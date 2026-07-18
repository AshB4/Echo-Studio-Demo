import { randomUUID } from "crypto";

export const KNOWLEDGE_SOURCE_TYPES = Object.freeze([
	"product",
	"brand",
	"platform",
	"performance",
	"playbook",
	"general",
]);

export const SOURCE_TYPE_TO_CONTEXT_SECTION = Object.freeze({
	product: "productKnowledge",
	brand: "brandRules",
	platform: "platformRules",
	performance: "previousCampaignPerformance",
	playbook: "marketingPlaybook",
	general: "generalNotes",
});

const SOURCE_TYPE_SET = new Set(KNOWLEDGE_SOURCE_TYPES);

export function createKnowledgeSourceId() {
	return `ks_${randomUUID()}`;
}

export function isKnowledgeSourceType(value) {
	return SOURCE_TYPE_SET.has(String(value || ""));
}

export function normalizeKnowledgeSourceType(value) {
	return String(value || "").trim().toLowerCase();
}

export function createKnowledgeSource(input = {}, options = {}) {
	const now = options.now || new Date().toISOString();
	const type = normalizeKnowledgeSourceType(input.type);
	return {
		id: input.id || createKnowledgeSourceId(),
		type,
		title: String(input.title || "").trim(),
		description: String(input.description || "").trim(),
		priority:
			typeof input.priority === "number" && Number.isFinite(input.priority)
				? input.priority
				: 100,
		enabled: input.enabled === undefined ? true : Boolean(input.enabled),
		tags: Array.isArray(input.tags)
			? input.tags.map((tag) => String(tag || "").trim()).filter(Boolean)
			: [],
		location: String(input.location || "").trim(),
		createdAt: input.createdAt || now,
		updatedAt: input.updatedAt || now,
	};
}

export function createEmptyAssemblySections() {
	return {
		productKnowledge: [],
		brandRules: [],
		platformRules: [],
		previousCampaignPerformance: [],
		marketingPlaybook: [],
		generalNotes: [],
	};
}

export function sourceToAssemblyItem(source = {}) {
	return {
		id: source.id,
		type: source.type,
		title: source.title,
		description: source.description,
		priority: source.priority,
		enabled: source.enabled,
		tags: Array.isArray(source.tags) ? source.tags : [],
		location: source.location,
	};
}

