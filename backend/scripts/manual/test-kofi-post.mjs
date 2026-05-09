import "dotenv/config";
import path from "path";
import { initLocalDb, readStoreSnapshot } from "../../utils/localDb.mjs";
import { postToAllPlatforms } from "../platforms/post-to-all.js";

function parseArgs(argv) {
	const args = {};
	for (let index = 0; index < argv.length; index += 1) {
		const part = argv[index];
		if (!part.startsWith("--")) continue;
		const key = part.slice(2);
		const next = argv[index + 1];
		if (!next || next.startsWith("--")) {
			args[key] = true;
			continue;
		}
		args[key] = next;
		index += 1;
	}
	return args;
}

function usage() {
	console.log(`Usage:
  node scripts/manual/test-kofi-post.mjs --post-id <id>
  node scripts/manual/test-kofi-post.mjs --title "..." --body "..." [--media frontend/assets/foo.png]

Optional:
  --headless true|false
`);
}

async function loadQueuedPost(postId) {
	await initLocalDb();
	const snapshot = await readStoreSnapshot();
	return (snapshot.posts || []).find((post) => String(post.id) === String(postId)) || null;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.headless !== undefined) {
		process.env.KOFI_HEADLESS = String(args.headless);
	}

	let payload = null;
	if (args["post-id"]) {
		const queued = await loadQueuedPost(args["post-id"]);
		if (!queued) {
			throw new Error(`Queued post not found: ${args["post-id"]}`);
		}
		payload = {
			...queued,
			platforms: ["kofi"],
			targets: [{ platform: "kofi", accountId: "kofi-main" }],
		};
	} else if (args.title || args.body) {
		payload = {
			id: `manual_kofi_${Date.now()}`,
			title: String(args.title || "").trim(),
			body: String(args.body || "").trim(),
			mediaPath: args.media ? path.normalize(String(args.media)) : null,
			platforms: ["kofi"],
			targets: [{ platform: "kofi", accountId: "kofi-main" }],
			contentIntent: ["relationship"],
			metadata: {},
			hashtags: [],
		};
	} else {
		usage();
		process.exit(1);
	}

	const results = await postToAllPlatforms(payload, payload.targets);
	console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
	console.error(error?.stack || error?.message || String(error));
	process.exit(1);
});
