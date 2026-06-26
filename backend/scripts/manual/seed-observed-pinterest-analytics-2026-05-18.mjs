import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
	appendPinterestMetricsSnapshot,
	initLocalDb,
	listPinterestMetricsSnapshots,
	readStoreSnapshot,
	replaceStoreSnapshot,
} from "../../utils/localDb.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "..", "..");
const STATS_DIR = path.join(BACKEND_ROOT, "stats");
const FUNNEL_PATH = path.join(STATS_DIR, "funnel.json");
const SUMMARY_PATH = path.join(STATS_DIR, "summary.json");

const CAPTURED_AT = "2026-05-18T12:00:00.000Z";
const CAMPAIGN = "Goblin + Cozy Utility";

const SNAPSHOTS = [
	{
		pinId: "goblinslow001",
		pinUrl: "",
		title: "I Am Allowed To Move Slowly",
		titleSeen: "I Am Allowed To Move Slowly",
		capturedAt: CAPTURED_AT,
		captureMethod: "manual_observed",
		confidence: 0.8,
		metrics: {
			impressions: 1400,
			saves: 6,
			pinClicks: 11,
			outboundClicks: 1,
		},
	},
	{
		pinId: "kawaii001",
		pinUrl: "",
		title: "Cute Kawaii Coloring Pages",
		titleSeen: "Cute Kawaii Coloring Pages",
		capturedAt: CAPTURED_AT,
		captureMethod: "manual_observed",
		confidence: 0.75,
		metrics: {
			impressions: 1200,
			saves: 2,
			pinClicks: 8,
			outboundClicks: 1,
		},
	},
	{
		pinId: "lighting001",
		pinUrl: "",
		title: "Backyard Lighting Before and After",
		titleSeen: "Backyard Lighting Before and After",
		capturedAt: CAPTURED_AT,
		captureMethod: "manual_observed",
		confidence: 0.8,
		metrics: {
			impressions: 900,
			saves: 1,
			pinClicks: 5,
			outboundClicks: 1,
		},
	},
	{
		pinId: "parent001",
		pinUrl: "",
		title: "This Buys You a Little Peace and Quiet",
		titleSeen: "This Buys You a Little Peace and Quiet",
		capturedAt: CAPTURED_AT,
		captureMethod: "manual_observed",
		confidence: 0.8,
		metrics: {
			impressions: 800,
			saves: 1,
			pinClicks: 3,
			outboundClicks: 1,
		},
	},
	{
		pinId: "password001",
		pinUrl: "",
		title: "Keep Your Information Safe",
		titleSeen: "Keep Your Information Safe",
		capturedAt: CAPTURED_AT,
		captureMethod: "manual_observed",
		confidence: 0.7,
		metrics: {
			impressions: 600,
			saves: 1,
			pinClicks: 0,
			outboundClicks: 1,
		},
	},
	{
		pinId: "bobbin001",
		pinUrl: "",
		title: "Metal vs Plastic Bobbins Explained Simply",
		titleSeen: "Metal vs Plastic Bobbins Explained Simply",
		capturedAt: CAPTURED_AT,
		captureMethod: "manual_observed",
		confidence: 0.65,
		metrics: {
			impressions: 600,
			saves: 0,
			pinClicks: 0,
			outboundClicks: 1,
		},
	},
];

const FUNNEL_EVENTS = [
	{
		platform: "Pinterest",
		campaign: CAMPAIGN,
		clicks: 27,
		likes: 0,
		signups: 0,
		conversions: 0,
		saves: 11,
		retweets: 0,
		timestamp: CAPTURED_AT,
	},
];

const SUMMARY = {
	total_posts_attempted: 0,
	total_posts_successful: 0,
	success_rate: 0,
	total_rejected: 0,
	most_active_day: null,
	last_updated: CAPTURED_AT,
};

async function main() {
	await initLocalDb();

	const existing = await listPinterestMetricsSnapshots({ limit: 1000 });
	const existingById = new Map(existing.map((entry) => [String(entry.pinId || ""), entry]));
	const preserved = existing.filter((entry) => !SNAPSHOTS.some((snapshot) => snapshot.pinId === entry.pinId));
	const mergedSnapshots = [...preserved, ...SNAPSHOTS];

	const store = await readStoreSnapshot();
	await replaceStoreSnapshot(store);

	for (const snapshot of mergedSnapshots) {
		await appendPinterestMetricsSnapshot(snapshot);
	}

	await writeFile(FUNNEL_PATH, JSON.stringify(FUNNEL_EVENTS, null, 2));
	await writeFile(SUMMARY_PATH, JSON.stringify(SUMMARY, null, 2));

	const funnel = JSON.parse(await readFile(FUNNEL_PATH, "utf8"));
	console.log(
		JSON.stringify(
			{
				updatedSnapshots: SNAPSHOTS.length,
				totalSnapshotsSeeded: SNAPSHOTS.length,
				funnelEvents: funnel.length,
				campaign: CAMPAIGN,
			},
			null,
			2,
		),
	);
}

main().catch((error) => {
	console.error(error?.stack || String(error));
	process.exitCode = 1;
});
