import test from "node:test";
import assert from "node:assert/strict";

import {
	buildKofiPostText,
	ensureKofiContentAllowed,
	inferKofiMode,
} from "../scripts/platforms/content/post-to-kofi.js";

test("buildKofiPostText combines title and body for Ko-fi updates", () => {
	assert.equal(
		buildKofiPostText({
			title: "Build log",
			body: "Got the browser worker mostly stable tonight.",
		}),
		"Build log\n\nGot the browser worker mostly stable tonight.",
	);
});

test("buildKofiPostText falls back to whichever field exists", () => {
	assert.equal(buildKofiPostText({ title: "Only title" }), "Only title");
	assert.equal(buildKofiPostText({ body: "Only body" }), "Only body");
});

test("inferKofiMode defaults to post and respects explicit product mode", () => {
	assert.equal(inferKofiMode({}), "post");
	assert.equal(inferKofiMode({ metadata: { kofiMode: "product" } }), "product");
});

test("ensureKofiContentAllowed blocks discovery intent and product mode", () => {
	assert.throws(
		() => ensureKofiContentAllowed({ contentIntent: ["discovery"] }),
		/relationship-first/i,
	);
	assert.throws(
		() => ensureKofiContentAllowed({ metadata: { kofiMode: "product" } }),
		/not wired yet/i,
	);
});
