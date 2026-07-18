import {
	CAMPAIGN_PLAN_STATUSES,
	RECOMMENDED_ASSET_STATUSES,
	SUCCESS_METRIC_KEYS,
	TIMELINE_PHASES,
	isCampaignPlanStatus,
} from "./campaign-planner.types.mjs";

function hasOwn(object, key) {
	return Object.prototype.hasOwnProperty.call(object, key);
}

function validateStringField(payload, field, errors, { required = false } = {}) {
	if (!hasOwn(payload, field)) {
		if (required) errors.push({ field, message: `${field} is required` });
		return;
	}
	if (typeof payload[field] !== "string" || (required && !payload[field].trim())) {
		errors.push({ field, message: `${field} must be a non-empty string` });
	}
}

function validateRecommendedAsset(asset, field, errors) {
	if (!asset || typeof asset !== "object" || Array.isArray(asset)) {
		errors.push({ field, message: `${field} must be an object` });
		return;
	}
	for (const key of ["type", "purpose", "platform", "reason"]) {
		if (hasOwn(asset, key) && typeof asset[key] !== "string") {
			errors.push({ field: `${field}.${key}`, message: `${key} must be a string` });
		}
	}
	if (hasOwn(asset, "priority")) {
		if (typeof asset.priority !== "number" || !Number.isFinite(asset.priority)) {
			errors.push({ field: `${field}.priority`, message: "priority must be a number" });
		}
	}
	if (
		hasOwn(asset, "status") &&
		!RECOMMENDED_ASSET_STATUSES.includes(String(asset.status || ""))
	) {
		errors.push({
			field: `${field}.status`,
			message: `status must be one of: ${RECOMMENDED_ASSET_STATUSES.join(", ")}`,
		});
	}
}

function validateTimeline(input, errors) {
	if (!Array.isArray(input)) {
		errors.push({ field: "timeline", message: "timeline must be an array" });
		return;
	}
	input.forEach((item, index) => {
		const field = `timeline[${index}]`;
		if (!item || typeof item !== "object" || Array.isArray(item)) {
			errors.push({ field, message: "timeline item must be an object" });
			return;
		}
		if (!TIMELINE_PHASES.includes(String(item.phase || ""))) {
			errors.push({
				field: `${field}.phase`,
				message: `phase must be one of: ${TIMELINE_PHASES.join(", ")}`,
			});
		}
		for (const key of ["objectives", "deliverables"]) {
			if (hasOwn(item, key) && !Array.isArray(item[key])) {
				errors.push({ field: `${field}.${key}`, message: `${key} must be an array` });
			}
		}
	});
}

function validateSuccessMetrics(input, errors) {
	if (!input || typeof input !== "object" || Array.isArray(input)) {
		errors.push({ field: "successMetrics", message: "successMetrics must be an object" });
		return;
	}
	for (const key of Object.keys(input)) {
		if (!SUCCESS_METRIC_KEYS.includes(key)) {
			errors.push({ field: `successMetrics.${key}`, message: "Unknown success metric" });
			continue;
		}
		const value = input[key];
		if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
			errors.push({
				field: `successMetrics.${key}`,
				message: "metric target must be a non-negative number",
			});
		}
	}
}

function validateRisks(input, errors) {
	if (!Array.isArray(input)) {
		errors.push({ field: "risks", message: "risks must be an array" });
		return;
	}
	input.forEach((risk, index) => {
		const field = `risks[${index}]`;
		if (!risk || typeof risk !== "object" || Array.isArray(risk)) {
			errors.push({ field, message: "risk must be an object" });
			return;
		}
		for (const key of ["title", "severity", "mitigation"]) {
			if (hasOwn(risk, key) && typeof risk[key] !== "string") {
				errors.push({ field: `${field}.${key}`, message: `${key} must be a string` });
			}
		}
	});
}

function validateKnownFields(payload, errors) {
	for (const field of [
		"missionId",
		"knowledgeContextId",
		"goal",
		"audience",
		"primaryPlatform",
		"notes",
	]) {
		validateStringField(payload, field, errors);
	}

	if (hasOwn(payload, "status") && !isCampaignPlanStatus(payload.status)) {
		errors.push({
			field: "status",
			message: `status must be one of: ${CAMPAIGN_PLAN_STATUSES.join(", ")}`,
		});
	}

	if (hasOwn(payload, "secondaryPlatforms")) {
		if (!Array.isArray(payload.secondaryPlatforms)) {
			errors.push({ field: "secondaryPlatforms", message: "secondaryPlatforms must be an array" });
		} else if (payload.secondaryPlatforms.some((platform) => typeof platform !== "string")) {
			errors.push({
				field: "secondaryPlatforms",
				message: "secondaryPlatforms must contain strings only",
			});
		}
	}

	if (hasOwn(payload, "recommendedAssets")) {
		if (!Array.isArray(payload.recommendedAssets)) {
			errors.push({ field: "recommendedAssets", message: "recommendedAssets must be an array" });
		} else {
			payload.recommendedAssets.forEach((asset, index) =>
				validateRecommendedAsset(asset, `recommendedAssets[${index}]`, errors),
			);
		}
	}

	if (hasOwn(payload, "timeline")) validateTimeline(payload.timeline, errors);
	if (hasOwn(payload, "successMetrics")) validateSuccessMetrics(payload.successMetrics, errors);
	if (hasOwn(payload, "risks")) validateRisks(payload.risks, errors);
}

export function validateCampaignPlanCreate(payload = {}) {
	const errors = [];
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return {
			valid: false,
			errors: [{ field: "campaignPlan", message: "CampaignPlan payload must be an object" }],
		};
	}
	validateStringField(payload, "missionId", errors, { required: true });
	validateKnownFields(payload, errors);
	return { valid: errors.length === 0, errors };
}

export function validateCampaignPlanUpdate(payload = {}) {
	const errors = [];
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return {
			valid: false,
			errors: [{ field: "campaignPlan", message: "CampaignPlan payload must be an object" }],
		};
	}
	validateKnownFields(payload, errors);
	return { valid: errors.length === 0, errors };
}

export function validateCampaignPlanGenerate(payload = {}) {
	const errors = [];
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return {
			valid: false,
			errors: [{ field: "request", message: "Generate payload must be an object" }],
		};
	}
	validateStringField(payload, "missionId", errors, { required: true });
	if (
		hasOwn(payload, "knowledgeContext") &&
		(!payload.knowledgeContext ||
			typeof payload.knowledgeContext !== "object" ||
			Array.isArray(payload.knowledgeContext))
	) {
		errors.push({ field: "knowledgeContext", message: "knowledgeContext must be an object" });
	}
	return { valid: errors.length === 0, errors };
}

