import express from "express";
import {
	createCampaignAsset,
	deleteCampaignAsset,
	generateCampaignAsset,
	getCampaignAsset,
	listCampaignAssets,
	updateCampaignAsset,
} from "./ai-generator.service.mjs";

export const aiGeneratorRouter = express.Router();
export const campaignAssetsRouter = express.Router();

aiGeneratorRouter.post("/generate", (req, res) => {
	const { campaignAsset, errors } = generateCampaignAsset(req.body ?? {});
	if (errors.length > 0) {
		return res.status(400).json({ message: "Validation failed", errors });
	}
	return res.status(201).json({ data: campaignAsset });
});

campaignAssetsRouter.get("/", (req, res) => {
	const missionId = typeof req.query.missionId === "string" ? req.query.missionId.trim() : null;
	const campaignPlanId =
		typeof req.query.campaignPlanId === "string" ? req.query.campaignPlanId.trim() : null;
	const assetBlueprintId =
		typeof req.query.assetBlueprintId === "string" ? req.query.assetBlueprintId.trim() : null;
	return res.json({ data: listCampaignAssets({ missionId, campaignPlanId, assetBlueprintId }) });
});

campaignAssetsRouter.get("/:id", (req, res) => {
	const campaignAsset = getCampaignAsset(req.params.id);
	if (!campaignAsset) {
		return res.status(404).json({ message: "CampaignAsset not found" });
	}
	return res.json({ data: campaignAsset });
});

campaignAssetsRouter.post("/", (req, res) => {
	const { campaignAsset, errors } = createCampaignAsset(req.body ?? {});
	if (errors.length > 0) {
		return res.status(400).json({ message: "Validation failed", errors });
	}
	return res.status(201).json({ data: campaignAsset });
});

campaignAssetsRouter.patch("/:id", (req, res) => {
	const { campaignAsset, errors } = updateCampaignAsset(req.params.id, req.body ?? {});
	if (errors.length > 0) {
		const status = errors.some((error) => error.field === "id") ? 404 : 400;
		return res.status(status).json({ message: "Validation failed", errors });
	}
	return res.json({ data: campaignAsset });
});

campaignAssetsRouter.delete("/:id", (req, res) => {
	const campaignAsset = deleteCampaignAsset(req.params.id);
	if (!campaignAsset) {
		return res.status(404).json({ message: "CampaignAsset not found" });
	}
	return res.json({ data: campaignAsset });
});

export default aiGeneratorRouter;
