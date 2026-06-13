import MarkdownIt from "markdown-it";
import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import {
	buildFeedsFromPosts,
	buildGeneratedCanonicalUrl,
	DEFAULT_FEED_CONFIG,
	selectRssArticles,
} from "./rssSyndication.mjs";

const markdown = new MarkdownIt({ html: false, linkify: true });

export const ARTICLE_PIPELINE_STATES = [
	"draft",
	"generated",
	"portfolio_deployed",
	"rss_detected",
	"dev_draft_created",
	"dev_published",
	"failed",
];

function cleanString(value) {
	if (value === null || value === undefined) return "";
	return String(value).trim();
}

function toArray(value) {
	if (value === null || value === undefined) return [];
	const list = Array.isArray(value) ? value : [value];
	return list
		.flatMap((item) => (Array.isArray(item) ? item : [item]))
		.map((item) => cleanString(item))
		.filter(Boolean);
}

function uniqueStrings(values = []) {
	const seen = new Set();
	const result = [];
	for (const value of values) {
		const text = cleanString(value);
		const key = text.toLowerCase();
		if (!text || seen.has(key)) continue;
		seen.add(key);
		result.push(text);
	}
	return result;
}

export function slugifyArticle(value) {
	return cleanString(value)
		.toLowerCase()
		.replace(/['"]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function firstString(...values) {
	for (const value of values) {
		const text = cleanString(value);
		if (text) return text;
	}
	return "";
}

function bodyForPost(post = {}) {
	return firstString(post.body, post.content, post.markdown);
}

function targetPlatforms(post = {}) {
	return uniqueStrings([
		...toArray(post.platforms),
		...toArray(post.targets?.map?.((target) => target?.platform) || []),
		...toArray(post.metadata?.syndicationTargets),
	]).map((platform) => platform.toLowerCase());
}

export function isArticleRecord(post = {}) {
	if (!cleanString(post.title) || !bodyForPost(post)) return false;
	const lifecycle = cleanString(post.lifecycleState || post.metadata?.lifecycleState).toLowerCase();
	const artifactType = cleanString(post.metadata?.artifactType).toLowerCase();
	const distributionTags = toArray(post.metadata?.distributionTags).map((tag) => tag.toLowerCase());
	const platforms = targetPlatforms(post);
	return (
		lifecycle === "article" ||
		lifecycle === "syndicated" ||
		artifactType.includes("article") ||
		platforms.includes("devto") ||
		distributionTags.includes("post:devto")
	);
}

export function normalizeArticleRecord(post = {}, options = {}) {
	const feedConfig = { ...DEFAULT_FEED_CONFIG, ...(options.feedConfig || {}) };
	const slug = firstString(post.slug, post.metadata?.slug, slugifyArticle(post.title || post.id));
	const canonicalUrl = firstString(
		post.canonicalUrl,
		post.metadata?.canonicalUrl,
		buildGeneratedCanonicalUrl({ ...post, slug }, feedConfig),
	);
	const platforms = targetPlatforms(post);
	const tags = uniqueStrings([
		...toArray(post.tags),
		...toArray(post.hashtags).map((tag) => tag.replace(/^#/, "")),
		...toArray(post.metadata?.tags),
		...toArray(post.metadata?.contentTags),
	]);
	const autoPublishDev =
		post.autoPublishDev ??
		post.metadata?.autoPublishDev ??
		(platforms.includes("devto") ? true : false);
	const pipelineStatus = firstString(
		post.pipelineStatus,
		post.metadata?.pipelineStatus,
		post.metadata?.syndicationStatus,
		"draft",
	);

	return {
		id: firstString(post.id, slug),
		title: firstString(post.title, "Untitled"),
		slug,
		excerpt: firstString(post.excerpt, post.description, post.metadata?.excerpt),
		body: bodyForPost(post),
		tags,
		publishDate: firstString(post.publishDate, post.metadata?.publishDate, post.scheduledAt, post.createdAt),
		canonicalUrl,
		devUrl: firstString(post.devUrl, post.metadata?.externalUrls?.devto),
		image: firstString(post.image, post.mediaPath),
		status: firstString(post.status, "draft"),
		autoPublishDev,
		syndicationTargets: uniqueStrings([...toArray(post.metadata?.syndicationTargets), ...platforms]),
		pipelineStatus,
	};
}

function htmlEscape(value) {
	return cleanString(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function renderPageShell({ title, description, body, canonicalUrl, feedUrl = "/blog/feed.xml" }) {
	return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${htmlEscape(title)}</title>
  <meta name="description" content="${htmlEscape(description)}">
  <link rel="canonical" href="${htmlEscape(canonicalUrl)}">
  <link rel="alternate" type="application/rss+xml" title="Ash B4 Blog RSS" href="${htmlEscape(feedUrl)}">
  <style>
    body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.65;margin:0;background:#101418;color:#f5f3ef}
    main{max-width:780px;margin:0 auto;padding:48px 20px 72px}
    a{color:#7dd3fc} h1{line-height:1.1;font-size:clamp(2rem,5vw,3.8rem)} .meta,.excerpt{color:#c7c2b8}
    article img{max-width:100%;height:auto}.card{border-top:1px solid #343a40;padding:24px 0}.tags{display:flex;gap:8px;flex-wrap:wrap}.tag{font-size:.85rem;color:#111;background:#f2c94c;padding:2px 8px;border-radius:999px}
  </style>
</head>
<body>
  <main>${body}</main>
</body>
</html>
`;
}

export function renderArticlePage(article = {}, options = {}) {
	const content = markdown.render(article.body || "");
	const tags = toArray(article.tags)
		.map((tag) => `<span class="tag">${htmlEscape(tag)}</span>`)
		.join("");
	const date = article.publishDate ? new Date(article.publishDate).toLocaleDateString("en-US") : "";
	const body = `<article>
  <p><a href="../">Blog</a></p>
  <h1>${htmlEscape(article.title)}</h1>
  <p class="meta">${htmlEscape(date)}</p>
  ${article.excerpt ? `<p class="excerpt">${htmlEscape(article.excerpt)}</p>` : ""}
  ${tags ? `<div class="tags">${tags}</div>` : ""}
  ${article.image ? `<p><img src="${htmlEscape(article.image)}" alt=""></p>` : ""}
  ${content}
</article>`;
	return renderPageShell({
		title: article.title,
		description: article.excerpt,
		body,
		canonicalUrl: article.canonicalUrl,
		feedUrl: options.feedUrl || "/blog/feed.xml",
	});
}

export function renderBlogIndex(articles = [], options = {}) {
	const cards = articles
		.map((article) => {
			const date = article.publishDate ? new Date(article.publishDate).toLocaleDateString("en-US") : "";
			return `<section class="card">
  <h2><a href="./${htmlEscape(article.slug)}/">${htmlEscape(article.title)}</a></h2>
  <p class="meta">${htmlEscape(date)}</p>
  ${article.excerpt ? `<p>${htmlEscape(article.excerpt)}</p>` : ""}
</section>`;
		})
		.join("\n");
	return renderPageShell({
		title: options.title || "Ash B4 Blog",
		description: options.description || "Articles generated from PostPunk.",
		body: `<h1>${htmlEscape(options.heading || "Ash B4 Blog")}</h1>\n${cards}`,
		canonicalUrl: options.canonicalUrl || "https://ashb4.github.io/blog/",
		feedUrl: options.feedUrl || "/blog/feed.xml",
	});
}

export function applyPipelineStatus(post = {}, status, now = new Date().toISOString()) {
	const metadata = { ...(post.metadata || {}) };
	const history = Array.isArray(metadata.pipelineHistory) ? [...metadata.pipelineHistory] : [];
	history.push({ status, at: now });
	return {
		...post,
		pipelineStatus: status,
		autoPublishDev:
			post.autoPublishDev ??
			metadata.autoPublishDev ??
			(targetPlatforms(post).includes("devto") ? true : false),
		metadata: {
			...metadata,
			pipelineStatus: status,
			pipelineHistory: history,
			autoPublishDev:
				post.autoPublishDev ??
				metadata.autoPublishDev ??
				(targetPlatforms(post).includes("devto") ? true : false),
		},
		updatedAt: now,
	};
}

export async function generatePortfolioOutput(posts = [], options = {}) {
	const outDir = options.outDir;
	if (!outDir) throw new Error("outDir is required");
	const feedConfig = { ...DEFAULT_FEED_CONFIG, ...(options.feedConfig || {}) };
	const now = options.generatedAt || new Date().toISOString();
	const publicArticles = selectRssArticles(posts, {
		config: feedConfig,
		feedType: "public",
		generatedAt: now,
	}).map((article) => normalizeArticleRecord(article, { feedConfig }));
	const allArticleRecords = posts
		.filter(isArticleRecord)
		.map((post) => normalizeArticleRecord(post, { feedConfig }));
	const feeds = buildFeedsFromPosts(posts, {
		config: feedConfig,
		generatedAt: now,
	});

	await rm(path.join(outDir, "blog"), { recursive: true, force: true });
	await mkdir(path.join(outDir, "blog"), { recursive: true });

	await writeFile(
		path.join(outDir, "blog", "index.html"),
		renderBlogIndex(publicArticles, {
			title: feedConfig.title,
			description: feedConfig.description,
			canonicalUrl: `${feedConfig.siteUrl.replace(/\/+$/, "")}/`,
		}),
	);
	await writeFile(path.join(outDir, "blog", "feed.xml"), feeds.public);
	await writeFile(path.join(outDir, "blog", "devto.xml"), feeds.devto);

	for (const article of publicArticles) {
		const articleDir = path.join(outDir, "blog", article.slug);
		await mkdir(articleDir, { recursive: true });
		await writeFile(path.join(articleDir, "index.html"), renderArticlePage(article));
	}

	return {
		outDir,
		publicArticleCount: publicArticles.length,
		articleRecordCount: allArticleRecords.length,
		devtoArticleCount: feeds.devtoArticles.length,
		generatedAt: now,
	};
}
