import "dotenv/config";
import { execFile } from "child_process";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import { promisify } from "util";
import MarkdownIt from "markdown-it";
import { initLocalDb, readStoreSnapshot, replaceStoreSnapshot } from "../../utils/localDb.mjs";
import { sendPostPunkTelegramAlert } from "../../utils/telegramAlerts.mjs";
import { buildArchiveEntry } from "../../utils/archiveEntry.mjs";
import { attachDevtoCoverPrompt, buildDevtoCoverPrompt } from "../../utils/devtoCoverPrompt.mjs";
import postToDevto from "../platforms/dev/post-to-devto.js";

const execFileAsync = promisify(execFile);
const markdown = new MarkdownIt({ html: false, linkify: true });
const DEFAULT_PORTFOLIO_REPO = "/Users/ash/Desktop/Portfolio/AshB4.github.io";
const SITE_URL = "https://ashb4.github.io";

function argValue(name, fallback = null) {
	const prefix = `--${name}=`;
	const match = process.argv.find((arg) => arg.startsWith(prefix));
	return match ? match.slice(prefix.length) : fallback;
}

function cleanString(value, fallback = "") {
	const text = String(value ?? "").trim();
	return text || fallback;
}

function slugify(value) {
	return cleanString(value)
		.toLowerCase()
		.replace(/['"]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function postSlug(post = {}) {
	const canonical = cleanString(post.canonicalUrl || post.metadata?.canonicalUrl);
	if (canonical) {
		try {
			const url = new URL(canonical);
			const parts = url.pathname.split("/").filter(Boolean);
			const blogIndex = parts.indexOf("blog");
			if (blogIndex >= 0 && parts[blogIndex + 1]) return parts[blogIndex + 1];
		} catch {
			// fall through to explicit slug/title
		}
	}
	return cleanString(post.slug || post.metadata?.slug, slugify(post.title || post.id));
}

function isoDateOnly(value) {
	const date = new Date(value || Date.now());
	if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
	return date.toISOString().slice(0, 10);
}

function articleContent(post = {}) {
	const body = cleanString(post.body || post.content || post.markdown);
	return markdown.render(body);
}

function portfolioPostFromArticle(post = {}) {
	const slug = postSlug(post);
	const canonicalUrl = `${SITE_URL}/blog/${slug}/`;
	const coverImageUrl = cleanString(post.coverImageUrl || post.image || post.metadata?.coverImageUrl);
	return {
		id: post.id,
		title: cleanString(post.title, "Untitled"),
		slug,
		date: isoDateOnly(post.publishDate || post.metadata?.publishDate || post.scheduledAt || post.createdAt),
		excerpt: cleanString(post.excerpt || post.description || post.metadata?.excerpt),
		tags: Array.isArray(post.tags) ? post.tags : [],
		canonicalUrl,
		devUrl: cleanString(post.devUrl || post.metadata?.externalUrls?.devto) || undefined,
		includeInFeed: true,
		coverImageUrl: coverImageUrl || undefined,
		coverImageAlt: coverImageUrl ? cleanString(post.metadata?.coverImageAlt, post.title) : undefined,
		content: articleContent(post),
	};
}

function stablePost(post = {}) {
	return Object.fromEntries(
		Object.entries(post).filter(([, value]) => {
			if (value === undefined || value === null) return false;
			if (Array.isArray(value)) return value.length > 0;
			if (typeof value === "string") return value.length > 0;
			return true;
		}),
	);
}

async function writePortfolioData(post, repoDir) {
	const postsFile = path.join(repoDir, "src", "data", "posts.js");
	const moduleUrl = `${pathToFileURL(postsFile).href}?t=${Date.now()}`;
	const { posts: existingPosts = [] } = await import(moduleUrl);
	const nextPost = portfolioPostFromArticle(post);
	const merged = [...existingPosts.filter((item) => item.slug !== nextPost.slug), nextPost]
		.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
		.map(stablePost);
	const source = `export const posts = ${JSON.stringify(merged, null, 2)};\n`;
	await writeFile(postsFile, source, "utf8");
	return nextPost;
}

async function runCommand(command, args, cwd) {
	const { stdout, stderr } = await execFileAsync(command, args, { cwd });
	return `${stdout || ""}${stderr || ""}`.trim();
}

async function hasPortfolioSourceChanges(repoDir) {
	const output = await runCommand("git", [
		"status",
		"--porcelain",
		"--",
		"src/data/posts.js",
		"public/devto-covers",
		"src/pages/Blog.jsx",
		"src/pages/BlogPost.jsx",
	], repoDir);
	return output.length > 0;
}

async function commitPortfolioSource(repoDir, title) {
	if (!(await hasPortfolioSourceChanges(repoDir))) return { committed: false };
	await runCommand("git", [
		"add",
		"src/data/posts.js",
		"public/devto-covers",
		"src/pages/Blog.jsx",
		"src/pages/BlogPost.jsx",
	], repoDir);
	await runCommand("git", ["commit", "-m", `Publish article: ${title}`], repoDir);
	await runCommand("git", ["push", "origin", "main"], repoDir);
	return { committed: true };
}

async function syncPortfolioSource(repoDir, title, post) {
	await writePortfolioData(post, repoDir);
	const sourceCommit = await commitPortfolioSource(repoDir, title);
	return sourceCommit;
}

async function appendLog(logPath, event) {
	await mkdir(path.dirname(logPath), { recursive: true });
	await writeFile(logPath, `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`, {
		flag: "a",
	});
}

async function notify(logPath, stage, status, detail = "") {
	await appendLog(logPath, { stage, status, detail });
	const icon = status === "success" ? "OK" : status === "error" ? "ERROR" : "INFO";
	await sendPostPunkTelegramAlert(`[${icon}] Article pipeline ${stage}: ${detail || status}`);
}

function withCoverMetadata(post, options = {}) {
	const coverImageUrl = cleanString(options.coverUrl || post.image || post.metadata?.coverImageUrl);
	const coverImageAlt = cleanString(options.coverAlt, `${post.title} cover image`);
	const withPrompt = attachDevtoCoverPrompt(post, {
		primaryLesson: options.primaryLesson,
		visualMetaphor: options.visualMetaphor,
		requiredText: options.requiredText,
	});
	return {
		...withPrompt,
		image: coverImageUrl || withPrompt.image,
		coverImageUrl: coverImageUrl || withPrompt.coverImageUrl,
		metadata: {
			...(withPrompt.metadata || {}),
			coverImageUrl,
			coverImageAlt,
			coverImageSource: cleanString(options.coverSource, "postpunk_generated"),
			coverImageStatus: coverImageUrl ? "generated" : withPrompt.metadata?.coverImageStatus,
			coverImagePrompt: buildDevtoCoverPrompt(withPrompt, {
				primaryLesson: options.primaryLesson,
				visualMetaphor: options.visualMetaphor,
				requiredText: options.requiredText,
			}),
		},
	};
}

export async function publishOneArticle(options = {}) {
	const articleId = options.articleId || argValue("id");
	if (!articleId) throw new Error("--id is required");
	const repoDir = options.repoDir || argValue("repo-dir", process.env.POSTPUNK_PORTFOLIO_REPO_DIR || DEFAULT_PORTFOLIO_REPO);
	const logPath =
		options.logPath ||
		path.join(process.cwd(), "logs", "article-pipeline", `${new Date().toISOString().replace(/[:.]/g, "-")}-${articleId}.jsonl`);

	await initLocalDb();
	const snapshot = await readStoreSnapshot();
	const original = (snapshot.posts || []).find((post) => post.id === articleId);
	if (!original) throw new Error(`Article not found in queue: ${articleId}`);

	const post = withCoverMetadata(original, {
		coverUrl: options.coverUrl || argValue("cover-url"),
		coverAlt: options.coverAlt || argValue("cover-alt"),
		coverSource: options.coverSource || argValue("cover-source"),
		primaryLesson: options.primaryLesson || argValue("primary-lesson"),
		visualMetaphor: options.visualMetaphor || argValue("visual-metaphor"),
		requiredText: options.requiredText || argValue("required-text"),
	});
	const slug = postSlug(post);
	const canonicalUrl = `${SITE_URL}/blog/${slug}/`;
	const postForPublish = {
		...post,
		canonicalUrl,
		metadata: {
			...(post.metadata || {}),
			canonicalUrl,
			syndicationStatus: "portfolio_generating",
		},
	};

	await notify(logPath, "start", "info", `${post.title} (${articleId})`);

	try {
		await notify(logPath, "github.io", "info", "Updating portfolio data");
		await writePortfolioData(postForPublish, repoDir);
		await notify(logPath, "github.io", "info", "Committing portfolio source");
		const sourceCommit = await commitPortfolioSource(repoDir, post.title);
		await notify(
			logPath,
			"github.io",
			"info",
			sourceCommit.committed ? "Portfolio source committed and pushed" : "No portfolio source changes to commit",
		);
		await notify(logPath, "github.io", "info", "Building portfolio");
		await runCommand("npm", ["run", "build"], repoDir);
		await notify(logPath, "github.io", "info", "Deploying GitHub Pages");
		await runCommand("npm", ["run", "deploy"], repoDir);
		await notify(logPath, "github.io", "success", canonicalUrl);

		await notify(logPath, "devto", "info", "Publishing article");
		const devResult = await postToDevto(postForPublish);
		await notify(logPath, "devto", "success", devResult.url);

		const syncedPost = {
			...postForPublish,
			devUrl: devResult.url,
			metadata: {
				...(postForPublish.metadata || {}),
				externalUrls: {
					...(postForPublish.metadata?.externalUrls || {}),
					devto: devResult.url,
				},
				platformIds: {
					...(postForPublish.metadata?.platformIds || {}),
					devto: String(devResult.articleId),
				},
				syndicationStatus: "dev_published",
				pipelineStatus: "dev_published",
			},
			updatedAt: new Date().toISOString(),
		};

		await notify(logPath, "github.io", "info", "Syncing DEV URL back into portfolio data");
		const finalSourceCommit = await syncPortfolioSource(repoDir, post.title, syncedPost);
		await notify(
			logPath,
			"github.io",
			"info",
			finalSourceCommit.committed ? "Final portfolio sync committed and pushed" : "No final portfolio changes to commit",
		);
		await notify(logPath, "github.io", "info", "Rebuilding portfolio with DEV link");
		await runCommand("npm", ["run", "build"], repoDir);
		await notify(logPath, "github.io", "info", "Redeploying GitHub Pages with DEV link");
		await runCommand("npm", ["run", "deploy"], repoDir);

		const now = new Date().toISOString();
		const updated = {
			...syncedPost,
			status: "posted",
			updatedAt: now,
		};
		const resultEntry = {
			platform: "devto",
			accountId: null,
			status: "success",
			result: devResult,
		};
		await replaceStoreSnapshot({
			posts: (snapshot.posts || []).filter((item) => item.id !== articleId),
			postedLog: [
				...(snapshot.postedLog || []),
				buildArchiveEntry(updated, {
					targets: [{ platform: "devto", accountId: null }],
					results: [resultEntry],
					processedAt: now,
				}),
			],
			rejections: snapshot.rejections || [],
		});
		await notify(logPath, "complete", "success", `${canonicalUrl} | ${devResult.url}`);
		return { success: true, canonicalUrl, devUrl: devResult.url, logPath };
	} catch (error) {
		await notify(logPath, "pipeline", "error", error?.message || String(error));
		throw error;
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	publishOneArticle()
		.then((result) => {
			console.log(JSON.stringify(result, null, 2));
		})
		.catch((error) => {
			console.error("Article pipeline failed:", error?.message || error);
			process.exitCode = 1;
		});
}
