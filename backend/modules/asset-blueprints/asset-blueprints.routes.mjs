import express from "express";
import {
	createAssetBlueprint,
	deleteAssetBlueprint,
	generateBlueprints,
	getAssetBlueprint,
	listAssetBlueprints,
	updateAssetBlueprint,
} from "./asset-blueprints.service.mjs";

const router = express.Router();

router.get("/", (req, res) => {
	const campaignPlanId =
		typeof req.query.campaignPlanId === "string" ? req.query.campaignPlanId.trim() : null;
	const missionId =
		typeof req.query.missionId === "string" ? req.query.missionId.trim() : null;
	return res.json({ data: listAssetBlueprints({ campaignPlanId, missionId }) });
});

router.post("/generate", (req, res) => {
	const { assetBlueprints, errors } = generateBlueprints(req.body ?? {});
	if (errors.length > 0) {
		return res.status(400).json({ message: "Validation failed", errors });
	}
	return res.status(201).json({ data: assetBlueprints });
});

router.get("/:id", (req, res) => {
	const assetBlueprint = getAssetBlueprint(req.params.id);
	if (!assetBlueprint) {
		return res.status(404).json({ message: "AssetBlueprint not found" });
	}
	return res.json({ data: assetBlueprint });
});

router.post("/", (req, res) => {
	const { assetBlueprint, errors } = createAssetBlueprint(req.body ?? {});
	if (errors.length > 0) {
		return res.status(400).json({ message: "Validation failed", errors });
	}
	return res.status(201).json({ data: assetBlueprint });
});

router.patch("/:id", (req, res) => {
	const { assetBlueprint, errors } = updateAssetBlueprint(req.params.id, req.body ?? {});
	if (errors.length > 0) {
		const status = errors.some((error) => error.field === "id") ? 404 : 400;
		return res.status(status).json({ message: "Validation failed", errors });
	}
	return res.json({ data: assetBlueprint });
});

router.delete("/:id", (req, res) => {
	const assetBlueprint = deleteAssetBlueprint(req.params.id);
	if (!assetBlueprint) {
		return res.status(404).json({ message: "AssetBlueprint not found" });
	}
	return res.json({ data: assetBlueprint });
});

export default router;

