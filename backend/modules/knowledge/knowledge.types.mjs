import { randomUUID } from "crypto";

export const KNOWLEDGE_STATUSES = Object.freeze([
	"pending",
	"collecting",
	"ready",
	"stale",
	"failed",
	"archived",
]);

export const DEFAULT_KNOWLEDGE_STATUS = "pending";

export const KNOWLEDGE_SECTION_KEYS = Object.freeze([
	"productKnowledge",
	"brandRules",
	"platformRules",
	"previousCampaignPerformance",
	"marketingPlaybook",
	"generalNotes",
]);

export const KNOWLEDGE_SECTION_DEFINITIONS = Object.freeze({
	productKnowledge: Object.freeze({
		title: "Product Knowledge",
		priority: 1,
	}),
	brandRules: Object.freeze({
		title: "Brand Rules",
		priority: 2,
	}),
	platformRules: Object.freeze({
		title: "Platform Rules",
		priority: 3,
	}),
	previousCampaignPerformance: Object.freeze({
		title: "Previous Campaign Performance",
		priority: 4,
	}),
	marketingPlaybook: Object.freeze({
		title: "Marketing Playbook",
		priority: 5,
	}),
	generalNotes: Object.freeze({
		title: "General Notes",
		priority: 6,
	}),
});

const STATUS_SET = new Set(KNOWLEDGE_STATUSES);

export function isKnowledgeStatus(value) {
	return STATUS_SET.has(String(value || ""));
}

export function normalizeKnowledgeStatus(value, fallback = DEFAULT_KNOWLEDGE_STATUS) {
	const status = String(value || "").trim().toLowerCase();
	return isKnowledgeStatus(status) ? status : fallback;
}

export function createKnowledgeContextId() {
	return `kc_${randomUUID()}`;
}

export function createKnowledgeSection(key, input = {}) {
	const definition = KNOWLEDGE_SECTION_DEFINITIONS[key] || {
		title: String(key || "Knowledge Section"),
		priority: 99,
	};
	return {
		title: String(input.title || definition.title).trim(),
		content: String(input.content || "").trim(),
		source: String(input.source || "").trim(),
		priority:
			typeof input.priority === "number" && Number.isFinite(input.priority)
				? input.priority
				: definition.priority,
		lastUpdated: input.lastUpdated || null,
	};
}

export function createDefaultKnowledgeSections() {
	return KNOWLEDGE_SECTION_KEYS.reduce((sections, key) => {
		sections[key] = createKnowledgeSection(key);
		return sections;
	}, {});
}

export function normalizeKnowledgeSections(input = {}) {
	const defaults = createDefaultKnowledgeSections();
	if (!input || typeof input !== "object" || Array.isArray(input)) {
		return defaults;
	}
	return KNOWLEDGE_SECTION_KEYS.reduce((sections, key) => {
		sections[key] = createKnowledgeSection(key, {
			...defaults[key],
			...(input[key] || {}),
		});
		return sections;
	}, {});
}

export function createKnowledgeContextDefaults(now = new Date().toISOString()) {
	return {
		id: createKnowledgeContextId(),
		missionId: null,
		title: "",
		status: DEFAULT_KNOWLEDGE_STATUS,
		sections: createDefaultKnowledgeSections(),
		warnings: [],
		metadata: {},
		createdAt: now,
		updatedAt: now,
	};
}

export function buildKnowledgeContext(input = {}, options = {}) {
	const now = options.now || new Date().toISOString();
	const defaults = createKnowledgeContextDefaults(now);
	const context = {
		...defaults,
		...input,
		id: input.id || defaults.id,
		missionId: input.missionId || defaults.missionId,
		title: String(input.title || defaults.title).trim(),
		status: normalizeKnowledgeStatus(input.status, defaults.status),
		sections: normalizeKnowledgeSections(input.sections || defaults.sections),
		warnings: Array.isArray(input.warnings) ? input.warnings : defaults.warnings,
		metadata:
			input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
				? input.metadata
				: defaults.metadata,
		createdAt: input.createdAt || now,
		updatedAt: input.updatedAt || now,
	};

	// TODO: Assemble prompt-ready AI context from ordered knowledge sections.
	// TODO: Add embeddings for section-level semantic retrieval.
	// TODO: Add semantic search over product, brand, platform, and performance memory.
	// TODO: Add retrieval ranking before planning and asset generation.
	// TODO: Add version history so generated plans can cite the exact evidence used.
	// TODO: Persist KnowledgeContexts once the storage strategy is selected.

	return context;
}

