import { buildMission, summarizeMission } from "./mission.types.mjs";
import { normalizeMissionStatus } from "./mission.status.mjs";
import {
	validateMissionCreate,
	validateMissionUpdate,
} from "./mission.validation.mjs";

const missionStore = new Map();

function sanitizeMissionInput(input = {}) {
	const next = { ...input };
	if (typeof next.title === "string") next.title = next.title.trim();
	if (typeof next.goal === "string") next.goal = next.goal.trim();
	if (typeof next.status === "string") {
		next.status = normalizeMissionStatus(next.status);
	}
	return next;
}

export function listMissions({ summary = false } = {}) {
	const missions = Array.from(missionStore.values()).sort((left, right) =>
		String(right.createdAt || "").localeCompare(String(left.createdAt || "")),
	);
	return summary ? missions.map(summarizeMission) : missions;
}

export function getMission(id) {
	return missionStore.get(String(id || "")) || null;
}

export function createMission(payload = {}) {
	const validation = validateMissionCreate(payload);
	if (!validation.valid) {
		return { mission: null, errors: validation.errors };
	}

	const mission = buildMission(sanitizeMissionInput(payload));
	missionStore.set(mission.id, mission);

	// TODO: Persist Missions after the storage strategy is selected.
	// TODO: Create KnowledgeContext automatically after intake is complete.

	return { mission, errors: [] };
}

export function updateMission(id, payload = {}) {
	const existing = getMission(id);
	if (!existing) {
		return { mission: null, errors: [{ field: "id", message: "Mission not found" }] };
	}

	const validation = validateMissionUpdate(payload);
	if (!validation.valid) {
		return { mission: null, errors: validation.errors };
	}

	const now = new Date().toISOString();
	const updates = sanitizeMissionInput(payload);
	const mission = buildMission(
		{
			...existing,
			...updates,
			id: existing.id,
			createdAt: existing.createdAt,
			updatedAt: now,
		},
		{ now },
	);

	missionStore.set(mission.id, mission);

	// TODO: Rebuild or mark KnowledgeContext stale when mission inputs change.
	// TODO: Add adapter hooks so Mission changes can update legacy post metadata.

	return { mission, errors: [] };
}

export function deleteMission(id) {
	const mission = getMission(id);
	if (!mission) return null;
	missionStore.delete(mission.id);

	// TODO: Decide whether Mission delete should become archive-only before persistence.
	// TODO: Keep CampaignPlan, CampaignAsset, ReviewDecision, and PublishingJob orphan
	// handling explicit when those modules exist.

	return mission;
}

export function clearMissionsForTesting() {
	missionStore.clear();
}

