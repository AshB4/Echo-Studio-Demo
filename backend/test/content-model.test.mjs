import test from "node:test";
import assert from "node:assert/strict";
import {
	normalizeContentLineage,
	normalizeContentMetadata,
	normalizeContentState,
} from "../utils/contentModel.mjs";
import { buildAstroFrontmatter, buildAstroMarkdownDocument } from "../utils/astroMarkdownExport.mjs";

test("normalizeContentState supports lifecycle-aware content progression", () => {
	assert.equal(normalizeContentState("experiment"), "experiment");
	assert.equal(normalizeContentState("ARTICLE"), "article");
	assert.equal(normalizeContentState("queued"), "seed");
});

test("normalizeContentMetadata keeps RSS syndication fields centralized", () => {
	const metadata = normalizeContentMetadata({
		canonicalUrl: "https://ashb4.github.io/blog/postpunk-rss/",
		excerpt: "RSS generated from PostPunk metadata.",
		publishDate: "2026-06-12T15:00:00.000Z",
		externalUrls: {
			devto: "https://dev.to/ashb4/postpunk-rss",
			medium: "",
		},
		syndicationStatus: "ready",
		platformIds: {
			devto: 456,
		},
	});

	assert.deepEqual(metadata, {
		canonicalUrl: "https://ashb4.github.io/blog/postpunk-rss/",
		excerpt: "RSS generated from PostPunk metadata.",
		publishDate: "2026-06-12T15:00:00.000Z",
		externalUrls: {
			devto: "https://dev.to/ashb4/postpunk-rss",
		},
		syndicationStatus: "ready",
		platformIds: {
			devto: 456,
		},
	});
});

