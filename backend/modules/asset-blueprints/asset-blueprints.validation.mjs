import {
	ASSET_BLUEPRINT_STATUSES,
	isAssetBlueprintStatus,
} from "./asset-blueprints.types.mjs";

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

function validateKnowledgeSources(input, errors) {
	if (!Array.isArray(input)) {
		errors.push({ field: "knowledgeSources", message: "knowledgeSources must be an array" });
		return;
	}
	input.forEach((source, index) => {
		const field = `knowledgeSources[${index}]`;
		if (!source || typeof source !== "object" || Array.isArray(source)) {
			errors.push({ field, message: "knowledge source reference must be an object" });
			return;
		}
		for (const key of ["sourceId", "sourceType", "reason"]) {
			if (hasOwn(source, key) && typeof source[key] !== "string") {
				errors.push({ field: `${field}.${key}`, message: `${key} must be a string` });
			}
		}
	});
}

function validateGenerationInstructions(input, errors) {
	if (!input || typeof input !== "object" || Array.isArray(input)) {
		errors.push({
			field: "generationInstructions",
			message: "generationInstructions must be an object",
		});
		return;
	}
	for (const key of ["style", "length", "format"]) {
		if (hasOwn(input, key) && typeof input[key] !== "string") {
			errors.push({
				field: `generationInstructions.${key}`,
				message: `${key} must be a string`,
			});
		}
	}
	if (hasOwn(input, "specialRequirements")) {
		if (!Array.isArray(input.specialRequirements)) {
			errors.push({
				field: "generationInstructions.specialRequirements",
				message: "specialRequirements must be an array",
			});
		} else if (input.specialRequirements.some((item) => typeof item !== "string")) {
			errors.push({
				field: "generationInstructions.specialRequirements",
				message: "specialRequirements must contain strings only",
			});
		}
	}
}

function validateKnownFields(payload, errors) {
	for (const field of [
		"campaignPlanId",
		"recommendedAssetId",
		"missionId",
		"knowledgeContextId",
		"assetType",
		"platform",
		"goal",
		"purpose",
		"audience",
		"persona",
		"tone",
		"hookStrategy",
		"ctaStrategy",
		"seoStrategy",
	]) {
		validateStringField(payload, field, errors);
	}

	if (hasOwn(payload, "status") && !isAssetBlueprintStatus(payload.status)) {
		errors.push({
			field: "status",
			message: `status must be one of: ${ASSET_BLUEPRINT_STATUSES.join(", ")}`,
		});
	}

	if (hasOwn(payload, "knowledgeSources")) {
		validateKnowledgeSources(payload.knowledgeSources, errors);
	}

	if (hasOwn(payload, "generationInstructions")) {
		validateGenerationInstructions(payload.generationInstructions, errors);
	}

	if (hasOwn(payload, "reviewChecklist")) {
		if (!Array.isArray(payload.reviewChecklist)) {
			errors.push({ field: "reviewChecklist", message: "reviewChecklist must be an array" });
		} else if (payload.reviewChecklist.some((item) => typeof item !== "string")) {
			errors.push({
				field: "reviewChecklist",
				message: "reviewChecklist must contain strings only",
			});
		}
	}

	if (hasOwn(payload, "metadata")) {
		const value = payload.metadata;
		if (value !== null && (typeof value !== "object" || Array.isArray(value))) {
			errors.push({ field: "metadata", message: "metadata must be an object" });
		}
	}
}

export function validateAssetBlueprintCreate(payload = {}) {
	const errors = [];
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return {
			valid: false,
			errors: [{ field: "assetBlueprint", message: "AssetBlueprint payload must be an object" }],
		};
	}
	validateStringField(payload, "campaignPlanId", errors, { required: true });
	validateStringField(payload, "missionId", errors, { required: true });
	validateStringField(payload, "assetType", errors, { required: true });
	validateKnownFields(payload, errors);
	return { valid: errors.length === 0, errors };
}

export function validateAssetBlueprintUpdate(payload = {}) {
	const errors = [];
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return {
			valid: false,
			errors: [{ field: "assetBlueprint", message: "AssetBlueprint payload must be an object" }],
		};
	}
	validateKnownFields(payload, errors);
	return { valid: errors.length === 0, errors };
}

export function validateBlueprintGenerate(payload = {}) {
	const errors = [];
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return {
			valid: false,
			errors: [{ field: "request", message: "Generate payload must be an object" }],
		};
	}
	if (
		!payload.campaignPlan ||
		typeof payload.campaignPlan !== "object" ||
		Array.isArray(payload.campaignPlan)
	) {
		errors.push({ field: "campaignPlan", message: "campaignPlan is required" });
		return { valid: false, errors };
	}
	if (!Array.isArray(payload.campaignPlan.recommendedAssets)) {
		errors.push({
			field: "campaignPlan.recommendedAssets",
			message: "recommendedAssets must be an array",
		});
	}
	return { valid: errors.length === 0, errors };
}

