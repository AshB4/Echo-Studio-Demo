import { randomUUID } from "crypto";

export const CAMPAIGN_PLAN_STATUSES = Object.freeze([
	"draft",
	"planning",
	"ready",
	"approved",
	"archived",
]);

export const DEFAULT_CAMPAIGN_PLAN_STATUS = "draft";

export const RECOMMENDED_ASSET_STATUSES = Object.freeze([
	"planned",
	"accepted",
	"rejected",
	"deferred",
]);

export const TIMELINE_PHASES = Object.freeze([
	"Week 1",
	"Week 2",
	"Week 3",
	"Week 4",
]);

export const SUCCESS_METRIC_KEYS = Object.freeze([
	"traffic",
	"emailSubscribers",
	"sales",
	"clicks",
	"saves",
	"followers",
]);

const PLAN_STATUS_SET = new Set(CAMPAIGN_PLAN_STATUSES);
const ASSET_STATUS_SET = new Set(RECOMMENDED_ASSET_STATUSES);

export function createCampaignPlanId() {
	return `cp_${randomUUID()}`;
}

export function createRecommendedAssetId() {
	return `ra_${randomUUID()}`;
}

export function isCampaignPlanStatus(value) {
	return PLAN_STATUS_SET.has(String(value || ""));
}

export function normalizeCampaignPlanStatus(
	value,
	fallback = DEFAULT_CAMPAIGN_PLAN_STATUS,
) {
	const status = String(value || "").trim().toLowerCase();
	return isCampaignPlanStatus(status) ? status : fallback;
}

export function normalizeRecommendedAssetStatus(value, fallback = "planned") {
	const status = String(value || "").trim().toLowerCase();
	return ASSET_STATUS_SET.has(status) ? status : fallback;
}

export function createRecommendedAsset(input = {}) {
	return {
		id: input.id || createRecommendedAssetId(),
		type: String(input.type || "").trim(),
		purpose: String(input.purpose || "").trim(),
		platform: String(input.platform || "").trim(),
		priority:
			typeof input.priority === "number" && Number.isFinite(input.priority)
				? input.priority
				: 100,
		reason: String(input.reason || "").trim(),
		status: normalizeRecommendedAssetStatus(input.status),
	};
}

export function createDefaultTimeline() {
	return TIMELINE_PHASES.map((phase) => ({
		phase,
		objectives: [],
		deliverables: [],
	}));
}

export function normalizeTimeline(input = null) {
	if (!Array.isArray(input)) return createDefaultTimeline();
	const byPhase = new Map(
		input
			.filter((item) => item && typeof item === "object")
			.map((item) => [String(item.phase || "").trim(), item]),
	);
	return TIMELINE_PHASES.map((phase) => {
		const item = byPhase.get(phase) || {};
		return {
			phase,
			objectives: Array.isArray(item.objectives) ? item.objectives : [],
			deliverables: Array.isArray(item.deliverables) ? item.deliverables : [],
		};
	});
}

export function createDefaultSuccessMetrics() {
	return SUCCESS_METRIC_KEYS.reduce((metrics, key) => {
		metrics[key] = 0;
		return metrics;
	}, {});
}

export function normalizeSuccessMetrics(input = {}) {
	const defaults = createDefaultSuccessMetrics();
	if (!input || typeof input !== "object" || Array.isArray(input)) return defaults;
	return SUCCESS_METRIC_KEYS.reduce((metrics, key) => {
		const value = input[key];
		metrics[key] =
			typeof value === "number" && Number.isFinite(value) && value >= 0
				? value
				: defaults[key];
		return metrics;
	}, {});
}

export function normalizeRisks(input = []) {
	if (!Array.isArray(input)) return [];
	return input
		.filter((risk) => risk && typeof risk === "object")
		.map((risk) => ({
			title: String(risk.title || "").trim(),
			severity: String(risk.severity || "medium").trim().toLowerCase(),
			mitigation: String(risk.mitigation || "").trim(),
		}))
		.filter((risk) => risk.title);
}

export function buildCampaignPlan(input = {}, options = {}) {
	const now = options.now || new Date().toISOString();
	return {
		id: input.id || createCampaignPlanId(),
		missionId: input.missionId || null,
		knowledgeContextId: input.knowledgeContextId || null,
		status: normalizeCampaignPlanStatus(input.status),
		goal: String(input.goal || "").trim(),
		audience: String(input.audience || "").trim(),
		primaryPlatform: String(input.primaryPlatform || "").trim(),
		secondaryPlatforms: Array.isArray(input.secondaryPlatforms)
			? input.secondaryPlatforms.map((platform) => String(platform || "").trim()).filter(Boolean)
			: [],
		recommendedAssets: Array.isArray(input.recommendedAssets)
			? input.recommendedAssets.map(createRecommendedAsset)
			: [],
		timeline: normalizeTimeline(input.timeline),
		successMetrics: normalizeSuccessMetrics(input.successMetrics),
		risks: normalizeRisks(input.risks),
		notes: String(input.notes || "").trim(),
		createdAt: input.createdAt || now,
		updatedAt: input.updatedAt || now,
	};
}

