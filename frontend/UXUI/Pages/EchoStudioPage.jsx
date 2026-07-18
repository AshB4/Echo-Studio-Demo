import { useMemo, useState } from "react";
import AppTopNav from "../Components/AppTopNav";
import echoArrow from "../../assets/InteralAssets/EchoArrow.png";
import { productProfiles } from "../utils/productProfiles";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001";
const ECHO_PRODUCTS = productProfiles.slice(0, 3);
const SUPPORTED_PLATFORMS = ["Pinterest", "Facebook", "Dev.to"];
const JOURNEY_STAGES = ["Mission", "Knowledge", "Strategy", "Content", "Review", "Publish"];
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
	if (loaderVisible || !pipeline.campaignPlan) return 1;
	if (view === "content") return 3;
	if (view === "review") return 4;
	if (view === "publish") return 5;
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

function appendCallToAction(copy, callToAction) {
	const content = String(copy || "").trim();
	const cta = String(callToAction || "").trim();
	if (!cta) return content;
	if (content.toLowerCase().includes(cta.toLowerCase())) return content;
	return `${content}\n\n${cta}`;
}

function createEditableContent({ asset, campaignPlan, campaignStrategy, product, recommendation }) {
	if (!asset) return [];
	const rawContent = String(asset.content || "").trim();
	const baseCopy =
		rawContent.toLowerCase() === "generated from blueprint."
			? campaignStrategy?.primaryMessage || buildCoreMessage({
				goal: campaignPlan?.goal,
				product,
				platform: asset.platform || campaignPlan?.primaryPlatform,
			})
			: rawContent;
	const platform = asset.platform || campaignPlan?.primaryPlatform || "";
	const cta = campaignStrategy?.callToAction || getDefaultCta({ goal: campaignPlan?.goal, platform });
	return {
		platform,
		title: campaignStrategy?.primaryHook || asset.title || humanizeAssetType(recommendation?.type),
		mainCopy: appendCallToAction(baseCopy, cta),
		cta,
		keywords: Array.isArray(campaignStrategy?.seoKeywords) && campaignStrategy.seoKeywords.length
			? campaignStrategy.seoKeywords.join(", ")
			: getDefaultKeywords({ goal: campaignPlan?.goal, product, platform }),
		hashtags: getDefaultHashtags({ product, platform }),
		destination: getDefaultDestination(platform),
		status: "Generated",
	};
}

