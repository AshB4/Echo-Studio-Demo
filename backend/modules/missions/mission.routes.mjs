import express from "express";
import {
	createMission,
	deleteMission,
	getMission,
	listMissions,
	updateMission,
} from "./mission.service.mjs";

const router = express.Router();

router.get("/", (_req, res) => {
	return res.json({ data: listMissions() });
});

router.get("/:id", (req, res) => {
	const mission = getMission(req.params.id);
	if (!mission) {
		return res.status(404).json({ message: "Mission not found" });
	}
	return res.json({ data: mission });
});

router.post("/", (req, res) => {
	const { mission, errors } = createMission(req.body ?? {});
	if (errors.length > 0) {
		return res.status(400).json({ message: "Validation failed", errors });
	}
	return res.status(201).json({ data: mission });
});

router.patch("/:id", (req, res) => {
	const { mission, errors } = updateMission(req.params.id, req.body ?? {});
	if (errors.length > 0) {
		const status = errors.some((error) => error.field === "id") ? 404 : 400;
		return res.status(status).json({ message: "Validation failed", errors });
	}
	return res.json({ data: mission });
});

router.delete("/:id", (req, res) => {
	const mission = deleteMission(req.params.id);
	if (!mission) {
		return res.status(404).json({ message: "Mission not found" });
	}
	return res.json({ data: mission });
});

export default router;

