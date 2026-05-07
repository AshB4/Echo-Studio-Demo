export const CONTENT_LIFECYCLE_STATES = [
	"seed",
	"fragment",
	"note",
	"experiment",
	"article",
	"syndicated",
	"refreshed",
	"archived",
];

export const CONTENT_LIFECYCLE_SET = new Set(CONTENT_LIFECYCLE_STATES);

export const CONTENT_METADATA_FIELDS = [
	"searchIntent",
	"evergreenScore",
	"contentHalfLife",
	"artifactType",
	"audienceStage",
	"problemType",
	"canonicalSource",
	"syndicationTargets",
	"repurposePriority",
	"relatedContent",
	"series",
	"tags",
];

export const CONTENT_LINEAGE_RELATIONSHIPS = [
	"originalSource",
	"variants",
	"syndicatedVersions",
	"pinterestVariants",
	"redditDiscussionVersions",
	"devtoVersions",
	"astroCanonicalSource",
];

function toCleanString(value) {
	if (value === null || value === undefined) return null;
	const normalized = String(value).trim();
	return normalized.length > 0 ? normalized : null;
}

function toStringArray(value) {
	if (value === null || value === undefined) return [];
	const list = Array.isArray(value) ? value : [value];
	return list
		.flatMap((item) => (Array.isArray(item) ? item : [item]))
		.map((item) => toCleanString(item))
		.filter(Boolean);
}

function toNumber(value) {
	if (value === null || value === undefined || value === "") return null;
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : null;
}

export function normalizeContentState(value, fallback = "seed") {
	const normalized = String(value || "")
		.trim()
		.toLowerCase();
	return CONTENT_LIFECYCLE_SET.has(normalized) ? normalized : fallback;
}

export function normalizeContentMetadata(metadata = {}, overrides = {}) {
	const source = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
	const canonicalSource = toCleanString(overrides.canonicalSource ?? source.canonicalSource);
	const normalized = {
		searchIntent: toCleanString(source.searchIntent),
		evergreenScore: toNumber(source.evergreenScore),
		contentHalfLife: toCleanString(source.contentHalfLife),
		artifactType: toCleanString(source.artifactType),
		audienceStage: toCleanString(source.audienceStage),
		problemType: toCleanString(source.problemType),
		canonicalSource,
		syndicationTargets: toStringArray(source.syndicationTargets),
		repurposePriority: toNumber(source.repurposePriority),
		relatedContent: toStringArray(source.relatedContent),
		series: toCleanString(source.series),
		tags: toStringArray(source.tags),
	};

	return Object.fromEntries(
		Object.entries(normalized).filter(([, value]) => {
			if (value === null) return false;
			if (Array.isArray(value)) return value.length > 0;
			return true;
		}),
	);
}

export function normalizeContentLineage(lineage = {}, overrides = {}) {
	const source = lineage && typeof lineage === "object" && !Array.isArray(lineage) ? lineage : {};
	const normalized = {
		originalSource: toCleanString(source.originalSource),
		variants: toStringArray(source.variants),
		syndicatedVersions: toStringArray(source.syndicatedVersions),
		pinterestVariants: toStringArray(source.pinterestVariants),
		redditDiscussionVersions: toStringArray(source.redditDiscussionVersions),
		devtoVersions: toStringArray(source.devtoVersions),
		astroCanonicalSource: toCleanString(
			overrides.canonicalSource ?? source.astroCanonicalSource ?? source.originalSource,
		),
	};

	return Object.fromEntries(
		Object.entries(normalized).filter(([, value]) => {
			if (value === null) return false;
			if (Array.isArray(value)) return value.length > 0;
			return true;
		}),
	);
}
