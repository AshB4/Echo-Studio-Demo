import {
	KNOWLEDGE_SOURCE_TYPES,
	isKnowledgeSourceType,
} from "./knowledge-retrieval.types.mjs";

function hasOwn(object, key) {
	return Object.prototype.hasOwnProperty.call(object, key);
}

export function validateKnowledgeSourceCreate(payload = {}) {
	const errors = [];
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return {
			valid: false,
			errors: [{ field: "source", message: "Knowledge source payload must be an object" }],
		};
	}

	if (!isKnowledgeSourceType(payload.type)) {
		errors.push({
			field: "type",
			message: `type must be one of: ${KNOWLEDGE_SOURCE_TYPES.join(", ")}`,
		});
	}

	if (typeof payload.title !== "string" || payload.title.trim().length === 0) {
		errors.push({ field: "title", message: "title is required" });
	}

	for (const field of ["description", "location"]) {
		if (hasOwn(payload, field) && typeof payload[field] !== "string") {
			errors.push({ field, message: `${field} must be a string` });
		}
	}

	if (hasOwn(payload, "priority")) {
		if (typeof payload.priority !== "number" || !Number.isFinite(payload.priority)) {
			errors.push({ field: "priority", message: "priority must be a number" });
		}
	}

	if (hasOwn(payload, "enabled") && typeof payload.enabled !== "boolean") {
		errors.push({ field: "enabled", message: "enabled must be a boolean" });
	}

	if (hasOwn(payload, "tags")) {
		if (!Array.isArray(payload.tags)) {
			errors.push({ field: "tags", message: "tags must be an array" });
		} else if (payload.tags.some((tag) => typeof tag !== "string")) {
			errors.push({ field: "tags", message: "tags must contain strings only" });
		}
	}

	return { valid: errors.length === 0, errors };
}

export function validateAssemblyRequest(payload = {}) {
	const errors = [];
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return {
			valid: false,
			errors: [{ field: "request", message: "Assembly payload must be an object" }],
		};
	}

	if (hasOwn(payload, "missionId")) {
		if (typeof payload.missionId !== "string" || payload.missionId.trim().length === 0) {
			errors.push({ field: "missionId", message: "missionId must be a non-empty string" });
		}
	}

	return { valid: errors.length === 0, errors };
}