function JourneyHeader({ activeIndex, onStageClick }) {
	return (
		<nav className="rounded-lg border border-gray-800 bg-gray-950/80 p-3" aria-label="Campaign journey">
			<ol className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
				{JOURNEY_STAGES.map((stage, index) => {
					const completed = index < activeIndex;
					const active = index === activeIndex;
					const clickable = completed && (index === 0 || index === 2);
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
	const [campaignContent, setCampaignContent] = useState(null);
	const [handoffStatus, setHandoffStatus] = useState("");
	const [error, setError] = useState("");

	const selectedProduct =
		ECHO_PRODUCTS.find((product) => product.id === form.productId) || ECHO_PRODUCTS[0];
	const activeJourneyIndex = getJourneyIndex({ view, loaderVisible, pipeline });
	const displayedRecommendations = useMemo(
		() => getDisplayedRecommendations(pipeline.campaignPlan, form.primaryPlatform),
		[pipeline.campaignPlan, form.primaryPlatform],
	);
	const campaignStrategy = pipeline.campaignStrategy;
	const recommendedAudience = useMemo(
		() =>
			campaignStrategy?.audience || getRecommendedAudience({
				product: selectedProduct,
				platform: pipeline.campaignPlan?.primaryPlatform || form.primaryPlatform,
			}),
		[campaignStrategy, pipeline.campaignPlan, form.primaryPlatform, selectedProduct],
	);
	const selectedRecommendation = displayedRecommendations[0] || null;

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
				assetBlueprints: [],
				campaignAsset: null,
			}));
			setCampaignContent(null);
			setHandoffStatus("");
		}, { completeText: "Campaign strategy ready" });
	}

	function approveStrategyAndGenerateDraft() {
		if (!pipeline.campaignPlan) return null;
		return runStep("Preparing campaign draft...", async () => {
			setCompletedNodes(KNOWLEDGE_NODE_DEFINITIONS.map((node) => node.key));
			setWorkingStep("Translating strategy into draft instructions...");
			const assetBlueprints = await postJson("/api/asset-blueprints/generate", {
				campaignPlan: pipeline.campaignPlan,
			});
			const blueprint = assetBlueprints[0];
			if (!blueprint) {
				throw new Error("Echo could not prepare a draft from this strategy.");
			}
			setWorkingStep("Generating campaign draft...");
			const campaignAsset = await postJson("/api/ai-generator/generate", {
				assetBlueprint: blueprint,
			});
			const editableContent = createEditableContent({
				asset: campaignAsset,
				campaignPlan: pipeline.campaignPlan,
				campaignStrategy: pipeline.campaignStrategy,
				product: selectedProduct,
				recommendation: selectedRecommendation,
			});
			setPipeline((current) => ({
				...current,
				assetBlueprints,
				campaignAsset,
			}));
			setCampaignContent(editableContent);
			setHandoffStatus("");
			setView("content");
		}, { completeText: "Campaign content ready" });
	}

	function handleJourneyStageClick(index) {
		if (index === 0) setView("intake");
		if (index === 2 && pipeline.campaignPlan) setView("strategy");
		if (index === 3 && campaignContent) setView("content");
		if (index === 4 && campaignContent) setView("review");
	}

	function updateCampaignContent(field, value) {
		setCampaignContent((current) => ({
			...(current || {}),
			[field]: value,
		}));
	}

	function approveContentForReview() {
		setView("review");
	}

	function approveReviewAndContinue() {
		setHandoffStatus("");
		setView("publish");
	}

	function confirmPublishingHandoff(mode) {
		const action = mode === "schedule" ? "scheduled for publishing handoff" : "prepared for publishing handoff";
		setHandoffStatus(`Campaign ${action}. This demo does not perform live publishing.`);
	}

	const publishingDestinations = getPublishingDestinations(campaignContent?.platform || form.primaryPlatform);

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
				<header>
					<h1 className="text-3xl font-bold text-pink-300">Echo Studio</h1>
						<p className="mt-2 text-sm text-gray-300">
							AI Marketing Operator for turning a business goal into approved campaign content.
						</p>
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
						</div>
					</section>
				) : view === "content" && campaignContent ? (
					<section className="space-y-5">
						<div>
							<p className="text-sm uppercase tracking-[0.28em] text-cyan-300">Campaign Created</p>
							<h2 className="mt-2 text-2xl font-semibold text-pink-200">Echo created your campaign content.</h2>
							<p className="mt-2 text-sm text-gray-300">
								Review the finished artifact first. Editing controls are below when you want to tune the copy.
							</p>
						</div>

						<div className="rounded-lg border border-pink-600/70 bg-gray-950/80 p-5 shadow-[0_0_30px_rgba(236,72,153,0.08)]">
							<p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Platform</p>
							<p className="mt-2 text-lg font-semibold text-pink-100">{campaignContent.platform || form.primaryPlatform}</p>
							<div className="mt-5 rounded border border-gray-800 bg-black/60 p-5">
								<p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Headline</p>
								<h3 className="mt-3 text-xl font-semibold text-pink-200">{campaignContent.title}</h3>
								<p className="mt-5 text-xs uppercase tracking-[0.22em] text-cyan-300">Generated Content</p>
								<p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-100">{campaignContent.mainCopy}</p>
							</div>
							<div className="mt-5 grid gap-4 md:grid-cols-2">
								<StrategyCard title="Keywords">
									<p>{campaignContent.keywords}</p>
								</StrategyCard>
								<StrategyCard title="Hashtags">
									<p>{campaignContent.hashtags}</p>
								</StrategyCard>
							</div>
						</div>

						<div className="rounded-lg border border-cyan-700/70 bg-gray-950/70 p-5">
							<p className="text-sm font-semibold text-cyan-200">Edit campaign content</p>
							<p className="mt-1 text-sm text-gray-400">
								Keep this as one coherent piece of marketing content. Echo will handle the publishing destination later.
							</p>
							<div className="grid gap-4 md:grid-cols-2">
								<label className="block text-sm text-gray-300">
									Platform
									<input
										className="mt-2 w-full border border-gray-700 bg-black px-3 py-2 text-white"
										value={campaignContent.platform || ""}
										onChange={(event) => updateCampaignContent("platform", event.target.value)}
									/>
								</label>
								<label className="block text-sm text-gray-300 md:col-span-2">
									Headline
									<input
										className="mt-2 w-full border border-gray-700 bg-black px-3 py-2 text-white"
										value={campaignContent.title || ""}
										onChange={(event) => updateCampaignContent("title", event.target.value)}
									/>
								</label>
								<label className="block text-sm text-gray-300 md:col-span-2">
									Generated Content
									<textarea
										className="mt-2 min-h-32 w-full border border-gray-700 bg-black px-3 py-2 text-white"
										value={campaignContent.mainCopy || ""}
										onChange={(event) => updateCampaignContent("mainCopy", event.target.value)}
									/>
								</label>
								<label className="block text-sm text-gray-300">
									Keywords
									<input
										className="mt-2 w-full border border-gray-700 bg-black px-3 py-2 text-white"
										value={campaignContent.keywords || ""}
										onChange={(event) => updateCampaignContent("keywords", event.target.value)}
									/>
								</label>
								<label className="block text-sm text-gray-300 md:col-span-2">
									Hashtags
									<input
										className="mt-2 w-full border border-gray-700 bg-black px-3 py-2 text-white"
										value={campaignContent.hashtags || ""}
										onChange={(event) => updateCampaignContent("hashtags", event.target.value)}
									/>
								</label>
							</div>
						</div>

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
								Continue to Review
							</button>
						</div>
					</section>
				) : view === "review" ? (
					<section className="space-y-5">
						<div>
							<p className="text-sm uppercase tracking-[0.28em] text-cyan-300">Review & Edit</p>
							<h2 className="mt-2 text-2xl font-semibold text-pink-200">Final campaign copy</h2>
							<p className="mt-2 text-sm text-gray-300">
								See the finished result first, then make final edits if needed.
							</p>
						</div>
						<div className="rounded-lg border border-cyan-600/70 bg-gray-950/80 p-5">
							<div className="rounded border border-pink-600/60 bg-black/60 p-5 shadow-[0_0_24px_rgba(236,72,153,0.08)]">
								<p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Preview</p>
								<h3 className="mt-3 text-xl font-semibold text-pink-200">{campaignContent?.title}</h3>
								<p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-100">{campaignContent?.mainCopy}</p>
								<p className="mt-2 text-xs text-gray-400">{campaignContent?.hashtags}</p>
							</div>
							<div className="mt-5 grid gap-4 md:grid-cols-2">
								<label className="block text-sm text-gray-300 md:col-span-2">
									Headline
									<input
										className="mt-2 w-full border border-gray-700 bg-black px-3 py-2 text-white"
										value={campaignContent?.title || ""}
										onChange={(event) => updateCampaignContent("title", event.target.value)}
									/>
								</label>
								<label className="block text-sm text-gray-300 md:col-span-2">
									Generated Content
									<textarea
										className="mt-2 min-h-40 w-full border border-gray-700 bg-black px-3 py-2 text-white"
										value={campaignContent?.mainCopy || ""}
										onChange={(event) => updateCampaignContent("mainCopy", event.target.value)}
									/>
								</label>
								<label className="block text-sm text-gray-300 md:col-span-2">
									Hashtags
									<input
										className="mt-2 w-full border border-gray-700 bg-black px-3 py-2 text-white"
										value={campaignContent?.hashtags || ""}
										onChange={(event) => updateCampaignContent("hashtags", event.target.value)}
									/>
								</label>
							</div>
						</div>
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
								onClick={approveReviewAndContinue}
							>
								Approve and Continue
							</button>
						</div>
					</section>
				) : view === "publish" ? (
					<section className="space-y-5">
						<div>
							<p className="text-sm uppercase tracking-[0.28em] text-cyan-300">Campaign Complete</p>
							<h2 className="mt-2 text-2xl font-semibold text-pink-200">
								Echo has successfully created your marketing campaign.
							</h2>
							<p className="mt-2 text-sm text-gray-300">
								This demo prepares the publishing handoff but does not send a live post.
							</p>
						</div>
						<div className="grid gap-4 md:grid-cols-2">
							<StrategyCard title="Platform">
								<p>{campaignContent?.platform || form.primaryPlatform}</p>
							</StrategyCard>
							<StrategyCard title="Publishing Destinations">
								<p className="font-semibold text-pink-100">{campaignContent?.platform || form.primaryPlatform}</p>
								<p className="mt-2 text-gray-400">Will publish to:</p>
								<ul className="mt-3 space-y-2">
									{publishingDestinations.map((destination) => (
										<li key={destination} className="flex gap-2">
											<span className="text-cyan-300">✓</span>
											<span>{destination}</span>
										</li>
									))}
								</ul>
							</StrategyCard>
							<StrategyCard title="Status">
								<p>Approved content package, ready for handoff.</p>
							</StrategyCard>
						</div>
						<div className="rounded-lg border border-pink-600/70 bg-gray-950/80 p-5">
							<p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Final Content</p>
							<h3 className="mt-3 text-lg font-semibold text-pink-200">{campaignContent?.title}</h3>
							<p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-100">{campaignContent?.mainCopy}</p>
							<p className="mt-2 text-xs text-gray-400">{campaignContent?.hashtags}</p>
							<p className="mt-2 text-xs text-gray-500">{campaignContent?.keywords}</p>
						</div>
						{handoffStatus ? (
							<div className="rounded border border-cyan-500/70 bg-cyan-950/20 p-3 text-sm text-cyan-100">
								{handoffStatus}
							</div>
						) : null}
						<div className="flex flex-wrap gap-3">
							<button
								type="button"
								className="border border-cyan-500 px-4 py-2 text-cyan-200 hover:bg-cyan-500 hover:text-black"
								onClick={() => setView("review")}
							>
								Back
							</button>
							<button
								type="button"
								className="border border-pink-500 bg-pink-500 px-4 py-2 font-semibold text-black hover:bg-pink-400"
								onClick={() => confirmPublishingHandoff("now")}
							>
								Publish Now
							</button>
							<button
								type="button"
								className="border border-cyan-500 px-4 py-2 text-cyan-200 hover:bg-cyan-500 hover:text-black"
								onClick={() => confirmPublishingHandoff("schedule")}
							>
								Schedule
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

								<div className="flex flex-col gap-3 rounded-lg border border-pink-600/60 bg-pink-950/10 p-4 sm:flex-row sm:items-center sm:justify-between">
									<div>
										<p className="font-semibold text-pink-200">Ready for Echo to create content?</p>
										<p className="mt-1 text-sm text-gray-300">
											Approving the strategy creates editable content from the selected recommendation.
										</p>
									</div>
									<button
										type="button"
										className="border border-pink-500 bg-pink-500 px-5 py-3 font-semibold text-black hover:bg-pink-400 disabled:cursor-wait disabled:opacity-50"
										onClick={approveStrategyAndGenerateDraft}
										disabled={Boolean(workingStep)}
									>
										Approve Strategy & Generate Content
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
