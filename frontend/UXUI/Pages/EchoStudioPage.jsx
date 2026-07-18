import { useMemo, useState } from "react";
import AppTopNav from "../Components/AppTopNav";
import echoArrow from "../../assets/InteralAssets/EchoArrow.png";
import { productProfiles } from "../utils/productProfiles";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001";
const ECHO_PRODUCTS = productProfiles.slice(0, 3);
const SUPPORTED_PLATFORMS = ["Pinterest", "Facebook", "Dev.to"];
const KNOWLEDGE_NODE_DEFINITIONS = [
	{ key: "product", label: "Product", className: "echo-brain-node-top" },
	{ key: "brand", label: "Brand", className: "echo-brain-node-left-top" },
	{ key: "platform", label: "Platform", className: "echo-brain-node-right-top" },
	{ key: "playbook", label: "Playbook", className: "echo-brain-node-left-bottom" },
	{ key: "performance", label: "Previous Campaigns", className: "echo-brain-node-right-bottom" },
	{ key: "seo", label: "SEO", className: "echo-brain-node-bottom" },
];

function getActiveKnowledgeNode(statusText) {
	if (statusText.includes("Product Knowledge")) return "product";
	if (statusText.includes("Brand Voice")) return "brand";
	if (statusText.includes("Platform Intelligence")) return "platform";
	if (statusText.includes("Marketing Playbook")) return "playbook";
	if (statusText.includes("Previous Campaigns")) return "performance";
	if (statusText.includes("SEO Strategy")) return "seo";
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
	assetBlueprints: [],
	campaignAsset: null,
};

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

function formatJson(value) {
	return JSON.stringify(value, null, 2);
}

function EchoBrainActivation({
	visible,
	statusText,
	completedNodes = [],
	complete = false,
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
					{complete ? "✓ Echo Brain Ready" : statusText || "Connecting knowledge..."}
				</p>
			</div>
		</div>
	);
}

