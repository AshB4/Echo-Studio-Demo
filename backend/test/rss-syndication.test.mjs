import test from "node:test";
import assert from "node:assert/strict";
import {
	backfillSyndicationMetadataForArticle,
	buildFeedsFromPosts,
	buildRssFeedXml,
	normalizeArticleForRss,
	selectRssArticles,
} from "../utils/rssSyndication.mjs";

const config = {
	siteUrl: "https://ashb4.github.io/blog",
	publicFeedPath: "/feed.xml",
	devtoFeedPath: "/devto.xml",
	title: "Ash B4 Blog",
	description: "Articles from PostPunk.",
	language: "en-us",
};

test("normalizeArticleForRss centralizes article metadata from existing post shape", () => {
	const article = normalizeArticleForRss({
		id: "article-1",
		title: "PostPunk RSS",
		body: "# PostPunk RSS\n\nThis is the body.",
		excerpt: "Feed automation from PostPunk.",
		scheduledAt: "2026-06-12T15:00:00.000Z",
		tags: ["rss", "syndication"],
		canonicalUrl: "https://ashb4.github.io/blog/postpunk-rss/",
		platforms: ["devto"],
		metadata: {
			syndicationStatus: "ready",
			externalUrls: {
				medium: "https://medium.com/example/postpunk-rss",
			},
			platformIds: {
				medium: "medium-123",
			},
		},
		results: [
			{
				platform: "devto",
				status: "success",
				result: {
					articleId: 456,
					url: "https://dev.to/ashb4/postpunk-rss",
				},
			},
		],
	}, { config });

	assert.equal(article.title, "PostPunk RSS");
	assert.equal(article.excerpt, "Feed automation from PostPunk.");
	assert.equal(article.canonicalUrl, "https://ashb4.github.io/blog/postpunk-rss/");
	assert.equal(article.externalUrls.devto, "https://dev.to/ashb4/postpunk-rss");
	assert.equal(article.externalUrls.medium, "https://medium.com/example/postpunk-rss");
	assert.equal(article.platformIds.devto, "456");
	assert.equal(article.platformIds.medium, "medium-123");
	assert.equal(article.syndicationStatus, "ready");
	assert.deepEqual(article.tags, ["rss", "syndication"]);
});

test("backfillSyndicationMetadataForArticle prepares older Dev.to records for RSS", () => {
	const updated = backfillSyndicationMetadataForArticle({
		id: "old-devto",
		title: "Older DEV Post",
		body: "This was posted before the RSS system existed.",
		platforms: ["devto"],
		processedAt: "2026-03-31T21:15:43.041Z",
		results: [
			{
				platform: "devto",
				status: "success",
				result: {
					articleId: 3437945,
					url: "https://dev.to/ashb4/older-dev-post",
				},
			},
		],
	}, { config });

	assert.equal(updated.canonicalUrl, "https://ashb4.github.io/blog/older-dev-post/");
	assert.equal(updated.metadata.canonicalUrl, "https://ashb4.github.io/blog/older-dev-post/");
	assert.equal(updated.metadata.externalUrls.devto, "https://dev.to/ashb4/older-dev-post");
	assert.equal(updated.metadata.platformIds.devto, "3437945");
	assert.equal(updated.metadata.syndicationStatus, "ready");
	assert.deepEqual(updated.metadata.syndicationTargets, ["devto"]);
});

test("selectRssArticles creates a DEV feed subset without duplicate article definitions", () => {
	const posts = [
		{
			id: "devto-article",
			title: "DEV Article",
			body: "Long enough body.",
			platforms: ["devto"],
			scheduledAt: "2026-06-12T15:00:00.000Z",
		},
		{
			id: "public-article",
			title: "Public Article",
			body: "Another body.",
			lifecycleState: "article",
			scheduledAt: "2026-06-11T15:00:00.000Z",
		},
	];

	assert.deepEqual(
		selectRssArticles(posts, { config, feedType: "devto", now: "2026-06-13T00:00:00.000Z" }).map((item) => item.id),
		["devto-article"],
	);
	assert.deepEqual(
		selectRssArticles(posts, { config, feedType: "public", now: "2026-06-13T00:00:00.000Z" }).map((item) => item.id),
		["devto-article", "public-article"],
	);
});

test("selectRssArticles keeps future scheduled drafts out of public RSS", () => {
	const posts = [
		{
			id: "future-devto",
			title: "Future DEV Draft",
			body: "This should be available to DEV import but not public RSS yet.",
			platforms: ["devto"],
			status: "approved",
			scheduledAt: "2026-07-01T15:00:00.000Z",
		},
	];

	assert.deepEqual(
		selectRssArticles(posts, { config, feedType: "devto", now: "2026-06-12T00:00:00.000Z" }).map((item) => item.id),
		["future-devto"],
	);
	assert.deepEqual(
		selectRssArticles(posts, { config, feedType: "public", now: "2026-06-12T00:00:00.000Z" }).map((item) => item.id),
		[],
	);
});

test("buildRssFeedXml emits valid RSS structure with canonical and external metadata", () => {
	const article = normalizeArticleForRss({
		id: "article-amp",
		title: "RSS & Syndication",
		body: "A post about RSS & DEV imports.",
		canonicalUrl: "https://ashb4.github.io/blog/rss-syndication/",
		metadata: {
			externalUrls: {
				devto: "https://dev.to/ashb4/rss-syndication",
			},
		},
		scheduledAt: "2026-06-12T15:00:00.000Z",
	}, { config });

	const xml = buildRssFeedXml([article], { config, generatedAt: "2026-06-12T16:00:00.000Z" });

	assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
	assert.match(xml, /<rss version="2.0"/);
	assert.match(xml, /<channel>/);
	assert.match(xml, /<title>RSS &amp; Syndication<\/title>/);
	assert.match(xml, /<postpunk:canonicalUrl>https:\/\/ashb4.github.io\/blog\/rss-syndication\/<\/postpunk:canonicalUrl>/);
	assert.match(xml, /<postpunk:externalUrl platform="devto">https:\/\/dev.to\/ashb4\/rss-syndication<\/postpunk:externalUrl>/);
	assert.match(xml, /<content:encoded><!\[CDATA\[/);
	assert.match(xml, /<\/rss>\n$/);
});

test("buildFeedsFromPosts generates coexisting public and DEV feeds", () => {
	const feeds = buildFeedsFromPosts([
		{
			id: "devto-article",
			title: "DEV Article",
			body: "Long enough body.",
			platforms: ["devto"],
			scheduledAt: "2026-06-12T15:00:00.000Z",
		},
		{
			id: "public-article",
			title: "Public Article",
			body: "Another body.",
			lifecycleState: "article",
			scheduledAt: "2026-06-11T15:00:00.000Z",
		},
	], { config, generatedAt: "2026-06-12T16:00:00.000Z" });

	assert.equal(feeds.publicArticles.length, 2);
	assert.equal(feeds.devtoArticles.length, 1);
	assert.match(feeds.public, /<atom:link href="https:\/\/ashb4.github.io\/blog\/feed.xml"/);
	assert.match(feeds.devto, /<atom:link href="https:\/\/ashb4.github.io\/blog\/devto.xml"/);
});
