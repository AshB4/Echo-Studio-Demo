import express from "express";
import {
	createCampaignPlan,
	deleteCampaignPlan,
	generateCampaignPlan,
	getCampaignPlan,
	listCampaignPlans,
	updateCampaignPlan,
} from "./campaign-planner.service.mjs";

const router = express.Router();

router.get("/", (req, res) => {
	const missionId =
		typeof req.query.missionId === "string" ? req.query.missionId.trim() : null;
	return res.json({ data: listCampaignPlans({ missionId }) });
});

router.get("/:id", (req, res) => {
	const campaignPlan = getCampaignPlan(req.params.id);
	if (!campaignPlan) {
		return res.status(404).json({ message: "CampaignPlan not found" });
	}
	return res.json({ data: campaignPlan });
});

router.post("/", (req, res) => {
	const { campaignPlan, errors } = createCampaignPlan(req.body ?? {});
	if (errors.length > 0) {
		return res.status(400).json({ message: "Validation failed", errors });
	}
	return res.status(201).json({ data: campaignPlan });
});

router.patch("/:id", (req, res) => {
	const { campaignPlan, errors } = updateCampaignPlan(req.params.id, req.body ?? {});
	if (errors.length > 0) {
		const status = errors.some((error) => error.field === "id") ? 404 : 400;
		return res.status(status).json({ message: "Validation failed", errors });
	}
	return res.json({ data: campaignPlan });
});

router.delete("/:id", (req, res) => {
	const campaignPlan = deleteCampaignPlan(req.params.id);
	if (!campaignPlan) {
		return res.status(404).json({ message: "CampaignPlan not found" });
	}
	return res.json({ data: campaignPlan });
});

router.post("/generate", (req, res) => {
	const { campaignPlan, errors } = generateCampaignPlan(req.body ?? {});
	if (errors.length > 0) {
		return res.status(400).json({ message: "Validation failed", errors });
	}
	return res.status(201).json({ data: campaignPlan });
});

export default router;

