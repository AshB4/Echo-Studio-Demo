import { useEffect, useMemo, useRef, useState } from "react";
import AppTopNav from "../Components/AppTopNav";
import echoArrow from "../../assets/InteralAssets/EchoArrow.png";
import { productProfiles } from "../utils/productProfiles";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001";
const LOCAL_ASSET_URLS = {
	...import.meta.glob("../../assets/badEnough/*.{png,jpg,jpeg,webp,gif,svg}", {
		eager: true,
		query: "?url",
		import: "default",
	}),
	...import.meta.glob("../../assets/buzzingbees/*.{png,jpg,jpeg,webp,gif,svg}", {
		eager: true,
		query: "?url",
		import: "default",
	}),
	...import.meta.glob("../../assets/devto/*.{png,jpg,jpeg,webp,gif,svg}", {
		eager: true,
		query: "?url",
		import: "default",
	}),
	...import.meta.glob("../../assets/goblinaffs/**/*.{png,jpg,jpeg,webp,gif,svg}", {
		eager: true,
		query: "?url",
		import: "default",
	}),
	...import.meta.glob("../../assets/InteralAssets/*.{png,jpg,jpeg,webp,gif,svg}", {
		eager: true,
		query: "?url",
		import: "default",
	}),
	...import.meta.glob("../../assets/kawaiiHalloween/*.{png,jpg,jpeg,webp,gif,svg}", {
		eager: true,
		query: "?url",
		import: "default",
	}),
	...import.meta.glob("../../assets/TinyKingdoms/*.{png,jpg,jpeg,webp,gif,svg}", {
		eager: true,
		query: "?url",
		import: "default",
	}),
};
const INTERNAL_PRODUCT_PROFILE_IDS = new Set(["postpunk-core", "gumroad-devtools", "reddit-product"]);
const ECHO_PRODUCTS = productProfiles.filter(
	(product) => ["live", "in-progress"].includes(product.lifecycleStatus) && !INTERNAL_PRODUCT_PROFILE_IDS.has(product.id),
);
const SUPPORTED_PLATFORMS = ["Pinterest", "Facebook", "Dev.to"];
const DEFAULT_PINTEREST_CAMPAIGN_SIZE = 10;
const DRAFT_SAVE_DEBOUNCE_MS = 700;
const AI_GENERATION_ENABLED =
	String(import.meta.env?.VITE_AI_GENERATION_ENABLED ?? import.meta.env?.AI_GENERATION_ENABLED ?? "true").toLowerCase() !==
	"false";
const JOURNEY_STAGES = ["Mission", "Knowledge", "Strategy", "Content", "Assets", "Review", "Schedule", "Publish"];
const KNOWLEDGE_NODE_DEFINITIONS = [
	{ key: "product", label: "Product", className: "echo-brain-node-top" },
	{ key: "brand", label: "Brand", className: "echo-brain-node-left-top" },
	{ key: "platform", label: "Platform", className: "echo-brain-node-right-top" },
	{ key: "playbook", label: "Playbook", className: "echo-brain-node-left-bottom" },
	{ key: "performance", label: "Previous Campaigns", className: "echo-brain-node-right-bottom" },
	{ key: "seo", label: "SEO", className: "echo-brain-node-bottom" },
];

function getActiveKnowledgeNode(statusText) {
	const text = String(statusText || "").toLowerCase();
	if (text.includes("product knowledge")) return "product";
	if (text.includes("brand voice")) return "brand";
	if (text.includes("platform intelligence")) return "platform";
	if (text.includes("marketing playbook")) return "playbook";
	if (text.includes("previous campaign")) return "performance";
	if (text.includes("seo")) return "seo";
	return "";
}

const BRAIN_SOURCE_DEFINITIONS = [
	{
		type: "playbook",
		title: "Marketing-Execution-Playbook.txt",
		location: "Marketing-Execution-Playbook.txt",
		priority: 1,
	},
	{
		type: "brand",
		title: "EchoMark-Execution-Principles.txt",
		location: "EchoMark-Execution-Principles.txt",
		priority: 2,
	},
	{
		type: "platform",
		title: "EchoMark-Platform-Composer.txt",
		location: "EchoMark-Platform-Composer.txt",
		priority: 3,
	},
	{
		type: "platform",
		title: "Pinterest-Discoverability-Intelligence.txt",
		location: "Pinterest-Discoverability-Intelligence.txt",
		priority: 4,
	},
	{
		type: "platform",
		title: "Pinterest-Saftey-Guidelines.txt",
		location: "Pinterest-Saftey-Guidelines.txt",
		priority: 5,
	},
	{
		type: "playbook",
		title: "Cross-Platform Canonical Tag Strategy for Content Syndication.pdf",
		location: "Cross-Platform Canonical Tag Strategy for Content Syndication.pdf",
		priority: 6,
	},
	{
		type: "product",
		title: "Amazon-Affiliate-Pinterest-Product-Research-Prompt.txt",
		location: "Amazon-Affiliate-Pinterest-Product-Research-Prompt.txt",
		priority: 7,
	},
	{
		type: "platform",
		title: "Prompt-builder-pinterest.txt",
		location: "Prompt-builder-pinterest.txt",
		priority: 8,
	},
];

function createProductBrainSource(product) {
	return {
		type: "product",
		title: `${product.label} Product Knowledge`,
		location: `productProfiles:${product.id}`,
		priority: 0,
		description: [
			product.productType,
			product.primaryGoal,
			`Audience: ${product.audience}`,
			`Voice: ${product.brandVoice}`,
		]
			.filter(Boolean)
			.join(" | "),
		tags: ["echo-brain", "product-profile", product.id],
		metadata: {
			productId: product.id,
			productName: product.label,
		},
	};
}

const emptyPipeline = {
	mission: null,
	knowledgeContext: null,
	campaignPlan: null,
	campaignStrategy: null,
	campaignGeneration: null,
	assetBlueprints: [],
	campaignAsset: null,
};

/**
 * @typedef {Object} CampaignStrategy
 * @property {string} audience
 * @property {string} primaryMessage
 * @property {string} marketingAngle
 * @property {string} primaryHook
 * @property {string} callToAction
 * @property {string[]} seoKeywords
 * @property {string} reasoning
 */

async function getJson(path) {
	const response = await fetch(`${API_BASE}${path}`);
	const body = await response.json().catch(() => ({}));
	if (!response.ok) {
		const message = body?.message || `Request failed: ${response.status}`;
		throw new Error(message);
	}
	return body.data;
}

async function getRawJson(path) {
	const response = await fetch(`${API_BASE}${path}`);
	const body = await response.json().catch(() => ({}));
	if (!response.ok) {
		const message = body?.detail || body?.message || body?.error || `Request failed: ${response.status}`;
		throw new Error(message);
	}
	return body;
}

