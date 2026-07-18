import { buildAssetBlueprint } from "./asset-blueprints.types.mjs";
import {
	validateAssetBlueprintCreate,
	validateAssetBlueprintUpdate,
	validateBlueprintGenerate,
} from "./asset-blueprints.validation.mjs";

const blueprintStore = new Map();

function includesText(value, text) {
	return String(value || "").toLowerCase().includes(text);
}

function deriveKnowledgeSources({ platform, campaignPlan = {} }) {
	const sources = [
		{ sourceId: campaignPlan.knowledgeContextId || "", sourceType: "brand", reason: "Apply brand voice constraints." },
		{ sourceId: campaignPlan.knowledgeContextId || "", sourceType: "product", reason: "Ground asset in product and offer facts." },
	];
	if (platform) {
		sources.push({
			sourceId: campaignPlan.knowledgeContextId || "",
			sourceType: "platform",
			reason: `Apply ${platform} platform rules.`,
		});
	}
	return sources;
}

function blueprintRulesForAsset(asset = {}) {
	const platform = String(asset.platform || "").toLowerCase();
	const type = String(asset.type || "").toLowerCase();
	const rules = {
		persona: "Professional",
		hookStrategy: "Value-first",
		ctaStrategy: "Soft CTA",
		seoStrategy: "",
		generationInstructions: {
			style: "Clear",
			length: "Medium",
			format: "Brief",
			specialRequirements: [],
		},
	};

	if (includesText(platform, "pinterest") || includesText(type, "pinterest")) {
		rules.persona = "Professional";
		rules.hookStrategy = "Curiosity";
		rules.generationInstructions.format = "Vertical Pin";
		rules.generationInstructions.specialRequirements.push("Use visual-first framing.");
	}

	if (includesText(platform, "blog") || includesText(type, "blog")) {
		rules.generationInstructions.length = "Long";
		rules.generationInstructions.format = "Article Outline";
		rules.seoStrategy = "Evergreen";
	}

	if (includesText(platform, "email") || includesText(type, "email")) {
		rules.ctaStrategy = "Direct";
		rules.generationInstructions.format = "Email";
	}

	if (includesText(platform, "landing") || includesText(type, "landing")) {
		rules.ctaStrategy = "Conversion";
		rules.generationInstructions.format = "Landing Page";
	}

	if (includesText(platform, "dev.to") || includesText(type, "devto")) {
		rules.generationInstructions.length = "Long";
		rules.generationInstructions.format = "Technical Article";
		rules.seoStrategy = rules.seoStrategy || "Evergreen";
	}

	return rules;
}

function sanitizeBlueprintInput(input = {}) {
	const next = { ...input };
	for (const field of [
		"campaignPlanId",
		"recommendedAssetId",
		"missionId",
		"knowledgeContextId",
		"assetType",
		"platform",
		"goal",
		"purpose",
		"audience",
		"persona",
		"tone",
		"hookStrategy",
		"ctaStrategy",
		"seoStrategy",
	]) {
		if (typeof next[field] === "string") next[field] = next[field].trim();
	}
	return next;
}

export function createAssetBlueprint(payload = {}) {
	const validation = validateAssetBlueprintCreate(payload);
	if (!validation.valid) return { assetBlueprint: null, errors: validation.errors };
	const assetBlueprint = buildAssetBlueprint(sanitizeBlueprintInput(payload));
	blueprintStore.set(assetBlueprint.id, assetBlueprint);

	// TODO: Persist AssetBlueprints after storage is selected.
	// TODO: Connect approved blueprints to future AI Asset Generator.

	return { assetBlueprint, errors: [] };
}

export function getAssetBlueprint(id) {
	return blueprintStore.get(String(id || "")) || null;
}

export function listAssetBlueprints({ campaignPlanId = null, missionId = null } = {}) {
	return Array.from(blueprintStore.values())
		.filter((blueprint) => !campaignPlanId || blueprint.campaignPlanId === campaignPlanId)
		.filter((blueprint) => !missionId || blueprint.missionId === missionId)
		.sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));
}

export function updateAssetBlueprint(id, payload = {}) {
	const existing = getAssetBlueprint(id);
	if (!existing) {
		return { assetBlueprint: null, errors: [{ field: "id", message: "AssetBlueprint not found" }] };
	}
	const validation = validateAssetBlueprintUpdate(payload);
	if (!validation.valid) return { assetBlueprint: null, errors: validation.errors };
	const now = new Date().toISOString();
	const assetBlueprint = buildAssetBlueprint(
		{
			...existing,
			...sanitizeBlueprintInput(payload),
			id: existing.id,
			createdAt: existing.createdAt,
			updatedAt: now,
		},
		{ now },
	);
	blueprintStore.set(assetBlueprint.id, assetBlueprint);

	// TODO: Add version history before blueprints feed generation.
	// TODO: Add A/B blueprint variants.

	return { assetBlueprint, errors: [] };
}

export function deleteAssetBlueprint(id) {
	const assetBlueprint = getAssetBlueprint(id);
	if (!assetBlueprint) return null;
	blueprintStore.delete(assetBlueprint.id);
	return assetBlueprint;
}

export function generateBlueprints(payload = {}) {
	const validation = validateBlueprintGenerate(payload);
	if (!validation.valid) return { assetBlueprints: null, errors: validation.errors };

	const campaignPlan = payload.campaignPlan;
	const blueprints = campaignPlan.recommendedAssets.map((asset) => {
		const rules = blueprintRulesForAsset(asset);
		const assetBlueprint = buildAssetBlueprint({
			campaignPlanId: campaignPlan.id || null,
			recommendedAssetId: asset.id || null,
			missionId: campaignPlan.missionId || null,
			knowledgeContextId: campaignPlan.knowledgeContextId || null,
			status: "ready",
			assetType: asset.type || "",
			platform: asset.platform || "",
			goal: campaignPlan.goal || "",
			purpose: asset.purpose || "",
			audience: campaignPlan.audience || "",
			persona: rules.persona,
			tone: "Clear and practical",
			hookStrategy: rules.hookStrategy,
			ctaStrategy: rules.ctaStrategy,
			seoStrategy: rules.seoStrategy,
			knowledgeSources: deriveKnowledgeSources({
				platform: asset.platform,
				campaignPlan,
			}),
			generationInstructions: rules.generationInstructions,
			reviewChecklist: [
				"follows brand voice",
				"matches platform rules",
				"clear CTA",
				"correct persona",
				"SEO reviewed",
			],
			metadata: {
				generatedBy: "asset-blueprint-rules",
				priority: asset.priority ?? null,
				reason: asset.reason || "",
			},
		});
		blueprintStore.set(assetBlueprint.id, assetBlueprint);
		return assetBlueprint;
	});

	// TODO: Add LLM prompt assembly from approved blueprints.
	// TODO: Add prompt templates and multi-model routing.
	// TODO: Add image generation settings for visual assets.
	// TODO: Add SEO optimization and brand adaptation.
	// TODO: Feed performance feedback into future blueprint rules.

	return { assetBlueprints: blueprints, errors: [] };
}

export function clearAssetBlueprintsForTesting() {
	blueprintStore.clear();
}

