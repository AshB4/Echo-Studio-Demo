import "dotenv/config";
import axios from "axios";
import { initLocalDb, readStoreSnapshot, replaceStoreSnapshot } from "../../utils/localDb.mjs";
import {
	applyPipelineStatus,
	isArticleRecord,
	normalizeArticleRecord,
} from "../../utils/articlePipeline.mjs";
import { DEFAULT_FEED_CONFIG } from "../../utils/rssSyndication.mjs";

const DEVTO_API_BASE = "https://dev.to/api";
const DEVTO_API_ACCEPT = "application/vnd.forem.api-v1+json";

function envValue(name, fallback = "") {
	const value = process.env[name];
	return value === undefined || value === null || value === "" ? fallback : value;
}

function boolArg(name) {
	return process.argv.includes(`--${name}`);
}

function feedConfigFromEnv() {
	return {
		...DEFAULT_FEED_CONFIG,
		siteUrl: envValue("POSTPUNK_RSS_SITE_URL", DEFAULT_FEED_CONFIG.siteUrl),
		title: envValue("POSTPUNK_RSS_TITLE", DEFAULT_FEED_CONFIG.title),
		description: envValue("POSTPUNK_RSS_DESCRIPTION", DEFAULT_FEED_CONFIG.description),
	};
}

function apiKeyFromEnv() {
	const apiKey = envValue("DEVTO_API_KEY");
	if (!apiKey) throw new Error("DEVTO_API_KEY is required to publish DEV drafts");
	return apiKey;
}

function devtoHeaders(apiKey) {
	return {
		"api-key": apiKey,
		"Api-Key": apiKey,
		accept: DEVTO_API_ACCEPT,
		"Content-Type": "application/json",
	};
}

function articleKey(article = {}) {
	return String(article.canonicalUrl || "").trim().toLowerCase();
}

function draftCanonicalUrl(draft = {}) {
	return String(draft.canonical_url || draft.canonicalUrl || "").trim();
}

function draftUrl(draft = {}) {
	return String(draft.url || (draft.path ? `https://dev.to${draft.path}` : "")).trim();
}

function draftId(draft = {}) {
	return String(draft.id || "").trim();
}

export function buildAutoPublishIndex(records = [], feedConfig = DEFAULT_FEED_CONFIG) {
	const byCanonical = new Map();
	for (const record of records) {
		if (!isArticleRecord(record)) continue;
		const article = normalizeArticleRecord(record, { feedConfig });
		if (!article.autoPublishDev || !article.syndicationTargets.includes("devto")) continue;
		const key = articleKey(article);
		if (key) byCanonical.set(key, article);
	}
	return byCanonical;
}

async function fetchUnpublishedDrafts(apiKey, client = axios) {
	const response = await client.get(`${DEVTO_API_BASE}/articles/me/unpublished`, {
		headers: devtoHeaders(apiKey),
		params: { per_page: 100 },
	});
	return Array.isArray(response.data) ? response.data : [];
}

async function publishDraft(draft, apiKey, client = axios) {
	const id = draftId(draft);
	if (!id) throw new Error("DEV draft is missing an id");
	const response = await client.put(
		`${DEVTO_API_BASE}/articles/${id}`,
		{ article: { published: true } },
		{ headers: devtoHeaders(apiKey) },
	);
	return response.data || {};
}

export function annotateDevtoPublication(record, draft, published, now) {
	const metadata = { ...(record.metadata || {}) };
	const externalUrls = { ...(metadata.externalUrls || {}) };
	const platformIds = { ...(metadata.platformIds || {}) };
	const url = draftUrl(published) || draftUrl(draft);
	const id = draftId(published) || draftId(draft);
	if (url) externalUrls.devto = url;
	if (id) platformIds.devto = id;

	return applyPipelineStatus(
		{
			...record,
			devUrl: url || record.devUrl,
			metadata: {
				...metadata,
				externalUrls,
				platformIds,
				syndicationStatus: "dev_published",
			},
		},
		"dev_published",
		now,
	);
}

function updateRecords(records = [], publishedByCanonical = new Map(), feedConfig = DEFAULT_FEED_CONFIG, now) {
	return records.map((record) => {
		if (!isArticleRecord(record)) return record;
		const article = normalizeArticleRecord(record, { feedConfig });
		const match = publishedByCanonical.get(articleKey(article));
		if (!match) return record;
		return annotateDevtoPublication(record, match.draft, match.published, now);
	});
}

export async function publishDevtoDrafts(options = {}) {
	await initLocalDb();
	const snapshot = await readStoreSnapshot();
	const feedConfig = { ...feedConfigFromEnv(), ...(options.feedConfig || {}) };
	const records = [...(snapshot.posts || []), ...(snapshot.postedLog || [])];
	const autoPublishByCanonical = buildAutoPublishIndex(records, feedConfig);
	const apiKey = options.apiKey || apiKeyFromEnv();
	const client = options.client || axios;
	const now = options.publishedAt || new Date().toISOString();
	const dryRun = options.dryRun ?? boolArg("dry-run");

	const drafts = await fetchUnpublishedDrafts(apiKey, client);
	const matches = drafts
		.map((draft) => {
			const key = draftCanonicalUrl(draft).toLowerCase();
			return key && autoPublishByCanonical.has(key) ? { draft, article: autoPublishByCanonical.get(key) } : null;
		})
		.filter(Boolean);

	const published = [];
	for (const match of matches) {
		if (dryRun) {
			published.push({ ...match, published: match.draft, dryRun: true });
			continue;
		}
		published.push({
			...match,
			published: await publishDraft(match.draft, apiKey, client),
			dryRun: false,
		});
	}

	if (!dryRun && published.length > 0) {
		const publishedByCanonical = new Map(
			published.map((item) => [articleKey(item.article), item]),
		);
		await replaceStoreSnapshot({
			posts: updateRecords(snapshot.posts || [], publishedByCanonical, feedConfig, now),
			postedLog: updateRecords(snapshot.postedLog || [], publishedByCanonical, feedConfig, now),
			rejections: snapshot.rejections || [],
		});
	}

	return {
		draftCount: drafts.length,
		matchedCount: matches.length,
		publishedCount: published.length,
		dryRun,
		published,
	};
}

if (import.meta.url === `file://${process.argv[1]}`) {
	publishDevtoDrafts()
		.then((result) => {
			const verb = result.dryRun ? "would publish" : "published";
			console.log(
				`DEV draft publisher ${verb} ${result.publishedCount}/${result.draftCount} unpublished drafts (${result.matchedCount} matched PostPunk).`,
			);
		})
		.catch((error) => {
			console.error("DEV draft publishing failed:", error?.message || error);
			process.exitCode = 1;
		});
}
