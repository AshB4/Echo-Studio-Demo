import { randomUUID } from "crypto";

export const ASSET_BLUEPRINT_STATUSES = Object.freeze([
	"draft",
	"planned",
	"ready",
	"approved",
	"rejected",
	"archived",
]);

export const DEFAULT_ASSET_BLUEPRINT_STATUS = "draft";

export const DEFAULT_REVIEW_CHECKLIST = Object.freeze([
	"follows brand voice",
	"matches platform rules",
	"clear CTA",
	"correct persona",
	"SEO reviewed",
]);

const STATUS_SET = new Set(ASSET_BLUEPRINT_STATUSES);

export function createAssetBlueprintId() {
	return `ab_${randomUUID()}`;
}

export function isAssetBlueprintStatus(value) {
	return STATUS_SET.has(String(value || ""));
}

export function normalizeAssetBlueprintStatus(
	value,
	fallback = DEFAULT_ASSET_BLUEPRINT_STATUS,
) {
	const status = String(value || "").trim().toLowerCase();
	return isAssetBlueprintStatus(status) ? status : fallback;
}

export function normalizeKnowledgeSources(input = []) {
	if (!Array.isArray(input)) return [];
	return input
		.filter((source) => source && typeof source === "object")
		.map((source) => ({
			sourceId: String(source.sourceId || "").trim(),
			sourceType: String(source.sourceType || "").trim(),
			reason: String(source.reason || "").trim(),
		}))
		.filter((source) => source.sourceType || source.sourceId);
}

export function normalizeGenerationInstructions(input = {}) {
	const value = input && typeof input === "object" && !Array.isArray(input) ? input : {};
	return {
		style: String(value.style || "").trim(),
		length: String(value.length || "").trim(),
		format: String(value.format || "").trim(),
		specialRequirements: Array.isArray(value.specialRequirements)
			? value.specialRequirements.map((item) => String(item || "").trim()).filter(Boolean)
			: [],
	};
}

export function normalizeReviewChecklist(input = null) {
	if (!Array.isArray(input)) return [...DEFAULT_REVIEW_CHECKLIST];
	return input.map((item) => String(item || "").trim()).filter(Boolean);
}

export function buildAssetBlueprint(input = {}, options = {}) {
	const now = options.now || new Date().toISOString();
	return {
		id: input.id || createAssetBlueprintId(),
		campaignPlanId: input.campaignPlanId || null,
		recommendedAssetId: input.recommendedAssetId || null,
		missionId: input.missionId || null,
		knowledgeContextId: input.knowledgeContextId || null,
		status: normalizeAssetBlueprintStatus(input.status),
		assetType: String(input.assetType || "").trim(),
		platform: String(input.platform || "").trim(),
		goal: String(input.goal || "").trim(),
		purpose: String(input.purpose || "").trim(),
		audience: String(input.audience || "").trim(),
		persona: String(input.persona || "").trim(),
		tone: String(input.tone || "").trim(),
		hookStrategy: String(input.hookStrategy || "").trim(),
		ctaStrategy: String(input.ctaStrategy || "").trim(),
		seoStrategy: String(input.seoStrategy || "").trim(),
		knowledgeSources: normalizeKnowledgeSources(input.knowledgeSources),
		generationInstructions: normalizeGenerationInstructions(input.generationInstructions),
		reviewChecklist: normalizeReviewChecklist(input.reviewChecklist),
		metadata:
			input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
				? input.metadata
				: {},
		createdAt: input.createdAt || now,
		updatedAt: input.updatedAt || now,
	};
}

