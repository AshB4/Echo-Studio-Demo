import "dotenv/config";
import postToFacebook from "./scripts/platforms/social/post-to-facebook.js";
import { getAccount } from "./utils/accountStore.mjs";

async function testFacebook() {
	const accountId = process.env.FACEBOOK_TEST_ACCOUNT_ID || "fb-color-with-ash";
	const account = await getAccount("facebook", accountId);
	if (!account) {
		throw new Error(`Facebook test account not found: ${accountId}`);
	}

	const post = {
		title: process.env.FACEBOOK_TEST_TITLE || "Test Facebook Post",
		body:
			process.env.FACEBOOK_TEST_BODY ||
			"This is a test post from PostPunk. If this works, it should post to Color With Ash and then share to the main profile automatically.",
		hashtags: ["test", "postpunk", "facebook"],
		image: null,
		mediaPath: process.env.FACEBOOK_TEST_MEDIA_PATH || null,
	};

	try {
		const result = await postToFacebook(post, {
			account,
			target: { platform: "facebook", accountId },
		});
		console.log("Facebook test successful:", JSON.stringify(result, null, 2));
	} catch (error) {
		console.error("Facebook test failed:", error?.stack || error?.message || String(error));
		process.exitCode = 1;
	}
}

testFacebook();
