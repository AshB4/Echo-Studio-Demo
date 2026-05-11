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
	"intentPrimary",
	"intentSecondary",
	"awarenessStage",
	"headline",
	"headlineVariants",
	"primaryEmotion",
	"secondaryEmotion",
	"curiosityType",
	"specificitySignals",
	"authoritySignals",
	"trustSignals",
	"patternInterruptType",
	"hookType",
	"contentIntent",
	"saveIntent",
	"shareIntent",
	"thumbnailConcept",
	"firstLine",
	"platformOptimizations",
	"ctrScore",
	"clarityScore",
	"trustScore",
	"curiosityScore",
	"saveScore",
	"shareScore",
	"painProximity",
	"commercialityScore",
	"emotionTags",
	"identityTags",
	"queryChainDepth",
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
	"jtbd",
	"pinAngle",
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

function toInteger(value) {
	const numeric = toNumber(value);
	return numeric === null ? null : Math.trunc(numeric);
}

function toIntentTags(value) {
	return toStringArray(value);
}

function toPlainObject(value) {
	if (value === null || value === undefined || Array.isArray(value) || typeof value !== "object") {
		return null;
	}
	const entries = Object.entries(value).filter(([, nestedValue]) => {
		if (nestedValue === null || nestedValue === undefined) return false;
		if (typeof nestedValue === "string") return nestedValue.trim().length > 0;
		if (Array.isArray(nestedValue)) return nestedValue.length > 0;
		return true;
	});
	return entries.length > 0 ? Object.fromEntries(entries) : null;
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
		intentPrimary: toCleanString(source.intentPrimary),
		intentSecondary: toCleanString(source.intentSecondary),
		awarenessStage: toCleanString(source.awarenessStage),
		headline: toCleanString(source.headline),
		headlineVariants: toStringArray(source.headlineVariants),
		primaryEmotion: toCleanString(source.primaryEmotion),
		secondaryEmotion: toCleanString(source.secondaryEmotion),
		curiosityType: toCleanString(source.curiosityType),
		specificitySignals: toPlainObject(source.specificitySignals),
		authoritySignals: toStringArray(source.authoritySignals),
		trustSignals: toStringArray(source.trustSignals),
		patternInterruptType: toCleanString(source.patternInterruptType),
		hookType: toCleanString(source.hookType),
		contentIntent: toCleanString(source.contentIntent),
		saveIntent: toCleanString(source.saveIntent),
		shareIntent: toCleanString(source.shareIntent),
		thumbnailConcept: toCleanString(source.thumbnailConcept),
		firstLine: toCleanString(source.firstLine),
		platformOptimizations: toPlainObject(source.platformOptimizations),
		ctrScore: toNumber(source.ctrScore),
		clarityScore: toNumber(source.clarityScore),
		trustScore: toNumber(source.trustScore),
		curiosityScore: toNumber(source.curiosityScore),
		saveScore: toNumber(source.saveScore),
		shareScore: toNumber(source.shareScore),
		painProximity: toNumber(source.painProximity),
		commercialityScore: toNumber(source.commercialityScore),
		emotionTags: toIntentTags(source.emotionTags),
		identityTags: toIntentTags(source.identityTags),
		queryChainDepth: toInteger(source.queryChainDepth),
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
		jtbd: toCleanString(source.jtbd),
		pinAngle: toCleanString(source.pinAngle),
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
