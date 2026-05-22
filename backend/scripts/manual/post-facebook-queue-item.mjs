import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import postToFacebook from "../platforms/social/post-to-facebook.js";
import { getAccount } from "../../utils/accountStore.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "../..");
const QUEUE_PATH = path.join(BACKEND_ROOT, "queue", "postQueue.json");

const postId = String(process.argv[2] || "").trim();

if (!postId) {
	throw new Error("Usage: node scripts/manual/post-facebook-queue-item.mjs <postId>");
}

const queue = JSON.parse(await readFile(QUEUE_PATH, "utf8"));
const post = queue.find((entry) => String(entry?.id || "") === postId);

if (!post) {
	throw new Error(`Queue item not found: ${postId}`);
}

const account =
	(await getAccount("facebook", "fb-color-with-ash")) ||
	(await getAccount("facebook", "fb-main-page"));

if (!account) {
	throw new Error("Facebook account not found");
}

const result = await postToFacebook(post, {
	account,
	target: { platform: "facebook", accountId: account.id || null },
});

console.log(
	JSON.stringify(
		{
			postId,
			title: post.title,
			mediaPath: post.mediaPath,
			result,
		},
		null,
		2,
	),
);
