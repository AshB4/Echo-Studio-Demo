import { randomUUID } from "crypto";
import { DEFAULT_MISSION_STATUS, normalizeMissionStatus } from "./mission.status.mjs";

export const DEFAULT_MISSION_CHANNELS = Object.freeze([]);

export function createMissionId() {
	return `m_${randomUUID()}`;
}

export function createMissionDefaults(now = new Date().toISOString()) {
	return {
		id: createMissionId(),
		title: "",
		goal: "",
		status: DEFAULT_MISSION_STATUS,
		description: "",
		businessName: "",
		productId: null,
		productName: "",
		knowledgeContextId: null,
		audience: "",
		offer: "",
		deadline: null,
		channels: [...DEFAULT_MISSION_CHANNELS],
		constraints: [],
		successCriteria: [],
		tone: "",
		budget: null,
		location: "",
		seasonalContext: "",
		metadata: {},
		createdBy: null,
		completedAt: null,
		archivedAt: null,
		createdAt: now,
		updatedAt: now,
	};
}

export function buildMission(input = {}, options = {}) {
	const now = options.now || new Date().toISOString();
	const defaults = createMissionDefaults(now);
	const mission = {
		...defaults,
		...input,
		id: input.id || defaults.id,
		title: String(input.title || input.goal || defaults.title).trim(),
		goal: String(input.goal || defaults.goal).trim(),
		status: normalizeMissionStatus(input.status, defaults.status),
		channels: Array.isArray(input.channels) ? input.channels : defaults.channels,
		constraints: Array.isArray(input.constraints)
			? input.constraints
			: defaults.constraints,
		successCriteria: Array.isArray(input.successCriteria)
			? input.successCriteria
			: defaults.successCriteria,
		metadata:
			input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
				? input.metadata
				: defaults.metadata,
		createdAt: input.createdAt || now,
		updatedAt: input.updatedAt || now,
	};

	// TODO: Link Mission to KnowledgeContext once the knowledge module exists.
	// TODO: Link Mission to CampaignPlan once planning is introduced.
	// TODO: Link Mission to CampaignAsset once assets are introduced.
	// TODO: Link Mission to ReviewDecision once review workflows exist.
	// TODO: Link Mission to PublishingJob once publishing jobs are split from posts.
	// TODO: Add legacy PostPunk adapters at the module boundary, not inside Mission.

	return mission;
}

export function summarizeMission(mission = {}) {
	return {
		id: mission.id,
		title: mission.title,
		goal: mission.goal,
		status: mission.status,
		businessName: mission.businessName || "",
		productName: mission.productName || "",
		knowledgeContextId: mission.knowledgeContextId || null,
		audience: mission.audience || "",
		offer: mission.offer || "",
		deadline: mission.deadline || null,
		channels: Array.isArray(mission.channels) ? mission.channels : [],
		createdAt: mission.createdAt,
		updatedAt: mission.updatedAt,
	};
}
