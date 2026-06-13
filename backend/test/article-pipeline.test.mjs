import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
	applyPipelineStatus,
	generatePortfolioOutput,
	normalizeArticleRecord,
} from "../utils/articlePipeline.mjs";

const feedConfig = {
	siteUrl: "https://ashb4.github.io/blog",
	publicFeedPath: "/feed.xml",
	devtoFeedPath: "/devto.xml",
	title: "Ash Test Blog",
	description: "Generated from PostPunk.",
	language: "en-us",
	owner: "Ash",
};

test("DEV-targeted articles default to mandatory auto-publish", () => {
	const article = normalizeArticleRecord({
		id: "devto-article",
		title: "Automation Is Awake",
		body: "Article body",
		targets: [{ platform: "devto" }],
	});

	assert.equal(article.autoPublishDev, true);
	assert.deepEqual(article.syndicationTargets, ["devto"]);
});

test("explicit autoPublishDev false is preserved for non-DEV article records", () => {
	const article = normalizeArticleRecord({
		id: "portfolio-only",
		title: "Portfolio Only",
		body: "Article body",
		lifecycleState: "article",
		autoPublishDev: false,
	});

	assert.equal(article.autoPublishDev, false);
});

test("applyPipelineStatus writes current status and history", () => {
	const updated = applyPipelineStatus(
		{
			id: "article-1",
			title: "Pipeline",
			body: "Body",
			lifecycleState: "article",
		},
		"generated",
		"2026-06-12T12:00:00.000Z",
	);

	assert.equal(updated.pipelineStatus, "generated");
	assert.equal(updated.metadata.pipelineStatus, "generated");
	assert.deepEqual(updated.metadata.pipelineHistory, [
		{ status: "generated", at: "2026-06-12T12:00:00.000Z" },
	]);
});

test("generatePortfolioOutput writes blog pages and colocated feeds", async () => {
	const outDir = await mkdtemp(path.join(os.tmpdir(), "postpunk-portfolio-"));
	try {
		const result = await generatePortfolioOutput(
			[
				{
					id: "article-1",
					title: "First Article",
					body: "# Hello\n\nThis came from PostPunk.",
					excerpt: "This came from PostPunk.",
					lifecycleState: "article",
					publishDate: "2026-06-01T10:00:00.000Z",
					image: "/assets/title.png",
					tags: ["automation"],
				},
				{
					id: "article-2",
					title: "DEV Article",
					body: "DEV body",
					targets: [{ platform: "devto" }],
					scheduledAt: "2026-06-20T10:00:00.000Z",
				},
				{
					id: "pin-only",
					title: "Pin",
					body: "Not an article",
					targets: [{ platform: "pinterest" }],
				},
			],
			{
				outDir,
				feedConfig,
				generatedAt: "2026-06-12T12:00:00.000Z",
			},
		);

		assert.equal(result.publicArticleCount, 1);
		assert.equal(result.articleRecordCount, 2);
		assert.equal(result.devtoArticleCount, 1);

		const index = await readFile(path.join(outDir, "blog", "index.html"), "utf8");
		const article = await readFile(path.join(outDir, "blog", "first-article", "index.html"), "utf8");
		const publicFeed = await readFile(path.join(outDir, "blog", "feed.xml"), "utf8");
		const devtoFeed = await readFile(path.join(outDir, "blog", "devto.xml"), "utf8");

		assert.match(index, /First Article/);
		assert.match(article, /<h1>First Article<\/h1>/);
		assert.match(article, /<img src="\/assets\/title\.png" alt="">/);
		assert.match(publicFeed, /<title>First Article<\/title>/);
		assert.doesNotMatch(publicFeed, /DEV Article/);
		assert.match(devtoFeed, /<title>DEV Article<\/title>/);
	} finally {
		await rm(outDir, { recursive: true, force: true });
	}
});
