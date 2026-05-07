/** @format */

const PLATFORM_BODY_LIMITS = {
	x: 140,
	twitter: 140,
};

const PLATFORM_MEDIA_RULES = {
	instagram: {
		requiresMedia: true,
		allowedTypes: ["image", "gif", "video"],
	},
	pinterest: {
		requiresMedia: true,
		allowedTypes: ["image", "gif", "video"],
	},
};

const REDDIT_HARD_SELL_PATTERNS = [
	/\bbuy now\b/i,
	/\blimited time\b/i,
	/\bact now\b/i,
	/\bdiscount\b/i,
	/\bsale\b/i,
	/\bpromo code\b/i,
	/\border now\b/i,
	/\bsubscribe now\b/i,
	/\bdon't miss out\b/i,
	/\blink in bio\b/i,
];

const GOBLIN_PATTERNS = [/\bgoblin\b/i, /\blore\b/i, /\bmeme\b/i, /\bprintable\b/i];

const formatAccountHint = (platform, accountId) =>
	accountId ? `${platform} (${accountId})` : platform;

function countLinks(text = "") {
	const matches = String(text).match(/https?:\/\/\S+/gi);
	return matches ? matches.length : 0;
}

function hasHardSellLanguage(text = "") {
	return REDDIT_HARD_SELL_PATTERNS.some((pattern) => pattern.test(String(text)));
}

function containsGoblinSignals(values = []) {
	return values.some((value) => GOBLIN_PATTERNS.some((pattern) => pattern.test(String(value || ""))));
}

function validateRedditGuardrails({
	body = "",
	title = "",
	customText = {},
	useAutoPlatformText = true,
	targets = [],
	metadata = {},
	intendedStatus = "draft",
	postIntent = "",
	includeProductLink = false,
	tags = [],
}) {
	const redditTargets = (Array.isArray(targets) ? targets : []).filter(
		(target) => String(target?.platform || "").toLowerCase() === "reddit",
	);
	if (redditTargets.length === 0) return [];

	const violations = [];
	const subreddit = String(metadata?.redditSubreddit || "").trim();
	const communityReason = String(metadata?.redditCommunityReason || "").trim();
	const postType = String(metadata?.redditPostType || "").trim().toLowerCase();
	const linkMode = String(metadata?.redditLinkMode || "").trim().toLowerCase();
	const overrideCandidates = redditTargets.map((target) => {
		const overrideKey = target.accountId ? `reddit:${target.accountId}` : "reddit";
		return String(
			useAutoPlatformText
				? body
				: customText?.[overrideKey] ?? customText?.reddit ?? body,
		);
	});
	const candidateText = overrideCandidates.join("\n").trim() || String(body || "");
	const linkCount = countLinks(candidateText);
	const goblinAdjacent = containsGoblinSignals([
		title,
		body,
		postType,
		...(Array.isArray(tags) ? tags : []),
		...(Array.isArray(metadata?.contentTags) ? metadata.contentTags : []),
	]);

	if (intendedStatus === "approved") {
		violations.push({
			platform: "reddit",
			accountId: null,
			type: "redditManualReviewRequired",
			message:
				"Reddit posts default to manual review. Save this as a draft and review it in a subreddit-specific context before approval.",
		});
	}

	if (!subreddit) {
		violations.push({
			platform: "reddit",
			accountId: null,
			type: "redditSubredditRequired",
			message: "Reddit posts require a target subreddit before they can be prepared safely.",
		});
	}

	if (communityReason.length < 12) {
		violations.push({
			platform: "reddit",
			accountId: null,
			type: "redditCommunityReasonRequired",
			message:
				'Reddit posts need a real answer to "why would this subreddit care?" before they should move forward.',
		});
	}

	if (postType === "hard-sell") {
		violations.push({
			platform: "reddit",
			accountId: null,
			type: "redditHardSellBlocked",
			message: "Reddit hard-sell mode is blocked. Reframe this as discussion, humor, useful content, or product-adjacent context.",
		});
	}

	if (hasHardSellLanguage(candidateText) || postIntent === "launch") {
		violations.push({
			platform: "reddit",
			accountId: null,
			type: "redditSalesTone",
			message: "Reddit copy is reading as overt promotion. Strip the sales language and make the post stand on its own.",
		});
	}

	if (linkMode === "direct-link" || linkCount > 1 || (includeProductLink && linkMode !== "soft-redirect")) {
		violations.push({
			platform: "reddit",
			accountId: null,
			type: "redditLinkPressure",
			message: "Reddit should use minimal link pressure. Prefer no link or a soft redirect instead of direct promotion.",
		});
	}

	if (goblinAdjacent && (postIntent === "punch" || includeProductLink || linkMode === "direct-link")) {
		violations.push({
			platform: "reddit",
			accountId: null,
			type: "redditGoblinExtractionRisk",
			message:
				"Goblin Reddit posts should stay humor-first and low-pressure. This is drifting toward extraction behavior.",
		});
	}

	return violations;
}

export function validatePostAgainstRules({
	body = "",
	title = "",
	customText = {},
	useAutoPlatformText = true,
	targets = [],
	mediaType = null,
	hasMedia = false,
	metadata = {},
	intendedStatus = "draft",
	postIntent = "",
	includeProductLink = false,
	tags = [],
}) {
	if (!Array.isArray(targets) || targets.length === 0) {
		return [];
	}

	const violations = validateRedditGuardrails({
		body,
		title,
		customText,
		useAutoPlatformText,
		targets,
		metadata,
		intendedStatus,
		postIntent,
		includeProductLink,
		tags,
	});

	for (const target of targets) {
		if (!target) continue;
		const platform = String(target.platform || "").toLowerCase();
		if (!platform) continue;

		const limit = PLATFORM_BODY_LIMITS[platform];
		if (!limit) continue;

		const overrideKey = target.accountId ? `${platform}:${target.accountId}` : platform;
		const candidateText = useAutoPlatformText
			? body
			: customText?.[overrideKey] ?? customText?.[platform] ?? body;

		const length = candidateText ? candidateText.length : 0;
		if (length > limit) {
			violations.push({
				platform,
				accountId: target.accountId ?? null,
				type: "bodyLength",
				limit,
				actual: length,
				message: `Limit ${limit} characters for ${formatAccountHint(platform, target.accountId)}. Currently ${length}.`,
			});
		}

		const mediaRule = PLATFORM_MEDIA_RULES[platform];
		if (mediaRule?.requiresMedia && !hasMedia) {
			violations.push({
				platform,
				accountId: target.accountId ?? null,
				type: "mediaRequired",
				message: `Media is required for ${formatAccountHint(platform, target.accountId)}.`,
			});
			continue;
		}
		if (
			hasMedia &&
			mediaRule?.allowedTypes?.length &&
			mediaType &&
			!mediaRule.allowedTypes.includes(mediaType)
		) {
			violations.push({
				platform,
				accountId: target.accountId ?? null,
				type: "mediaTypeUnsupported",
				message: `${formatAccountHint(platform, target.accountId)} does not support media type "${mediaType}".`,
			});
		}
	}

	return violations;
}
