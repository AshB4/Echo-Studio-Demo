/** @format */

import { useState, useEffect, useMemo } from "react";
import seoVault from "../../../posts/seoVault.json";
import { validatePostAgainstRules } from "../../utils/platformRules";
import { normalizePostStatus } from "../../utils/postStatus";
import { getProductProfile, productProfiles } from "../../utils/productProfiles";
import {
	mergeTargets,
	distributionTagsToTargets,
	normalizeTagList,
} from "../../utils/distributionTags";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001";

const AVAILABLE_PLATFORMS = [
	"x",
	"facebook",
	"linkedin",
	"pinterest",
	"substack",
	"reddit",
	"tumblr",
	"kofi",
	"discord",
	"devto",
	"hashnode",
	"producthunt",
	"amazon",
];

const DEFAULT_POST_INTENT = "jab";
const DEFAULT_CAMPAIGN_PHASE = "evergreen";
const DEFAULT_AWARENESS_STAGE = "evaluation";

const toArray = (value) => {
	if (!value) return [];
	if (Array.isArray(value)) return value;
	return [value];
};

const toDateTimeLocal = (value) => {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	const tzOffset = date.getTimezoneOffset() * 60000;
	return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

const normalizeHashtags = (value) => {
	if (!value) return "";
	if (Array.isArray(value)) return value.join(" ");
	return typeof value === "string" ? value : "";
};

const normalizeCommaList = (value) => {
	if (!value) return "";
	if (Array.isArray(value)) return value.join(", ");
	return typeof value === "string" ? value : "";
};

const normalizeJsonText = (value) => {
	if (!value) return "";
	if (typeof value === "string") return value;
	if (typeof value === "object") {
		try {
			return JSON.stringify(value, null, 2);
		} catch {
			return "";
		}
	}
	return "";
};

const parseJsonText = (value) => {
	if (!value || !String(value).trim()) return null;
	try {
		const parsed = JSON.parse(String(value));
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
	} catch {
		return null;
	}
};

const normalizeTargetEntry = (platform, accountId) => {
	if (!platform) return null;
	const normalizedPlatform = String(platform).toLowerCase();
	const normalizedAccount =
		accountId === undefined || accountId === null ? null : String(accountId);
	return {
		platform: normalizedPlatform,
		accountId: normalizedAccount,
	};
};

const sanitizeTargetsInput = (input, fallbackPlatforms = []) => {
	if (Array.isArray(input) && input.length) {
		return input
			.map((entry) => {
				if (!entry) return null;
				if (typeof entry === "string") {
					return normalizeTargetEntry(entry, null);
				}
				if (typeof entry === "object") {
					const platform =
						entry.platform ?? entry.name ?? entry.value ?? entry.id;
					const accountId =
						entry.accountId ?? entry.account ?? entry.account_id ?? entry.id;
					return normalizeTargetEntry(platform, accountId ?? null);
				}
				return null;
			})
			.filter(Boolean);
	}

	return (Array.isArray(fallbackPlatforms) ? fallbackPlatforms : toArray(fallbackPlatforms))
		.map((platform) => normalizeTargetEntry(platform, null))
		.filter(Boolean);
};

const usePostComposerState = (initialDraft = null) => {
	const hasPersistedId =
		initialDraft?.__hasRealId !== false && Boolean(initialDraft?.id);
	const initialStatus = normalizePostStatus(initialDraft?.status);
	const initialTargets = sanitizeTargetsInput(
		initialDraft?.targets,
		toArray(initialDraft?.platforms || initialDraft?.platform),
	);
	const [title, setTitle] = useState(initialDraft?.title || "");
	const [body, setBody] = useState(
		initialDraft?.body || initialDraft?.content || ""
	);
	const [image, setImage] = useState(initialDraft?.image || null);
	const [mediaPath, setMediaPath] = useState(initialDraft?.mediaPath || null);
	const [mediaType, setMediaType] = useState(initialDraft?.mediaType || null);
	const [altText, setAltText] = useState(initialDraft?.altText || "");
	const [manualTargets, setManualTargets] = useState(initialTargets);
	const [scheduledAt, setScheduledAt] = useState(
		toDateTimeLocal(initialDraft?.scheduledAt || initialDraft?.scheduled_at)
	);
	const [saveAsDraft, setSaveAsDraft] = useState(initialStatus !== "approved");
	const [approveForSchedule, setApproveForSchedule] = useState(
		initialStatus === "approved" || !initialDraft
	);
	const [selectedProduct, setSelectedProduct] = useState(
		initialDraft?.metadata?.productProfileId || ""
	);
	const [postIntent, setPostIntent] = useState(
		initialDraft?.metadata?.postIntent || DEFAULT_POST_INTENT
	);
	const [campaignPhase, setCampaignPhase] = useState(
		initialDraft?.metadata?.campaignPhase || DEFAULT_CAMPAIGN_PHASE
	);
	const [campaignAngle, setCampaignAngle] = useState(
		initialDraft?.metadata?.campaignAngle || ""
	);
	const [headline, setHeadline] = useState(
		initialDraft?.metadata?.headline || initialDraft?.title || ""
	);
	const [headlineVariants, setHeadlineVariants] = useState(
		normalizeCommaList(initialDraft?.metadata?.headlineVariants)
	);
	const [primaryEmotion, setPrimaryEmotion] = useState(
		initialDraft?.metadata?.primaryEmotion || ""
	);
	const [secondaryEmotion, setSecondaryEmotion] = useState(
		initialDraft?.metadata?.secondaryEmotion || ""
	);
	const [curiosityType, setCuriosityType] = useState(
		initialDraft?.metadata?.curiosityType || ""
	);
	const [specificitySignals, setSpecificitySignals] = useState(
		normalizeJsonText(initialDraft?.metadata?.specificitySignals)
	);
	const [authoritySignals, setAuthoritySignals] = useState(
		normalizeCommaList(initialDraft?.metadata?.authoritySignals)
	);
	const [trustSignals, setTrustSignals] = useState(
		normalizeCommaList(initialDraft?.metadata?.trustSignals)
	);
	const [patternInterruptType, setPatternInterruptType] = useState(
		initialDraft?.metadata?.patternInterruptType || ""
	);
	const [hookType, setHookType] = useState(initialDraft?.metadata?.hookType || "");
	const [contentIntent, setContentIntent] = useState(
		initialDraft?.metadata?.contentIntent || ""
	);
	const [searchIntent, setSearchIntent] = useState(
		initialDraft?.metadata?.searchIntent || ""
	);
	const [saveIntent, setSaveIntent] = useState(
		initialDraft?.metadata?.saveIntent || ""
	);
	const [shareIntent, setShareIntent] = useState(
		initialDraft?.metadata?.shareIntent || ""
	);
	const [thumbnailConcept, setThumbnailConcept] = useState(
		initialDraft?.metadata?.thumbnailConcept || ""
	);
	const [firstLine, setFirstLine] = useState(initialDraft?.metadata?.firstLine || "");
	const [platformOptimizations, setPlatformOptimizations] = useState(
		normalizeJsonText(initialDraft?.metadata?.platformOptimizations)
	);
	const [ctrScore, setCtrScore] = useState(initialDraft?.metadata?.ctrScore ?? "");
	const [clarityScore, setClarityScore] = useState(initialDraft?.metadata?.clarityScore ?? "");
	const [trustScore, setTrustScore] = useState(initialDraft?.metadata?.trustScore ?? "");
	const [curiosityScore, setCuriosityScore] = useState(
		initialDraft?.metadata?.curiosityScore ?? ""
	);
	const [saveScore, setSaveScore] = useState(initialDraft?.metadata?.saveScore ?? "");
	const [shareScore, setShareScore] = useState(initialDraft?.metadata?.shareScore ?? "");
	const [intentPrimary, setIntentPrimary] = useState(
		initialDraft?.metadata?.intentPrimary || ""
	);
	const [intentSecondary, setIntentSecondary] = useState(
		initialDraft?.metadata?.intentSecondary || ""
	);
	const [awarenessStage, setAwarenessStage] = useState(
		initialDraft?.metadata?.awarenessStage || DEFAULT_AWARENESS_STAGE
	);
	const [painProximity, setPainProximity] = useState(
		initialDraft?.metadata?.painProximity ?? ""
	);
	const [commercialityScore, setCommercialityScore] = useState(
		initialDraft?.metadata?.commercialityScore ?? ""
	);
	const [emotionTags, setEmotionTags] = useState(
		normalizeCommaList(initialDraft?.metadata?.emotionTags)
	);
	const [identityTags, setIdentityTags] = useState(
		normalizeCommaList(initialDraft?.metadata?.identityTags)
	);
	const [queryChainDepth, setQueryChainDepth] = useState(
		initialDraft?.metadata?.queryChainDepth ?? ""
	);
	const [evergreenScore, setEvergreenScore] = useState(
		initialDraft?.metadata?.evergreenScore ?? ""
	);
	const [jtbd, setJtbd] = useState(initialDraft?.metadata?.jtbd || "");
	const [pinAngle, setPinAngle] = useState(initialDraft?.metadata?.pinAngle || "");
	const [visualHook, setVisualHook] = useState(
		initialDraft?.metadata?.visualHook || ""
	);
	const [redditSubreddit, setRedditSubreddit] = useState(
		initialDraft?.metadata?.redditSubreddit || ""
	);
	const [redditCommunityReason, setRedditCommunityReason] = useState(
		initialDraft?.metadata?.redditCommunityReason || ""
	);
	const [redditPostType, setRedditPostType] = useState(
		initialDraft?.metadata?.redditPostType || "discussion"
	);
	const [redditLinkMode, setRedditLinkMode] = useState(
		initialDraft?.metadata?.redditLinkMode || "no-link"
	);

	const [useAutoHashtags, setUseAutoHashtags] = useState(
		!normalizeHashtags(initialDraft?.hashtags)
	);
	const [manualHashtags, setManualHashtags] = useState(
		normalizeHashtags(initialDraft?.hashtags)
	);
	const [contentTags, setContentTags] = useState(
		normalizeTagList(initialDraft?.metadata?.contentTags || initialDraft?.tags || [])
			.join(", ")
	);
	const [distributionTags, setDistributionTags] = useState(
		normalizeTagList(initialDraft?.metadata?.distributionTags || []).join(", ")
	);

	const [useAutoPlatformText, setUseAutoPlatformText] = useState(
		!(initialDraft?.platformOverrides && Object.keys(initialDraft.platformOverrides).length > 0)
	);
	const [customText, setCustomText] = useState(
		initialDraft?.platformOverrides || {}
	);
	const [autoAffiliateAmazon, setAutoAffiliateAmazon] = useState(
		Boolean(
			initialDraft?.autoAffiliateAmazon ||
			initialDraft?.metadata?.autoAffiliateAmazon
		)
	);
	const [includeProductLink, setIncludeProductLink] = useState(
		Boolean(initialDraft?.metadata?.includeProductLink)
	);
	const [imageStatus, setImageStatus] = useState(
		initialDraft?.metadata?.imageStatus ||
			(initialDraft?.mediaPath || initialDraft?.image ? "attached" : "prompt-needed")
	);
	const [imageConcept, setImageConcept] = useState(
		initialDraft?.metadata?.imageConcept || ""
	);
	const [imagePrompt, setImagePrompt] = useState(
		initialDraft?.metadata?.imagePrompt || ""
	);
	const [aiProductName, setAiProductName] = useState(initialDraft?.title || "");
	const [aiProductType, setAiProductType] = useState("Automation Tool");
	const [aiAudience, setAiAudience] = useState("Indie creators and solo founders");
	const [aiProvider, setAiProvider] = useState("openai");
	const [aiSuggestions, setAiSuggestions] = useState(null);
	const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);

	const selectedProductProfile = useMemo(
		() => getProductProfile(selectedProduct),
		[selectedProduct]
	);

	useEffect(() => {
		if (!selectedProductProfile) return;
		const seo = seoVault;
		if (!seo) return;

		if (!title) {
			setTitle(selectedProductProfile.label);
		}
		if (!body && seo.meta_description) {
			setBody(seo.meta_description || "");
		}
		if (!altText && seo.alt_text_examples?.[0]) {
			setAltText(seo.alt_text_examples?.[0] || "");
		}
		if (!useAutoHashtags && seo.hashtags?.All) {
			setManualHashtags(seo.hashtags.All.join(" "));
		}
		if (!aiProductName) {
			setAiProductName(selectedProductProfile.label);
		}
		setAiProductType(selectedProductProfile.productType);
		setAiAudience(selectedProductProfile.audience);
	}, [selectedProductProfile, useAutoHashtags]);

	useEffect(() => {
		if (!initialDraft) return;
		setTitle(initialDraft.title || "");
		setBody(initialDraft.body || initialDraft.content || "");
		setImage(initialDraft.image || null);
		setMediaPath(initialDraft.mediaPath || null);
		setMediaType(initialDraft.mediaType || null);
		setAltText(initialDraft.altText || "");
		setManualTargets(
			sanitizeTargetsInput(
				initialDraft.targets,
				toArray(initialDraft.platforms || initialDraft.platform)
			)
		);
		setScheduledAt(
			toDateTimeLocal(initialDraft.scheduledAt || initialDraft.scheduled_at)
		);
		const nextStatus = normalizePostStatus(initialDraft.status);
		setSaveAsDraft(nextStatus !== "approved");
		setApproveForSchedule(nextStatus === "approved");
		setUseAutoHashtags(!normalizeHashtags(initialDraft.hashtags));
		setManualHashtags(normalizeHashtags(initialDraft.hashtags));
		setContentTags(
			normalizeTagList(initialDraft.metadata?.contentTags || initialDraft.tags || []).join(", ")
		);
		setDistributionTags(
			normalizeTagList(initialDraft.metadata?.distributionTags || []).join(", ")
		);
		setUseAutoPlatformText(
			!(
				initialDraft.platformOverrides &&
				Object.keys(initialDraft.platformOverrides).length > 0
			)
		);
		setCustomText(initialDraft.platformOverrides || {});
		setAutoAffiliateAmazon(
			Boolean(
				initialDraft.autoAffiliateAmazon ||
				initialDraft.metadata?.autoAffiliateAmazon
			)
		);
		setIncludeProductLink(Boolean(initialDraft.metadata?.includeProductLink));
		setImageStatus(
			initialDraft.metadata?.imageStatus ||
				(initialDraft.mediaPath || initialDraft.image ? "attached" : "prompt-needed")
		);
		setImageConcept(initialDraft.metadata?.imageConcept || "");
		setImagePrompt(initialDraft.metadata?.imagePrompt || "");
		setAiProductName(initialDraft.title || "");
		setSelectedProduct(initialDraft.metadata?.productProfileId || "");
		setPostIntent(initialDraft.metadata?.postIntent || DEFAULT_POST_INTENT);
		setCampaignPhase(initialDraft.metadata?.campaignPhase || DEFAULT_CAMPAIGN_PHASE);
		setCampaignAngle(initialDraft.metadata?.campaignAngle || "");
		setHeadline(initialDraft.metadata?.headline || initialDraft.title || "");
		setHeadlineVariants(normalizeCommaList(initialDraft.metadata?.headlineVariants));
		setPrimaryEmotion(initialDraft.metadata?.primaryEmotion || "");
		setSecondaryEmotion(initialDraft.metadata?.secondaryEmotion || "");
		setCuriosityType(initialDraft.metadata?.curiosityType || "");
		setSpecificitySignals(normalizeJsonText(initialDraft.metadata?.specificitySignals));
		setAuthoritySignals(normalizeCommaList(initialDraft.metadata?.authoritySignals));
		setTrustSignals(normalizeCommaList(initialDraft.metadata?.trustSignals));
		setPatternInterruptType(initialDraft.metadata?.patternInterruptType || "");
		setHookType(initialDraft.metadata?.hookType || "");
		setContentIntent(initialDraft.metadata?.contentIntent || "");
		setSearchIntent(initialDraft.metadata?.searchIntent || "");
		setSaveIntent(initialDraft.metadata?.saveIntent || "");
		setShareIntent(initialDraft.metadata?.shareIntent || "");
		setThumbnailConcept(initialDraft.metadata?.thumbnailConcept || "");
		setFirstLine(initialDraft.metadata?.firstLine || "");
		setPlatformOptimizations(normalizeJsonText(initialDraft.metadata?.platformOptimizations));
		setCtrScore(initialDraft.metadata?.ctrScore ?? "");
		setClarityScore(initialDraft.metadata?.clarityScore ?? "");
		setTrustScore(initialDraft.metadata?.trustScore ?? "");
		setCuriosityScore(initialDraft.metadata?.curiosityScore ?? "");
		setSaveScore(initialDraft.metadata?.saveScore ?? "");
		setShareScore(initialDraft.metadata?.shareScore ?? "");
		setIntentPrimary(initialDraft.metadata?.intentPrimary || "");
		setIntentSecondary(initialDraft.metadata?.intentSecondary || "");
		setAwarenessStage(initialDraft.metadata?.awarenessStage || DEFAULT_AWARENESS_STAGE);
		setPainProximity(initialDraft.metadata?.painProximity ?? "");
		setCommercialityScore(initialDraft.metadata?.commercialityScore ?? "");
		setEmotionTags(normalizeCommaList(initialDraft.metadata?.emotionTags));
		setIdentityTags(normalizeCommaList(initialDraft.metadata?.identityTags));
		setQueryChainDepth(initialDraft.metadata?.queryChainDepth ?? "");
		setEvergreenScore(initialDraft.metadata?.evergreenScore ?? "");
		setJtbd(initialDraft.metadata?.jtbd || "");
		setPinAngle(initialDraft.metadata?.pinAngle || "");
		setVisualHook(initialDraft.metadata?.visualHook || "");
		setRedditSubreddit(initialDraft.metadata?.redditSubreddit || "");
		setRedditCommunityReason(initialDraft.metadata?.redditCommunityReason || "");
		setRedditPostType(initialDraft.metadata?.redditPostType || "discussion");
		setRedditLinkMode(initialDraft.metadata?.redditLinkMode || "no-link");
	}, [initialDraft]);

	const toggleTarget = (platform, accountId = null) => {
		const normalized = normalizeTargetEntry(platform, accountId);
		if (!normalized) return;
		setManualTargets((prev = []) => {
			const exists = prev.some(
				(target) =>
					target.platform === normalized.platform &&
					(target.accountId ?? null) === (normalized.accountId ?? null)
			);
			if (exists) {
				return prev.filter(
					(target) =>
						!(
							target.platform === normalized.platform &&
							(target.accountId ?? null) === (normalized.accountId ?? null)
						)
				);
			}
			return [...prev, normalized];
		});
	};

	const derivedTargets = useMemo(
		() => distributionTagsToTargets(distributionTags),
		[distributionTags]
	);

	const selectedTargets = useMemo(
		() => mergeTargets(manualTargets, derivedTargets),
		[manualTargets, derivedTargets]
	);

	const selectedPlatforms = useMemo(
		() => Array.from(new Set(selectedTargets.map((target) => target.platform))),
		[selectedTargets]
	);

	const handleSubmit = async (overrides = {}) => {
		if (selectedTargets.length === 0) {
			throw new Error("Select at least one platform or account target before posting");
		}
		const scheduledSource =
			overrides.scheduledAt !== undefined ? overrides.scheduledAt : scheduledAt;
		const scheduledIso = scheduledSource
			? new Date(scheduledSource).toISOString()
			: null;

		const platformViolations = validatePostAgainstRules({
			body,
			title,
			customText,
			useAutoPlatformText,
			targets: selectedTargets,
			mediaType,
			hasMedia: Boolean(mediaPath || image),
			metadata: {
				...(initialDraft?.metadata || {}),
				contentTags: normalizeTagList(contentTags),
				distributionTags: normalizeTagList(distributionTags),
				redditSubreddit: redditSubreddit.trim(),
				redditCommunityReason: redditCommunityReason.trim(),
				redditPostType,
				redditLinkMode,
			},
			intendedStatus: overrides.status || (saveAsDraft || !approveForSchedule ? "draft" : "approved"),
			postIntent,
			includeProductLink,
			tags: normalizeTagList(contentTags),
		});
		if (platformViolations.length > 0) {
			const error = new Error(platformViolations[0].message);
			error.violations = platformViolations;
			throw error;
		}

		const nextStatus =
			overrides.status ||
			(saveAsDraft || !approveForSchedule ? "draft" : "approved");
		const sharedPayload = {
			title,
			body,
			image,
			mediaPath,
			mediaType,
			altText,
			platforms: selectedPlatforms,
			targets: selectedTargets,
			scheduledAt: scheduledIso,
			status: nextStatus,
			hashtags: useAutoHashtags ? null : manualHashtags,
			platformOverrides: useAutoPlatformText ? null : customText,
			autoAffiliateAmazon,
			metadata: {
				...(initialDraft?.metadata || {}),
				autoAffiliateAmazon,
				includeProductLink,
				postIntent,
				campaignPhase,
				campaignAngle: campaignAngle.trim(),
				headline: headline.trim(),
				headlineVariants: normalizeTagList(headlineVariants),
				primaryEmotion: primaryEmotion.trim(),
				secondaryEmotion: secondaryEmotion.trim(),
				curiosityType: curiosityType.trim(),
				specificitySignals: parseJsonText(specificitySignals),
				authoritySignals: normalizeTagList(authoritySignals),
				trustSignals: normalizeTagList(trustSignals),
				patternInterruptType: patternInterruptType.trim(),
				hookType: hookType.trim(),
				contentIntent: contentIntent.trim(),
				searchIntent: searchIntent.trim(),
				saveIntent: saveIntent.trim(),
				shareIntent: shareIntent.trim(),
				thumbnailConcept: thumbnailConcept.trim(),
				firstLine: firstLine.trim(),
				platformOptimizations: parseJsonText(platformOptimizations),
				ctrScore:
					ctrScore === "" || ctrScore === null ? null : Number(ctrScore),
				clarityScore:
					clarityScore === "" || clarityScore === null ? null : Number(clarityScore),
				trustScore:
					trustScore === "" || trustScore === null ? null : Number(trustScore),
				curiosityScore:
					curiosityScore === "" || curiosityScore === null
						? null
						: Number(curiosityScore),
				saveScore:
					saveScore === "" || saveScore === null ? null : Number(saveScore),
				shareScore:
					shareScore === "" || shareScore === null ? null : Number(shareScore),
				intentPrimary: intentPrimary.trim(),
				intentSecondary: intentSecondary.trim(),
				awarenessStage: awarenessStage.trim(),
				painProximity:
					painProximity === "" || painProximity === null
						? null
						: Number(painProximity),
				commercialityScore:
					commercialityScore === "" || commercialityScore === null
						? null
						: Number(commercialityScore),
				emotionTags: normalizeTagList(emotionTags),
				identityTags: normalizeTagList(identityTags),
				queryChainDepth:
					queryChainDepth === "" || queryChainDepth === null
						? null
						: Number(queryChainDepth),
				evergreenScore:
					evergreenScore === "" || evergreenScore === null
						? null
						: Number(evergreenScore),
				jtbd: jtbd.trim(),
				pinAngle: pinAngle.trim(),
				visualHook: visualHook.trim(),
				redditSubreddit: redditSubreddit.trim(),
				redditCommunityReason: redditCommunityReason.trim(),
				redditPostType,
				redditLinkMode,
				productProfileId: selectedProductProfile?.id || null,
				productProfileLabel: selectedProductProfile?.label || "",
				productCategory: selectedProductProfile?.category || "",
				productLinks: selectedProductProfile?.links || {},
				contentTags: normalizeTagList(contentTags),
				distributionTags: normalizeTagList(distributionTags),
				imageStatus,
				imageConcept: imageConcept.trim(),
				imagePrompt: imagePrompt.trim(),
				approvalSource:
					nextStatus === "approved" ? "composer" : "draft-review",
				requiresReview: nextStatus !== "approved",
			},
			tags: normalizeTagList(contentTags),
		};

		const url = hasPersistedId
			? `${API_BASE}/api/posts/${initialDraft.id}`
			: `${API_BASE}/api/posts`;
		const method = hasPersistedId ? "PUT" : "POST";
		const res = await fetch(url, {
			method,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(sharedPayload),
		});
		if (!res.ok) {
			const errorText = await res.text();
			throw new Error(`${hasPersistedId ? "Update" : "Save"} failed: ${res.status} ${errorText}`);
		}
		return {
			mode: hasPersistedId ? "update" : "queue",
			data: await res.json(),
		};
	};

	const generateSeoSuggestions = async ({ dryRun = false } = {}) => {
		if (!aiProductName || !aiProductType || !aiAudience) {
			throw new Error("Fill in product name, type, and audience before generating suggestions");
		}
		setIsGeneratingSeo(true);
		try {
			const res = await fetch(`${API_BASE}/api/ai/seo-generate`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					productName: aiProductName,
					productType: selectedProductProfile?.productType || aiProductType,
					audience: selectedProductProfile?.audience || aiAudience,
					platformIds: selectedPlatforms,
					productProfileId: selectedProductProfile?.id || null,
					postIntent,
					campaignPhase,
					campaignAngle,
					visualHook,
					provider: aiProvider,
					dryRun,
				}),
			});
			if (!res.ok) {
				const errorText = await res.text();
				let detail = errorText;
				try {
					const parsed = JSON.parse(errorText);
					detail = parsed?.detail || parsed?.error || errorText;
				} catch {
					detail = errorText;
				}
				throw new Error(`SEO generation failed: ${res.status} ${detail}`);
			}
			const data = await res.json();
			setAiSuggestions(data);

			if (!dryRun && data.mode !== "dry-run") {
				setHeadline(data.headline || data.product_name || aiProductName);
				setTitle(data.headline || data.product_name || aiProductName);
				setBody(data.meta_description || body);
				setAltText(data.alt_text_examples?.[0] || "");
				if (data.post_intent) {
					setPostIntent(data.post_intent);
				}
				if (data.campaign_phase) {
					setCampaignPhase(data.campaign_phase);
				}
				if (data.campaign_angle) {
					setCampaignAngle(data.campaign_angle);
				}
				if (data.headline_variants) {
					setHeadlineVariants(normalizeCommaList(data.headline_variants));
				}
				if (data.primary_emotion) {
					setPrimaryEmotion(data.primary_emotion);
				}
				if (data.secondary_emotion) {
					setSecondaryEmotion(data.secondary_emotion);
				}
				if (data.curiosity_type) {
					setCuriosityType(data.curiosity_type);
				}
				if (data.specificity_signals && typeof data.specificity_signals === "object") {
					setSpecificitySignals(JSON.stringify(data.specificity_signals, null, 2));
				}
				if (Array.isArray(data.authority_signals)) {
					setAuthoritySignals(data.authority_signals.join(", "));
				}
				if (Array.isArray(data.trust_signals)) {
					setTrustSignals(data.trust_signals.join(", "));
				}
				if (data.pattern_interrupt_type) {
					setPatternInterruptType(data.pattern_interrupt_type);
				}
				if (data.hook_type) {
					setHookType(data.hook_type);
				}
				if (data.content_intent) {
					setContentIntent(data.content_intent);
				}
				if (data.search_intent) {
					setSearchIntent(data.search_intent);
				}
				if (data.save_intent) {
					setSaveIntent(data.save_intent);
				}
				if (data.share_intent) {
					setShareIntent(data.share_intent);
				}
				if (data.thumbnail_concept) {
					setThumbnailConcept(data.thumbnail_concept);
				}
				if (data.first_line) {
					setFirstLine(data.first_line);
				}
				if (data.platform_optimizations && typeof data.platform_optimizations === "object") {
					setPlatformOptimizations(JSON.stringify(data.platform_optimizations, null, 2));
				}
				if (data.ctr_score !== undefined && data.ctr_score !== null) {
					setCtrScore(data.ctr_score);
				}
				if (data.clarity_score !== undefined && data.clarity_score !== null) {
					setClarityScore(data.clarity_score);
				}
				if (data.trust_score !== undefined && data.trust_score !== null) {
					setTrustScore(data.trust_score);
				}
				if (data.curiosity_score !== undefined && data.curiosity_score !== null) {
					setCuriosityScore(data.curiosity_score);
				}
				if (data.save_score !== undefined && data.save_score !== null) {
					setSaveScore(data.save_score);
				}
				if (data.share_score !== undefined && data.share_score !== null) {
					setShareScore(data.share_score);
				}
				if (data.intent_primary) {
					setIntentPrimary(data.intent_primary);
				}
				if (data.intent_secondary) {
					setIntentSecondary(data.intent_secondary);
				}
				if (data.awareness_stage) {
					setAwarenessStage(data.awareness_stage);
				}
				if (data.pain_proximity !== undefined && data.pain_proximity !== null) {
					setPainProximity(data.pain_proximity);
				}
				if (data.commerciality_score !== undefined && data.commerciality_score !== null) {
					setCommercialityScore(data.commerciality_score);
				}
				if (Array.isArray(data.emotion_tags)) {
					setEmotionTags(data.emotion_tags.join(", "));
				}
				if (Array.isArray(data.identity_tags)) {
					setIdentityTags(data.identity_tags.join(", "));
				}
				if (data.query_chain_depth !== undefined && data.query_chain_depth !== null) {
					setQueryChainDepth(data.query_chain_depth);
				}
				if (data.evergreen_score !== undefined && data.evergreen_score !== null) {
					setEvergreenScore(data.evergreen_score);
				}
				if (data.jtbd) {
					setJtbd(data.jtbd);
				}
				if (data.pin_angle) {
					setPinAngle(data.pin_angle);
				}
				if (data.visual_hook) {
					setVisualHook(data.visual_hook);
				}
				setSaveAsDraft(true);
				setApproveForSchedule(false);
				if (Array.isArray(data.keywords) && data.keywords.length > 0) {
					setUseAutoHashtags(false);
					setManualHashtags(
						data.keywords
							.map((keyword) => `#${String(keyword).replace(/\s+/g, "")}`)
							.join(" "),
					);
				}
			}

			return data;
		} finally {
			setIsGeneratingSeo(false);
		}
	};

	return {
		title,
		setTitle,
		body,
		setBody,
		image,
		setImage,
		mediaPath,
		setMediaPath,
		mediaType,
		setMediaType,
		altText,
		setAltText,
		selectedTargets,
		selectedPlatforms,
		toggleTarget,
		contentTags,
		setContentTags,
		distributionTags,
		setDistributionTags,
		scheduledAt,
		setScheduledAt,
		saveAsDraft,
		setSaveAsDraft,
		approveForSchedule,
		setApproveForSchedule,
		selectedProduct,
		setSelectedProduct,
		postIntent,
		setPostIntent,
		campaignPhase,
		setCampaignPhase,
		campaignAngle,
		setCampaignAngle,
		headline,
		setHeadline,
		headlineVariants,
		setHeadlineVariants,
		primaryEmotion,
		setPrimaryEmotion,
		secondaryEmotion,
		setSecondaryEmotion,
		curiosityType,
		setCuriosityType,
		specificitySignals,
		setSpecificitySignals,
		authoritySignals,
		setAuthoritySignals,
		trustSignals,
		setTrustSignals,
		patternInterruptType,
		setPatternInterruptType,
		hookType,
		setHookType,
		contentIntent,
		setContentIntent,
		searchIntent,
		setSearchIntent,
		saveIntent,
		setSaveIntent,
		shareIntent,
		setShareIntent,
		thumbnailConcept,
		setThumbnailConcept,
		firstLine,
		setFirstLine,
		platformOptimizations,
		setPlatformOptimizations,
		ctrScore,
		setCtrScore,
		clarityScore,
		setClarityScore,
		trustScore,
		setTrustScore,
		curiosityScore,
		setCuriosityScore,
		saveScore,
		setSaveScore,
		shareScore,
		setShareScore,
		intentPrimary,
		setIntentPrimary,
		intentSecondary,
		setIntentSecondary,
		awarenessStage,
		setAwarenessStage,
		painProximity,
		setPainProximity,
		commercialityScore,
		setCommercialityScore,
		emotionTags,
		setEmotionTags,
		identityTags,
		setIdentityTags,
		queryChainDepth,
		setQueryChainDepth,
		evergreenScore,
		setEvergreenScore,
		jtbd,
		setJtbd,
		pinAngle,
		setPinAngle,
		visualHook,
		setVisualHook,
		redditSubreddit,
		setRedditSubreddit,
		redditCommunityReason,
		setRedditCommunityReason,
		redditPostType,
		setRedditPostType,
		redditLinkMode,
		setRedditLinkMode,
		selectedProductProfile,
		useAutoHashtags,
		setUseAutoHashtags,
		manualHashtags,
		setManualHashtags,
		useAutoPlatformText,
		setUseAutoPlatformText,
		customText,
		setCustomText,
		autoAffiliateAmazon,
		setAutoAffiliateAmazon,
		includeProductLink,
		setIncludeProductLink,
		imageStatus,
		setImageStatus,
		imageConcept,
		setImageConcept,
		imagePrompt,
		setImagePrompt,
		aiProductName,
		setAiProductName,
		aiProductType,
		setAiProductType,
		aiAudience,
		setAiAudience,
		aiProvider,
		setAiProvider,
		aiSuggestions,
		isGeneratingSeo,
		generateSeoSuggestions,
		handleSubmit,
		seoVault,
		productProfiles,
		availablePlatforms: AVAILABLE_PLATFORMS,
		isEditing: hasPersistedId,
	};
};

export default usePostComposerState;
