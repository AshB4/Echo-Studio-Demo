import express from "express";
import {
	assembleKnowledgeContext,
	deleteKnowledgeSource,
	listKnowledgeSources,
	registerKnowledgeSource,
} from "./knowledge-retrieval.service.mjs";

const router = express.Router();

router.get("/", (req, res) => {
	const includeDisabled =
		String(req.query.includeDisabled || "true").toLowerCase() !== "false";
	const type = typeof req.query.type === "string" ? req.query.type.trim() : null;
	return res.json({ data: listKnowledgeSources({ includeDisabled, type }) });
});

router.post("/", (req, res) => {
	const { source, errors } = registerKnowledgeSource(req.body ?? {});
	if (errors.length > 0) {
		return res.status(400).json({ message: "Validation failed", errors });
	}
	return res.status(201).json({ data: source });
});

router.delete("/:id", (req, res) => {
	const source = deleteKnowledgeSource(req.params.id);
	if (!source) {
		return res.status(404).json({ message: "Knowledge source not found" });
	}
	return res.json({ data: source });
});

router.post("/assemble", (req, res) => {
	const { knowledgeContext, errors } = assembleKnowledgeContext(req.body ?? {});
	if (errors.length > 0) {
		return res.status(400).json({ message: "Validation failed", errors });
	}
	return res.json({ knowledgeContext });
});

export default router;

