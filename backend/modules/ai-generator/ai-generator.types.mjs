import { randomUUID } from "crypto";

export const REASONING_LEVELS = Object.freeze(["low", "medium", "high"]);

export const QUALITY_TARGETS = Object.freeze(["draft", "production", "premium"]);

export const AI_PROVIDERS = Object.freeze(["OpenAI", "Anthropic", "Google", "Local"]);

export const CAMPAIGN_ASSET_STATUSES = Object.freeze([
	"draft",
	"generated",
	"review",
	"approved",
	"rejected",
	"published",
	"archived",
]);

export const DEFAULT_CAMPAIGN_ASSET_STATUS = "draft";
export const DEFAULT_SYSTEM_PROMPT_VERSION = "echo-studio-v1";

const STATUS_SET = new Set(CAMPAIGN_ASSET_STATUSES);
const REASONING_SET = new Set(REASONING_LEVELS);
const QUALITY_SET = new Set(QUALITY_TARGETS);
const PROVIDER_SET = new Set(AI_PROVIDERS);

export function createCampaignAssetId() {
	return `ca_${randomUUID()}`;
}

export function isCampaignAssetStatus(value) {
	return STATUS_SET.has(String(value || ""));
}

export function isReasoningLevel(value) {
	return REASONING_SET.has(String(value || ""));
}

export function isQualityTarget(value) {
	return QUALITY_SET.has(String(value || ""));
}

export function isAiProvider(value) {
	return PROVIDER_SET.has(String(value || ""));
}

export function normalizeCampaignAssetStatus(
	value,
	fallback = DEFAULT_CAMPAIGN_ASSET_STATUS,
) {
	const status = String(value || "").trim().toLowerCase();
	return isCampaignAssetStatus(status) ? status : fallback;
}

function includesText(value, text) {
	return String(value || "").toLowerCase().includes(text);
}

function inferBlueprintKind(assetBlueprint = {}) {
	const platform = String(assetBlueprint.platform || "");
	const assetType = String(assetBlueprint.assetType || "");

	if (includesText(platform, "pinterest") || includesText(assetType, "pinterest")) {
		return "pinterest";
	}
	if (includesText(platform, "blog") || includesText(assetType, "blog")) {
		return "blog";
	}
	if (includesText(platform, "dev.to") || includesText(assetType, "devto")) {
		return "blog";
	}
	if (includesText(platform, "email") || includesText(assetType, "email")) {
		return "email";
	}
	if (includesText(platform, "landing") || includesText(assetType, "landing")) {
		return "landingPage";
	}
	return "default";
}

export function normalizeGenerationProfile(input = {}) {
	const profile = input && typeof input === "object" && !Array.isArray(input) ? input : {};
	return {
		model: String(profile.model || "gpt-5.5").trim(),
		reasoningLevel: isReasoningLevel(profile.reasoningLevel) ? profile.reasoningLevel : "medium",
		temperature:
			typeof profile.temperature === "number" && Number.isFinite(profile.temperature)
				? profile.temperature
				: 0.6,
		maxTokens:
			typeof profile.maxTokens === "number" && Number.isFinite(profile.maxTokens)
				? profile.maxTokens
				: 1200,
		creativity: String(profile.creativity || "balanced").trim(),
		voice: String(profile.voice || "Clear and practical").trim(),
		qualityTarget: isQualityTarget(profile.qualityTarget)
			? profile.qualityTarget
			: "production",
		imageModel: String(profile.imageModel || "").trim(),
		provider: isAiProvider(profile.provider) ? profile.provider : "OpenAI",
		systemPromptVersion: String(profile.systemPromptVersion || DEFAULT_SYSTEM_PROMPT_VERSION).trim(),
		metadata:
			profile.metadata && typeof profile.metadata === "object" && !Array.isArray(profile.metadata)
				? profile.metadata
				: {},
	};
}

export function createGenerationProfile(assetBlueprint = {}) {
	const kind = inferBlueprintKind(assetBlueprint);
	const baseProfile = {
		model: "gpt-5.5",
		reasoningLevel: "medium",
		temperature: 0.6,
		maxTokens: 1200,
		creativity: "balanced",
		voice: assetBlueprint.tone || "Clear and practical",
		qualityTarget: "production",
		imageModel: "",
		provider: "OpenAI",
		systemPromptVersion: DEFAULT_SYSTEM_PROMPT_VERSION,
		metadata: {
			generatedFrom: "asset-blueprint",
			assetBlueprintId: assetBlueprint.id || null,
			assetKind: kind,
		},
	};

	if (kind === "pinterest") {
		return normalizeGenerationProfile({
			...baseProfile,
			reasoningLevel: "medium",
			temperature: 0.8,
			maxTokens: 800,
			creativity: "visual",
			qualityTarget: "production",
			imageModel: "gpt-image",
		});
	}

	if (kind === "blog") {
		return normalizeGenerationProfile({
			...baseProfile,
			reasoningLevel: "high",
			temperature: 0.5,
			maxTokens: 2400,
			qualityTarget: "premium",
		});
	}

	if (kind === "email") {
		return normalizeGenerationProfile({
			...baseProfile,
			reasoningLevel: "medium",
			temperature: 0.6,
			maxTokens: 1000,
		});
	}

	if (kind === "landingPage") {
		return normalizeGenerationProfile({
			...baseProfile,
			reasoningLevel: "high",
			temperature: 0.4,
			maxTokens: 1800,
		});
	}

	return normalizeGenerationProfile(baseProfile);
}

export function createPlaceholderCampaignAssetContent(assetBlueprint = {}) {
	const kind = inferBlueprintKind(assetBlueprint);
	const titles = {
		pinterest: "Placeholder Pinterest Pin",
		blog: "Placeholder Blog",
		email: "Placeholder Email",
		landingPage: "Placeholder Landing Page",
		default: "Placeholder Campaign Asset",
	};
	return {
		title: titles[kind] || titles.default,
		content: "Generated from blueprint.",
	};
}

export function buildCampaignAsset(input = {}, options = {}) {
	const now = options.now || new Date().toISOString();
	return {
		id: input.id || createCampaignAssetId(),
		missionId: input.missionId || null,
		campaignPlanId: input.campaignPlanId || null,
		assetBlueprintId: input.assetBlueprintId || null,
		status: normalizeCampaignAssetStatus(input.status),
		assetType: String(input.assetType || "").trim(),
		platform: String(input.platform || "").trim(),
		title: String(input.title || "").trim(),
		content: String(input.content || "").trim(),
		metadata:
			input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
				? input.metadata
				: {},
		generationProfile: normalizeGenerationProfile(input.generationProfile),
		createdAt: input.createdAt || now,
		updatedAt: input.updatedAt || now,
	};
}
