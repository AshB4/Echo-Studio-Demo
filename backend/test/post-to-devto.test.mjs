import test from "node:test";
import assert from "node:assert/strict";
import {
	normalizeDevtoTags,
	publicAssetUrl,
	publicImageUrl,
} from "../scripts/platforms/dev/post-to-devto.js";

test("publicImageUrl accepts only already-public image URLs", () => {
	assert.equal(publicImageUrl("https://example.com/image.png"), "https://example.com/image.png");
	assert.equal(publicImageUrl("frontend/assets/devto/DevRage.png"), undefined);
});

test("publicAssetUrl converts local repo assets to raw GitHub URLs", () => {
	assert.equal(
		publicAssetUrl("frontend/assets/devto/DevRage.png"),
		"https://raw.githubusercontent.com/AshB4/N8tiveFlow/main/frontend/assets/devto/DevRage.png",
	);
});

test("normalizeDevtoTags strips hashes and limits to four alphanumeric tags", () => {
	assert.deepEqual(
		normalizeDevtoTags(["#web-dev", "#AI", "content_strategy", "dev.to", "extra"]),
		["webdev", "AI", "contentstrategy", "devto"],
	);
});
