import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({ html: false, linkify: true });

export const DEFAULT_FEED_CONFIG = {
	siteUrl: "https://ashb4.github.io/blog",
	publicFeedPath: "/feed.xml",
	devtoFeedPath: "/devto.xml",
	title: "Ash B4 Blog",
	description: "PostPunk-powered articles and publishing notes.",
	language: "en-us",
	owner: "Ash B4",
};

function cleanString(value) {
	if (value === null || value === undefined) return "";
	return String(value).trim();
}

function firstString(...values) {
	for (const value of values) {
		const text = cleanString(value);
		if (text) return text;
	}
	return "";
}

function toArray(value) {
	if (value === null || value === undefined) return [];
	const list = Array.isArray(value) ? value : [value];
	return list
		.flatMap((item) => (Array.isArray(item) ? item : [item]))
		.map((item) => cleanString(item))
		.filter(Boolean);
}

function uniqueStrings(values = []) {
	const seen = new Set();
	const result = [];
	for (const value of values) {
		const key = cleanString(value);
		if (!key || seen.has(key.toLowerCase())) continue;
		seen.add(key.toLowerCase());
		result.push(key);
	}
	return result;
}

function validDate(value) {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function slugify(value) {
	return cleanString(value)
		.toLowerCase()
		.replace(/['"]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function xmlEscape(value) {
	return cleanString(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function cdata(value) {
	return `<![CDATA[${cleanString(value).replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

function htmlToText(value) {
	return cleanString(value)
		.replace(/<[^>]*>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function excerptFromBody(body = "", maxLength = 220) {
	const text = cleanString(body)
		.replace(/^#+\s+/gm, "")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/[*_`>#-]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength - 1).trimEnd()}...`;
}

function platformList(post = {}) {
	const targetPlatforms = toArray(post.targets?.map?.((target) => target?.platform) || []);
	return uniqueStrings([
		...toArray(post.platforms),
		...targetPlatforms,
		...toArray(post.metadata?.syndicationTargets),
	]);
}

function resultUrls(post = {}) {
	const urls = {};
	for (const result of Array.isArray(post.results) ? post.results : []) {
		const platform = cleanString(result?.platform).toLowerCase();
		const url = firstString(result?.result?.url, result?.url, result?.result?.articleUrl);
		if (platform && url) urls[platform] = url;
	}
	return urls;
}

function resultIds(post = {}) {
	const ids = {};
	for (const result of Array.isArray(post.results) ? post.results : []) {
		const platform = cleanString(result?.platform).toLowerCase();
		const id = firstString(
			result?.result?.articleId,
			result?.result?.id,
			result?.articleId,
			result?.id,
		);
		if (platform && id) ids[platform] = id;
	}
	return ids;
}

function externalUrls(post = {}) {
	return {
		...(post.metadata?.externalUrls || {}),
		...(post.externalUrls || {}),
		...resultUrls(post),
	};
}

function postDate(post = {}) {
	return (
		validDate(post.publishDate) ||
		validDate(post.publishedAt) ||
		validDate(post.processedAt) ||
		validDate(post.scheduledAt) ||
		validDate(post.createdAt) ||
		validDate(post.updatedAt) ||
		new Date()
	);
}

function postStatus(post = {}) {
	return cleanString(post.status || post.metadata?.status).toLowerCase();
}

function isPostedLike(post = {}) {
	const status = postStatus(post);
	const lifecycleState = cleanString(post.lifecycleState || post.metadata?.lifecycleState).toLowerCase();
	return ["posted", "published", "sent"].includes(status) || lifecycleState === "syndicated";
}

function articleBody(post = {}) {
	return firstString(post.body, post.content, post.markdown, post.description);
}

function isArticleCandidate(post = {}, feedType = "public") {
	const title = cleanString(post.title);
	const body = articleBody(post);
	if (!title || !body) return false;

	const platforms = platformList(post).map((platform) => platform.toLowerCase());
	const lifecycleState = cleanString(post.lifecycleState || post.metadata?.lifecycleState).toLowerCase();
	const artifactType = cleanString(post.metadata?.artifactType).toLowerCase();
	const distributionTags = toArray(post.metadata?.distributionTags).map((tag) => tag.toLowerCase());

	if (feedType === "devto") {
		return platforms.includes("devto") || distributionTags.includes("post:devto");
	}

	return (
		lifecycleState === "article" ||
		lifecycleState === "syndicated" ||
		artifactType.includes("article") ||
		platforms.includes("devto") ||
		distributionTags.includes("post:devto")
	);
}

export function buildCanonicalUrl(post = {}, config = DEFAULT_FEED_CONFIG) {
	const explicit = firstString(
		post.canonicalUrl,
		post.canonicalURL,
		post.metadata?.canonicalUrl,
		post.metadata?.canonicalURL,
		post.metadata?.canonicalSource,
		post.canonicalSource,
	);
	if (explicit) return explicit;

	const siteUrl = cleanString(config.siteUrl).replace(/\/+$/, "");
	return buildGeneratedCanonicalUrl(post, { ...config, siteUrl });
}

export function buildGeneratedCanonicalUrl(post = {}, config = DEFAULT_FEED_CONFIG) {
	const slug = firstString(post.slug, post.metadata?.slug, slugify(post.title || post.id));
	const siteUrl = cleanString(config.siteUrl).replace(/\/+$/, "");
	return slug ? `${siteUrl}/${slug}/` : siteUrl;
}

export function backfillSyndicationMetadataForArticle(post = {}, options = {}) {
	const config = { ...DEFAULT_FEED_CONFIG, ...(options.config || {}) };
	const platforms = platformList(post).map((platform) => platform.toLowerCase());
	const distributionTags = toArray(post.metadata?.distributionTags).map((tag) => tag.toLowerCase());
	const shouldBackfill =
		options.force ||
		platforms.includes("devto") ||
		distributionTags.includes("post:devto") ||
		cleanString(post.lifecycleState || post.metadata?.lifecycleState).toLowerCase() === "article";
	if (!shouldBackfill || !cleanString(post.title) || !articleBody(post)) {
		return post;
	}

	const generatedCanonical = buildGeneratedCanonicalUrl(post, config);
	const currentCanonical = firstString(
		post.canonicalUrl,
		post.canonicalURL,
		post.metadata?.canonicalUrl,
		post.metadata?.canonicalURL,
		post.metadata?.canonicalSource,
		post.canonicalSource,
	);
	const siteUrl = cleanString(config.siteUrl).replace(/\/+$/, "");
	const refreshGeneratedCanonical =
		options.refreshGeneratedCanonicals && currentCanonical.startsWith(`${siteUrl}/`);
	const canonicalUrl = refreshGeneratedCanonical
		? generatedCanonical
		: firstString(currentCanonical, generatedCanonical);
	const article = normalizeArticleForRss(
		{
			...post,
			canonicalUrl,
		},
		{ config },
	);
	const metadata = { ...(post.metadata || {}) };
	const external = { ...(metadata.externalUrls || {}), ...(post.externalUrls || {}) };
	for (const [platform, url] of Object.entries(article.externalUrls || {})) {
		if (url) external[platform] = url;
	}
	const platformIds = { ...(metadata.platformIds || {}), ...(post.platformIds || {}) };
	for (const [platform, id] of Object.entries(article.platformIds || {})) {
		if (id) platformIds[platform] = id;
	}

	const syndicationTargets = uniqueStrings([
		...toArray(metadata.syndicationTargets),
		...platforms,
	]).filter((platform) => ["devto", "medium", "substack"].includes(platform.toLowerCase()));

	return {
		...post,
		canonicalUrl,
		excerpt: firstString(post.excerpt, article.excerpt),
		publishDate: firstString(post.publishDate, article.publishDate),
		metadata: {
			...metadata,
			canonicalUrl,
			excerpt: firstString(metadata.excerpt, post.excerpt, article.excerpt),
			publishDate: firstString(metadata.publishDate, post.publishDate, article.publishDate),
			syndicationStatus: firstString(metadata.syndicationStatus, post.syndicationStatus, "ready"),
			...(Object.keys(external).length ? { externalUrls: external } : {}),
			...(Object.keys(platformIds).length ? { platformIds } : {}),
			...(syndicationTargets.length ? { syndicationTargets } : {}),
		},
	};
}

export function normalizeArticleForRss(post = {}, options = {}) {
	const config = { ...DEFAULT_FEED_CONFIG, ...(options.config || {}) };
	const body = articleBody(post);
	const canonicalUrl = buildCanonicalUrl(post, config);
	const urls = externalUrls(post);
	const platformIds = {
		...(post.metadata?.platformIds || {}),
		...(post.platformIds || {}),
		...resultIds(post),
	};
	const platforms = platformList(post);
	const tags = uniqueStrings([
		...toArray(post.tags),
		...toArray(post.hashtags).map((tag) => tag.replace(/^#/, "")),
		...toArray(post.metadata?.tags),
		...toArray(post.metadata?.contentTags),
	]);
	const html = markdown.render(body);
	const status = firstString(
		post.syndicationStatus,
		post.metadata?.syndicationStatus,
		post.status,
	);

	return {
		id: firstString(post.id, canonicalUrl),
		title: firstString(post.title, "Untitled"),
		excerpt: firstString(post.excerpt, post.description, post.metadata?.excerpt, excerptFromBody(body)),
		body,
		html,
		publishDate: postDate(post).toISOString(),
		tags,
		canonicalUrl,
		externalUrls: urls,
		platformIds,
		syndicationStatus: status,
		platforms,
		image: firstString(post.image, post.mediaPath),
		link: firstString(options.linkUrl, urls[options.linkPlatform], canonicalUrl),
	};
}

export function selectRssArticles(posts = [], options = {}) {
	const feedType = options.feedType || "public";
	const nowMs = Date.parse(options.now || options.generatedAt || Date.now());
	return posts
		.filter((post) => isArticleCandidate(post, feedType))
		.filter((post) => {
			if (feedType !== "public") return true;
			if (isPostedLike(post)) return true;
			return postDate(post).getTime() <= nowMs;
		})
		.map((post) => normalizeArticleForRss(post, options))
		.sort((left, right) => Date.parse(right.publishDate) - Date.parse(left.publishDate));
}

function rssItemXml(item = {}) {
	const categories = toArray(item.tags)
		.map((tag) => `      <category>${xmlEscape(tag)}</category>`)
		.join("\n");
	const externalLinks = Object.entries(item.externalUrls || {})
		.map(([platform, url]) => `      <postpunk:externalUrl platform="${xmlEscape(platform)}">${xmlEscape(url)}</postpunk:externalUrl>`)
		.join("\n");
	const platformIds = Object.entries(item.platformIds || {})
		.map(([platform, id]) => `      <postpunk:platformId platform="${xmlEscape(platform)}">${xmlEscape(id)}</postpunk:platformId>`)
		.join("\n");
	const platforms = toArray(item.platforms)
		.map((platform) => `      <postpunk:platform>${xmlEscape(platform)}</postpunk:platform>`)
		.join("\n");

	return [
		"    <item>",
		`      <title>${xmlEscape(item.title)}</title>`,
		`      <link>${xmlEscape(item.link || item.canonicalUrl)}</link>`,
		`      <guid isPermaLink="false">${xmlEscape(item.id || item.canonicalUrl)}</guid>`,
		`      <pubDate>${new Date(item.publishDate).toUTCString()}</pubDate>`,
		`      <description>${cdata(item.excerpt)}</description>`,
		`      <content:encoded>${cdata(item.html)}</content:encoded>`,
		`      <postpunk:canonicalUrl>${xmlEscape(item.canonicalUrl)}</postpunk:canonicalUrl>`,
		`      <postpunk:syndicationStatus>${xmlEscape(item.syndicationStatus)}</postpunk:syndicationStatus>`,
		item.image ? `      <postpunk:image>${xmlEscape(item.image)}</postpunk:image>` : "",
		categories,
		platforms,
		externalLinks,
		platformIds,
		"    </item>",
	].filter(Boolean).join("\n");
}

export function buildRssFeedXml(articles = [], options = {}) {
	const config = { ...DEFAULT_FEED_CONFIG, ...(options.config || {}) };
	const now = new Date(options.generatedAt || Date.now());
	const siteUrl = cleanString(config.siteUrl).replace(/\/+$/, "");
	const feedPath = options.feedPath || config.publicFeedPath;
	const feedUrl = /^https?:\/\//i.test(feedPath) ? feedPath : `${siteUrl}${feedPath.startsWith("/") ? "" : "/"}${feedPath}`;
	const items = articles.map((item) => rssItemXml(item)).join("\n");

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:postpunk="https://postpunk.local/rss/ns#">',
		"  <channel>",
		`    <title>${xmlEscape(config.title)}</title>`,
		`    <link>${xmlEscape(siteUrl)}</link>`,
		`    <description>${xmlEscape(config.description)}</description>`,
		`    <language>${xmlEscape(config.language)}</language>`,
		`    <lastBuildDate>${now.toUTCString()}</lastBuildDate>`,
		`    <atom:link href="${xmlEscape(feedUrl)}" rel="self" type="application/rss+xml" />`,
		`    <generator>PostPunk RSS Syndication</generator>`,
		items,
		"  </channel>",
		"</rss>",
		"",
	].filter((line) => line !== "").join("\n") + "\n";
}

export function buildFeedsFromPosts(posts = [], options = {}) {
	const config = { ...DEFAULT_FEED_CONFIG, ...(options.config || {}) };
	const publicArticles = selectRssArticles(posts, {
		config,
		feedType: "public",
		generatedAt: options.generatedAt,
	});
	const devtoArticles = selectRssArticles(posts, {
		config,
		feedType: "devto",
		generatedAt: options.generatedAt,
	});

	return {
		public: buildRssFeedXml(publicArticles, {
			config,
			feedPath: config.publicFeedPath,
			generatedAt: options.generatedAt,
		}),
		devto: buildRssFeedXml(devtoArticles, {
			config: {
				...config,
				title: `${config.title} DEV Import`,
				description: `DEV import feed for ${config.title}.`,
			},
			feedPath: config.devtoFeedPath,
			generatedAt: options.generatedAt,
		}),
		publicArticles,
		devtoArticles,
	};
}
