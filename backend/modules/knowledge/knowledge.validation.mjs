import {
	KNOWLEDGE_SECTION_KEYS,
	isKnowledgeStatus,
} from "./knowledge.types.mjs";

function hasOwn(object, key) {
	return Object.prototype.hasOwnProperty.call(object, key);
}

function isValidDateValue(value) {
	if (value === null || value === undefined || value === "") return true;
	const date = new Date(value);
	return !Number.isNaN(date.getTime());
}

function validateSection(section, field, errors) {
	if (!section || typeof section !== "object" || Array.isArray(section)) {
		errors.push({ field, message: `${field} must be an object` });
		return;
	}

	for (const key of ["title", "content", "source"]) {
		if (hasOwn(section, key) && typeof section[key] !== "string") {
			errors.push({ field: `${field}.${key}`, message: `${key} must be a string` });
		}
	}

	if (hasOwn(section, "priority")) {
		if (typeof section.priority !== "number" || !Number.isFinite(section.priority)) {
			errors.push({ field: `${field}.priority`, message: "priority must be a number" });
		}
	}

	if (hasOwn(section, "lastUpdated") && !isValidDateValue(section.lastUpdated)) {
		errors.push({
			field: `${field}.lastUpdated`,
			message: "lastUpdated must be a valid date",
		});
	}
}

function validateKnownFields(payload, errors) {
	if (hasOwn(payload, "missionId")) {
		const value = payload.missionId;
		if (value !== null && value !== undefined && typeof value !== "string") {
			errors.push({ field: "missionId", message: "missionId must be a string" });
		}
	}

	if (hasOwn(payload, "title") && typeof payload.title !== "string") {
		errors.push({ field: "title", message: "title must be a string" });
	}

	if (hasOwn(payload, "status") && !isKnowledgeStatus(payload.status)) {
		errors.push({
			field: "status",
			message: "status is not a valid knowledge context status",
		});
	}

	if (hasOwn(payload, "warnings") && !Array.isArray(payload.warnings)) {
		errors.push({ field: "warnings", message: "warnings must be an array" });
	}

	if (hasOwn(payload, "metadata")) {
		const value = payload.metadata;
		if (value !== null && (typeof value !== "object" || Array.isArray(value))) {
			errors.push({ field: "metadata", message: "metadata must be an object" });
		}
	}

	if (hasOwn(payload, "sections")) {
		const sections = payload.sections;
		if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
			errors.push({ field: "sections", message: "sections must be an object" });
			return;
		}
		for (const key of Object.keys(sections)) {
			if (!KNOWLEDGE_SECTION_KEYS.includes(key)) {
				errors.push({ field: `sections.${key}`, message: "Unknown knowledge section" });
				continue;
			}
			validateSection(sections[key], `sections.${key}`, errors);
		}
	}
}

export function validateKnowledgeContextCreate(payload = {}) {
	const errors = [];
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return {
			valid: false,
			errors: [
				{ field: "knowledgeContext", message: "KnowledgeContext payload must be an object" },
			],
		};
	}

	validateKnownFields(payload, errors);

	return { valid: errors.length === 0, errors };
}

export function validateKnowledgeContextUpdate(payload = {}) {
	const errors = [];
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return {
			valid: false,
			errors: [
				{ field: "knowledgeContext", message: "KnowledgeContext payload must be an object" },
			],
		};
	}

	validateKnownFields(payload, errors);

	return { valid: errors.length === 0, errors };
}

