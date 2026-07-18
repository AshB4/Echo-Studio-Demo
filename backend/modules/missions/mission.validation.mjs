import { isMissionStatus } from "./mission.status.mjs";

const STRING_FIELDS = new Set([
	"title",
	"goal",
	"description",
	"businessName",
	"productId",
	"productName",
	"knowledgeContextId",
	"audience",
	"offer",
	"tone",
	"location",
	"seasonalContext",
	"createdBy",
]);

const ARRAY_FIELDS = new Set([
	"channels",
	"constraints",
	"successCriteria",
]);

function hasOwn(object, key) {
	return Object.prototype.hasOwnProperty.call(object, key);
}

function isValidDateValue(value) {
	if (value === null || value === undefined || value === "") return true;
	const date = new Date(value);
	return !Number.isNaN(date.getTime());
}

function validateKnownFields(payload, errors) {
	for (const field of STRING_FIELDS) {
		if (!hasOwn(payload, field)) continue;
		const value = payload[field];
		if (value !== null && value !== undefined && typeof value !== "string") {
			errors.push({ field, message: `${field} must be a string` });
		}
	}

	for (const field of ARRAY_FIELDS) {
		if (!hasOwn(payload, field)) continue;
		if (!Array.isArray(payload[field])) {
			errors.push({ field, message: `${field} must be an array` });
		}
	}

	if (hasOwn(payload, "metadata")) {
		const value = payload.metadata;
		if (value !== null && (typeof value !== "object" || Array.isArray(value))) {
			errors.push({ field: "metadata", message: "metadata must be an object" });
		}
	}

	if (hasOwn(payload, "budget")) {
		const value = payload.budget;
		if (
			value !== null &&
			value !== undefined &&
			(typeof value !== "number" || Number.isNaN(value))
		) {
			errors.push({ field: "budget", message: "budget must be a number" });
		}
	}

	if (hasOwn(payload, "deadline") && !isValidDateValue(payload.deadline)) {
		errors.push({ field: "deadline", message: "deadline must be a valid date" });
	}

	if (hasOwn(payload, "status") && !isMissionStatus(payload.status)) {
		errors.push({ field: "status", message: "status is not a valid mission status" });
	}
}

export function validateMissionCreate(payload = {}) {
	const errors = [];
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return {
			valid: false,
			errors: [{ field: "mission", message: "Mission payload must be an object" }],
		};
	}

	if (typeof payload.goal !== "string" || payload.goal.trim().length === 0) {
		errors.push({ field: "goal", message: "goal is required" });
	}

	validateKnownFields(payload, errors);

	return { valid: errors.length === 0, errors };
}

export function validateMissionUpdate(payload = {}) {
	const errors = [];
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return {
			valid: false,
			errors: [{ field: "mission", message: "Mission payload must be an object" }],
		};
	}

	if (hasOwn(payload, "goal")) {
		if (typeof payload.goal !== "string" || payload.goal.trim().length === 0) {
			errors.push({ field: "goal", message: "goal cannot be empty" });
		}
	}

	validateKnownFields(payload, errors);

	return { valid: errors.length === 0, errors };
}
