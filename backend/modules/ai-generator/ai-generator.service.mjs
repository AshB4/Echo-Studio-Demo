import {
	buildCampaignAsset,
	createGenerationProfile,
	createPlaceholderCampaignAssetContent,
} from "./ai-generator.types.mjs";
import {
	validateCampaignAssetCreate,
	validateCampaignAssetUpdate,
	validateGenerateRequest,
} from "./ai-generator.validation.mjs";

const campaignAssetStore = new Map();

function sanitizeCampaignAssetInput(input = {}) {
	const next = { ...input };
	for (const field of [
		"missionId",
		"campaignPlanId",
		"assetBlueprintId",
		"assetType",
		"platform",
		"title",
		"content",
	]) {
		if (typeof next[field] === "string") next[field] = next[field].trim();
	}
	return next;
}

export function createCampaignAsset(payload = {}) {
	const validation = validateCampaignAssetCreate(payload);
	if (!validation.valid) return { campaignAsset: null, errors: validation.errors };

	const campaignAsset = buildCampaignAsset(sanitizeCampaignAssetInput(payload));
	campaignAssetStore.set(campaignAsset.id, campaignAsset);

	// TODO: Persist CampaignAssets after storage is selected.
	// TODO: Connect approved CampaignAssets to future ReviewDecision workflow.

	return { campaignAsset, errors: [] };
}

export function getCampaignAsset(id) {
	return campaignAssetStore.get(String(id || "")) || null;
}

export function listCampaignAssets({
	missionId = null,
	campaignPlanId = null,
	assetBlueprintId = null,
} = {}) {
	return Array.from(campaignAssetStore.values())
		.filter((asset) => !missionId || asset.missionId === missionId)
		.filter((asset) => !campaignPlanId || asset.campaignPlanId === campaignPlanId)
		.filter((asset) => !assetBlueprintId || asset.assetBlueprintId === assetBlueprintId)
		.sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));
}

export function updateCampaignAsset(id, payload = {}) {
	const existing = getCampaignAsset(id);
	if (!existing) {
		return { campaignAsset: null, errors: [{ field: "id", message: "CampaignAsset not found" }] };
	}

	const validation = validateCampaignAssetUpdate(payload);
	if (!validation.valid) return { campaignAsset: null, errors: validation.errors };

	const now = new Date().toISOString();
	const campaignAsset = buildCampaignAsset(
		{
			...existing,
			...sanitizeCampaignAssetInput(payload),
			id: existing.id,
			createdAt: existing.createdAt,
			updatedAt: now,
		},
		{ now },
	);
	campaignAssetStore.set(campaignAsset.id, campaignAsset);

	// TODO: Add CampaignAsset version history before generated content becomes editable.
	// TODO: Add token accounting and cost tracking metadata.

	return { campaignAsset, errors: [] };
}

export function deleteCampaignAsset(id) {
	const campaignAsset = getCampaignAsset(id);
	if (!campaignAsset) return null;
	campaignAssetStore.delete(campaignAsset.id);
	return campaignAsset;
}

export function generateCampaignAsset(payload = {}) {
	const validation = validateGenerateRequest(payload);
	if (!validation.valid) return { campaignAsset: null, errors: validation.errors };

	const { assetBlueprint } = payload;
	const generationProfile = createGenerationProfile(assetBlueprint);
	const placeholderContent = createPlaceholderCampaignAssetContent(assetBlueprint);
	const campaignAsset = buildCampaignAsset({
		missionId: assetBlueprint.missionId || null,
		campaignPlanId: assetBlueprint.campaignPlanId || null,
		assetBlueprintId: assetBlueprint.id || null,
		status: "generated",
		assetType: assetBlueprint.assetType || "",
		platform: assetBlueprint.platform || "",
		title: placeholderContent.title,
		content: placeholderContent.content,
		metadata: {
			generatedBy: "ai-generator-placeholder",
			blueprintStatus: assetBlueprint.status || null,
			knowledgeContextId: assetBlueprint.knowledgeContextId || null,
		},
		generationProfile,
	});

	campaignAssetStore.set(campaignAsset.id, campaignAsset);

	// TODO: Add OpenAI integration.
	// TODO: Add Anthropic integration.
	// TODO: Add streaming responses.
	// TODO: Add prompt assembly from AssetBlueprint and KnowledgeContext.
	// TODO: Add structured output validation for generated assets.
	// TODO: Add image generation for visual asset types.
	// TODO: Add multi-model routing.
	// TODO: Add cost tracking and token accounting.
	// TODO: Add prompt caching.
	// TODO: Add retry handling.

	return { campaignAsset, errors: [] };
}

export function clearCampaignAssetsForTesting() {
	campaignAssetStore.clear();
}
