export const MISSION_STATUSES = Object.freeze([
	"draft",
	"intake_complete",
	"planning",
	"planned",
	"generating_assets",
	"assets_ready",
	"in_review",
	"approved",
	"publishing",
	"live",
	"completed",
	"paused",
	"failed",
	"archived",
]);

export const DEFAULT_MISSION_STATUS = "draft";

const STATUS_SET = new Set(MISSION_STATUSES);

export function isMissionStatus(value) {
	return STATUS_SET.has(String(value || ""));
}

export function normalizeMissionStatus(value, fallback = DEFAULT_MISSION_STATUS) {
	const status = String(value || "").trim().toLowerCase();
	return isMissionStatus(status) ? status : fallback;
}

export function isTerminalMissionStatus(status) {
	return ["completed", "failed", "archived"].includes(
		normalizeMissionStatus(status),
	);
}

