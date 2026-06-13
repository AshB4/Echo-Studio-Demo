import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { initLocalDb, readStoreSnapshot } from "../../utils/localDb.mjs";
import { buildFeedsFromPosts, DEFAULT_FEED_CONFIG } from "../../utils/rssSyndication.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "../..");

function argValue(name, fallback = null) {
	const prefix = `--${name}=`;
	const match = process.argv.find((arg) => arg.startsWith(prefix));
	if (!match) return fallback;
	return match.slice(prefix.length);
}

function envValue(name, fallback = "") {
	const value = process.env[name];
	return value === undefined || value === null || value === "" ? fallback : value;
}

function feedConfigFromEnv() {
	return {
		...DEFAULT_FEED_CONFIG,
		siteUrl: envValue("POSTPUNK_RSS_SITE_URL", DEFAULT_FEED_CONFIG.siteUrl),
		publicFeedPath: envValue("POSTPUNK_RSS_PUBLIC_PATH", DEFAULT_FEED_CONFIG.publicFeedPath),
		devtoFeedPath: envValue("POSTPUNK_RSS_DEVTO_PATH", DEFAULT_FEED_CONFIG.devtoFeedPath),
		title: envValue("POSTPUNK_RSS_TITLE", DEFAULT_FEED_CONFIG.title),
		description: envValue("POSTPUNK_RSS_DESCRIPTION", DEFAULT_FEED_CONFIG.description),
		language: envValue("POSTPUNK_RSS_LANGUAGE", DEFAULT_FEED_CONFIG.language),
		owner: envValue("POSTPUNK_RSS_OWNER", DEFAULT_FEED_CONFIG.owner),
	};
}

function outputDirectory() {
	const configured = argValue("out-dir", process.env.POSTPUNK_RSS_OUT_DIR);
	if (!configured) return path.join(BACKEND_ROOT, "public", "rss");
	return path.isAbsolute(configured) ? configured : path.resolve(BACKEND_ROOT, configured);
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

export async function generateRssFeeds(options = {}) {
	await initLocalDb();
	const snapshot = await readStoreSnapshot();
	const records = byUniqueId([...(snapshot.posts || []), ...(snapshot.postedLog || [])]);
	const config = { ...feedConfigFromEnv(), ...(options.config || {}) };
	const generatedAt = options.generatedAt || new Date().toISOString();
	const feeds = buildFeedsFromPosts(records, { config, generatedAt });
	const outDir = options.outDir || outputDirectory();

	await mkdir(outDir, { recursive: true });
	const publicPath = path.join(outDir, "feed.xml");
	const devtoPath = path.join(outDir, "devto.xml");
	await Promise.all([
		writeFile(publicPath, feeds.public),
		writeFile(devtoPath, feeds.devto),
	]);

	return {
		outDir,
		publicPath,
		devtoPath,
		publicCount: feeds.publicArticles.length,
		devtoCount: feeds.devtoArticles.length,
	};
}

if (import.meta.url === `file://${process.argv[1]}`) {
	generateRssFeeds()
		.then((result) => {
			console.log(
				`RSS feeds generated: ${result.publicPath} (${result.publicCount}), ${result.devtoPath} (${result.devtoCount})`,
			);
		})
		.catch((error) => {
			console.error("RSS feed generation failed:", error?.message || error);
			process.exitCode = 1;
		});
}
