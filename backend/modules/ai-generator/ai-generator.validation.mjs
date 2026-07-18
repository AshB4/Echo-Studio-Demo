import {
	AI_PROVIDERS,
	CAMPAIGN_ASSET_STATUSES,
	QUALITY_TARGETS,
	REASONING_LEVELS,
	isAiProvider,
	isCampaignAssetStatus,
	isQualityTarget,
	isReasoningLevel,
} from "./ai-generator.types.mjs";

function hasOwn(object, key) {
	return Object.prototype.hasOwnProperty.call(object, key);
}

function validateStringField(payload, field, errors, { required = false } = {}) {
	if (!hasOwn(payload, field)) {
		if (required) errors.push({ field, message: `${field} is required` });
		return;
	}
	if (payload[field] !== null && payload[field] !== undefined && typeof payload[field] !== "string") {
		errors.push({ field, message: `${field} must be a string` });
		return;
	}
	if (required && !String(payload[field] || "").trim()) {
		errors.push({ field, message: `${field} cannot be empty` });
	}
}

function validateGenerationProfile(input, errors) {
	if (!input || typeof input !== "object" || Array.isArray(input)) {
		errors.push({ field: "generationProfile", message: "generationProfile must be an object" });
		return;
	}

	for (const field of [
		"model",
		"creativity",
		"voice",
		"imageModel",
		"provider",
		"systemPromptVersion",
	]) {
		validateStringField(input, field, errors);
	}

	if (hasOwn(input, "reasoningLevel") && !isReasoningLevel(input.reasoningLevel)) {
		errors.push({
			field: "generationProfile.reasoningLevel",
			message: `reasoningLevel must be one of: ${REASONING_LEVELS.join(", ")}`,
		});
	}

	if (hasOwn(input, "qualityTarget") && !isQualityTarget(input.qualityTarget)) {
		errors.push({
			field: "generationProfile.qualityTarget",
			message: `qualityTarget must be one of: ${QUALITY_TARGETS.join(", ")}`,
		});
	}

	if (hasOwn(input, "provider") && !isAiProvider(input.provider)) {
		errors.push({
			field: "generationProfile.provider",
			message: `provider must be one of: ${AI_PROVIDERS.join(", ")}`,
		});
	}

	if (hasOwn(input, "temperature")) {
		const value = input.temperature;
		if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 2) {
			errors.push({
				field: "generationProfile.temperature",
				message: "temperature must be a number between 0 and 2",
			});
		}
	}

	if (hasOwn(input, "maxTokens")) {
		const value = input.maxTokens;
		if (typeof value !== "number" || !Number.isFinite(value) || value < 1) {
			errors.push({
				field: "generationProfile.maxTokens",
				message: "maxTokens must be a positive number",
			});
		}
	}

	if (hasOwn(input, "metadata")) {
		const value = input.metadata;
		if (value !== null && (typeof value !== "object" || Array.isArray(value))) {
			errors.push({ field: "generationProfile.metadata", message: "metadata must be an object" });
		}
	}
}

function validateKnownCampaignAssetFields(payload, errors) {
	for (const field of [
		"missionId",
		"campaignPlanId",
		"assetBlueprintId",
		"assetType",
		"platform",
		"title",
		"content",
	]) {
		validateStringField(payload, field, errors);
	}

	if (hasOwn(payload, "status") && !isCampaignAssetStatus(payload.status)) {
		errors.push({
			field: "status",
			message: `status must be one of: ${CAMPAIGN_ASSET_STATUSES.join(", ")}`,
		});
	}

	if (hasOwn(payload, "metadata")) {
		const value = payload.metadata;
		if (value !== null && (typeof value !== "object" || Array.isArray(value))) {
			errors.push({ field: "metadata", message: "metadata must be an object" });
		}
	}

	if (hasOwn(payload, "generationProfile")) {
		validateGenerationProfile(payload.generationProfile, errors);
	}
}

export function validateCampaignAssetCreate(payload = {}) {
	const errors = [];
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return {
			valid: false,
			errors: [{ field: "campaignAsset", message: "CampaignAsset payload must be an object" }],
		};
	}
	validateStringField(payload, "missionId", errors, { required: true });
	validateStringField(payload, "assetBlueprintId", errors, { required: true });
	validateStringField(payload, "assetType", errors, { required: true });
	validateKnownCampaignAssetFields(payload, errors);
	return { valid: errors.length === 0, errors };
}

export function validateCampaignAssetUpdate(payload = {}) {
	const errors = [];
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return {
			valid: false,
			errors: [{ field: "campaignAsset", message: "CampaignAsset payload must be an object" }],
		};
	}
	validateKnownCampaignAssetFields(payload, errors);
	return { valid: errors.length === 0, errors };
}

export function validateGenerateRequest(payload = {}) {
	const errors = [];
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return {
			valid: false,
			errors: [{ field: "request", message: "Generate payload must be an object" }],
		};
	}
	if (
		!payload.assetBlueprint ||
		typeof payload.assetBlueprint !== "object" ||
		Array.isArray(payload.assetBlueprint)
	) {
		errors.push({ field: "assetBlueprint", message: "assetBlueprint is required" });
	}
	return { valid: errors.length === 0, errors };
}
