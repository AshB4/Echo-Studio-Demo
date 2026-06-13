import assert from "node:assert/strict";
import test from "node:test";
import {
	annotateDevtoPublication,
	buildAutoPublishIndex,
} from "../scripts/pipeline/publish-devto-drafts.mjs";

const feedConfig = {
	siteUrl: "https://ashb4.github.io/blog",
	publicFeedPath: "/feed.xml",
	devtoFeedPath: "/devto.xml",
	title: "Ash Test Blog",
	description: "Generated from PostPunk.",
	language: "en-us",
	owner: "Ash",
};

test("buildAutoPublishIndex only includes DEV article records with auto-publish enabled", () => {
	const index = buildAutoPublishIndex(
		[
			{
				id: "devto-ready",
				title: "DEV Ready",
				body: "Body",
				targets: [{ platform: "devto" }],
			},
			{
				id: "devto-disabled",
				title: "DEV Disabled",
				body: "Body",
				targets: [{ platform: "devto" }],
				autoPublishDev: false,
			},
			{
				id: "pin-only",
				title: "Pin Only",
				body: "Body",
				targets: [{ platform: "pinterest" }],
			},
		],
		feedConfig,
	);

	assert.equal(index.has("https://ashb4.github.io/blog/dev-ready/"), true);
	assert.equal(index.has("https://ashb4.github.io/blog/dev-disabled/"), false);
	assert.equal(index.has("https://ashb4.github.io/blog/pin-only/"), false);
});

test("annotateDevtoPublication stores DEV URL, platform id, and published pipeline status", () => {
	const updated = annotateDevtoPublication(
		{
			id: "devto-ready",
			title: "DEV Ready",
			body: "Body",
			targets: [{ platform: "devto" }],
			metadata: {
				externalUrls: {},
				platformIds: {},
			},
		},
		{
			id: 123,
			url: "https://dev.to/ashb4/dev-ready",
		},
		{
			id: 123,
			url: "https://dev.to/ashb4/dev-ready",
		},
		"2026-06-12T12:00:00.000Z",
	);

	assert.equal(updated.pipelineStatus, "dev_published");
	assert.equal(updated.metadata.syndicationStatus, "dev_published");
	assert.equal(updated.metadata.externalUrls.devto, "https://dev.to/ashb4/dev-ready");
	assert.equal(updated.metadata.platformIds.devto, "123");
	assert.deepEqual(updated.metadata.pipelineHistory, [
		{ status: "dev_published", at: "2026-06-12T12:00:00.000Z" },
	]);
});
