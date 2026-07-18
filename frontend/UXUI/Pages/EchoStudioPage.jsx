import { useMemo, useState } from "react";
import AppTopNav from "../Components/AppTopNav";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001";

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

export default function EchoStudioPage() {
	const [form, setForm] = useState({
		goal: "Launch my new book with authority",
		audience: "Solo creators and developers",
		primaryPlatform: "Pinterest",
		businessName: "Echo Studio Demo",
	});
	const [pipeline, setPipeline] = useState(emptyPipeline);
	const [brainSources, setBrainSources] = useState([]);
	const [view, setView] = useState("intake");
	const [workingStep, setWorkingStep] = useState("");
	const [error, setError] = useState("");

	const firstBlueprint = pipeline.assetBlueprints[0] || null;
	const canGeneratePlan = Boolean(pipeline.mission && pipeline.knowledgeContext);
	const canGenerateBlueprints = Boolean(pipeline.campaignPlan);
	const canGenerateAsset = Boolean(firstBlueprint);

	const visibleAssetSummary = useMemo(() => {
		if (!pipeline.campaignAsset) return "No campaign asset generated yet.";
		return `${pipeline.campaignAsset.title} (${pipeline.campaignAsset.status})`;
	}, [pipeline.campaignAsset]);

	function updateField(field, value) {
		setForm((current) => ({ ...current, [field]: value }));
	}

	async function runStep(label, action) {
		try {
			setWorkingStep(label);
			setError("");
			await action();
		} catch (stepError) {
			setError(stepError.message || "Echo Studio workflow failed.");
		} finally {
			setWorkingStep("");
		}
	}

	async function loadBrainForMission(mission) {
		const existingSources = await getJson("/api/knowledge-sources");
		const existingByTitle = new Map(
			existingSources.map((source) => [source.title, source]),
		);
		const sources = [];

		for (const sourceDefinition of BRAIN_SOURCE_DEFINITIONS) {
			const existingSource = existingByTitle.get(sourceDefinition.title);
			if (existingSource) {
				sources.push({ ...existingSource, loadedStatus: "Loaded" });
				continue;
			}
			const source = await postJson("/api/knowledge-sources", {
				...sourceDefinition,
				description: "Echo Studio marketing intelligence source",
				enabled: true,
				tags: ["echo-brain"],
			});
			sources.push({ ...source, loadedStatus: "Loaded" });
		}

		const assembledBrain = await assembleBrain(mission.id);
		const knowledgeContext = await postJson("/api/knowledge", {
			missionId: mission.id,
			title: `${mission.title} Echo Brain`,
			status: "ready",
			sections: createKnowledgeSections(assembledBrain),
			metadata: {
				sourceCount: sources.length,
				sourceTitles: sources.map((source) => source.title),
			},
		});
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
		return runStep("Creating Mission", async () => {
			const mission = await postJson("/api/missions", {
				title: form.goal,
				goal: form.goal,
				audience: form.audience,
				businessName: form.businessName,
				channels: [form.primaryPlatform],
				status: "intake_complete",
			});
			setPipeline({ ...emptyPipeline, mission });
			setView("brain");
			await loadBrainForMission(mission);
		});
	}

	function generateCampaignPlan() {
		return runStep("Generating Campaign Plan", async () => {
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
			const campaignAsset = await postJson("/api/ai-generator/generate", {
				assetBlueprint: firstBlueprint,
			});
			setPipeline((current) => ({ ...current, campaignAsset }));
		});
	}

	return (
		<div className="min-h-screen bg-black px-4 py-4 text-white">
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
						<label className="block text-sm text-gray-300" htmlFor="echo-platform">
							Primary Platform
						</label>
						<input
							id="echo-platform"
							className="w-full border border-gray-700 bg-gray-950 px-3 py-2 text-white"
							value={form.primaryPlatform}
							onChange={(event) => updateField("primaryPlatform", event.target.value)}
						/>
						<label className="block text-sm text-gray-300" htmlFor="echo-business">
							Business Name
						</label>
						<input
							id="echo-business"
							className="w-full border border-gray-700 bg-gray-950 px-3 py-2 text-white"
							value={form.businessName}
							onChange={(event) => updateField("businessName", event.target.value)}
						/>
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
