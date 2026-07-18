import {
	buildCampaignPlan,
	createRecommendedAsset,
} from "./campaign-planner.types.mjs";
import {
	validateCampaignPlanCreate,
	validateCampaignPlanGenerate,
	validateCampaignPlanUpdate,
} from "./campaign-planner.validation.mjs";

const campaignPlanStore = new Map();

function includesText(value, pattern) {
	return String(value || "").toLowerCase().includes(pattern);
}

function readKnowledgeText(knowledgeContext = {}) {
	return JSON.stringify(knowledgeContext || {}).toLowerCase();
}

function inferPrimaryPlatform({ mission = {}, knowledgeContext = {} } = {}) {
	const candidates = [
		mission.primaryPlatform,
		mission.platform,
		Array.isArray(mission.channels) ? mission.channels[0] : "",
		knowledgeContext.primaryPlatform,
	];
	const knowledgeText = readKnowledgeText(knowledgeContext);
	const match = candidates.find((candidate) => String(candidate || "").trim());
	if (match) return String(match).trim();
	if (knowledgeText.includes("pinterest")) return "Pinterest";
	if (knowledgeText.includes("dev.to") || knowledgeText.includes("devto")) return "Dev.to";
	if (knowledgeText.includes("email")) return "Email";
	return "Email";
}

function inferSecondaryPlatforms({ primaryPlatform, mission = {}, knowledgeContext = {} }) {
	const raw = [
		...(Array.isArray(mission.secondaryPlatforms) ? mission.secondaryPlatforms : []),
		...(Array.isArray(mission.channels) ? mission.channels : []),
	];
	const knowledgeText = readKnowledgeText(knowledgeContext);
	if (knowledgeText.includes("pinterest")) raw.push("Pinterest");
	if (knowledgeText.includes("dev.to") || knowledgeText.includes("devto")) raw.push("Dev.to");
	if (knowledgeText.includes("blog")) raw.push("Blog");
	if (knowledgeText.includes("email")) raw.push("Email");
	return Array.from(
		new Set(
			raw
				.map((platform) => String(platform || "").trim())
				.filter(Boolean)
				.filter((platform) => platform.toLowerCase() !== String(primaryPlatform).toLowerCase()),
		),
	);
}

function addAsset(assets, input) {
	const key = `${input.type}:${input.platform}`.toLowerCase();
	if (assets.some((asset) => `${asset.type}:${asset.platform}`.toLowerCase() === key)) return;
	assets.push(createRecommendedAsset(input));
}

function generateRecommendedAssets({ goal, audience, primaryPlatform, secondaryPlatforms }) {
	const assets = [];
	const platforms = [primaryPlatform, ...secondaryPlatforms].join(" ").toLowerCase();
	const goalText = String(goal || "").toLowerCase();
	const audienceText = String(audience || "").toLowerCase();

	if (platforms.includes("pinterest")) {
		addAsset(assets, {
			type: "pinterest_pin",
			purpose: "Discovery",
			platform: "Pinterest",
			priority: 1,
			reason: "Pinterest is present in the platform mix, so visual discovery assets should lead.",
			status: "planned",
		});
	}

	if (audienceText.includes("developer") || audienceText.includes("developers")) {
		addAsset(assets, {
			type: "devto_article",
			purpose: "Authority",
			platform: "Dev.to",
			priority: 2,
			reason: "Developer audiences respond better to useful article-style proof than generic promo.",
			status: "planned",
		});
	}

	if (goalText.includes("authority")) {
		addAsset(assets, {
			type: "blog_article",
			purpose: "Authority",
			platform: "Blog",
			priority: 2,
			reason: "Authority goals need a durable long-form proof asset.",
			status: "planned",
		});
		addAsset(assets, {
			type: "pinterest_pin",
			purpose: "Authority Distribution",
			platform: "Pinterest",
			priority: 3,
			reason: "Pinterest can distribute authority content visually over time.",
			status: "planned",
		});
	}

	if (goalText.includes("launch")) {
		addAsset(assets, {
			type: "email_announcement",
			purpose: "Launch",
			platform: "Email",
			priority: 1,
			reason: "Launch goals need a direct owned-channel announcement.",
			status: "planned",
		});
		addAsset(assets, {
			type: "landing_page_copy",
			purpose: "Conversion",
			platform: "Landing Page",
			priority: 1,
			reason: "Launch traffic needs a clear destination and conversion path.",
			status: "planned",
		});
	}

	if (assets.length === 0) {
		addAsset(assets, {
			type: "campaign_brief",
			purpose: "Planning",
			platform: primaryPlatform || "General",
			priority: 1,
			reason: "No specific rule matched, so start with a concise campaign brief.",
			status: "planned",
		});
	}

	return assets.sort((left, right) => left.priority - right.priority);
}

function createTimeline(recommendedAssets) {
	const assetNames = recommendedAssets.map((asset) => asset.type);
	return [
		{
			phase: "Week 1",
			objectives: ["Confirm positioning", "Prepare core offer and channel requirements"],
			deliverables: ["Campaign brief", ...assetNames.slice(0, 2)],
		},
		{
			phase: "Week 2",
			objectives: ["Create first campaign assets", "Prepare review checklist"],
			deliverables: assetNames.slice(2, 4),
		},
		{
			phase: "Week 3",
			objectives: ["Publish or export approved assets", "Monitor early signals"],
			deliverables: ["Publishing schedule", "Initial performance notes"],
		},
		{
			phase: "Week 4",
			objectives: ["Review results", "Identify reusable winners"],
			deliverables: ["Campaign retrospective", "Next-mission recommendations"],
		},
	];
}