async function postJson(path, payload) {
	const response = await fetch(`${API_BASE}${path}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	const body = await response.json().catch(() => ({}));
	if (!response.ok) {
		const message = body?.message || `Request failed: ${response.status}`;
		throw new Error(message);
	}
	return body.data;
}

async function postRawJson(path, payload) {
	const response = await fetch(`${API_BASE}${path}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	const body = await response.json().catch(() => ({}));
	if (!response.ok) {
		const message = body?.detail || body?.message || body?.error || `Request failed: ${response.status}`;
		throw new Error(message);
	}
	return body;
}

async function patchJson(path, payload) {
	const response = await fetch(`${API_BASE}${path}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	const body = await response.json().catch(() => ({}));
	if (!response.ok) {
		const message = body?.message || `Request failed: ${response.status}`;
		throw new Error(message);
	}
	return body.data;
}

async function deleteJson(path) {
	const response = await fetch(`${API_BASE}${path}`, {
		method: "DELETE",
	});
	const body = await response.json().catch(() => ({}));
	if (!response.ok) {
		const message = body?.message || `Request failed: ${response.status}`;
		throw new Error(message);
	}
	return body.data;
}

async function assembleBrain(missionId) {
	const response = await fetch(`${API_BASE}/api/knowledge-sources/assemble`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ missionId }),
	});
	const body = await response.json().catch(() => ({}));
	if (!response.ok) {
		const message = body?.message || `Request failed: ${response.status}`;
		throw new Error(message);
	}
	return body.knowledgeContext;
}

function sectionContentFromSources(sources) {
	return sources
		.map((source) => `${source.title} (${source.location})`)
		.join("\n");
}

function createKnowledgeSections(assembledBrain) {
	return {
		productKnowledge: {
			content: sectionContentFromSources(assembledBrain.productKnowledge),
			source: "Echo Brain",
			priority: 1,
			lastUpdated: new Date().toISOString(),
		},
		brandRules: {
			content: sectionContentFromSources(assembledBrain.brandRules),
			source: "Echo Brain",
			priority: 2,
			lastUpdated: new Date().toISOString(),
		},
		platformRules: {
			content: sectionContentFromSources(assembledBrain.platformRules),
			source: "Echo Brain",
			priority: 3,
			lastUpdated: new Date().toISOString(),
		},
		previousCampaignPerformance: {
			content: sectionContentFromSources(assembledBrain.previousCampaignPerformance),
			source: "Echo Brain",
			priority: 4,
			lastUpdated: new Date().toISOString(),
		},
		marketingPlaybook: {
			content: sectionContentFromSources(assembledBrain.marketingPlaybook),
			source: "Echo Brain",
			priority: 5,
			lastUpdated: new Date().toISOString(),
		},
		generalNotes: {
			content: sectionContentFromSources(assembledBrain.generalNotes),
			source: "Echo Brain",
			priority: 6,
			lastUpdated: new Date().toISOString(),
		},
	};
}

function EchoBrainActivation({
	visible,
	statusText,
	completedNodes = [],
	complete = false,
	completeText = "Campaign strategy ready",
	onReadyAnimationEnd,
}) {
	if (!visible) return null;
	const completedNodeSet = new Set(completedNodes);
	const activeNodeKey = complete ? "" : getActiveKnowledgeNode(statusText);

	return (
		<div className="echo-brain-backdrop">
			<div
				className={`echo-brain-loader ${complete ? "echo-brain-loader-ready" : ""}`}
				role="status"
				aria-live="polite"
				onAnimationEnd={(event) => {
					if (complete && event.animationName === "echoBrainReadyFade") {
						onReadyAnimationEnd?.();
					}
				}}
			>
				<div className="echo-brain-orbit" aria-hidden="true">
					<div className="echo-brain-ring" />
					{KNOWLEDGE_NODE_DEFINITIONS.map((node) => {
						const loaded = completedNodeSet.has(node.key);
						const active = activeNodeKey === node.key && !loaded;
						return (
							<div
								key={node.key}
								className={`echo-brain-node ${node.className} ${
									loaded ? "echo-brain-node-loaded" : ""
								} ${active ? "echo-brain-node-active" : ""}`}
								aria-label={node.label}
								title={node.label}
							>
								<span className="echo-brain-node-dot">
									{loaded ? <span className="echo-brain-node-check">✓</span> : null}
								</span>
								<span className="echo-brain-node-label" aria-hidden="true">
									{node.label}
								</span>
							</div>
						);
					})}
					<div className="echo-brain-core">
						<img src={echoArrow} alt="" className="echo-brain-logo" />
					</div>
				</div>
				<h2 className="mt-8 text-2xl font-bold text-cyan-100">Echo Brain</h2>
				<p className="mt-2 min-h-5 text-sm text-pink-100">
					{complete ? `✓ ${completeText}` : statusText || "Reading product knowledge..."}
				</p>
			</div>
		</div>
	);
}

function humanizeAssetType(type = "") {
	const text = String(type || "")
		.replace(/_/g, " ")
		.replace(/\b\w/g, (letter) => letter.toUpperCase())
		.trim();
	if (text.toLowerCase() === "pinterest pin") return "Pinterest Pin";
	if (text.toLowerCase() === "devto article") return "Dev.to Article";
	return text || "Campaign Asset";
}

function getDisplayedRecommendations(campaignPlan, primaryPlatform) {
	const assets = Array.isArray(campaignPlan?.recommendedAssets)
		? campaignPlan.recommendedAssets
		: [];
	const platform = String(primaryPlatform || campaignPlan?.primaryPlatform || "").toLowerCase();
	const matching = assets.filter((asset) =>
		String(asset.platform || "").toLowerCase() === platform,
	);
	const visible = matching.length ? matching : assets.slice(0, 1);
	return visible.map((asset) => ({
		...asset,
		displayName: humanizeAssetType(asset.type),
	}));
}

function buildCoreMessage({ goal, product, platform }) {
	const productName = product?.label || "this offer";
	if (goal) {
		return `Position ${productName} around the promise in "${goal}" and keep the ${platform} message focused on one clear action.`;
	}
	return `Position ${productName} with a clear ${platform} message and one practical next step.`;
}

function getRecommendedAudience({ product, platform }) {
	const productAudience = String(product?.audience || "").trim();
	if (productAudience) return productAudience;
	const platformText = String(platform || "").toLowerCase();
	if (platformText.includes("dev.to")) return "Developers and technical builders evaluating practical workflows.";
	if (platformText.includes("facebook")) return "Warm community members and small-business buyers who respond to clear offers.";
	if (platformText.includes("pinterest")) return "Search-driven browsers looking for useful ideas, visual inspiration, and repeatable solutions.";
	return "People most likely to care about this product and take the next step.";
}

function getTargetKeywords({ goal, product, platform }) {
	return getDefaultKeywords({ goal, product, platform });
}

function getSeoKeywordList({ goal, product, platform }) {
	return getTargetKeywords({ goal, product, platform })
		.split(",")
		.map((keyword) => keyword.trim())
		.filter(Boolean);
}

function buildMarketingAngle({ goal, product, platform }) {
	const goalText = String(goal || "").toLowerCase();
	const platformText = String(platform || "").toLowerCase();
	const productType = product?.productType || "offer";
	if (goalText.includes("launch")) return `Launch ${productType} with a focused proof-and-action message.`;
	if (goalText.includes("sale")) return `Make the offer feel timely, specific, and easy to act on.`;
	if (goalText.includes("authority")) return `Build trust by showing useful expertise before asking for the click.`;
	if (platformText.includes("pinterest")) return `Use evergreen discovery to repeat one clear product promise.`;
	if (platformText.includes("facebook")) return `Use conversational proof and a direct next step for a warm audience.`;
	if (platformText.includes("dev.to")) return `Lead with practical value so the promotion feels earned.`;
	return `Connect the product promise to the campaign goal with one practical next step.`;
}

function buildPrimaryHook({ goal, product, platform }) {
	const productName = product?.label || "this offer";
	const platformText = String(platform || "").toLowerCase();
	if (platformText.includes("dev.to")) return `What I learned building ${productName}`;
	if (platformText.includes("facebook")) return `A practical update for anyone thinking about ${productName}`;
	if (goal) return `${productName}: ${goal}`;
	return `A clearer way to understand ${productName}`;
}

function buildWhyEchoChoseThis({ goal, audience, product, platform, campaignPlan }) {
	const productType = product?.productType || "offer";
	const brandVoice = product?.brandVoice || "brand voice";
	const assetCount = getDisplayedRecommendations(campaignPlan, platform).length;
	if (String(platform || "").toLowerCase().includes("pinterest")) {
		return `${platform} fits this campaign because ${productType} can benefit from visual discovery, evergreen search traffic, and repeated exposure. Echo focused the recommendation around ${assetCount === 1 ? "one asset" : "a tight asset set"} that can test the goal with ${audience || "the target audience"} while staying close to the brand voice: ${brandVoice}.`;
	}
	if (String(platform || "").toLowerCase().includes("dev.to")) {
		return `${platform} fits this campaign because ${audience || "the audience"} needs useful proof before promotion. Echo shaped the strategy around practical authority, product clarity, and the goal: ${goal || "move the campaign forward"}.`;
	}
	return `${platform || "This channel"} fits this campaign because Echo can keep the message focused on ${goal || "the mission"} while applying product knowledge, brand voice, and platform rules before any content is created.`;
}

/**
 * Build Week CampaignStrategy model.
 * This is the frontend strategy contract consumed by content generation while
 * the backend Campaign Planner remains API-compatible for the demo.
 *
 * @returns {CampaignStrategy}
 */
function buildCampaignStrategy({ campaignPlan, goal, product, platform }) {
	const strategyGoal = campaignPlan?.goal || goal || "";
	const strategyPlatform = campaignPlan?.primaryPlatform || platform || "";
	const audience = campaignPlan?.audience || getRecommendedAudience({
		product,
		platform: strategyPlatform,
	});
	const primaryMessage = buildCoreMessage({
		goal: strategyGoal,
		product,
		platform: strategyPlatform,
	});
	const marketingAngle = buildMarketingAngle({
		goal: strategyGoal,
		product,
		platform: strategyPlatform,
	});
	const primaryHook = buildPrimaryHook({
		goal: strategyGoal,
		product,
		platform: strategyPlatform,
	});
	const callToAction = getDefaultCta({
		goal: strategyGoal,
		platform: strategyPlatform,
	});
	const seoKeywords = getSeoKeywordList({
		goal: strategyGoal,
		product,
		platform: strategyPlatform,
	});
	const reasoning = buildWhyEchoChoseThis({
		goal: strategyGoal,
		audience,
		product,
		platform: strategyPlatform,
		campaignPlan,
	});

	return {
		audience,
		primaryMessage,
		marketingAngle,
		primaryHook,
		callToAction,
		seoKeywords,
		reasoning,
	};
}

function getJourneyIndex({ view, loaderVisible, pipeline }) {
	if (view === "intake") return 0;
	if (view === "library") return 0;
	if (loaderVisible || !pipeline.campaignPlan) return 1;
	if (view === "content") return 3;
	if (view === "assets") return 4;
	if (view === "review") return 5;
	if (view === "schedule") return 6;
	if (view === "publish") return 7;
	return 2;
}

function getDefaultDestination(platform = "") {
	const text = String(platform || "").toLowerCase();
	if (text.includes("pinterest")) return "Primary Pinterest destination";
	if (text.includes("facebook")) return "Facebook page queue";
	if (text.includes("dev.to")) return "Dev.to publishing workspace";
	return "Publishing handoff queue";
}

function getPublishingDestinations(platform = "") {
	const text = String(platform || "").toLowerCase();
	if (text.includes("pinterest")) return ["Mental Health", "Coloring Books", "Self Care"];
	if (text.includes("facebook")) return ["Primary Facebook Page"];
	if (text.includes("dev.to")) return ["Dev.to Draft Workspace"];
	return [getDefaultDestination(platform)];
}

function getDefaultCta({ goal, platform }) {
	const goalText = String(goal || "").toLowerCase();
	if (goalText.includes("launch")) return "See the launch details";
	if (goalText.includes("sale")) return "Shop the offer";
	if (String(platform || "").toLowerCase().includes("dev.to")) return "Read the full breakdown";
	return "Learn more";
}

function getDefaultKeywords({ goal, product, platform }) {
	const values = [
		product?.label,
		product?.category,
		String(platform || "").includes("Pinterest") ? "visual discovery" : platform,
		goal,
	]
		.filter(Boolean)
		.flatMap((value) =>
			String(value)
				.split(/[,|]/)
				.map((item) => item.trim())
				.filter(Boolean),
		);
	return Array.from(new Set(values)).slice(0, 6).join(", ");
}

function getDefaultHashtags({ product, platform }) {
	const platformText = String(platform || "").toLowerCase();
	const tags = [];
	if (platformText.includes("pinterest")) tags.push("#PinterestMarketing", "#CreatorBusiness");
	if (platformText.includes("facebook")) tags.push("#SmallBusiness", "#Marketing");
	if (platformText.includes("dev.to")) tags.push("#devjournal", "#buildinpublic");
	if (product?.category) tags.push(`#${String(product.category).replace(/[^a-z0-9]/gi, "")}`);
	return tags.join(" ");
}

function normalizePlatformId(platform = "") {
	const text = String(platform || "").trim().toLowerCase();
	if (text === "dev.to" || text === "devto") return "devto";
	if (text.includes("pinterest")) return "pinterest";
	if (text.includes("facebook")) return "facebook";
	return text || "general";
}

function humanizePlatformId(platform = "") {
	const text = normalizePlatformId(platform);
	if (text === "devto") return "Dev.to";
	if (text === "pinterest") return "Pinterest";
	if (text === "facebook") return "Facebook";
	return String(platform || "General").trim();
}

function getDefaultCampaignSize(platform = "") {
	return normalizePlatformId(platform) === "pinterest" ? DEFAULT_PINTEREST_CAMPAIGN_SIZE : 1;
}

function normalizeList(value) {
	if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
	if (typeof value === "string") {
		return value
			.split(/[,\n]/)
			.map((item) => item.trim())
			.filter(Boolean);
	}
	return [];
}

function normalizeLocalAssetPath(value) {
	const raw = String(value || "").trim();
	if (!raw) return "";
	const assetIndex = raw.indexOf("frontend/assets/");
	if (assetIndex >= 0) return raw.slice(assetIndex);
	const shortAssetIndex = raw.indexOf("assets/");
	if (shortAssetIndex >= 0) return `frontend/${raw.slice(shortAssetIndex)}`;
	return raw;
}

function getCampaignAssetPreview(post) {
	const candidates = [post.imageAsset, post.mediaPath, post.image].filter(Boolean);
	for (const candidate of candidates) {
		const raw = String(candidate || "").trim();
		if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) {
			return {
				url: raw,
				path: raw,
				filename: raw.split("/").pop() || "Uploaded asset",
				alt: post.altText || post.title || "Campaign visual",
			};
		}
		if (raw.startsWith("/media/")) {
			return {
				url: `${API_BASE}${raw}`,
				path: raw,
				filename: raw.split("/").pop() || "Uploaded asset",
				alt: post.altText || post.title || "Campaign visual",
			};
		}
		const assetPath = normalizeLocalAssetPath(candidate);
		if (!assetPath.startsWith("frontend/assets/")) continue;
		const moduleKey = assetPath.replace("frontend/assets/", "../../assets/");
		const url = LOCAL_ASSET_URLS[moduleKey];
		if (!url) continue;
		return {
			url,
			path: assetPath,
			filename: assetPath.split("/").pop(),
			alt: post.altText || post.title || "Campaign visual",
		};
	}
	return null;
}

function readFileAsDataUrl(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (event) => resolve(event.target?.result || "");
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

function joinForSearch(values = []) {
	return values
		.flatMap((value) => normalizeList(value))
		.concat(values.filter((value) => typeof value === "string"))
		.join(" ")
		.toLowerCase();
}

function recommendPinterestBoard(post, pinterestBoards) {
	const boards = Array.isArray(pinterestBoards?.boards) ? pinterestBoards.boards : [];
	const rules = Array.isArray(pinterestBoards?.rules) ? pinterestBoards.rules : [];
	const defaultBoard = pinterestBoards?.defaultBoard || boards[0] || "";
	const searchText = joinForSearch([
		post.title,
		post.body,
		post.hook,
		post.keywords,
		post.hashtags,
		post.campaignAngle,
		post.imageConcept,
	]);
	let best = null;
	for (const rule of rules) {
		const keywords = normalizeList(rule.keywords);
		const matches = keywords.filter((keyword) => searchText.includes(keyword.toLowerCase()));
		if (!matches.length) continue;
		if (!best || matches.length > best.matches.length) {
			best = { board: rule.board, matches };
		}
	}
	const board = best?.board && boards.includes(best.board) ? best.board : defaultBoard;
	return {
		board,
		confidence: best?.matches?.length > 1 ? "High" : best?.matches?.length === 1 ? "Medium" : "Default",
		matches: best?.matches || [],
		reason: best?.matches?.length
			? `Matches keywords: ${best.matches.join(", ")}`
			: "No keyword rule matched, so Echo selected the configured default.",
	};
}

function buildScheduledAt(index) {
	const date = new Date();
	date.setDate(date.getDate() + Math.floor(index / 2) + 1);
	date.setHours(index % 2 === 0 ? 10 : 15, 0, 0, 0);
	return date.toISOString();
}

function formatLocalSchedule(iso) {
	if (!iso) return "";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	const offset = date.getTimezoneOffset();
	const local = new Date(date.getTime() - offset * 60_000);
	return local.toISOString().slice(0, 16);
}

function parseLocalSchedule(value) {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getPromptSections(post) {
	return [
		["Campaign Prompt", post.prompts?.campaign],
		["Content Prompt", post.prompts?.content],
		["SEO Prompt", post.prompts?.seo],
		["Image Prompt", post.imagePrompt],
	].filter(([, value]) => String(value || "").trim());
}

function normalizeGeneratedCampaignPost(post, index, { campaignPrompt, seoPrompt, pinterestBoards }) {
	const generated = post.generated || {};
	const platform = humanizePlatformId(post.platform);
	const hashtags = normalizeList(post.hashtags || generated.hashtags?.All);
	const keywords = normalizeList(generated.keywords || post.keywords);
	const normalized = {
		localId: `generated-${index}`,
		platform,
		title: post.title || generated.headline || post.hook || `Campaign Post ${index + 1}`,
		body: post.body || generated.seo_human_pitch || generated.meta_description || "",
		hook: post.hook || generated.hook || post.title || "",
		cta: post.cta || generated.primary_cta || "",
		hashtags,
		keywords,
		imageConcept: post.image_concept || generated.image_concept || "",
		imagePrompt: post.image_prompt || generated.image_prompt || "",
		altText: post.alt_text || "",
		destinationUrl: post.destination_url || generated.destination_url || "",
		campaignPhase: post.phase || generated.campaign_phase || "",
		campaignAngle: post.campaign_angle || generated.campaign_angle || "",
		postIntent: post.post_intent || generated.post_intent || "",
		product: post.product || generated.product || "",
		prompts: {
			campaign: campaignPrompt || "",
			content: seoPrompt || "",
			seo: seoPrompt || "",
		},
		raw: post,
		scheduledAt: buildScheduledAt(index),
	};
	const boardRecommendation =
		normalizePlatformId(platform) === "pinterest"
			? recommendPinterestBoard(normalized, pinterestBoards)
			: null;
	return {
		...normalized,
		destination: boardRecommendation?.board || getDefaultDestination(platform),
		boardRecommendation,
	};
}

function buildQueuePayload(post, { mission, campaignStrategy, selectedProduct }) {
	const platformId = normalizePlatformId(post.platform);
	const hashtags = normalizeList(post.hashtags);
	return {
		title: post.title,
		body: post.body,
		platforms: [platformId],
		targets: [platformId],
		scheduledAt: post.scheduledAt || null,
		hashtags,
		altText: post.altText || "",
		status: "approved",
		metadata: {
			echoStudio: true,
			missionId: mission?.id || null,
			productProfileId: selectedProduct?.id || null,
			productName: selectedProduct?.label || "",
			campaignStrategy,
			campaignPhase: post.campaignPhase || "",
			campaignAngle: post.campaignAngle || "",
			hook: post.hook || "",
			cta: post.cta || "",
			imageConcept: post.imageConcept || "",
			imagePrompt: post.imagePrompt || "",
			destinationUrl: post.destinationUrl || "",
			pinterestBoard: platformId === "pinterest" ? post.destination || "" : "",
			pinterestBoards: platformId === "pinterest" && post.destination ? [post.destination] : [],
			prompts: post.prompts || {},
			contentTags: ["echo-studio", post.campaignPhase, platformId].filter(Boolean),
			distributionTags: [`post:${platformId}`],
		},
		tags: ["echo-studio", post.campaignPhase, post.campaignAngle].filter(Boolean),
	};
}

function buildCampaignDraftPayload({
	id = null,
	form,
	pipeline,
	brainSources,
	generatedPosts,
	pinterestBoards,
	currentView,
	queueResults,
	publishResults,
	handoffStatus,
	status = "draft",
}) {
	const posts = Array.isArray(generatedPosts) ? generatedPosts : [];
	const draftStatus = getCampaignDraftStatus({
		status,
		currentView,
		generatedPosts: posts,
		queueResults,
		publishResults,
	});
	return {
		...(id ? { id } : {}),
		status: draftStatus,
		title: pipeline?.mission?.title || form?.goal || "Echo Studio Campaign",
		form,
		currentView,
		mission: pipeline?.mission || null,
		knowledgeContext: pipeline?.knowledgeContext || null,
		campaignStrategy: pipeline?.campaignStrategy || null,
		campaignPlan: pipeline?.campaignPlan || null,
		campaignGeneration: pipeline?.campaignGeneration || null,
		generatedPosts: posts,
		scheduling: posts.map((post) => ({
			localId: post.localId,
			title: post.title,
			platform: post.platform,
			scheduledAt: post.scheduledAt || null,
		})),
		selectedDestinations: posts.map((post) => ({
			localId: post.localId,
			platform: post.platform,
			destination: post.destination || "",
			boardRecommendation: post.boardRecommendation || null,
			destinationUrl: post.destinationUrl || "",
		})),
		brainSources,
		pinterestBoards,
		queueResults,
		publishResults,
		handoffStatus,
	};
}

function getCampaignDraftStatus({
	status,
	currentView,
	generatedPosts,
	queueResults,
	publishResults,
}) {
	if (Array.isArray(publishResults) && publishResults.length) return "publish_handoff";
	if (Array.isArray(queueResults) && queueResults.length) return "queued";
	if (currentView === "publish") return "ready_for_publish";
	if (currentView === "schedule") return "scheduled_draft";
	if (["content", "assets", "review"].includes(currentView) && generatedPosts.length) return "generated";
	return status || "draft";
}

function getCampaignDraftStatusLabel(status = "") {
	const labels = {
		draft: "Draft",
		generated: "Generated",
		scheduled_draft: "Scheduled",
		queued: "Queued",
		ready_for_publish: "Ready for Publish",
		publish_handoff: "Publish Handoff",
	};
	return labels[String(status || "").toLowerCase()] || "Draft";
}

function getRestoredDraftView(draft) {
	const view = String(draft?.currentView || "").trim();
	const hasPosts = Array.isArray(draft?.generatedPosts) && draft.generatedPosts.length > 0;
	if (["content", "assets", "review", "schedule", "publish"].includes(view) && hasPosts) return view;
	if (view === "strategy" && draft?.campaignPlan) return "strategy";
	return hasPosts ? "content" : "strategy";
}

function formatDraftUpdatedDate(value) {
	if (!value) return "Unknown";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Unknown";
	return date.toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function getDraftProductName(draft) {
	return (
		draft?.form?.productId &&
			ECHO_PRODUCTS.find((product) => product.id === draft.form.productId)?.label
	) || draft?.mission?.productName || draft?.mission?.businessName || "Unknown product";
}

function getDraftPlatform(draft) {
	return (
		draft?.generatedPosts?.[0]?.platform ||
		draft?.form?.primaryPlatform ||
		draft?.campaignPlan?.primaryPlatform ||
		draft?.mission?.channels?.[0] ||
		"Unknown platform"
	);
}

function getDraftTitle(draft) {
	return draft?.title || draft?.mission?.title || draft?.form?.goal || "Untitled campaign";
}

function getDraftPostCount(draft) {
	return Array.isArray(draft?.generatedPosts) ? draft.generatedPosts.length : 0;
}

function getScheduleWarnings(posts) {
	const warnings = [];
	const byDayPlatform = new Map();
	const seenBoards = new Map();
	const seenHooks = new Map();
	const seenImages = new Map();
	const sorted = [...posts].sort((left, right) =>
		String(left.scheduledAt || "").localeCompare(String(right.scheduledAt || "")),
	);
	for (const post of sorted) {
		const platformId = normalizePlatformId(post.platform);
		const day = String(post.scheduledAt || "").slice(0, 10);
		const key = `${day}:${platformId}`;
		byDayPlatform.set(key, (byDayPlatform.get(key) || 0) + 1);
		if (platformId === "pinterest" && post.destination) {
			const boardKey = `${day}:${post.destination}`;
			if (seenBoards.has(boardKey)) warnings.push(`Duplicate Pinterest board on ${day}: ${post.destination}`);
			seenBoards.set(boardKey, true);
		}
		const hookKey = String(post.hook || post.title || "").trim().toLowerCase();
		if (hookKey) {
			if (seenHooks.has(hookKey)) warnings.push(`Duplicate hook: ${post.hook || post.title}`);
			seenHooks.set(hookKey, true);
		}
		const imageKey = String(post.imagePrompt || post.imageConcept || "").trim().toLowerCase();
		if (imageKey) {
			if (seenImages.has(imageKey)) warnings.push(`Duplicate image direction: ${post.title}`);
			seenImages.set(imageKey, true);
		}
	}
	for (let index = 1; index < sorted.length; index += 1) {
		const previous = sorted[index - 1];
		const current = sorted[index];
		if (normalizePlatformId(previous.platform) !== normalizePlatformId(current.platform)) continue;
		const previousTime = new Date(previous.scheduledAt).getTime();
		const currentTime = new Date(current.scheduledAt).getTime();
		if (Number.isFinite(previousTime) && Number.isFinite(currentTime) && currentTime - previousTime < 2 * 60 * 60 * 1000) {
			warnings.push(`${current.platform} posts are too close together.`);
		}
	}
	for (const [key, count] of byDayPlatform.entries()) {
		if (key.endsWith(":pinterest") && count > 5) warnings.push("More than daily Pinterest limit.");
		if (count > 3) warnings.push("Campaign clustering detected on one platform/day.");
	}
	return Array.from(new Set(warnings));
}

const CAMPAIGN_ACCENTS = [
	{
		dotClass: "bg-violet-500",
		borderClass: "border-violet-500/70",
		bgClass: "bg-violet-950/10",
		textClass: "text-violet-200",
		mutedTextClass: "text-violet-300",
		shadowClass: "shadow-[0_0_18px_rgba(139,92,246,0.16)]",
	},
	{
		dotClass: "bg-lime-500",
		borderClass: "border-lime-500/70",
		bgClass: "bg-lime-950/10",
		textClass: "text-lime-200",
		mutedTextClass: "text-lime-300",
		shadowClass: "shadow-[0_0_18px_rgba(132,204,22,0.16)]",
	},
	{
		dotClass: "bg-orange-500",
		borderClass: "border-orange-500/70",
		bgClass: "bg-orange-950/10",
		textClass: "text-orange-200",
		mutedTextClass: "text-orange-300",
		shadowClass: "shadow-[0_0_18px_rgba(249,115,22,0.16)]",
	},
	{
		dotClass: "bg-cyan-500",
		borderClass: "border-cyan-500/70",
		bgClass: "bg-cyan-950/10",
		textClass: "text-cyan-200",
		mutedTextClass: "text-cyan-300",
		shadowClass: "shadow-[0_0_18px_rgba(34,211,238,0.16)]",
	},
	{
		dotClass: "bg-fuchsia-500",
		borderClass: "border-fuchsia-500/70",
		bgClass: "bg-fuchsia-950/10",
		textClass: "text-fuchsia-200",
		mutedTextClass: "text-fuchsia-300",
		shadowClass: "shadow-[0_0_18px_rgba(217,70,239,0.16)]",
	},
];

function getCampaignAccent(seed = "") {
	const text = String(seed || "echo-studio");
	const hash = text.split("").reduce((total, character) => total + character.charCodeAt(0), 0);
	return CAMPAIGN_ACCENTS[hash % CAMPAIGN_ACCENTS.length];
}

function getCampaignName({ mission, selectedProduct, campaignStrategy }) {
	return (
		mission?.title ||
		campaignStrategy?.primaryHook ||
		(selectedProduct?.label ? `${selectedProduct.label} Campaign` : "Echo Studio Campaign")
	);
}

function getPostTypeLabel(platform = "", count = 1) {
	const platformId = normalizePlatformId(platform);
	if (platformId === "pinterest") return count === 1 ? "Pinterest Pin" : "Pinterest Pins";
	if (platformId === "facebook") return count === 1 ? "Facebook Post" : "Facebook Posts";
	if (platformId === "devto") return count === 1 ? "Dev.to Article" : "Dev.to Articles";
	return count === 1 ? "Campaign Post" : "Campaign Posts";
}

function getShortPostTypeLabel(platform = "") {
	const platformId = normalizePlatformId(platform);
	if (platformId === "pinterest") return "Pin";
	if (platformId === "facebook") return "Post";
	if (platformId === "devto") return "Article";
	return "Post";
}

function getCampaignPostCountLabel(posts, platform = "") {
	const count = posts.length;
	return `${count} ${getPostTypeLabel(platform, count)}`;
}

function getSortedScheduledPosts(posts) {
	return posts
		.map((post, originalIndex) => ({ post, originalIndex }))
		.sort((left, right) =>
			String(left.post.scheduledAt || "").localeCompare(String(right.post.scheduledAt || "")),
		);
}

function formatScheduleDate(iso) {
	if (!iso) return "Unscheduled";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "Unscheduled";
	return date.toLocaleDateString(undefined, {
		month: "long",
		day: "numeric",
	});
}

function formatScheduleTime(iso) {
	if (!iso) return "";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleTimeString(undefined, {
		hour: "numeric",
		minute: "2-digit",
	});
}

function getScheduleStatus(posts, warnings = []) {
	if (!posts.length) return "No posts generated";
	if (warnings.length) return "Needs schedule review";
	if (posts.every((post) => post.scheduledAt)) return "Scheduled";
	return "Partially scheduled";
}

function JourneyHeader({ activeIndex, onStageClick }) {
	return (
		<nav className="rounded-lg border border-gray-800 bg-gray-950/80 p-3" aria-label="Campaign journey">
			<ol className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-8">
				{JOURNEY_STAGES.map((stage, index) => {
					const completed = index < activeIndex;
					const active = index === activeIndex;
					const clickable = completed && [0, 2, 3, 4, 5].includes(index);
					const className = [
						"flex items-center justify-center gap-2 border px-3 py-2 text-center transition",
						active
							? "border-pink-500 bg-pink-500/15 text-pink-100 shadow-[0_0_18px_rgba(236,72,153,0.22)]"
							: completed
								? "border-cyan-500/70 text-cyan-100"
								: "border-gray-800 text-gray-500",
						clickable ? "hover:border-cyan-300 hover:text-cyan-50" : "",
					].join(" ");
					const content = (
						<>
							<span aria-hidden="true">{completed ? "✓" : index + 1}</span>
							<span>{stage}</span>
						</>
					);
					return (
						<li key={stage}>
							{clickable ? (
								<button type="button" className={`${className} w-full`} onClick={() => onStageClick(index)}>
									{content}
								</button>
							) : (
								<div className={className}>{content}</div>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}

function StrategyCard({ title, children }) {
	return (
		<section className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
			<h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">{title}</h3>
			<div className="mt-3 text-sm leading-6 text-gray-100">{children}</div>
		</section>
	);
}

function PromptInspector({ post }) {
	const sections = getPromptSections(post);
	if (!sections.length) return null;
	return (
		<details className="mt-4 rounded border border-gray-800 bg-black/50 p-3">
			<summary className="cursor-pointer text-sm font-semibold text-cyan-200">AI Generation Details</summary>
			<div className="mt-3 space-y-3">
				{sections.map(([label, value]) => (
					<div key={label}>
						<p className="text-xs uppercase tracking-[0.18em] text-pink-300">{label}</p>
						<pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-black p-3 text-xs leading-5 text-gray-200">
							{value}
						</pre>
					</div>
				))}
			</div>
		</details>
	);
}

function CampaignVisualPreview({ post, compact = false }) {
	const preview = getCampaignAssetPreview(post);
	if (!preview) return null;
	return (
		<figure
			className={[
				"overflow-hidden rounded-lg border border-cyan-500/40 bg-black/60",
				compact ? "h-20 w-20 shrink-0" : "mt-5",
			].join(" ")}
		>
			<img
				src={preview.url}
				alt={preview.alt}
				className={compact ? "h-full w-full object-cover" : "max-h-80 w-full object-contain"}
				loading="lazy"
				title={preview.path}
			/>
			{compact ? null : (
				<figcaption className="border-t border-gray-800 px-3 py-2 text-xs text-gray-400">
					Campaign visual: {preview.filename}
				</figcaption>
			)}
		</figure>
	);
}

function CampaignAssetsStep({
	posts,
	onChange,
	onUpload,
	onRemove,
	onCopy,
	uploadState,
}) {
	return (
		<section className="space-y-5">
			<div>
				<p className="text-sm uppercase tracking-[0.28em] text-cyan-300">Campaign Assets</p>
				<h2 className="mt-2 text-2xl font-semibold text-pink-200">Prepare the visuals for this campaign.</h2>
				<p className="mt-2 text-sm text-gray-300">
					Review Echo's visual direction, keep the existing campaign asset, or upload a replacement before final review.
				</p>
			</div>

			<div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
				<p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Asset Workflow</p>
				<div className="mt-3 grid gap-2 text-sm text-gray-300 sm:grid-cols-5">
					<span>Campaign</span>
					<span>Visual Prompt</span>
					<span>Asset</span>
					<span>Preview</span>
					<span>Review</span>
				</div>
			</div>

			{posts.map((post, index) => {
				const preview = getCampaignAssetPreview(post);
				const state = uploadState[post.localId] || {};
				return (
					<article key={post.localId} className="rounded-lg border border-pink-600/60 bg-gray-950/80 p-5">
						<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
							<div>
								<p className="text-xs uppercase tracking-[0.22em] text-cyan-300">{post.platform}</p>
								<h3 className="mt-2 text-xl font-semibold text-pink-200">{post.title}</h3>
								<p className="mt-2 text-sm text-gray-400">Campaign asset {index + 1}</p>
							</div>
							<p className="text-xs text-gray-500">{preview ? "Asset ready" : "Needs asset"}</p>
						</div>

						<section className="mt-5 rounded border border-gray-800 bg-black/45 p-4">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Visual Prompt</p>
									<p className="mt-1 text-sm text-gray-400">Use this direction for campaign artwork.</p>
								</div>
								<button
									type="button"
									className="border border-cyan-500 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500 hover:text-black"
									onClick={() => onCopy(post.imagePrompt || post.imageConcept || "", post.localId)}
									disabled={!String(post.imagePrompt || post.imageConcept || "").trim()}
								>
									{state.copied ? "Prompt Copied" : "Copy Prompt"}
								</button>
							</div>
							<textarea
								className="mt-4 min-h-28 w-full border border-gray-700 bg-black px-3 py-2 text-white"
								value={post.imagePrompt || ""}
								onChange={(event) => onChange(index, "imagePrompt", event.target.value)}
								placeholder="Echo's visual prompt will appear here."
							/>
						</section>

						<section className="mt-5 rounded border border-gray-800 bg-black/45 p-4">
							<p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Existing Campaign Asset</p>
							{preview ? (
								<div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,280px)_1fr] md:items-start">
									<CampaignVisualPreview post={post} />
									<div className="space-y-3 text-sm text-gray-300">
										<div>
											<p className="text-xs uppercase tracking-[0.18em] text-gray-500">Filename</p>
											<p className="mt-1 text-gray-100">{preview.filename}</p>
										</div>
										<div className="flex flex-wrap gap-3">
											<label className="inline-flex cursor-pointer items-center border border-cyan-500 px-3 py-2 text-cyan-200 hover:bg-cyan-500 hover:text-black">
												Replace Asset
												<input
													type="file"
													accept="image/*"
													className="sr-only"
													onChange={(event) => onUpload(index, event.target.files?.[0])}
												/>
											</label>
											<button
												type="button"
												className="border border-red-500/80 px-3 py-2 text-red-200 hover:bg-red-500 hover:text-black"
												onClick={() => onRemove(index)}
											>
												Remove Asset
											</button>
										</div>
									</div>
								</div>
							) : (
								<div className="mt-4 rounded border border-dashed border-gray-700 bg-black/40 p-4 text-sm text-gray-300">
									No campaign asset is attached yet.
								</div>
							)}
						</section>

						<section className="mt-5 rounded border border-gray-800 bg-black/45 p-4">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Upload Asset</p>
									<p className="mt-1 text-sm text-gray-400">Upload an image to replace the current campaign visual.</p>
								</div>
								<label className="inline-flex cursor-pointer items-center border border-pink-500 bg-pink-500 px-3 py-2 text-sm font-semibold text-black hover:bg-pink-400">
									Upload Image
									<input
										type="file"
										accept="image/*"
										className="sr-only"
										onChange={(event) => onUpload(index, event.target.files?.[0])}
									/>
								</label>
							</div>
							{state.uploading ? <p className="mt-3 text-sm text-cyan-200">Uploading image...</p> : null}
							{state.error ? <p className="mt-3 text-sm text-red-300">{state.error}</p> : null}
						</section>

						<section className="mt-5 rounded border border-gray-800 bg-black/45 p-4">
							<p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Generate with OpenAI</p>
							<p className="mt-2 text-sm text-gray-400">
								Native GPT image generation will allow users to create campaign artwork directly inside Echo Studio.
							</p>
							<button
								type="button"
								className="mt-3 cursor-not-allowed border border-gray-700 px-3 py-2 text-sm text-gray-500"
								disabled
							>
								Generate Image
							</button>
							<p className="mt-2 text-xs uppercase tracking-[0.18em] text-gray-500">Coming Soon</p>
						</section>
					</article>
				);
			})}
		</section>
	);
}

function GeneratedPostEditor({ post, index, boards = [], onChange, compact = false }) {
	return (
		<section className="rounded-lg border border-pink-600/60 bg-gray-950/80 p-5">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="text-xs uppercase tracking-[0.22em] text-cyan-300">{post.platform}</p>
					<h3 className="mt-2 text-xl font-semibold text-pink-200">{post.title}</h3>
					<p className="mt-2 text-sm text-gray-400">
						{post.campaignPhase || "Campaign"} · {post.campaignAngle || "Generated angle"}
					</p>
				</div>
				<p className="text-xs text-gray-500">Post {index + 1}</p>
			</div>

			<CampaignVisualPreview post={post} />

			<div className="mt-5 rounded border border-gray-800 bg-black/60 p-4">
				<p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Publish Preview</p>
				<p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-100">{post.body}</p>
				{post.hashtags.length ? (
					<p className="mt-3 text-xs text-gray-400">{post.hashtags.join(" ")}</p>
				) : null}
			</div>

			{post.boardRecommendation ? (
				<div className="mt-4 rounded border border-cyan-700/70 bg-cyan-950/20 p-4 text-sm">
					<p className="font-semibold text-cyan-100">Recommended Board</p>
					<p className="mt-2 text-gray-100">✓ {post.destination}</p>
					<p className="mt-1 text-gray-300">Confidence: {post.boardRecommendation.confidence}</p>
					<p className="mt-1 text-gray-400">{post.boardRecommendation.reason}</p>
				</div>
			) : null}

			{compact ? null : (
				<div className="mt-5 grid gap-4 md:grid-cols-2">
					<label className="block text-sm text-gray-300">
						Platform
						<input
							className="mt-2 w-full border border-gray-700 bg-black px-3 py-2 text-white"
							value={post.platform}
							onChange={(event) => onChange(index, "platform", event.target.value)}
						/>
					</label>
					<label className="block text-sm text-gray-300">
						Publishing Destination
						{normalizePlatformId(post.platform) === "pinterest" && boards.length ? (
							<select
								className="mt-2 w-full border border-gray-700 bg-black px-3 py-2 text-white"
								value={post.destination || ""}
								onChange={(event) => onChange(index, "destination", event.target.value)}
							>
								{boards.map((board) => (
									<option key={board} value={board}>
										{board}
									</option>
								))}
							</select>
						) : (
							<input
								className="mt-2 w-full border border-gray-700 bg-black px-3 py-2 text-white"
								value={post.destination || ""}
								onChange={(event) => onChange(index, "destination", event.target.value)}
							/>
						)}
					</label>
					<label className="block text-sm text-gray-300 md:col-span-2">
						Title
						<input
							className="mt-2 w-full border border-gray-700 bg-black px-3 py-2 text-white"
							value={post.title}
							onChange={(event) => onChange(index, "title", event.target.value)}
						/>
					</label>
					<label className="block text-sm text-gray-300 md:col-span-2">
						Generated Content
						<textarea
							className="mt-2 min-h-36 w-full border border-gray-700 bg-black px-3 py-2 text-white"
							value={post.body}
							onChange={(event) => onChange(index, "body", event.target.value)}
						/>
					</label>
					<label className="block text-sm text-gray-300">
						Title / Hook
						<input
							className="mt-2 w-full border border-gray-700 bg-black px-3 py-2 text-white"
							value={post.hook}
							onChange={(event) => onChange(index, "hook", event.target.value)}
						/>
					</label>
					<label className="block text-sm text-gray-300">
						Recommended Next Step
						<input
							className="mt-2 w-full border border-gray-700 bg-black px-3 py-2 text-white"
							value={post.cta}
							onChange={(event) => onChange(index, "cta", event.target.value)}
						/>
					</label>
					<label className="block text-sm text-gray-300">
						Hashtags
						<input
							className="mt-2 w-full border border-gray-700 bg-black px-3 py-2 text-white"
							value={post.hashtags.join(", ")}
							onChange={(event) => onChange(index, "hashtags", normalizeList(event.target.value))}
						/>
					</label>
					<label className="block text-sm text-gray-300">
						Keywords
						<input
							className="mt-2 w-full border border-gray-700 bg-black px-3 py-2 text-white"
							value={post.keywords.join(", ")}
							onChange={(event) => onChange(index, "keywords", normalizeList(event.target.value))}
						/>
					</label>
					<label className="block text-sm text-gray-300 md:col-span-2">
						Link
						<input
							className="mt-2 w-full border border-gray-700 bg-black px-3 py-2 text-white"
							value={post.destinationUrl}
							onChange={(event) => onChange(index, "destinationUrl", event.target.value)}
						/>
					</label>
					<label className="block text-sm text-gray-300 md:col-span-2">
						Visual Direction
						<input
							className="mt-2 w-full border border-gray-700 bg-black px-3 py-2 text-white"
							value={post.imageConcept}
							onChange={(event) => onChange(index, "imageConcept", event.target.value)}
						/>
					</label>
					<label className="block text-sm text-gray-300 md:col-span-2">
						Visual Instructions
						<textarea
							className="mt-2 min-h-24 w-full border border-gray-700 bg-black px-3 py-2 text-white"
							value={post.imagePrompt}
							onChange={(event) => onChange(index, "imagePrompt", event.target.value)}
						/>
					</label>
				</div>
			)}

			<PromptInspector post={post} />
		</section>
	);
}

export default function EchoStudioPage() {
	const [form, setForm] = useState({
		goal: "Launch my new book with authority",
		primaryPlatform: "Pinterest",
		productId: ECHO_PRODUCTS[0]?.id || "",
	});
	const [pipeline, setPipeline] = useState(emptyPipeline);
	const [brainSources, setBrainSources] = useState([]);
	const [view, setView] = useState("intake");
	const [workingStep, setWorkingStep] = useState("");
	const [loaderVisible, setLoaderVisible] = useState(false);
	const [completedNodes, setCompletedNodes] = useState([]);
	const [loaderComplete, setLoaderComplete] = useState(false);
	const [loaderCompleteText, setLoaderCompleteText] = useState("Campaign strategy ready");
	const [campaignPosts, setCampaignPosts] = useState([]);
	const [pinterestBoards, setPinterestBoards] = useState({ defaultBoard: "", boards: [], rules: [] });
	const [queueResults, setQueueResults] = useState([]);
	const [publishResults, setPublishResults] = useState([]);
	const [handoffStatus, setHandoffStatus] = useState("");
	const [error, setError] = useState("");
	const [currentCampaignDraftId, setCurrentCampaignDraftId] = useState(null);
	const [campaignDrafts, setCampaignDrafts] = useState([]);
	const [libraryLoading, setLibraryLoading] = useState(false);
	const [assetUploadState, setAssetUploadState] = useState({});
	const restoringDraftRef = useRef(false);

	const selectedProduct =
		ECHO_PRODUCTS.find((product) => product.id === form.productId) || ECHO_PRODUCTS[0];
	const activeJourneyIndex = getJourneyIndex({ view, loaderVisible, pipeline });
	const displayedRecommendations = useMemo(
		() => getDisplayedRecommendations(pipeline.campaignPlan, form.primaryPlatform),
		[pipeline.campaignPlan, form.primaryPlatform],
	);
	const campaignStrategy = pipeline.campaignStrategy;
	const campaignAccent = getCampaignAccent(selectedProduct?.id || pipeline.mission?.id || form.goal);
	const campaignName = getCampaignName({
		mission: pipeline.mission,
		selectedProduct,
		campaignStrategy,
	});
	const campaignPlatform = campaignPosts[0]?.platform || form.primaryPlatform;
	const campaignPostCountLabel = getCampaignPostCountLabel(campaignPosts, campaignPlatform);
	const recommendedAudience = useMemo(
		() =>
			campaignStrategy?.audience || getRecommendedAudience({
				product: selectedProduct,
				platform: pipeline.campaignPlan?.primaryPlatform || form.primaryPlatform,
			}),
		[campaignStrategy, pipeline.campaignPlan, form.primaryPlatform, selectedProduct],
	);
	const scheduleWarnings = useMemo(() => getScheduleWarnings(campaignPosts), [campaignPosts]);

	function applyCampaignDraft(draft) {
		restoringDraftRef.current = true;
		setError("");
		setCurrentCampaignDraftId(draft.id || null);
		setForm((current) => ({
			...current,
			...(draft.form || {}),
		}));
		setPipeline({
			...emptyPipeline,
			mission: draft.mission || null,
			knowledgeContext: draft.knowledgeContext || null,
			campaignPlan: draft.campaignPlan || null,
			campaignStrategy: draft.campaignStrategy || null,
			campaignGeneration: draft.campaignGeneration || null,
		});
		setBrainSources(Array.isArray(draft.brainSources) ? draft.brainSources : []);
		setCampaignPosts(Array.isArray(draft.generatedPosts) ? draft.generatedPosts : []);
		setPinterestBoards({
			defaultBoard: draft.pinterestBoards?.defaultBoard || "",
			boards: Array.isArray(draft.pinterestBoards?.boards) ? draft.pinterestBoards.boards : [],
			rules: Array.isArray(draft.pinterestBoards?.rules) ? draft.pinterestBoards.rules : [],
		});
		setQueueResults(Array.isArray(draft.queueResults) ? draft.queueResults : []);
		setPublishResults(Array.isArray(draft.publishResults) ? draft.publishResults : []);
		setHandoffStatus(draft.handoffStatus || "");
		setAssetUploadState({});
		setView(getRestoredDraftView(draft));
		window.setTimeout(() => {
			restoringDraftRef.current = false;
		}, 0);
	}

	function resetCampaignWorkspace() {
		restoringDraftRef.current = true;
		setCurrentCampaignDraftId(null);
		setPipeline(emptyPipeline);
		setBrainSources([]);
		setCampaignPosts([]);
		setPinterestBoards({ defaultBoard: "", boards: [], rules: [] });
		setQueueResults([]);
		setPublishResults([]);
		setHandoffStatus("");
		setAssetUploadState({});
		setError("");
		setView("intake");
		window.setTimeout(() => {
			restoringDraftRef.current = false;
		}, 0);
	}

	async function loadCampaignLibrary({ showLibrary = false } = {}) {
		setLibraryLoading(true);
		try {
			const drafts = await getJson("/api/campaigns");
			const normalizedDrafts = Array.isArray(drafts) ? drafts : [];
			setCampaignDrafts(normalizedDrafts);
			if (showLibrary || normalizedDrafts.length) setView("library");
			return normalizedDrafts;
		} catch (libraryError) {
			setError(libraryError.message || "Echo could not load saved campaigns.");
			return [];
		} finally {
			setLibraryLoading(false);
		}
	}

	async function openCampaignDraft(id) {
		setError("");
		try {
			const draft = await getJson(`/api/campaigns/${id}`);
			applyCampaignDraft(draft);
		} catch (openError) {
			setError(openError.message || "Echo could not open that campaign.");
		}
	}

	async function deleteCampaignDraftFromLibrary(id) {
		const draft = campaignDrafts.find((item) => item.id === id);
		const confirmed = window.confirm(`Delete "${getDraftTitle(draft)}"?`);
		if (!confirmed) return;
		setError("");
		try {
			await deleteJson(`/api/campaigns/${id}`);
			setCampaignDrafts((current) => current.filter((item) => item.id !== id));
			if (currentCampaignDraftId === id) resetCampaignWorkspace();
		} catch (deleteError) {
			setError(deleteError.message || "Echo could not delete that campaign.");
		}
	}

	function buildCurrentDraftPayload(overrides = {}) {
		return buildCampaignDraftPayload({
			id: currentCampaignDraftId,
			form,
			pipeline,
			brainSources,
			generatedPosts: campaignPosts,
			pinterestBoards,
			currentView: view,
			queueResults,
			publishResults,
			handoffStatus,
			...overrides,
		});
	}

	useEffect(() => {
		let cancelled = false;
		async function loadInitialLibrary() {
			try {
				const drafts = await getJson("/api/campaigns");
				if (cancelled) return;
				const normalizedDrafts = Array.isArray(drafts) ? drafts : [];
				setCampaignDrafts(normalizedDrafts);
			} catch (restoreError) {
				console.warn("No Echo Studio campaign drafts loaded:", restoreError?.message || restoreError);
			}
		}
		loadInitialLibrary();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!currentCampaignDraftId || restoringDraftRef.current) return undefined;
		if (view === "library") return undefined;
		if (!pipeline.mission && !pipeline.campaignStrategy && campaignPosts.length === 0) return undefined;
		const timer = window.setTimeout(async () => {
			try {
				await patchJson(`/api/campaigns/${currentCampaignDraftId}`, buildCurrentDraftPayload());
			} catch (saveError) {
				console.warn("Could not autosave Echo Studio campaign draft:", saveError?.message || saveError);
			}
		}, DRAFT_SAVE_DEBOUNCE_MS);
		return () => window.clearTimeout(timer);
	}, [
		currentCampaignDraftId,
		form,
		pipeline,
		brainSources,
		campaignPosts,
		pinterestBoards,
		view,
		queueResults,
		publishResults,
		handoffStatus,
	]);

	function updateField(field, value) {
		setForm((current) => ({ ...current, [field]: value }));
	}

	async function runStep(label, action, { completeText = "Campaign strategy ready" } = {}) {
		let succeeded = false;
		try {
			setWorkingStep(label);
			setLoaderVisible(true);
			setLoaderComplete(false);
			setLoaderCompleteText(completeText);
			setError("");
			await action();
			succeeded = true;
			setCompletedNodes(KNOWLEDGE_NODE_DEFINITIONS.map((node) => node.key));
			setWorkingStep(completeText);
			setLoaderComplete(true);
		} catch (stepError) {
			setError(stepError.message || "Echo Studio could not finish that step. Please try again.");
			setLoaderVisible(false);
		} finally {
			if (!succeeded) {
				setWorkingStep("");
				setLoaderComplete(false);
			}
		}
	}

	function markNodeLoaded(nodeKey) {
		setCompletedNodes((current) =>
			current.includes(nodeKey) ? current : [...current, nodeKey],
		);
	}

	async function loadPinterestBoards() {
		const boards = await getRawJson("/api/pinterest-boards");
		const normalized = {
			defaultBoard: boards.defaultBoard || "",
			boards: Array.isArray(boards.boards) ? boards.boards : [],
			rules: Array.isArray(boards.rules) ? boards.rules : [],
		};
		setPinterestBoards(normalized);
		return normalized;
	}

	async function loadBrainForMission(mission) {
		setWorkingStep("Reading product knowledge...");
		const existingSources = await getJson("/api/knowledge-sources");
		const existingByTitle = new Map(
			existingSources.map((source) => [source.title, source]),
		);
		const sources = [];
		const productSource = selectedProduct ? createProductBrainSource(selectedProduct) : null;
		const sourceDefinitions = productSource
			? [productSource, ...BRAIN_SOURCE_DEFINITIONS]
			: BRAIN_SOURCE_DEFINITIONS;

		for (const sourceDefinition of sourceDefinitions) {
			if (sourceDefinition.type === "product") setWorkingStep("Reading product knowledge...");
			if (sourceDefinition.type === "brand") setWorkingStep("Understanding the brand voice...");
			if (sourceDefinition.type === "platform") setWorkingStep("Reviewing platform intelligence...");
			if (sourceDefinition.type === "playbook") setWorkingStep("Applying the marketing playbook...");
			const existingSource = existingByTitle.get(sourceDefinition.title);
			if (existingSource) {
				sources.push({ ...existingSource, loadedStatus: "Loaded" });
				if (sourceDefinition.type === "product") markNodeLoaded("product");
				if (sourceDefinition.type === "brand") markNodeLoaded("brand");
				if (sourceDefinition.type === "platform") markNodeLoaded("platform");
				if (sourceDefinition.type === "playbook") markNodeLoaded("playbook");
				continue;
			}
			const source = await postJson("/api/knowledge-sources", {
				...sourceDefinition,
				description:
					sourceDefinition.description || "Echo Studio marketing intelligence source",
				enabled: true,
				tags: sourceDefinition.tags || ["echo-brain"],
			});
			sources.push({ ...source, loadedStatus: "Loaded" });
			if (sourceDefinition.type === "product") markNodeLoaded("product");
			if (sourceDefinition.type === "brand") markNodeLoaded("brand");
			if (sourceDefinition.type === "platform") markNodeLoaded("platform");
			if (sourceDefinition.type === "playbook") markNodeLoaded("playbook");
		}

		setWorkingStep("Looking for previous campaign patterns...");
		const assembledBrain = await assembleBrain(mission.id);
		markNodeLoaded("performance");
		setWorkingStep("Identifying SEO opportunities...");
		const knowledgeContext = await postJson("/api/knowledge", {
			missionId: mission.id,
			title: `${mission.title} Echo Brain`,
			status: "ready",
			sections: createKnowledgeSections(assembledBrain),
			metadata: {
				sourceCount: sources.length,
				sourceTitles: sources.map((source) => source.title),
				productId: selectedProduct?.id || null,
				productName: selectedProduct?.label || "",
				productKnowledgeSourceTitle: productSource?.title || null,
			},
		});
		markNodeLoaded("seo");
		const linkedMission = await patchJson(`/api/missions/${mission.id}`, {
			knowledgeContextId: knowledgeContext.id,
		});

		setBrainSources(sources.sort((left, right) => left.priority - right.priority));
		setPipeline((current) => ({
			...current,
			mission: linkedMission,
			knowledgeContext,
			campaignPlan: null,
			campaignStrategy: null,
			assetBlueprints: [],
			campaignAsset: null,
		}));
		return { linkedMission, knowledgeContext };
	}

	function continueToBrain() {
		return runStep("Reading product knowledge...", async () => {
			setCurrentCampaignDraftId(null);
			setCompletedNodes([]);
			const mission = await postJson("/api/missions", {
				title: form.goal,
				goal: form.goal,
				audience: recommendedAudience,
				businessName: selectedProduct?.label || "",
				productId: selectedProduct?.id || null,
				productName: selectedProduct?.label || "",
				channels: [form.primaryPlatform],
				status: "intake_complete",
				metadata: {
					selectedProduct: selectedProduct || null,
					echoBrainProductSource: selectedProduct
						? createProductBrainSource(selectedProduct)
						: null,
				},
			});
			setPipeline({ ...emptyPipeline, mission });
			setView("strategy");
			const { linkedMission, knowledgeContext } = await loadBrainForMission(mission);
			setWorkingStep("Building campaign strategy...");
			const campaignPlan = await postJson("/api/campaign-plans/generate", {
				missionId: linkedMission.id,
				mission: linkedMission,
				knowledgeContext,
			});
			const nextCampaignStrategy = buildCampaignStrategy({
				campaignPlan,
				goal: form.goal,
				product: selectedProduct,
				platform: form.primaryPlatform,
			});
			setPipeline((current) => ({
				...current,
				campaignPlan,
				campaignStrategy: nextCampaignStrategy,
				campaignGeneration: null,
				assetBlueprints: [],
				campaignAsset: null,
			}));
			setCampaignPosts([]);
			setQueueResults([]);
			setPublishResults([]);
			setHandoffStatus("");
		}, { completeText: "Campaign strategy ready" });
	}

	function approveStrategyAndGenerateDraft() {
		if (!pipeline.campaignPlan || !pipeline.campaignStrategy) return null;
		if (!AI_GENERATION_ENABLED) {
			setError("AI generation is paused during development. Open an existing campaign to continue testing.");
			return null;
		}
		return runStep("Generating campaign content...", async () => {
			setCompletedNodes(KNOWLEDGE_NODE_DEFINITIONS.map((node) => node.key));
			setWorkingStep("Loading publishing destinations...");
			const boards = await loadPinterestBoards();
			const platformId = normalizePlatformId(form.primaryPlatform);
			const generationPayload = {
				productName: selectedProduct?.label || "Selected product",
				productType: selectedProduct?.productType || selectedProduct?.category || "Product",
				audience: pipeline.campaignStrategy.audience,
				platformIds: [platformId],
				campaignPhases: ["launch"],
				productProfileId: selectedProduct?.id || null,
				postIntent: pipeline.campaignStrategy.primaryMessage,
				maxPosts: getDefaultCampaignSize(platformId),
			};
			setWorkingStep("Building AI campaign prompts...");
			const promptPreview = await postRawJson("/api/ai/campaign-generate", {
				...generationPayload,
				dryRun: true,
			});
			setWorkingStep("Generating campaign posts...");
			const campaignGeneration = await postRawJson("/api/ai/campaign-generate", generationPayload);
			const posts = Array.isArray(campaignGeneration.posts) ? campaignGeneration.posts : [];
			if (!posts.length) {
				throw new Error("Echo did not return any campaign posts.");
			}
			const seoPromptPreviews = await Promise.all(
				posts.map((post) =>
					postRawJson("/api/ai/seo-generate", {
						productName: generationPayload.productName,
						productType: generationPayload.productType,
						audience: generationPayload.audience,
						platformIds: [normalizePlatformId(post.platform)],
						productProfileId: generationPayload.productProfileId,
						postIntent: post.post_intent || generationPayload.postIntent,
						campaignPhase: post.phase || null,
						campaignAngle: post.campaign_angle || null,
						visualHook: post.visual_hook || null,
						dryRun: true,
					}).catch((promptError) => ({
						prompt: `Prompt preview unavailable: ${promptError.message || "request failed"}`,
					})),
				),
			);
			const normalizedPosts = posts.map((post, index) =>
				normalizeGeneratedCampaignPost(post, index, {
					campaignPrompt: promptPreview.planner_prompt || promptPreview.prompt || "",
					seoPrompt: seoPromptPreviews[index]?.prompt || "",
					pinterestBoards: boards,
				}),
			);
			const nextPipeline = {
				...pipeline,
				campaignGeneration,
				assetBlueprints: [],
				campaignAsset: null,
			};
			const savedDraft = await postJson("/api/campaigns", buildCampaignDraftPayload({
				form,
				pipeline: nextPipeline,
				brainSources,
				generatedPosts: normalizedPosts,
				pinterestBoards: boards,
				currentView: "content",
				queueResults: [],
				publishResults: [],
				handoffStatus: "",
			}));
			setCurrentCampaignDraftId(savedDraft.id || null);
			setCampaignDrafts((current) => [
				savedDraft,
				...current.filter((draft) => draft.id !== savedDraft.id),
			]);
			setPipeline((current) => ({
				...current,
				campaignGeneration,
				assetBlueprints: [],
				campaignAsset: null,
			}));
			setCampaignPosts(normalizedPosts);
			setQueueResults([]);
			setPublishResults([]);
			setHandoffStatus("");
			setView("content");
		}, { completeText: "Campaign content ready" });
	}

	function handleJourneyStageClick(index) {
		if (index === 0) setView("intake");
		if (index === 2 && pipeline.campaignPlan) setView("strategy");
		if (index === 3 && campaignPosts.length) setView("content");
		if (index === 4 && campaignPosts.length) setView("assets");
		if (index === 5 && campaignPosts.length) setView("review");
		if (index === 6 && campaignPosts.length) setView("schedule");
		if (index === 7 && campaignPosts.length) setView("publish");
	}

	function updateCampaignPost(index, field, value) {
		setCampaignPosts((current) =>
			current.map((post, postIndex) =>
				postIndex === index ? { ...post, [field]: value } : post,
			),
		);
	}

	function updateCampaignPostFields(index, updates) {
		setCampaignPosts((current) =>
			current.map((post, postIndex) =>
				postIndex === index ? { ...post, ...updates } : post,
			),
		);
	}

	async function uploadCampaignAsset(index, file) {
		if (!file) return;
		const post = campaignPosts[index];
		const stateKey = post?.localId || `post-${index}`;
		setAssetUploadState((current) => ({
			...current,
			[stateKey]: { ...current[stateKey], uploading: true, error: "", copied: false },
		}));
		try {
			const dataUrl = await readFileAsDataUrl(file);
			const response = await fetch(`${API_BASE}/api/media/upload`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					dataUrl,
					fileName: file.name || "campaign-asset",
				}),
			});
			const payload = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(payload?.detail || payload?.error || `Upload failed: ${response.status}`);
			}
			const mediaPath = payload.mediaPath || payload.mediaUrl || "";
			const mediaUrl = payload.mediaUrl || payload.mediaPath || "";
			updateCampaignPostFields(index, {
				image: mediaUrl.startsWith("http") ? mediaUrl : `${API_BASE}${mediaUrl}`,
				imageAsset: "",
				mediaPath,
				mediaType: payload.mediaType || "image",
				altText: post?.altText || post?.title || "Campaign visual",
			});
			setAssetUploadState((current) => ({
				...current,
				[stateKey]: { ...current[stateKey], uploading: false, error: "", copied: false },
			}));
		} catch (uploadError) {
			setAssetUploadState((current) => ({
				...current,
				[stateKey]: {
					...current[stateKey],
					uploading: false,
					error: uploadError?.message || "Upload failed.",
					copied: false,
				},
			}));
		}
	}

	function removeCampaignAsset(index) {
		updateCampaignPostFields(index, {
			image: "",
			imageAsset: "",
			mediaPath: "",
			mediaType: "",
		});
	}

	async function copyVisualPrompt(text, stateKey) {
		const value = String(text || "").trim();
		if (!value) return;
		try {
			await navigator.clipboard.writeText(value);
			setAssetUploadState((current) => ({
				...current,
				[stateKey]: { ...current[stateKey], copied: true, error: "" },
			}));
			window.setTimeout(() => {
				setAssetUploadState((current) => ({
					...current,
					[stateKey]: { ...current[stateKey], copied: false },
				}));
			}, 1600);
		} catch {
			setAssetUploadState((current) => ({
				...current,
				[stateKey]: { ...current[stateKey], copied: false, error: "Could not copy prompt." },
			}));
		}
	}

	function approveContentForReview() {
		setView("assets");
	}

	function approveAssetsForReview() {
		setView("review");
	}

	function approveReviewAndContinue() {
		setHandoffStatus("");
		setView("schedule");
	}

	function approveScheduleAndContinue() {
		setHandoffStatus("");
		setView("publish");
	}

	async function queueCampaign() {
		setHandoffStatus("Queueing campaign...");
		setError("");
		setQueueResults([]);
		try {
			const results = [];
			for (const post of campaignPosts) {
				const payload = buildQueuePayload(post, {
					mission: pipeline.mission,
					campaignStrategy: pipeline.campaignStrategy,
					selectedProduct,
				});
				results.push(await postRawJson("/api/posts", payload));
			}
			setQueueResults(results);
			setHandoffStatus(`${results.length} campaign post${results.length === 1 ? "" : "s"} queued with approved status.`);
		} catch (queueError) {
			setHandoffStatus("");
			setError(queueError.message || "Echo could not queue the campaign. Please try again.");
		}
	}

	async function publishCampaignNow() {
		setHandoffStatus("Publishing campaign now...");
		setError("");
		setPublishResults([]);
		try {
			const results = [];
			for (const post of campaignPosts) {
				const payload = buildQueuePayload(post, {
					mission: pipeline.mission,
					campaignStrategy: pipeline.campaignStrategy,
					selectedProduct,
				});
				results.push(await postRawJson("/api/post-to-all", {
					post: payload,
					targets: payload.targets,
					platforms: payload.platforms,
				}));
			}
			setPublishResults(results);
			setHandoffStatus(`${results.length} campaign post${results.length === 1 ? "" : "s"} sent to the publishing endpoint.`);
		} catch (publishError) {
			setHandoffStatus("");
			setError(publishError.message || "Echo could not publish the campaign. Please try again.");
		}
	}

	return (
		<div className="min-h-screen bg-black px-4 py-4 text-white">
			<EchoBrainActivation
				visible={loaderVisible}
				statusText={workingStep}
				completedNodes={completedNodes}
				complete={loaderComplete}
				completeText={loaderCompleteText}
				onReadyAnimationEnd={() => {
					setLoaderVisible(false);
					setWorkingStep("");
					setLoaderComplete(false);
				}}
			/>
			<AppTopNav />
			<div className="mx-auto max-w-6xl space-y-6">
				<header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<h1 className="text-3xl font-bold text-pink-300">Echo Studio</h1>
						<p className="mt-2 text-sm text-gray-300">
							AI Marketing Operator for turning a business goal into approved campaign content.
						</p>
					</div>
					<div className="flex flex-wrap gap-3">
						{view !== "intake" ? (
							<button
								type="button"
								className="border border-pink-500 px-4 py-2 text-sm font-semibold text-pink-200 hover:bg-pink-500 hover:text-black"
								onClick={resetCampaignWorkspace}
							>
								New Mission
							</button>
						) : null}
						<button
							type="button"
							className="border border-cyan-500 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500 hover:text-black disabled:cursor-wait disabled:opacity-50"
							onClick={() => loadCampaignLibrary({ showLibrary: true })}
							disabled={libraryLoading}
						>
							Campaign Library{campaignDrafts.length ? ` (${campaignDrafts.length})` : ""}
						</button>
					</div>
				</header>

				<JourneyHeader activeIndex={activeJourneyIndex} onStageClick={handleJourneyStageClick} />

				{view === "intake" ? (
					<section className="rounded-lg border border-pink-600/70 bg-gray-950/70 p-5 shadow-[0_0_30px_rgba(236,72,153,0.08)]">
						<div className="mb-5">
							<p className="text-sm uppercase tracking-[0.28em] text-cyan-300">Mission Intake</p>
							<h2 className="mt-2 text-2xl font-semibold text-pink-200">
								Tell Echo what you want to accomplish.
							</h2>
							<p className="mt-2 text-sm text-gray-300">
								Echo will infer the audience, tone, positioning, keywords, and next step from your goal, product, and platform.
							</p>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<label className="block text-sm text-gray-300 md:col-span-2" htmlFor="echo-goal">
								Marketing Goal
								<input
									id="echo-goal"
									className="mt-2 w-full border border-gray-700 bg-black px-3 py-3 text-white outline-none focus:border-pink-500"
									value={form.goal}
									onChange={(event) => updateField("goal", event.target.value)}
								/>
							</label>
							<label className="block text-sm text-gray-300" htmlFor="echo-product">
								Product
								<select
									id="echo-product"
									className="mt-2 w-full border border-gray-700 bg-black px-3 py-3 text-white outline-none focus:border-cyan-500"
									value={form.productId}
									onChange={(event) => updateField("productId", event.target.value)}
								>
									{ECHO_PRODUCTS.map((product) => (
										<option key={product.id} value={product.id}>
											{product.label}
										</option>
									))}
									<option disabled value="coming-soon-add-product">
										Add product (Coming Soon)
									</option>
								</select>
							</label>
							<label className="block text-sm text-gray-300" htmlFor="echo-platform">
								Primary Platform
								<select
									id="echo-platform"
									className="mt-2 w-full border border-gray-700 bg-black px-3 py-3 text-white outline-none focus:border-cyan-500"
									value={form.primaryPlatform}
									onChange={(event) => updateField("primaryPlatform", event.target.value)}
								>
									{SUPPORTED_PLATFORMS.map((platform) => (
										<option key={platform} value={platform}>
											{platform}
										</option>
									))}
									<option disabled value="coming-soon-add-platform">
										Add more platforms (Coming Soon)
									</option>
								</select>
							</label>
						</div>

						<div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
							<button
								type="button"
								className="border border-pink-500 bg-pink-500 px-5 py-3 font-semibold text-black hover:bg-pink-400 disabled:cursor-wait disabled:opacity-50"
								onClick={continueToBrain}
								disabled={Boolean(workingStep)}
							>
								Build My Campaign
							</button>
							<p className="text-sm text-gray-400">
								Next: Echo Brain reads what it knows and recommends the campaign strategy.
							</p>
							<button
								type="button"
								className="border border-cyan-500 px-5 py-3 font-semibold text-cyan-200 hover:bg-cyan-500 hover:text-black disabled:cursor-wait disabled:opacity-50"
								onClick={() => loadCampaignLibrary({ showLibrary: true })}
								disabled={libraryLoading}
							>
								Open Campaign Library{campaignDrafts.length ? ` (${campaignDrafts.length})` : ""}
							</button>
						</div>
					</section>
					) : view === "library" ? (
						<section className="space-y-5">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
								<div>
									<p className="text-sm uppercase tracking-[0.28em] text-cyan-300">Campaign Library</p>
									<h2 className="mt-2 text-2xl font-semibold text-pink-200">Open a saved campaign draft.</h2>
									<p className="mt-2 text-sm text-gray-300">
										Saved campaigns restore the existing workflow without regenerating content.
									</p>
								</div>
								<button
									type="button"
									className="border border-pink-500 bg-pink-500 px-4 py-2 font-semibold text-black hover:bg-pink-400"
									onClick={resetCampaignWorkspace}
								>
									New Campaign
								</button>
							</div>

							{error ? (
								<div className="rounded border border-red-500/70 bg-red-950/30 p-3 text-sm text-red-200">
									{error}
								</div>
							) : null}

							{libraryLoading ? (
								<div className="rounded-lg border border-cyan-700/70 bg-gray-950/70 p-5 text-sm text-gray-200">
									Loading saved campaigns...
								</div>
							) : campaignDrafts.length ? (
								<div className="grid gap-4 md:grid-cols-2">
									{campaignDrafts.map((draft) => {
										const accent = getCampaignAccent(draft.id || getDraftTitle(draft));
										const platform = getDraftPlatform(draft);
										const postCount = getDraftPostCount(draft);
										return (
											<article
												key={draft.id}
												className={`rounded-lg border p-5 ${accent.borderClass} ${accent.bgClass} ${accent.shadowClass}`}
											>
												<div className="flex items-start gap-3">
													<span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${accent.dotClass}`} aria-hidden="true" />
													<div className="min-w-0 flex-1">
														<p className={`text-xs uppercase tracking-[0.2em] ${accent.mutedTextClass}`}>
															{getCampaignDraftStatusLabel(draft.status)}
														</p>
														<h3 className={`mt-2 truncate text-lg font-semibold ${accent.textClass}`}>
															{getDraftTitle(draft)}
														</h3>
													</div>
												</div>
												<div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
													<div className="rounded border border-gray-800 bg-black/35 p-3">
														<p className="text-xs uppercase tracking-[0.16em] text-gray-500">Product</p>
														<p className="mt-2 text-gray-100">{getDraftProductName(draft)}</p>
													</div>
													<div className="rounded border border-gray-800 bg-black/35 p-3">
														<p className="text-xs uppercase tracking-[0.16em] text-gray-500">Platform</p>
														<p className="mt-2 text-gray-100">{platform}</p>
													</div>
													<div className="rounded border border-gray-800 bg-black/35 p-3">
														<p className="text-xs uppercase tracking-[0.16em] text-gray-500">Posts</p>
														<p className="mt-2 text-gray-100">{postCount}</p>
													</div>
													<div className="rounded border border-gray-800 bg-black/35 p-3">
														<p className="text-xs uppercase tracking-[0.16em] text-gray-500">Updated</p>
														<p className="mt-2 text-gray-100">{formatDraftUpdatedDate(draft.updatedAt)}</p>
													</div>
												</div>
												<div className="mt-4 flex flex-wrap gap-3">
													<button
														type="button"
														className="border border-pink-500 bg-pink-500 px-4 py-2 font-semibold text-black hover:bg-pink-400"
														onClick={() => openCampaignDraft(draft.id)}
													>
														Open
													</button>
													<button
														type="button"
														className="border border-red-500/80 px-4 py-2 text-red-200 hover:bg-red-500 hover:text-black"
														onClick={() => deleteCampaignDraftFromLibrary(draft.id)}
													>
														Delete
													</button>
												</div>
											</article>
										);
									})}
								</div>
							) : (
								<div className="rounded-lg border border-gray-800 bg-gray-950/70 p-6">
									<p className="text-lg font-semibold text-pink-200">No saved campaigns yet.</p>
									<p className="mt-2 text-sm text-gray-300">
										Start a new mission to create the first saved campaign draft.
									</p>
									<button
										type="button"
										className="mt-4 border border-pink-500 bg-pink-500 px-4 py-2 font-semibold text-black hover:bg-pink-400"
										onClick={resetCampaignWorkspace}
									>
										New Campaign
									</button>
								</div>
							)}
						</section>
					) : view === "content" && campaignPosts.length ? (
						<section className="space-y-5">
							<div>
								<p className="text-sm uppercase tracking-[0.28em] text-cyan-300">Campaign Created</p>
								<h2 className="mt-2 text-2xl font-semibold text-pink-200">Echo generated {campaignPosts.length} campaign post{campaignPosts.length === 1 ? "" : "s"}.</h2>
								<p className="mt-2 text-sm text-gray-300">
									Review the campaign copy first, then confirm the visuals before final approval.
								</p>
							</div>

							{campaignPosts.map((post, index) => (
								<GeneratedPostEditor
									key={post.localId}
									post={post}
									index={index}
									boards={pinterestBoards.boards}
									onChange={updateCampaignPost}
								/>
							))}

							{error ? (
								<div className="rounded border border-red-500/70 bg-red-950/30 p-3 text-sm text-red-200">
								{error}
							</div>
						) : null}

						<div className="flex flex-wrap gap-3">
							<button
								type="button"
								className="border border-cyan-500 px-4 py-2 text-cyan-200 hover:bg-cyan-500 hover:text-black"
								onClick={() => setView("strategy")}
							>
								Back to Strategy
							</button>
							<button
								type="button"
								className="border border-pink-500 bg-pink-500 px-4 py-2 font-semibold text-black hover:bg-pink-400"
								onClick={approveContentForReview}
							>
								Continue to Campaign Assets
								</button>
							</div>
						</section>
					) : view === "assets" && campaignPosts.length ? (
						<section className="space-y-5">
							<CampaignAssetsStep
								posts={campaignPosts}
								onChange={updateCampaignPost}
								onUpload={uploadCampaignAsset}
								onRemove={removeCampaignAsset}
								onCopy={copyVisualPrompt}
								uploadState={assetUploadState}
							/>
							<div className="flex flex-wrap gap-3">
								<button
									type="button"
									className="border border-cyan-500 px-4 py-2 text-cyan-200 hover:bg-cyan-500 hover:text-black"
									onClick={() => setView("content")}
								>
									Back to Content
								</button>
								<button
									type="button"
									className="border border-pink-500 bg-pink-500 px-4 py-2 font-semibold text-black hover:bg-pink-400"
									onClick={approveAssetsForReview}
								>
									Continue to Review
								</button>
							</div>
						</section>
					) : view === "review" ? (
						<section className="space-y-5">
							<div>
								<p className="text-sm uppercase tracking-[0.28em] text-cyan-300">Campaign Review</p>
								<h2 className="mt-2 text-2xl font-semibold text-pink-200">Approve the generated campaign.</h2>
								<p className="mt-2 text-sm text-gray-300">
									Every generated post remains editable. Inspect the prompts and final fields before schedule review.
								</p>
							</div>
							{campaignPosts.map((post, index) => (
								<GeneratedPostEditor
									key={post.localId}
									post={post}
									index={index}
									boards={pinterestBoards.boards}
									onChange={updateCampaignPost}
								/>
							))}
							<div className="flex flex-wrap gap-3">
								<button
									type="button"
								className="border border-cyan-500 px-4 py-2 text-cyan-200 hover:bg-cyan-500 hover:text-black"
								onClick={() => setView("assets")}
							>
								Back to Campaign Assets
							</button>
							<button
								type="button"
								className="border border-pink-500 bg-pink-500 px-4 py-2 font-semibold text-black hover:bg-pink-400"
									onClick={approveReviewAndContinue}
								>
									Approve Content & Review Schedule
								</button>
							</div>
						</section>
					) : view === "schedule" ? (
						<section className="space-y-5">
							<div>
								<p className="text-sm uppercase tracking-[0.28em] text-cyan-300">Campaign Schedule</p>
								<h2 className="mt-2 text-2xl font-semibold text-pink-200">Schedule each generated post.</h2>
								<p className="mt-2 text-sm text-gray-300">
									Each item below becomes its own queue job for the existing publishing worker.
								</p>
							</div>
							<section className={`rounded-lg border p-5 ${campaignAccent.borderClass} ${campaignAccent.bgClass} ${campaignAccent.shadowClass}`}>
								<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
									<div className="flex items-start gap-3">
										<span className={`mt-1 h-4 w-4 shrink-0 rounded-full ${campaignAccent.dotClass}`} aria-hidden="true" />
										<div>
											<p className={`text-xs uppercase tracking-[0.24em] ${campaignAccent.mutedTextClass}`}>Campaign</p>
											<h3 className={`mt-2 text-xl font-semibold ${campaignAccent.textClass}`}>{campaignName}</h3>
										</div>
									</div>
									<div className="grid gap-3 text-sm sm:grid-cols-3 md:min-w-[420px]">
										<div className="rounded border border-gray-800 bg-black/40 p-3">
											<p className="text-xs uppercase tracking-[0.18em] text-gray-500">Platform</p>
											<p className="mt-2 text-gray-100">{campaignPlatform}</p>
										</div>
										<div className="rounded border border-gray-800 bg-black/40 p-3">
											<p className="text-xs uppercase tracking-[0.18em] text-gray-500">Posts</p>
											<p className="mt-2 text-gray-100">{campaignPostCountLabel}</p>
										</div>
										<div className="rounded border border-gray-800 bg-black/40 p-3">
											<p className="text-xs uppercase tracking-[0.18em] text-gray-500">Status</p>
											<p className="mt-2 text-gray-100">{getScheduleStatus(campaignPosts, scheduleWarnings)}</p>
										</div>
									</div>
								</div>
							</section>
							<div className={`rounded-lg border p-4 ${scheduleWarnings.length ? "border-yellow-500/70 bg-yellow-950/20 text-yellow-100" : "border-cyan-500/70 bg-cyan-950/20 text-cyan-100"}`}>
								{scheduleWarnings.length ? (
									<ul className="space-y-2 text-sm">
										{scheduleWarnings.map((warning) => (
											<li key={warning}>⚠ {warning}</li>
										))}
									</ul>
								) : (
									<p className="text-sm">✓ Schedule spacing looks healthy.</p>
								)}
							</div>
							<div className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
								<div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
									<div>
										<p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Timeline</p>
										<p className="mt-1 text-sm text-gray-400">List view now, structured for a future weekly or monthly calendar.</p>
									</div>
									<p className="text-xs text-gray-500">{campaignPostCountLabel}</p>
								</div>
								<div className="space-y-3">
									{getSortedScheduledPosts(campaignPosts).map(({ post, originalIndex }) => (
										<section key={post.localId} className={`rounded border border-gray-800 bg-black/45 p-4 ${campaignAccent.shadowClass}`}>
											<div className="grid gap-4 md:grid-cols-[130px_1fr_220px] md:items-center">
												<div className="flex gap-3 md:block">
													<span className={`mt-1 inline-block h-3 w-3 shrink-0 rounded-full ${campaignAccent.dotClass} md:mb-3`} aria-hidden="true" />
													<div>
														<p className="text-sm font-semibold text-gray-100">{formatScheduleDate(post.scheduledAt)}</p>
														<p className="text-sm text-gray-400">{formatScheduleTime(post.scheduledAt) || "Choose time"}</p>
													</div>
												</div>
												<div className={`border-l-2 pl-4 ${campaignAccent.borderClass}`}>
													<p className={`text-xs uppercase tracking-[0.2em] ${campaignAccent.mutedTextClass}`}>
														{getShortPostTypeLabel(post.platform)} {originalIndex + 1}
													</p>
													<div className="mt-2 flex gap-3">
														<CampaignVisualPreview post={post} compact />
														<div>
															<h3 className="text-lg font-semibold text-pink-100">{post.title}</h3>
															<p className="mt-2 text-sm text-gray-400">
																{post.destination || getDefaultDestination(post.platform)} · {post.campaignPhase || "Launch"}
															</p>
														</div>
													</div>
												</div>
												<label className="block text-sm text-gray-300">
													Scheduled time
													<input
														type="datetime-local"
														className="mt-2 w-full border border-gray-700 bg-black px-3 py-2 text-white"
														value={formatLocalSchedule(post.scheduledAt)}
														onChange={(event) => updateCampaignPost(originalIndex, "scheduledAt", parseLocalSchedule(event.target.value))}
													/>
												</label>
											</div>
										</section>
									))}
								</div>
							</div>
							<div className="flex flex-wrap gap-3">
								<button
									type="button"
									className="border border-cyan-500 px-4 py-2 text-cyan-200 hover:bg-cyan-500 hover:text-black"
									onClick={() => setView("review")}
								>
									Back to Review
								</button>
								<button
									type="button"
									className="border border-pink-500 bg-pink-500 px-4 py-2 font-semibold text-black hover:bg-pink-400"
									onClick={approveScheduleAndContinue}
								>
									Approve Schedule
								</button>
							</div>
						</section>
					) : view === "publish" ? (
						<section className="space-y-5">
							<div>
							<p className="text-sm uppercase tracking-[0.28em] text-cyan-300">Campaign Complete</p>
							<h2 className="mt-2 text-2xl font-semibold text-pink-200">
								{campaignPostCountLabel} generated and ready for queueing.
							</h2>
							<p className="mt-2 text-sm text-gray-300">
								Review the campaign queue before sending each post to the existing publisher.
								</p>
							</div>
							<section className={`rounded-lg border p-5 ${campaignAccent.borderClass} ${campaignAccent.bgClass} ${campaignAccent.shadowClass}`}>
								<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
									<div className="flex items-start gap-3">
										<span className={`mt-1 h-4 w-4 shrink-0 rounded-full ${campaignAccent.dotClass}`} aria-hidden="true" />
										<div>
											<p className={`text-xs uppercase tracking-[0.24em] ${campaignAccent.mutedTextClass}`}>Campaign Summary</p>
											<h3 className={`mt-2 text-xl font-semibold ${campaignAccent.textClass}`}>{campaignName}</h3>
										</div>
									</div>
									<div className="grid gap-3 text-sm sm:grid-cols-3 md:min-w-[420px]">
										<div className="rounded border border-gray-800 bg-black/40 p-3">
											<p className="text-xs uppercase tracking-[0.18em] text-gray-500">Platform</p>
											<p className="mt-2 text-gray-100">{campaignPlatform}</p>
										</div>
										<div className="rounded border border-gray-800 bg-black/40 p-3">
											<p className="text-xs uppercase tracking-[0.18em] text-gray-500">Posts</p>
											<p className="mt-2 text-gray-100">{campaignPostCountLabel}</p>
										</div>
										<div className="rounded border border-gray-800 bg-black/40 p-3">
											<p className="text-xs uppercase tracking-[0.18em] text-gray-500">Schedule Status</p>
											<p className="mt-2 text-gray-100">{getScheduleStatus(campaignPosts, scheduleWarnings)}</p>
										</div>
									</div>
								</div>
							</section>
							<section className="rounded-lg border border-gray-800 bg-gray-950/80 p-5">
								<div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
									<div>
										<p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Campaign Queue</p>
										<h3 className="mt-2 text-xl font-semibold text-pink-200">Individual publish jobs</h3>
									</div>
									<p className="text-xs text-gray-500">{campaignPostCountLabel}</p>
								</div>
								<div className="mt-4 space-y-3">
									{getSortedScheduledPosts(campaignPosts).map(({ post, originalIndex }) => (
										<article key={post.localId} className="rounded border border-gray-800 bg-black/45 p-4">
											<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
												<div className="flex gap-3">
													<span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${campaignAccent.dotClass}`} aria-hidden="true" />
													<CampaignVisualPreview post={post} compact />
													<div>
														<p className={`text-xs uppercase tracking-[0.2em] ${campaignAccent.mutedTextClass}`}>
															✓ {getShortPostTypeLabel(post.platform)} {originalIndex + 1}
														</p>
														<h4 className="mt-2 text-lg font-semibold text-pink-100">{post.title}</h4>
														<p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-200">{post.body}</p>
														{post.hashtags.length ? (
															<p className="mt-2 text-xs text-gray-500">{post.hashtags.join(" ")}</p>
														) : null}
													</div>
												</div>
												<div className="shrink-0 rounded border border-gray-800 bg-gray-950/80 p-3 text-sm text-gray-300 md:w-56">
													<p className="font-semibold text-cyan-100">Scheduled</p>
													<p className="mt-2">{formatScheduleDate(post.scheduledAt)}</p>
													<p>{formatScheduleTime(post.scheduledAt) || "No time selected"}</p>
													<p className="mt-3 text-xs uppercase tracking-[0.18em] text-gray-500">Destination</p>
													<p className="mt-1 text-gray-200">{post.destination || getDefaultDestination(post.platform)}</p>
												</div>
											</div>
										</article>
									))}
								</div>
							</section>
							{handoffStatus ? (
								<div className="rounded border border-cyan-500/70 bg-cyan-950/20 p-3 text-sm text-cyan-100">
									{handoffStatus}
								</div>
							) : null}
							{error ? (
								<div className="rounded border border-red-500/70 bg-red-950/30 p-3 text-sm text-red-200">
									{error}
								</div>
							) : null}
							{queueResults.length || publishResults.length ? (
								<div className="rounded border border-gray-800 bg-black/50 p-3 text-xs text-gray-300">
									{queueResults.length ? <p>Queued posts: {queueResults.length}</p> : null}
									{publishResults.length ? <p>Publish results returned: {publishResults.length}</p> : null}
								</div>
							) : null}
							<div className="flex flex-wrap gap-3">
								<button
									type="button"
									className="border border-cyan-500 px-4 py-2 text-cyan-200 hover:bg-cyan-500 hover:text-black"
									onClick={() => setView("schedule")}
								>
									Back
								</button>
								<button
									type="button"
									className="border border-pink-500 bg-pink-500 px-4 py-2 font-semibold text-black hover:bg-pink-400"
									onClick={publishCampaignNow}
								>
									Publish Now
								</button>
								<button
									type="button"
									className="border border-cyan-500 px-4 py-2 text-cyan-200 hover:bg-cyan-500 hover:text-black"
									onClick={queueCampaign}
								>
									Queue Campaign
								</button>
							</div>
						</section>
				) : (
					<section className="space-y-5">
						<div>
							<p className="text-sm uppercase tracking-[0.28em] text-cyan-300">Echo Brain Recommendation</p>
							<h2 className="mt-2 text-2xl font-semibold text-pink-200">
								Approve the strategy before Echo creates content.
							</h2>
							<p className="mt-2 text-sm text-gray-300">
								Echo Brain built this reusable strategy first. Text generation will use it as the source of truth.
							</p>
						</div>

						{pipeline.campaignPlan && campaignStrategy ? (
							<>
								<div className="grid gap-4 md:grid-cols-2">
									<StrategyCard title="Audience">
										<p>{campaignStrategy.audience}</p>
									</StrategyCard>
									<StrategyCard title="Primary Message">
										<p>{campaignStrategy.primaryMessage}</p>
									</StrategyCard>
									<StrategyCard title="Marketing Angle">
										<p>{campaignStrategy.marketingAngle}</p>
									</StrategyCard>
									<StrategyCard title="Primary Hook">
										<p>{campaignStrategy.primaryHook}</p>
									</StrategyCard>
									<StrategyCard title="Call to Action">
										<p>{campaignStrategy.callToAction}</p>
									</StrategyCard>
									<StrategyCard title="SEO Keywords">
										<ul className="flex flex-wrap gap-2">
											{campaignStrategy.seoKeywords.map((keyword) => (
												<li
													key={keyword}
													className="border border-cyan-700/70 bg-cyan-950/20 px-2 py-1 text-xs text-cyan-100"
												>
													{keyword}
												</li>
											))}
										</ul>
									</StrategyCard>
									<StrategyCard title="Recommended Assets">
										<ul className="space-y-2">
											{displayedRecommendations.map((asset) => (
												<li key={`${asset.platform}-${asset.type}`} className="flex gap-2">
													<span className="text-pink-300">•</span>
													<span>
														1 {asset.displayName}
														{asset.purpose ? ` for ${asset.purpose.toLowerCase()}` : ""}
													</span>
												</li>
											))}
										</ul>
									</StrategyCard>
								</div>

								<StrategyCard title="Why This Campaign Should Work">
									<p>{campaignStrategy.reasoning}</p>
								</StrategyCard>

								{error ? (
									<div className="rounded border border-red-500/70 bg-red-950/30 p-3 text-sm text-red-200">
										{error}
									</div>
								) : null}
								{!AI_GENERATION_ENABLED ? (
									<div className="rounded border border-cyan-500/70 bg-cyan-950/20 p-3 text-sm text-cyan-100">
										AI generation is paused during development. Open an existing campaign to continue testing.
									</div>
								) : null}

								<div className="flex flex-col gap-3 rounded-lg border border-pink-600/60 bg-pink-950/10 p-4 sm:flex-row sm:items-center sm:justify-between">
									<div>
										<p className="font-semibold text-pink-200">Ready for Echo to create content?</p>
										<p className="mt-1 text-sm text-gray-300">
											{AI_GENERATION_ENABLED
												? "Approving the strategy creates editable content from the selected recommendation."
												: "Generation is disabled so you can keep developing the workflow without spending AI credits."}
										</p>
									</div>
									<button
										type="button"
										className="border border-pink-500 bg-pink-500 px-5 py-3 font-semibold text-black hover:bg-pink-400 disabled:cursor-wait disabled:opacity-50"
										onClick={approveStrategyAndGenerateDraft}
										disabled={Boolean(workingStep) || !AI_GENERATION_ENABLED}
									>
										{AI_GENERATION_ENABLED ? "Approve Strategy & Generate Content" : "AI Generation Paused"}
									</button>
								</div>
							</>
						) : (
							<div className="rounded-lg border border-cyan-700/70 bg-gray-950/70 p-5 text-sm text-gray-200">
								Echo Brain is preparing your campaign strategy.
							</div>
						)}
					</section>
				)}

				{error && view === "intake" ? (
					<p className="text-sm text-red-300">{error}</p>
				) : null}
			</div>
		</div>
	);
}