test("normalizeContentMetadata keeps discoverability fields compact and consistent", () => {
	const metadata = normalizeContentMetadata({
		searchIntent: "how to structure evergreen content",
		intentPrimary: "problem",
		intentSecondary: "identity",
		awarenessStage: "evaluation",
		headline: "How I Structure Evergreen Content",
		headlineVariants: ["Evergreen Content Structure"],
		primaryEmotion: "clarity",
		secondaryEmotion: "control",
		curiosityType: "process",
		specificitySignals: { number: true, platform: true },
		authoritySignals: ["real workflow"],
		trustSignals: ["screenshots"],
		patternInterruptType: "contrarian opener",
		hookType: "process",
		contentIntent: "educate",
		saveIntent: "template",
		shareIntent: "reference",
		thumbnailConcept: "clean checklist",
		firstLine: "Most evergreen systems are messy before they work.",
		platformOptimizations: { Pinterest: { hook: "save this" } },
		ctrScore: "82",
		clarityScore: "77",
		trustScore: "74",
		curiosityScore: "61",
		saveScore: "88",
		shareScore: "55",
		identityArchetype: "desk optimizer",
		ecosystemCluster: "cozy productivity",
		futureSelfSignal: "works with less friction",
		saveReason: "Reusable organization tool",
		utilityType: "organization-tool",
		discoveryScore: "8",
		retailCommonalityScore: "2",
		rabbitHoleScore: "7",
		visualClarityScore: "9",
		savePotentialScore: "8",
		amazonDiscoveryScore: "6",
		seasonalityScore: "4",
		landingPageMatchScore: "9",
		landingPageMatchReason: "matches product page",
		productFitScore: "8",
		productFitState: "recommended",
		productFitReasons: ["cluster:cozy productivity"],
		productFitRecommended: true,
		productFitBlocked: false,
		painProximity: "8",
		commercialityScore: "6",
		emotionTags: ["frustrated", "curious"],
		identityTags: ["developer", "indie hacker"],
		queryChainDepth: "4",
		evergreenScore: "87",
		contentHalfLife: "18 months",
		artifactType: "architecture-note",
		audienceStage: "consideration",
		problemType: "discoverability",
		syndicationTargets: ["pinterest", "devto"],
		repurposePriority: "4",
		relatedContent: ["astro-canonicals", "internal-linking"],
		series: "publishing-ops",
		tags: ["seo", "evergreen"],
		jtbd: "understand evergreen architecture",
		pinAngle: "problem-first",
		headline: "How I Structure Evergreen Content",
		headlineVariants: ["Evergreen Content Structure"],
		primaryEmotion: "clarity",
		secondaryEmotion: "control",
		curiosityType: "process",
		specificitySignals: { number: true, platform: true },
		authoritySignals: ["real workflow"],
		trustSignals: ["screenshots"],
		patternInterruptType: "contrarian opener",
		hookType: "process",
		contentIntent: "educate",
		saveIntent: "template",
		shareIntent: "reference",
		thumbnailConcept: "clean checklist",
		firstLine: "Most evergreen systems are messy before they work.",
		platformOptimizations: { Pinterest: { hook: "save this" } },
		ctrScore: 82,
		clarityScore: 77,
		trustScore: 74,
		curiosityScore: 61,
		saveScore: 88,
		shareScore: 55,
		identityArchetype: "desk optimizer",
		ecosystemCluster: "cozy productivity",
		futureSelfSignal: "works with less friction",
		saveReason: "Reusable organization tool",
		utilityType: "organization-tool",
		discoveryScore: 8,
		retailCommonalityScore: 2,
		rabbitHoleScore: 7,
		visualClarityScore: 9,
		savePotentialScore: 8,
		amazonDiscoveryScore: 6,
		seasonalityScore: 4,
		landingPageMatchScore: 9,
		landingPageMatchReason: "matches product page",
		productFitScore: 8,
		productFitState: "recommended",
		productFitReasons: ["cluster:cozy productivity"],
		productFitRecommended: true,
		productFitBlocked: false,
	});

	assert.deepEqual(metadata, {
		searchIntent: "how to structure evergreen content",
		intentPrimary: "problem",
		intentSecondary: "identity",
		awarenessStage: "evaluation",
		headline: "How I Structure Evergreen Content",
		headlineVariants: ["Evergreen Content Structure"],
		primaryEmotion: "clarity",
		secondaryEmotion: "control",
		curiosityType: "process",
		specificitySignals: { number: true, platform: true },
		authoritySignals: ["real workflow"],
		trustSignals: ["screenshots"],
		patternInterruptType: "contrarian opener",
		hookType: "process",
		contentIntent: "educate",
		saveIntent: "template",
		shareIntent: "reference",
		thumbnailConcept: "clean checklist",
		firstLine: "Most evergreen systems are messy before they work.",
		platformOptimizations: { Pinterest: { hook: "save this" } },
		ctrScore: 82,
		clarityScore: 77,
		trustScore: 74,
		curiosityScore: 61,
		saveScore: 88,
		shareScore: 55,
		identityArchetype: "desk optimizer",
		ecosystemCluster: "cozy productivity",
		futureSelfSignal: "works with less friction",
		saveReason: "Reusable organization tool",
		utilityType: "organization-tool",
		discoveryScore: 8,
		retailCommonalityScore: 2,
		rabbitHoleScore: 7,
		visualClarityScore: 9,
		savePotentialScore: 8,
		amazonDiscoveryScore: 6,
		seasonalityScore: 4,
		landingPageMatchScore: 9,
		landingPageMatchReason: "matches product page",
		productFitScore: 8,
		productFitState: "recommended",
		productFitReasons: ["cluster:cozy productivity"],
		productFitRecommended: true,
		productFitBlocked: false,
		painProximity: 8,
		commercialityScore: 6,
		emotionTags: ["frustrated", "curious"],
		identityTags: ["developer", "indie hacker"],
		queryChainDepth: 4,
		evergreenScore: 87,
		contentHalfLife: "18 months",
		artifactType: "architecture-note",
		audienceStage: "consideration",
		problemType: "discoverability",
		syndicationTargets: ["pinterest", "devto"],
		repurposePriority: 4,
		relatedContent: ["astro-canonicals", "internal-linking"],
		series: "publishing-ops",
		tags: ["seo", "evergreen"],
		jtbd: "understand evergreen architecture",
		pinAngle: "problem-first",
		headline: "How I Structure Evergreen Content",
		headlineVariants: ["Evergreen Content Structure"],
		primaryEmotion: "clarity",
		secondaryEmotion: "control",
		curiosityType: "process",
		specificitySignals: { number: true, platform: true },
		authoritySignals: ["real workflow"],
		trustSignals: ["screenshots"],
		patternInterruptType: "contrarian opener",
		hookType: "process",
		contentIntent: "educate",
		saveIntent: "template",
		shareIntent: "reference",
		thumbnailConcept: "clean checklist",
		firstLine: "Most evergreen systems are messy before they work.",
		platformOptimizations: { Pinterest: { hook: "save this" } },
		ctrScore: 82,
		clarityScore: 77,
		trustScore: 74,
		curiosityScore: 61,
		saveScore: 88,
		shareScore: 55,
		identityArchetype: "desk optimizer",
		ecosystemCluster: "cozy productivity",
		futureSelfSignal: "works with less friction",
		saveReason: "Reusable organization tool",
		utilityType: "organization-tool",
		discoveryScore: 8,
		retailCommonalityScore: 2,
		rabbitHoleScore: 7,
		visualClarityScore: 9,
		savePotentialScore: 8,
		amazonDiscoveryScore: 6,
		seasonalityScore: 4,
		landingPageMatchScore: 9,
		landingPageMatchReason: "matches product page",
		productFitScore: 8,
		productFitState: "recommended",
		productFitReasons: ["cluster:cozy productivity"],
		productFitRecommended: true,
		productFitBlocked: false,
	});
});

