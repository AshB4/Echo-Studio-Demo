import {
	buildKnowledgeContext,
	normalizeKnowledgeStatus,
	normalizeKnowledgeSections,
} from "./knowledge.types.mjs";
import {
	validateKnowledgeContextCreate,
	validateKnowledgeContextUpdate,
} from "./knowledge.validation.mjs";

const knowledgeStore = new Map();

function sanitizeKnowledgeInput(input = {}) {
	const next = { ...input };
	if (typeof next.title === "string") next.title = next.title.trim();
	if (typeof next.status === "string") {
		next.status = normalizeKnowledgeStatus(next.status);
	}
	return next;
}

export function listKnowledgeContexts({ missionId = null } = {}) {
	const contexts = Array.from(knowledgeStore.values()).sort((left, right) =>
		String(right.createdAt || "").localeCompare(String(left.createdAt || "")),
	);
	if (!missionId) return contexts;
	return contexts.filter((context) => context.missionId === missionId);
}

export function getKnowledgeContext(id) {
	return knowledgeStore.get(String(id || "")) || null;
}

export function createKnowledgeContext(payload = {}) {
	const validation = validateKnowledgeContextCreate(payload);
	if (!validation.valid) {
		return { knowledgeContext: null, errors: validation.errors };
	}

	const knowledgeContext = buildKnowledgeContext(sanitizeKnowledgeInput(payload));
	knowledgeStore.set(knowledgeContext.id, knowledgeContext);

	// TODO: Run AI context assembly after retrieval sources are wired.
	// TODO: Persist KnowledgeContexts after storage is selected.

	return { knowledgeContext, errors: [] };
}

export function updateKnowledgeContext(id, payload = {}) {
	const existing = getKnowledgeContext(id);
	if (!existing) {
		return {
			knowledgeContext: null,
			errors: [{ field: "id", message: "KnowledgeContext not found" }],
		};
	}

	const validation = validateKnowledgeContextUpdate(payload);
	if (!validation.valid) {
		return { knowledgeContext: null, errors: validation.errors };
	}

	const now = new Date().toISOString();
	const updates = sanitizeKnowledgeInput(payload);
	const knowledgeContext = buildKnowledgeContext(
		{
			...existing,
			...updates,
			sections: {
				...(existing.sections || {}),
				...(updates.sections || {}),
			},
			id: existing.id,
			createdAt: existing.createdAt,
			updatedAt: now,
		},
		{ now },
	);

	knowledgeStore.set(knowledgeContext.id, knowledgeContext);

	// TODO: Record version history when knowledge sections change.
	// TODO: Re-run retrieval ranking after semantic search exists.

	return { knowledgeContext, errors: [] };
}

export function deleteKnowledgeContext(id) {
	const knowledgeContext = getKnowledgeContext(id);
	if (!knowledgeContext) return null;
	knowledgeStore.delete(knowledgeContext.id);

	// TODO: Replace hard delete with archive semantics before persistence.

	return knowledgeContext;
}

export function clearKnowledgeContextsForTesting() {
	knowledgeStore.clear();
}
