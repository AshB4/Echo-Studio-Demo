import {
	SOURCE_TYPE_TO_CONTEXT_SECTION,
	createEmptyAssemblySections,
	createKnowledgeSource,
	sourceToAssemblyItem,
} from "./knowledge-retrieval.types.mjs";
import {
	validateAssemblyRequest,
	validateKnowledgeSourceCreate,
} from "./knowledge-retrieval.validation.mjs";

const sourceStore = new Map();

function sortSourcesByPriority(left, right) {
	const priorityDiff = Number(left.priority || 0) - Number(right.priority || 0);
	if (priorityDiff !== 0) return priorityDiff;
	return String(left.title || "").localeCompare(String(right.title || ""));
}

export function registerKnowledgeSource(payload = {}) {
	const validation = validateKnowledgeSourceCreate(payload);
	if (!validation.valid) {
		return { source: null, errors: validation.errors };
	}

	const source = createKnowledgeSource(payload);
	sourceStore.set(source.id, source);

	// TODO: Parse markdown or structured source files referenced by location.
	// TODO: Cache parsed source summaries after persistence exists.

	return { source, errors: [] };
}

export function listKnowledgeSources({ includeDisabled = true, type = null } = {}) {
	return Array.from(sourceStore.values())
		.filter((source) => includeDisabled || source.enabled)
		.filter((source) => !type || source.type === type)
		.sort(sortSourcesByPriority);
}

export function deleteKnowledgeSource(id) {
	const source = sourceStore.get(String(id || "")) || null;
	if (!source) return null;
	sourceStore.delete(source.id);
	return source;
}

export function assembleKnowledgeContext(payload = {}) {
	const validation = validateAssemblyRequest(payload);
	if (!validation.valid) {
		return { knowledgeContext: null, errors: validation.errors };
	}

	const sections = createEmptyAssemblySections();
	const enabledSources = listKnowledgeSources({ includeDisabled: false });

	for (const source of enabledSources) {
		const sectionKey = SOURCE_TYPE_TO_CONTEXT_SECTION[source.type];
		if (!sectionKey || !sections[sectionKey]) continue;
		sections[sectionKey].push(sourceToAssemblyItem(source));
	}

	const missionId =
		typeof payload.missionId === "string" ? payload.missionId.trim() : null;
	const now = new Date().toISOString();
	const knowledgeContext = {
		id: `kc_retrieved_${Date.now()}`,
		missionId,
		status: "ready",
		productKnowledge: sections.productKnowledge,
		brandRules: sections.brandRules,
		platformRules: sections.platformRules,
		previousCampaignPerformance: sections.previousCampaignPerformance,
		marketingPlaybook: sections.marketingPlaybook,
		generalNotes: sections.generalNotes,
		metadata: {
			assembledBy: "knowledge-retrieval",
			sourceCount: enabledSources.length,
		},
		createdAt: now,
		updatedAt: now,
	};

	// TODO: Add embeddings before semantic retrieval.
	// TODO: Add semantic search and vector database integration.
	// TODO: Add retrieval ranking beyond explicit priority sorting.
	// TODO: Add prompt assembly for planner-ready context.
	// TODO: Add source-level caching and invalidation.

	return { knowledgeContext, errors: [] };
}

export function clearKnowledgeSourcesForTesting() {
	sourceStore.clear();
}
