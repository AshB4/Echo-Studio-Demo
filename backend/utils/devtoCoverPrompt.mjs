const STYLE_BLOCK = `Style:
Retro 64-bit pixel art with cozy late-night hacker vibes, subtle CRT glow, rich lighting, and dense environmental storytelling. Include the recurring raccoon mascot: clever, determined, slightly sleep-deprived, and surrounded by tiny humorous details. Aspect ratio 16:9. Pixel art only.`;

function cleanString(value, fallback = "") {
	const text = String(value ?? "").trim();
	return text || fallback;
}

function excerptFromBody(body = "", maxLength = 360) {
	const text = cleanString(body)
		.replace(/^#+\s+/gm, "")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/[*_`>#-]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength - 1).trimEnd()}...`;
}

function metadataFields(article = {}) {
	const metadata = article.metadata || {};
	return metadata.coverImagePromptFields || article.coverImagePromptFields || {};
}

export function normalizeDevtoCoverPromptFields(article = {}, overrides = {}) {
	const fields = metadataFields(article);
	const title = cleanString(
		overrides.articleTitle ?? fields.articleTitle ?? article.title,
		"Untitled PostPunk article",
	);
	const summary = cleanString(
		overrides.articleSummary ??
			fields.articleSummary ??
			article.excerpt ??
			article.description ??
			article.metadata?.excerpt ??
			excerptFromBody(article.body || article.content || article.markdown),
		"A practical PostPunk article about building, debugging, and shipping automation with more clarity.",
	);
	const primaryLesson = cleanString(
		overrides.primaryLesson ?? fields.primaryLesson ?? article.metadata?.primaryLesson,
		"What should developers learn from this article?",
	);
	const visualMetaphor = cleanString(
		overrides.visualMetaphor ?? fields.visualMetaphor ?? article.metadata?.visualMetaphor,
		"A late-night debugging desk where a small technical problem becomes a visible system map.",
	);
	const requiredText = cleanString(
		overrides.requiredText ??
			overrides.requiredOnScreenText ??
			fields.requiredText ??
			fields.requiredOnScreenText ??
			article.metadata?.requiredText ??
			article.metadata?.requiredOnScreenText,
		title,
	);

	return {
		articleTitle: title,
		articleSummary: summary,
		primaryLesson,
		visualMetaphor,
		requiredText,
	};
}

export function buildDevtoCoverPrompt(article = {}, overrides = {}) {
	const fields = normalizeDevtoCoverPromptFields(article, overrides);
	return `Create a DEV.to article illustration in a consistent PostPunk style.

${STYLE_BLOCK}

Article:
Title: ${fields.articleTitle}

Summary: ${fields.articleSummary}

Lesson: ${fields.primaryLesson}

Visual Metaphor: ${fields.visualMetaphor}

Required Text: ${fields.requiredText}

The scene should instantly communicate the article topic, spark curiosity, and make developers think: "I need to know the story behind this." Maintain the exact same visual identity across all future PostPunk article illustrations.`;
}

export function attachDevtoCoverPrompt(article = {}, overrides = {}) {
	const fields = normalizeDevtoCoverPromptFields(article, overrides);
	const prompt = buildDevtoCoverPrompt(article, fields);
	return {
		...article,
		coverImagePrompt: prompt,
		metadata: {
			...(article.metadata || {}),
			coverImagePrompt: prompt,
			coverImagePromptFields: fields,
			coverImageStatus: cleanString(article.metadata?.coverImageStatus, "prompt_ready"),
		},
	};
}
