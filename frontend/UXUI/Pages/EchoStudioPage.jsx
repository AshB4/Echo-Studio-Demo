import { useMemo, useState } from "react";
import AppTopNav from "../Components/AppTopNav";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001";

const emptyPipeline = {
	mission: null,
	knowledgeContext: null,
	campaignPlan: null,
	assetBlueprints: [],
	campaignAsset: null,
};

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
	const [workingStep, setWorkingStep] = useState("");
	const [error, setError] = useState("");

	const firstBlueprint = pipeline.assetBlueprints[0] || null;
	const canCreateKnowledge = Boolean(pipeline.mission);
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

	function createMission() {
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
		});
	}

	function createKnowledge() {
		return runStep("Creating Knowledge", async () => {
			const knowledgeContext = await postJson("/api/knowledge", {
				missionId: pipeline.mission.id,
				title: `${pipeline.mission.title} Knowledge`,
				status: "ready",
				sections: {
					productKnowledge: {
						content: `Goal: ${pipeline.mission.goal}`,
						source: "browser workflow",
						priority: 1,
						lastUpdated: new Date().toISOString(),
					},
					brandRules: {
						content: "Use a clear, practical, trustworthy voice.",
						source: "browser workflow",
						priority: 2,
						lastUpdated: new Date().toISOString(),
					},
					platformRules: {
						content: `${form.primaryPlatform} is the primary platform.`,
						source: "browser workflow",
						priority: 3,
						lastUpdated: new Date().toISOString(),
					},
					marketingPlaybook: {
						content: "Lead with a specific offer, then support it with proof.",
						source: "browser workflow",
						priority: 5,
						lastUpdated: new Date().toISOString(),
					},
				},
			});
			const mission = await patchJson(`/api/missions/${pipeline.mission.id}`, {
				knowledgeContextId: knowledgeContext.id,
			});
			setPipeline((current) => ({
				...current,
				mission,
				knowledgeContext,
				campaignPlan: null,
				assetBlueprints: [],
				campaignAsset: null,
			}));
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
						onClick={createMission}
						disabled={Boolean(workingStep)}
					>
						Create Mission
					</button>
				</section>

				<section className="space-y-3">
					<h2 className="text-xl font-semibold text-cyan-200">Pipeline</h2>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							className="border border-cyan-500 px-3 py-2 text-cyan-200 hover:bg-cyan-500 hover:text-black disabled:opacity-50"
							onClick={createKnowledge}
							disabled={!canCreateKnowledge || Boolean(workingStep)}
						>
							Create Knowledge
						</button>
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
							Generate Asset Blueprint
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
			</div>
		</div>
	);
}