test("normalizeContentLineage tracks canonical-aware derivatives", () => {
	const lineage = normalizeContentLineage(
		{
			originalSource: "postpunk-discoverability-system",
			variants: ["postpunk-devto"],
			pinterestVariants: ["pin-a", "pin-b"],
			devtoVersions: ["devto-123"],
		},
		{ canonicalSource: "https://archive.example.com/postpunk-discoverability-system" },
	);

	assert.deepEqual(lineage, {
		originalSource: "postpunk-discoverability-system",
		variants: ["postpunk-devto"],
		pinterestVariants: ["pin-a", "pin-b"],
		devtoVersions: ["devto-123"],
		astroCanonicalSource: "https://archive.example.com/postpunk-discoverability-system",
	});
});

test("buildAstroFrontmatter emits metadata Astro can consume directly", () => {
	const frontmatter = buildAstroFrontmatter({
		title: "PostPunk Discoverability Model",
		description: "Lifecycle-aware publishing operations for Astro archives.",
		lifecycleState: "article",
		canonicalSource: "https://archive.example.com/postpunk/discoverability-model",
		metadata: {
			searchIntent: "discoverability operations system",
			intentPrimary: "problem",
			intentSecondary: "solution",
			awarenessStage: "evaluation",
			headline: "How I Structure Evergreen Content",
			headlineVariants: ["Evergreen Content Structure"],
			primaryEmotion: "clarity",
			secondaryEmotion: "control",
			curiosityType: "process",
			specificitySignals: { number: true, platform: true },
			authoritySignals: ["real workflow"],
			trustSignals: ["screenshots"],
			patternInterruptType: "contrarian opener",
			hookType: "process",
			contentIntent: "educate",
			saveIntent: "template",
			shareIntent: "reference",
			thumbnailConcept: "clean checklist",
			firstLine: "Most evergreen systems are messy before they work.",
			platformOptimizations: { Pinterest: { hook: "save this" } },
			ctrScore: 82,
			clarityScore: 77,
			trustScore: 74,
			curiosityScore: 61,
			saveScore: 88,
			shareScore: 55,
			identityArchetype: "desk optimizer",
			ecosystemCluster: "cozy productivity",
			futureSelfSignal: "works with less friction",
			saveReason: "Reusable organization tool",
			utilityType: "organization-tool",
			discoveryScore: 8,
			retailCommonalityScore: 2,
			rabbitHoleScore: 7,
			visualClarityScore: 9,
			savePotentialScore: 8,
			amazonDiscoveryScore: 6,
			seasonalityScore: 4,
			landingPageMatchScore: 9,
			landingPageMatchReason: "matches product page",
			productFitScore: 8,
			productFitState: "recommended",
			productFitReasons: ["cluster:cozy productivity"],
			productFitRecommended: true,
			productFitBlocked: false,
			painProximity: 7,
			commercialityScore: 5,
			emotionTags: ["clarity", "control"],
			identityTags: ["indie hacker", "builder"],
			queryChainDepth: 3,
			artifactType: "guide",
			tags: ["postpunk", "astro"],
			series: "discoverability-ops",
			relatedContent: ["canonical-strategy"],
			syndicationTargets: ["devto", "pinterest"],
			jtbd: "understand the publishing system",
			pinAngle: "beginner",
		},
		lineage: {
			originalSource: "postpunk-discoverability-model",
			devtoVersions: ["devto:456"],
		},
	});

	assert.equal(frontmatter.state, "article");
	assert.equal(frontmatter.canonicalURL, "https://archive.example.com/postpunk/discoverability-model");
	assert.equal(frontmatter.intentPrimary, "problem");
	assert.equal(frontmatter.intentSecondary, "solution");
	assert.equal(frontmatter.awarenessStage, "evaluation");
	assert.equal(frontmatter.headline, "How I Structure Evergreen Content");
	assert.deepEqual(frontmatter.headlineVariants, ["Evergreen Content Structure"]);
	assert.equal(frontmatter.primaryEmotion, "clarity");
	assert.equal(frontmatter.secondaryEmotion, "control");
	assert.equal(frontmatter.curiosityType, "process");
	assert.deepEqual(frontmatter.specificitySignals, { number: true, platform: true });
	assert.deepEqual(frontmatter.authoritySignals, ["real workflow"]);
	assert.deepEqual(frontmatter.trustSignals, ["screenshots"]);
	assert.equal(frontmatter.patternInterruptType, "contrarian opener");
	assert.equal(frontmatter.hookType, "process");
	assert.equal(frontmatter.contentIntent, "educate");
	assert.equal(frontmatter.saveIntent, "template");
	assert.equal(frontmatter.shareIntent, "reference");
	assert.equal(frontmatter.thumbnailConcept, "clean checklist");
	assert.equal(frontmatter.firstLine, "Most evergreen systems are messy before they work.");
	assert.deepEqual(frontmatter.platformOptimizations, { Pinterest: { hook: "save this" } });
	assert.equal(frontmatter.ctrScore, 82);
	assert.equal(frontmatter.clarityScore, 77);
	assert.equal(frontmatter.trustScore, 74);
	assert.equal(frontmatter.curiosityScore, 61);
	assert.equal(frontmatter.saveScore, 88);
	assert.equal(frontmatter.shareScore, 55);
	assert.equal(frontmatter.identityArchetype, "desk optimizer");
	assert.equal(frontmatter.ecosystemCluster, "cozy productivity");
	assert.equal(frontmatter.futureSelfSignal, "works with less friction");
	assert.equal(frontmatter.saveReason, "Reusable organization tool");
	assert.equal(frontmatter.utilityType, "organization-tool");
	assert.equal(frontmatter.discoveryScore, 8);
	assert.equal(frontmatter.retailCommonalityScore, 2);
	assert.equal(frontmatter.rabbitHoleScore, 7);
	assert.equal(frontmatter.visualClarityScore, 9);
	assert.equal(frontmatter.savePotentialScore, 8);
	assert.equal(frontmatter.amazonDiscoveryScore, 6);
	assert.equal(frontmatter.seasonalityScore, 4);
	assert.equal(frontmatter.landingPageMatchScore, 9);
	assert.equal(frontmatter.landingPageMatchReason, "matches product page");
	assert.equal(frontmatter.productFitScore, 8);
	assert.equal(frontmatter.productFitState, "recommended");
	assert.deepEqual(frontmatter.productFitReasons, ["cluster:cozy productivity"]);
	assert.equal(frontmatter.productFitRecommended, true);
	assert.equal(frontmatter.productFitBlocked, false);
	assert.equal(frontmatter.painProximity, 7);
	assert.equal(frontmatter.commercialityScore, 5);
	assert.deepEqual(frontmatter.emotionTags, ["clarity", "control"]);
	assert.deepEqual(frontmatter.identityTags, ["indie hacker", "builder"]);
	assert.equal(frontmatter.queryChainDepth, 3);
	assert.deepEqual(frontmatter.tags, ["postpunk", "astro"]);
	assert.deepEqual(frontmatter.syndicationTargets, ["devto", "pinterest"]);
	assert.equal(frontmatter.jtbd, "understand the publishing system");
	assert.equal(frontmatter.pinAngle, "beginner");
	assert.equal(frontmatter.lineage.originalSource, "postpunk-discoverability-model");
});

test("buildAstroMarkdownDocument renders YAML frontmatter plus body", () => {
	const document = buildAstroMarkdownDocument({
		title: "Evergreen Refresh Playbook",
		body: "Body copy for Astro.",
		lifecycleState: "refreshed",
		canonicalSource: "https://archive.example.com/evergreen-refresh-playbook",
		metadata: {
			tags: ["evergreen", "refresh"],
			relatedContent: ["evergreen-audit"],
		},
	});

	assert.match(document, /^---\n/);
	assert.match(document, /state: "refreshed"/);
	assert.match(document, /canonicalURL: "https:\/\/archive\.example\.com\/evergreen-refresh-playbook"/);
	assert.match(document, /tags:\n  - "evergreen"\n  - "refresh"/);
	assert.match(document, /\nBody copy for Astro\.\n$/);
});