function createSuccessMetrics(goal = "") {
	const launch = includesText(goal, "launch");
	const authority = includesText(goal, "authority");
	return {
		traffic: launch || authority ? 500 : 250,
		emailSubscribers: launch ? 50 : 20,
		sales: launch ? 25 : 10,
		clicks: 100,
		saves: 50,
		followers: authority ? 100 : 25,
	};
}

function createRisks({ goal, primaryPlatform }) {
	const risks = [
		{
			title: "Message spread too thin",
			severity: "medium",
			mitigation: "Keep one primary offer and reuse it across planned assets.",
		},
	];
	if (includesText(goal, "launch")) {
		risks.push({
			title: "Launch deadline pressure",
			severity: "high",
			mitigation: "Approve the landing page and email before secondary channel assets.",
		});
	}
	if (String(primaryPlatform || "").toLowerCase().includes("pinterest")) {
		risks.push({
			title: "Visual asset dependency",
			severity: "medium",
			mitigation: "Confirm image availability before creating Pinterest execution assets.",
		});
	}
	return risks;
}

function sanitizeCampaignPlanInput(input = {}) {
	const next = { ...input };
	for (const field of ["goal", "audience", "primaryPlatform", "notes"]) {
		if (typeof next[field] === "string") next[field] = next[field].trim();
	}
	return next;
}

export function createCampaignPlan(payload = {}) {
	const validation = validateCampaignPlanCreate(payload);
	if (!validation.valid) return { campaignPlan: null, errors: validation.errors };
	const campaignPlan = buildCampaignPlan(sanitizeCampaignPlanInput(payload));
	campaignPlanStore.set(campaignPlan.id, campaignPlan);

	// TODO: Persist CampaignPlans after storage is selected.
	// TODO: Connect approved plans to future CampaignAsset generation.

	return { campaignPlan, errors: [] };
}

export function getCampaignPlan(id) {
	return campaignPlanStore.get(String(id || "")) || null;
}

export function listCampaignPlans({ missionId = null } = {}) {
	const plans = Array.from(campaignPlanStore.values()).sort((left, right) =>
		String(right.createdAt || "").localeCompare(String(left.createdAt || "")),
	);
	if (!missionId) return plans;
	return plans.filter((plan) => plan.missionId === missionId);
}

export function updateCampaignPlan(id, payload = {}) {
	const existing = getCampaignPlan(id);
	if (!existing) {
		return { campaignPlan: null, errors: [{ field: "id", message: "CampaignPlan not found" }] };
	}
	const validation = validateCampaignPlanUpdate(payload);
	if (!validation.valid) return { campaignPlan: null, errors: validation.errors };
	const now = new Date().toISOString();
	const campaignPlan = buildCampaignPlan(
		{
			...existing,
			...sanitizeCampaignPlanInput(payload),
			id: existing.id,
			createdAt: existing.createdAt,
			updatedAt: now,
		},
		{ now },
	);
	campaignPlanStore.set(campaignPlan.id, campaignPlan);

	// TODO: Add version history before plans feed asset generation.

	return { campaignPlan, errors: [] };
}

export function deleteCampaignPlan(id) {
	const campaignPlan = getCampaignPlan(id);
	if (!campaignPlan) return null;
	campaignPlanStore.delete(campaignPlan.id);
	return campaignPlan;
}

export function generateCampaignPlan(payload = {}) {
	const validation = validateCampaignPlanGenerate(payload);
	if (!validation.valid) return { campaignPlan: null, errors: validation.errors };

	const knowledgeContext = payload.knowledgeContext || {};
	const mission = payload.mission || {};
	const goal = String(mission.goal || knowledgeContext.goal || payload.goal || "").trim();
	const audience = String(
		mission.audience || knowledgeContext.audience || payload.audience || "",
	).trim();
	const primaryPlatform = inferPrimaryPlatform({ mission, knowledgeContext });
	const secondaryPlatforms = inferSecondaryPlatforms({
		primaryPlatform,
		mission,
		knowledgeContext,
	});
	const recommendedAssets = generateRecommendedAssets({
		goal,
		audience,
		primaryPlatform,
		secondaryPlatforms,
	});
	const campaignPlan = buildCampaignPlan({
		missionId: payload.missionId,
		knowledgeContextId: knowledgeContext.id || payload.knowledgeContextId || null,
		status: "ready",
		goal,
		audience,
		primaryPlatform,
		secondaryPlatforms,
		recommendedAssets,
		timeline: createTimeline(recommendedAssets),
		successMetrics: createSuccessMetrics(goal),
		risks: createRisks({ goal, primaryPlatform }),
		notes: "Deterministic Phase 3 plan. No AI planning or asset generation was used.",
	});
	campaignPlanStore.set(campaignPlan.id, campaignPlan);

	// TODO: Replace deterministic rules with AI planning after KnowledgeContext is stable.
	// TODO: Add LLM reasoning with cited evidence from KnowledgeContext.
	// TODO: Integrate winner analysis and analytics feedback.
	// TODO: Add platform optimization, budget allocation, calendars, and seasonality.

	return { campaignPlan, errors: [] };
}

export function clearCampaignPlansForTesting() {
	campaignPlanStore.clear();
}