export default function EchoStudioPage() {
	const [form, setForm] = useState({
		goal: "Launch my new book with authority",
		audience: "Solo creators and developers",
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
	const [error, setError] = useState("");

	const firstBlueprint = pipeline.assetBlueprints[0] || null;
	const canGeneratePlan = Boolean(pipeline.mission && pipeline.knowledgeContext);
	const canGenerateBlueprints = Boolean(pipeline.campaignPlan);
	const canGenerateAsset = Boolean(firstBlueprint);
	const selectedProduct =
		ECHO_PRODUCTS.find((product) => product.id === form.productId) || ECHO_PRODUCTS[0];

	const visibleAssetSummary = useMemo(() => {
		if (!pipeline.campaignAsset) return "No campaign asset generated yet.";
		return `${pipeline.campaignAsset.title} (${pipeline.campaignAsset.status})`;
	}, [pipeline.campaignAsset]);

	function updateField(field, value) {
		setForm((current) => ({ ...current, [field]: value }));
	}

	async function runStep(label, action) {
		let succeeded = false;
		try {
			setWorkingStep(label);
			setLoaderVisible(true);
			setLoaderComplete(false);
			setError("");
			await action();
			succeeded = true;
			setCompletedNodes(KNOWLEDGE_NODE_DEFINITIONS.map((node) => node.key));
			setWorkingStep("Echo Brain Ready");
			setLoaderComplete(true);
		} catch (stepError) {
			setError(stepError.message || "Echo Studio workflow failed.");
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
		setWorkingStep("Connecting knowledge...");
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
			if (sourceDefinition.type === "product") setWorkingStep("Reading Product Knowledge...");
			if (sourceDefinition.type === "brand") setWorkingStep("Reading Brand Voice...");
			if (sourceDefinition.type === "platform") setWorkingStep("Reviewing Platform Intelligence...");
			if (sourceDefinition.type === "playbook") setWorkingStep("Loading Marketing Playbook...");
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

		setWorkingStep("Reviewing Previous Campaigns...");
		const assembledBrain = await assembleBrain(mission.id);
		markNodeLoaded("performance");
		setWorkingStep("Preparing SEO Strategy...");
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
			assetBlueprints: [],
			campaignAsset: null,
		}));
	}

	function continueToBrain() {
		return runStep("Reading Product Knowledge...", async () => {
			setCompletedNodes([]);
			const mission = await postJson("/api/missions", {
				title: form.goal,
				goal: form.goal,
				audience: form.audience,
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
			setView("brain");
			await loadBrainForMission(mission);
		});
	}

	function generateCampaignPlan() {
		return runStep("Generating Campaign Plan", async () => {
			setCompletedNodes(KNOWLEDGE_NODE_DEFINITIONS.map((node) => node.key));
			setWorkingStep("Building Campaign Strategy...");
			const campaignPlan = await postJson("/api/campaign-plans/generate", {
				missionId: pipeline.mission.id,
				mission: pipeline.mission,
				knowledgeContext: pipeline.knowledgeContext,
			});
			setPipeline((current) => ({
				...current,
				campaignPlan,
				assetBlueprints: [],
				campaignAsset: null,
			}));
		});
	}

	function generateAssetBlueprints() {
		return runStep("Generating Asset Blueprint", async () => {
			setCompletedNodes(KNOWLEDGE_NODE_DEFINITIONS.map((node) => node.key));
			setWorkingStep("Creating Asset Blueprints...");
			const assetBlueprints = await postJson("/api/asset-blueprints/generate", {
				campaignPlan: pipeline.campaignPlan,
			});
			setPipeline((current) => ({
				...current,
				assetBlueprints,
				campaignAsset: null,
			}));
		});
	}

	function generateCampaignAsset() {
		return runStep("Generating Campaign Asset", async () => {
			setCompletedNodes(KNOWLEDGE_NODE_DEFINITIONS.map((node) => node.key));
			setWorkingStep("Preparing Campaign Assets...");
			const campaignAsset = await postJson("/api/ai-generator/generate", {
				assetBlueprint: firstBlueprint,
			});
			setPipeline((current) => ({ ...current, campaignAsset }));
		});
	}

	return (
		<div className="min-h-screen bg-black px-4 py-4 text-white">
			<EchoBrainActivation
				visible={loaderVisible}
				statusText={workingStep}
				completedNodes={completedNodes}
				complete={loaderComplete}
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
						Mission to Campaign Asset, using the real backend pipeline.
					</p>
				</header>

				{view === "intake" ? (
					<section className="space-y-3">
						<h2 className="text-xl font-semibold text-cyan-200">Mission</h2>
						<label className="block text-sm text-gray-300" htmlFor="echo-goal">
							Goal
						</label>
						<input
							id="echo-goal"
							className="w-full border border-gray-700 bg-gray-950 px-3 py-2 text-white"
							value={form.goal}
							onChange={(event) => updateField("goal", event.target.value)}
						/>
						<label className="block text-sm text-gray-300" htmlFor="echo-audience">
							Audience
						</label>
						<input
							id="echo-audience"
							className="w-full border border-gray-700 bg-gray-950 px-3 py-2 text-white"
							value={form.audience}
							onChange={(event) => updateField("audience", event.target.value)}
						/>
						<label className="block text-sm text-gray-300" htmlFor="echo-product">
							Product
						</label>
						<select
							id="echo-product"
							className="w-full border border-gray-700 bg-gray-950 px-3 py-2 text-white"
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
						<label className="block text-sm text-gray-300" htmlFor="echo-platform">
							Primary Platform
						</label>
						<select
							id="echo-platform"
							className="w-full border border-gray-700 bg-gray-950 px-3 py-2 text-white"
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
						<button
							type="button"
							className="border border-pink-500 px-4 py-2 text-pink-200 hover:bg-pink-500 hover:text-black disabled:opacity-50"
							onClick={continueToBrain}
							disabled={Boolean(workingStep)}
						>
							Continue
						</button>
					</section>
				) : (
					<>
						<section className="space-y-3">
							<h2 className="text-xl font-semibold text-cyan-200">Echo Brain</h2>
							<table className="w-full border-collapse text-left text-sm">
								<thead>
									<tr className="border-b border-gray-700 text-gray-300">
										<th className="py-2 pr-3">Source Name</th>
										<th className="py-2 pr-3">Source Type</th>
										<th className="py-2 pr-3">Loaded Status</th>
									</tr>
								</thead>
								<tbody>
									{brainSources.map((source) => (
										<tr key={source.id} className="border-b border-gray-900">
											<td className="py-2 pr-3">{source.title}</td>
											<td className="py-2 pr-3">{source.type}</td>
											<td className="py-2 pr-3">{source.loadedStatus || "Loaded"}</td>
										</tr>
									))}
								</tbody>
							</table>
						</section>

						<section className="space-y-3">
							<h2 className="text-xl font-semibold text-cyan-200">Pipeline</h2>
							<div className="flex flex-wrap gap-2">
								<button
									type="button"
									className="border border-cyan-500 px-3 py-2 text-cyan-200 hover:bg-cyan-500 hover:text-black disabled:opacity-50"
									onClick={generateCampaignPlan}
									disabled={!canGeneratePlan || Boolean(workingStep)}
								>
									Generate Campaign Plan
								</button>
								<button
									type="button"
									className="border border-cyan-500 px-3 py-2 text-cyan-200 hover:bg-cyan-500 hover:text-black disabled:opacity-50"
									onClick={generateAssetBlueprints}
									disabled={!canGenerateBlueprints || Boolean(workingStep)}
								>
									Generate Asset Blueprints
								</button>
								<button
									type="button"
									className="border border-cyan-500 px-3 py-2 text-cyan-200 hover:bg-cyan-500 hover:text-black disabled:opacity-50"
									onClick={generateCampaignAsset}
									disabled={!canGenerateAsset || Boolean(workingStep)}
								>
									Generate Campaign Asset
								</button>
							</div>
							<p className="text-sm text-gray-300">
								Current step: {workingStep || "Ready"}
							</p>
							{error ? <p className="text-sm text-red-300">{error}</p> : null}
						</section>

						<section className="space-y-3">
							<h2 className="text-xl font-semibold text-cyan-200">Campaign Asset</h2>
							<p className="text-sm text-gray-300">{visibleAssetSummary}</p>
							<pre className="max-h-[520px] overflow-auto border border-gray-800 bg-gray-950 p-3 text-xs text-gray-100">
								{formatJson(pipeline)}
							</pre>
						</section>
					</>
				)}

				{error && view === "intake" ? (
					<p className="text-sm text-red-300">{error}</p>
				) : null}
			</div>
		</div>
	);
}
