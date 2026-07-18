import express from "express";
import {
	createKnowledgeContext,
	deleteKnowledgeContext,
	getKnowledgeContext,
	listKnowledgeContexts,
	updateKnowledgeContext,
} from "./knowledge.service.mjs";

const router = express.Router();

router.get("/", (req, res) => {
	const missionId =
		typeof req.query.missionId === "string" ? req.query.missionId.trim() : null;
	return res.json({ data: listKnowledgeContexts({ missionId }) });
});

router.get("/:id", (req, res) => {
	const knowledgeContext = getKnowledgeContext(req.params.id);
	if (!knowledgeContext) {
		return res.status(404).json({ message: "KnowledgeContext not found" });
	}
	return res.json({ data: knowledgeContext });
});

router.post("/", (req, res) => {
	const { knowledgeContext, errors } = createKnowledgeContext(req.body ?? {});
	if (errors.length > 0) {
		return res.status(400).json({ message: "Validation failed", errors });
	}
	return res.status(201).json({ data: knowledgeContext });
});

router.patch("/:id", (req, res) => {
	const { knowledgeContext, errors } = updateKnowledgeContext(
		req.params.id,
		req.body ?? {},
	);
	if (errors.length > 0) {
		const status = errors.some((error) => error.field === "id") ? 404 : 400;
		return res.status(status).json({ message: "Validation failed", errors });
	}
	return res.json({ data: knowledgeContext });
});

router.delete("/:id", (req, res) => {
	const knowledgeContext = deleteKnowledgeContext(req.params.id);
	if (!knowledgeContext) {
		return res.status(404).json({ message: "KnowledgeContext not found" });
	}
	return res.json({ data: knowledgeContext });
});

export default router;

