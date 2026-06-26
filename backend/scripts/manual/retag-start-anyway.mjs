import { initLocalDb, readStoreSnapshot, replaceStoreSnapshot } from "../../utils/localDb.mjs";
import { inferStartAnywayIdentity } from "../../utils/pinterestQueueIdentity.mjs";

function isStartAnywayPost(post = {}) {
	const text = JSON.stringify({
		title: post?.title,
		body: post?.body,
		mediaPath: post?.mediaPath,
		metadata: post?.metadata,
	}).toLowerCase();
	return (
		String(post?.metadata?.productProfileId || "") === "start-anyway-frog" ||
		String(post?.productProfileId || "") === "start-anyway-frog" ||
		/start-anyway|start anyway|frog circle shirt|frog hoodie/.test(text)
	);
}

async function main() {
	await initLocalDb();
	const snapshot = await readStoreSnapshot();
	let updated = 0;

	for (const post of snapshot.posts) {
		if (!isStartAnywayPost(post)) continue;
		const metadata = { ...(post.metadata || {}) };
		const identityText = [
			post.title,
			post.body,
			metadata.keyword,
			metadata.angle,
			metadata.productLink,
			...(metadata.pinterestTags || []),
		]
			.map((value) => String(value || "").toLowerCase())
			.join(" ");
		const identity = inferStartAnywayIdentity(identityText, post.mediaPath || post.image || "");
		if (!identity) continue;
		const nextId = identity.productProfileId;
		if (metadata.productProfileId === nextId && post.productProfileId === nextId) continue;
		metadata.productProfileId = nextId;
		metadata.productProfileLabel =
			nextId === "start-anyway-frog-hoodie" ? "Start Anyway Frog Hoodie" : "Start Anyway Frog Tee";
		post.metadata = metadata;
		post.productProfileId = nextId;
		post.updatedAt = new Date().toISOString();
		updated += 1;
	}

	await replaceStoreSnapshot(snapshot);
	console.log(JSON.stringify({ updated }, null, 2));
}

main().catch((error) => {
	console.error(error?.stack || String(error));
	process.exitCode = 1;
});
