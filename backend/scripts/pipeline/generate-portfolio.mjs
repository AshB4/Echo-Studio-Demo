import path from "path";
import { fileURLToPath } from "url";
import { initLocalDb, readStoreSnapshot, replaceStoreSnapshot } from "../../utils/localDb.mjs";
import {
	applyPipelineStatus,
	generatePortfolioOutput,
	isArticleRecord,
} from "../../utils/articlePipeline.mjs";
import { DEFAULT_FEED_CONFIG } from "../../utils/rssSyndication.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "../..");

function argValue(name, fallback = null) {
	const prefix = `--${name}=`;
	const match = process.argv.find((arg) => arg.startsWith(prefix));
	return match ? match.slice(prefix.length) : fallback;
}

function envValue(name, fallback = "") {
	const value = process.env[name];
	return value === undefined || value === null || value === "" ? fallback : value;
}

function feedConfigFromEnv() {
	return {
		...DEFAULT_FEED_CONFIG,
		siteUrl: envValue("POSTPUNK_RSS_SITE_URL", DEFAULT_FEED_CONFIG.siteUrl),
		title: envValue("POSTPUNK_RSS_TITLE", DEFAULT_FEED_CONFIG.title),
		description: envValue("POSTPUNK_RSS_DESCRIPTION", DEFAULT_FEED_CONFIG.description),
	};
}

function outputDirectory() {
	const configured =
		argValue("out-dir") ||
		process.env.POSTPUNK_PORTFOLIO_OUT_DIR ||
		process.env.POSTPUNK_PORTFOLIO_REPO_DIR;
	if (!configured) return path.join(BACKEND_ROOT, "public", "portfolio");
	return path.isAbsolute(configured) ? configured : path.resolve(BACKEND_ROOT, configured);
}

function shouldPersistStatus() {
	return !process.argv.includes("--no-status");
}

function byUniqueId(records = []) {
	const map = new Map();
	for (const record of records) {
		const id = String(record?.id || "").trim();
		if (!id) continue;
		const existing = map.get(id);
		if (!existing) {
			map.set(id, record);
			continue;
		}
		const existingDate = Date.parse(existing.processedAt || existing.updatedAt || existing.createdAt || 0);
		const nextDate = Date.parse(record.processedAt || record.updatedAt || record.createdAt || 0);
		if (Number.isFinite(nextDate) && (!Number.isFinite(existingDate) || nextDate >= existingDate)) {
			map.set(id, record);
		}
	}
	return Array.from(map.values());
}

export async function generatePortfolio(options = {}) {
	await initLocalDb();
	const snapshot = await readStoreSnapshot();
	const outDir = options.outDir || outputDirectory();
	const feedConfig = { ...feedConfigFromEnv(), ...(options.feedConfig || {}) };
	const generatedAt = options.generatedAt || new Date().toISOString();
	const records = byUniqueId([...(snapshot.posts || []), ...(snapshot.postedLog || [])]);
	const result = await generatePortfolioOutput(records, {
		outDir,
		feedConfig,
		generatedAt,
	});

	if (options.persistStatus ?? shouldPersistStatus()) {
		const posts = (snapshot.posts || []).map((post) =>
			isArticleRecord(post) ? applyPipelineStatus(post, "generated", generatedAt) : post,
		);
		await replaceStoreSnapshot({
			posts,
			postedLog: snapshot.postedLog || [],
			rejections: snapshot.rejections || [],
		});
	}

	return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	generatePortfolio()
		.then((result) => {
			console.log(
				`Portfolio generated at ${result.outDir}: ${result.publicArticleCount} public articles, ${result.devtoArticleCount} DEV feed items.`,
			);
		})
		.catch((error) => {
			console.error("Portfolio generation failed:", error?.message || error);
			process.exitCode = 1;
		});
}
