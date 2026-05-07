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
	});

	assert.deepEqual(metadata, {
		searchIntent: "how to structure evergreen content",
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
			artifactType: "guide",
			tags: ["postpunk", "astro"],
			series: "discoverability-ops",
			relatedContent: ["canonical-strategy"],
			syndicationTargets: ["devto", "pinterest"],
		},
		lineage: {
			originalSource: "postpunk-discoverability-model",
			devtoVersions: ["devto:456"],
		},
	});

	assert.equal(frontmatter.state, "article");
	assert.equal(frontmatter.canonicalURL, "https://archive.example.com/postpunk/discoverability-model");
	assert.deepEqual(frontmatter.tags, ["postpunk", "astro"]);
	assert.deepEqual(frontmatter.syndicationTargets, ["devto", "pinterest"]);
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
