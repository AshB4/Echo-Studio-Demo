import { initLocalDb, readStoreSnapshot, replaceStoreSnapshot } from "../../utils/localDb.mjs";
import {
	backfillSyndicationMetadataForArticle,
	DEFAULT_FEED_CONFIG,
} from "../../utils/rssSyndication.mjs";

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

function changed(left, right) {
	return JSON.stringify(left) !== JSON.stringify(right);
}

function backfillList(records = [], config) {
	let count = 0;
	const next = records.map((record) => {
		const updated = backfillSyndicationMetadataForArticle(record, {
			config,
			refreshGeneratedCanonicals: true,
		});
		if (changed(record, updated)) count += 1;
		return updated;
	});
	return { next, count };
}

export async function backfillDevtoMetadata(options = {}) {
	await initLocalDb();
	const snapshot = await readStoreSnapshot();
	const config = { ...feedConfigFromEnv(), ...(options.config || {}) };
	const posts = backfillList(snapshot.posts || [], config);
	const postedLog = backfillList(snapshot.postedLog || [], config);

	await replaceStoreSnapshot({
		posts: posts.next,
		postedLog: postedLog.next,
		rejections: snapshot.rejections || [],
	});

	return {
		postsUpdated: posts.count,
		postedLogUpdated: postedLog.count,
	};
}

if (import.meta.url === `file://${process.argv[1]}`) {
	backfillDevtoMetadata()
		.then((result) => {
			console.log(
				`Dev.to RSS metadata backfilled: ${result.postsUpdated} queued posts, ${result.postedLogUpdated} archive entries.`,
			);
		})
		.catch((error) => {
			console.error("Dev.to RSS metadata backfill failed:", error?.message || error);
			process.exitCode = 1;
		});
}
