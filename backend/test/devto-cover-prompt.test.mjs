import assert from "node:assert/strict";
import test from "node:test";
import {
	attachDevtoCoverPrompt,
	buildDevtoCoverPrompt,
	normalizeDevtoCoverPromptFields,
} from "../utils/devtoCoverPrompt.mjs";

test("buildDevtoCoverPrompt uses the compact PostPunk cover image template", () => {
	const prompt = buildDevtoCoverPrompt({
		title: "Automation Needs Receipts",
		excerpt: "A short article about proving automation worked before trusting it.",
		metadata: {
			primaryLesson: "Ship automation with evidence, not vibes.",
			visualMetaphor: "A raccoon checking logs beside a glowing terminal.",
			requiredText: "status: verified",
		},
	});

	assert.match(prompt, /Create a DEV\.to article illustration in a consistent PostPunk style\./);
	assert.match(prompt, /Retro 64-bit pixel art with cozy late-night hacker vibes/);
	assert.match(prompt, /Title: Automation Needs Receipts/);
	assert.match(prompt, /Required Text: status: verified/);
	assert.doesNotMatch(prompt, /ARTICLE-SPECIFIC CONTENT/);
});

test("normalizeDevtoCoverPromptFields accepts legacy requiredOnScreenText", () => {
	const fields = normalizeDevtoCoverPromptFields(
		{ title: "Legacy Field", body: "Body" },
		{ requiredOnScreenText: "build failed: coffee missing" },
	);

	assert.equal(fields.requiredText, "build failed: coffee missing");
});

test("attachDevtoCoverPrompt stores prompt fields on article metadata", () => {
	const article = attachDevtoCoverPrompt(
		{
			title: "PostPunk Images",
			body: "Generating consistent covers for every article.",
		},
		{
			primaryLesson: "Consistent prompts make consistent covers.",
			visualMetaphor: "A raccoon arranging tiny pixel-art thumbnails.",
			requiredText: "cover queued",
		},
	);

	assert.equal(article.metadata.coverImageStatus, "prompt_ready");
	assert.equal(article.metadata.coverImagePromptFields.requiredText, "cover queued");
	assert.match(article.coverImagePrompt, /Required Text: cover queued/);
});
