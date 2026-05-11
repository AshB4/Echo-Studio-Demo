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
