/** @format */
import "dotenv/config";
import express from "express";
import cors from "cors";
import { readFile, writeFile, mkdir, access } from "fs/promises";
import fs from "fs"; // only for constants like fs.constants.F_OK
import path from "path";
import { fileURLToPath } from "url";
import { postToAllPlatforms, normalizeTargets } from "./scripts/platforms/post-to-all.js";
import authRouter from "./routes/auth.js";
import contentRouter from "./routes/content/index.js";
import { missionRouter } from "./modules/missions/index.mjs";
import { knowledgeRouter } from "./modules/knowledge/index.mjs";
import { knowledgeRetrievalRouter } from "./modules/knowledge-retrieval/index.mjs";
import { campaignPlannerRouter } from "./modules/campaign-planner/index.mjs";
import { assetBlueprintsRouter } from "./modules/asset-blueprints/index.mjs";
import {
	aiGeneratorRouter,
	campaignAssetsRouter,
} from "./modules/ai-generator/index.mjs";
import { processQueue } from "./scripts/postingJob.mjs";
import { rebalancePinterestMix } from "./scripts/queue/rebalance-pinterest-mix.mjs";
import { getPublicAccounts } from "./utils/accountStore.mjs";
import { getAccounts } from "./utils/accountStore.mjs";
import { findDuplicatePost } from "./utils/queueGuard.mjs";
import { generateSeoPayload, getDryRunPayload } from "./utils/seoGeneration.mjs";
import { generateCampaignPosts, getCampaignDryRunPayload } from "./utils/campaignGeneration.mjs";
import {
  buildPinterestCreativeContext,
  findPinterestCreativeConflict,
} from "./utils/pinterestCreative.mjs";
import { buildAnalyticsSummary } from "./utils/analyticsSummary.mjs";
import { runPlatformHealthChecks } from "./utils/platformHealth.mjs";
import { normalizePostStatus } from "./utils/postStatus.mjs";
import { distributionTagsToTargets, normalizeTagList } from "./utils/distributionTags.mjs";
import { buildArchiveEntry } from "./utils/archiveEntry.mjs";
import {
	appendPostedLogEntry as appendPostedLogToDb,
	appendPinterestMetricsSnapshot,
	clearPostedPostsFromQueue,
	createPost,
	deletePost as deletePostFromDb,
	readStoreSnapshot,
	getRotationSettings,
	getLocalDbPath,
	initLocalDb,
	getPinterestPinMappings,
	listPosts,
	listPinterestMetricsSnapshots,
	listPostedLog,
	savePinterestPinMappings,
	replaceStoreSnapshot,
	updatePost as updatePostInDb,
} from "./utils/localDb.mjs";
import { 
	initAttributionStorage, 
	recordTouchpoint, 
	recordConversion, 
	getTouchpoints, 
	getConversions, 
	getAttributionData,
	clearAttributionData
} from "./attribution/events.js";
import { 
	stitchUserJourneys, 
	applyAttributionModel, 
	calculateAttributionReporting
} from "./attribution/stitching.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "75mb" }));
app.use("/api/auth", authRouter);
app.use("/api/content", contentRouter);
app.use("/api/missions", missionRouter);
app.use("/api/knowledge", knowledgeRouter);
app.use("/api/knowledge-sources", knowledgeRetrievalRouter);
app.use("/api/campaign-plans", campaignPlannerRouter);
app.use("/api/asset-blueprints", assetBlueprintsRouter);
app.use("/api/ai-generator", aiGeneratorRouter);
app.use("/api/campaign-assets", campaignAssetsRouter);
const PORT = process.env.PORT || 3001;

// ---- data paths
const DIR_QUEUE = path.join(__dirname, "queue");
const DIR_MEDIA = path.join(__dirname, "media");
const DIR_MEDIA_IMAGES = path.join(DIR_MEDIA, "images");
const DIR_MEDIA_GIFS = path.join(DIR_MEDIA, "gifs");
const DIR_MEDIA_VIDEOS = path.join(DIR_MEDIA, "videos");
const DIR_MEDIA_OTHER = path.join(DIR_MEDIA, "other");
const STATS_FUNNEL = path.join(__dirname, "stats", "funnel.json");
const STATS_SUMMARY = path.join(__dirname, "stats", "summary.json");
const PINTEREST_BOARDS_PATH = path.join(__dirname, "config", "pinterest-boards.json");
let platformHealthCache = null;
let platformHealthCacheAt = 0;
const PLATFORM_HEALTH_TTL_MS = 60_000;

// ---- helpers
async function ensureFiles() {
	await mkdir(DIR_QUEUE, { recursive: true });
	await mkdir(DIR_MEDIA_IMAGES, { recursive: true });
	await mkdir(DIR_MEDIA_GIFS, { recursive: true });
	await mkdir(DIR_MEDIA_VIDEOS, { recursive: true });
	await mkdir(DIR_MEDIA_OTHER, { recursive: true });
	await initLocalDb();
}

const readJson = async (p) => JSON.parse(await readFile(p, "utf-8"));
const writeJson = async (p, data) =>
	writeFile(p, JSON.stringify(data, null, 2));

async function appendPostedLogEntry(post) {
	const postedLog = await listPostedLog();
	const existing = postedLog.find(
		(entry) => entry?.id === post?.id && entry?.manualArchived,
	);
	const alreadyLogged = Boolean(existing);
	if (alreadyLogged) return;
	await appendPostedLogToDb(
		buildArchiveEntry(post, {
			targets: Array.isArray(post.targets) ? post.targets : [],
			results: [],
			processedAt: new Date().toISOString(),
			manualArchived: true,
		}),
	);
}

function postTargetsPinterest(post = {}) {
	const platforms = Array.isArray(post?.platforms) ? post.platforms : [];
	const targets = Array.isArray(post?.targets) ? post.targets : [];
	return (
		platforms.some((platform) => String(platform || "").toLowerCase() === "pinterest") ||
		targets.some((target) => String(target?.platform || "").toLowerCase() === "pinterest")
	);
}

function shouldAutoRebalancePinterest(post = {}) {
	return (
		postTargetsPinterest(post) &&
		normalizePostStatus(post?.status || "draft") === "approved" &&
		Boolean(post?.scheduledAt)
	);
}

async function maybeRebalancePinterestQueue(post = null) {
	if (!shouldAutoRebalancePinterest(post)) {
		return null;
	}
	const snapshot = await readStoreSnapshot();
	const { posts, summary } = rebalancePinterestMix(snapshot.posts, {
		startDate: new Date().toISOString().slice(0, 10),
	});
	await replaceStoreSnapshot({
		posts,
		postedLog: snapshot.postedLog,
		rejections: snapshot.rejections,
	});
	return summary;
}

function safeFileName(input) {
	const base = String(input || "upload")
		.toLowerCase()
		.replace(/\.[^.]+$/, "")
		.replace(/[^a-z0-9_-]+/g, "-")
		.replace(/-+/g, "-")
		.slice(0, 80)
		.replace(/^-|-$/g, "");
	return base || "upload";
}

function parseDataUrl(dataUrl) {
	const match = String(dataUrl || "").match(
		/^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/i,
	);
	if (!match) return null;
	const mimeType = match[1].toLowerCase();
	const base64 = match[2];
	return { mimeType, buffer: Buffer.from(base64, "base64") };
}

function mediaBucketFromMime(mimeType) {
	if (mimeType.startsWith("image/gif")) {
		return { dir: DIR_MEDIA_GIFS, bucket: "gifs", mediaType: "gif", ext: "gif" };
	}
	if (mimeType.startsWith("image/")) {
		const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "img";
		return { dir: DIR_MEDIA_IMAGES, bucket: "images", mediaType: "image", ext };
	}
	if (mimeType.startsWith("video/")) {
		const ext = mimeType.split("/")[1] || "mp4";
		return { dir: DIR_MEDIA_VIDEOS, bucket: "videos", mediaType: "video", ext };
	}
	return { dir: DIR_MEDIA_OTHER, bucket: "other", mediaType: "file", ext: "bin" };
}

app.use("/media", express.static(DIR_MEDIA));

// ---- API: Posts CRUD
app.get("/api/posts", async (_req, res) => {
	try {
		res.json(await listPosts());
	} catch {
		res.status(500).json({ error: "Could not load posts" });
	}
});

app.get("/api/posts/archive", async (_req, res) => {
	try {
		const archive = await listPostedLog();
		res.json(
			[...archive].sort((a, b) => {
				const left = new Date(b.processedAt || b.createdAt || 0).getTime();
				const right = new Date(a.processedAt || a.createdAt || 0).getTime();
				return left - right;
			}),
		);
	} catch (error) {
		res.status(500).json({
			error: "Could not load posted archive",
			detail: error?.message || String(error),
		});
	}
});

app.get("/api/accounts", async (_req, res) => {
	try {
		const accounts = await getPublicAccounts();
		res.json(accounts);
	} catch (error) {
		res.status(500).json({ error: "Failed to load accounts", detail: error?.message });
	}
});

app.get("/api/platform-health", async (req, res) => {
	try {
		const live = String(req.query.live || "true").toLowerCase() !== "false";
		const now = Date.now();
		if (
			live &&
			platformHealthCache &&
			now - platformHealthCacheAt < PLATFORM_HEALTH_TTL_MS
		) {
			return res.json(platformHealthCache);
		}
		const accounts = await getAccounts();
		const report = await runPlatformHealthChecks(accounts, { live });
		if (live) {
			platformHealthCache = report;
			platformHealthCacheAt = now;
		}
		return res.json(report);
	} catch (error) {
		return res.status(500).json({
			error: "Failed to load platform health",
			detail: error?.message || String(error),
		});
	}
});

app.get("/api/settings/rotation", async (_req, res) => {
	try {
		return res.json(await getRotationSettings());
	} catch (error) {
		return res.status(500).json({
			error: "Failed to load rotation settings",
			detail: error?.message || String(error),
		});
	}
});

app.put("/api/settings/rotation", async (req, res) => {
	try {
		return res.json(await updateRotationSettings(req.body ?? {}));
	} catch (error) {
		return res.status(500).json({
			error: "Failed to save rotation settings",
			detail: error?.message || String(error),
		});
	}
});

app.get("/api/pinterest-boards", async (_req, res) => {
	try {
		const config = await readJson(PINTEREST_BOARDS_PATH).catch(() => ({}));
		return res.json({
			defaultBoard: String(config?.defaultBoard || "").trim(),
			boards: Array.isArray(config?.boards)
				? config.boards.map((board) => String(board || "").trim()).filter(Boolean)
				: [],
		});
	} catch (error) {
		return res.status(500).json({
			error: "Failed to load Pinterest boards",
			detail: error?.message || String(error),
		});
	}
});

app.get("/api/analytics/summary", async (_req, res) => {
	try {
		const [events, storedSummary, pinterestSnapshots] = await Promise.all([
			readJson(STATS_FUNNEL).catch(() => []),
			readJson(STATS_SUMMARY).catch(() => ({})),
			listPinterestMetricsSnapshots({ limit: 200 }).catch(() => []),
		]);
		res.json(buildAnalyticsSummary(events, storedSummary, pinterestSnapshots));
	} catch (error) {
		res.status(500).json({
			error: "Failed to load analytics summary",
			detail: error?.message,
		});
	}
});

app.get("/api/analytics/pinterest/snapshots", async (req, res) => {
	try {
		const snapshots = await listPinterestMetricsSnapshots({
			postId: req.query.postId ? String(req.query.postId) : null,
			limit: req.query.limit ? Number(req.query.limit) : 200,
		});
		return res.json(snapshots);
	} catch (error) {
		return res.status(500).json({
			error: "Failed to load Pinterest metrics snapshots",
			detail: error?.message || String(error),
		});
	}
});

app.post("/api/analytics/pinterest/snapshots", async (req, res) => {
	try {
		const payload = req.body ?? {};
		if (!payload.pinId && !payload.pinUrl) {
			return res.status(400).json({ error: "pinId or pinUrl is required" });
		}
		if (!payload.capturedAt) {
			payload.capturedAt = new Date().toISOString();
		}
		await appendPinterestMetricsSnapshot(payload);
		return res.status(201).json(payload);
	} catch (error) {
		return res.status(500).json({
			error: "Failed to save Pinterest metrics snapshot",
			detail: error?.message || String(error),
		});
	}
});

app.get("/api/analytics/pinterest/mappings", async (_req, res) => {
	try {
		return res.json(await getPinterestPinMappings());
	} catch (error) {
		return res.status(500).json({
			error: "Failed to load Pinterest pin mappings",
			detail: error?.message || String(error),
		});
	}
});

// Attribution Tracking Endpoints
app.post("/api/attribution/touchpoint", async (req, res) => {
	try {
		const touchpoint = await recordTouchpoint(req.body);
		res.status(201).json(touchpoint);
	} catch (error) {
		res.status(500).json({
			error: "Failed to record touchpoint",
			detail: error?.message || String(error),
		});
	}
});

app.post("/api/attribution/conversion", async (req, res) => {
	try {
		const conversion = await recordConversion(req.body);
		res.status(201).json(conversion);
	} catch (error) {
		res.status(500).json({
			error: "Failed to record conversion",
			detail: error?.message || String(error),
		});
	}
});

app.get("/api/attribution/data", async (req, res) => {
	try {
		const data = await getAttributionData(req.query);
		res.json(data);
	} catch (error) {
		res.status(500).json({
			error: "Failed to get attribution data",
			detail: error?.message || String(error),
		});
	}
});

app.delete("/api/attribution/reset", async (_req, res) => {
	try {
		await clearAttributionData();
		res.json({ message: "Attribution data cleared successfully" });
	} catch (error) {
		res.status(500).json({
			error: "Failed to clear attribution data",
			detail: error?.message || String(error),
		});
	}
});

// Attribution Modeling Endpoints
app.get("/api/attribution/journeys", async (req, res) => {
	try {
		const { attributionModel, timeWindowHours } = req.query;
		const [touchpoints, conversions] = await Promise.all([
			getTouchpoints(),
			getConversions()
		]);
		
		const journeys = stitchUserJourneys(touchpoints, conversions, {
			attributionModel,
			timeWindowHours: timeWindowHours ? parseInt(timeWindowHours, 10) : undefined
		});
		
		const attributedJourneys = journeys.map(journey => 
			applyAttributionModel(journey)
		);
		
		res.json({
			journeys: attributedJourneys,
			count: attributedJourneys.length
		});
	} catch (error) {
		res.status(500).json({
			error: "Failed to generate attribution journeys",
			detail: error?.message || String(error),
		});
	}
});

app.get("/api/attribution/report", async (req, res) => {
	try {
		const { attributionModel, timeWindowHours } = req.query;
		const [touchpoints, conversions] = await Promise.all([
			getTouchpoints(),
			getConversions()
		]);
		
		const journeys = stitchUserJourneys(touchpoints, conversions, {
			attributionModel,
			timeWindowHours: timeWindowHours ? parseInt(timeWindowHours, 10) : undefined
		});
		
		const attributedJourneys = journeys.map(journey => 
			applyAttributionModel(journey)
		);
		
		const report = calculateAttributionReporting(attributedJourneys);
		
		res.json({
			report,
			model: attributionModel || 'linear',
			timeWindowHours: timeWindowHours ? parseInt(timeWindowHours, 10) : 24 * 30
		});
	} catch (error) {
		res.status(500).json({
			error: "Failed to generate attribution report",
			detail: error?.message || String(error),
		});
	}
});

// Attribution Dashboard Endpoints
app.get("/api/attribution/dashboard", async (req, res) => {
	try {
		const { attributionModel, timeWindowDays } = req.query;
		const [touchpoints, conversions] = await Promise.all([
			getTouchpoints(),
			getConversions()
		]);
		
		const timeWindowHours = timeWindowDays ? parseInt(timeWindowDays, 10) * 24 : 24 * 30;
		
		const journeys = stitchUserJourneys(touchpoints, conversions, {
			attributionModel,
			timeWindowHours
		});
		
		const attributedJourneys = journeys.map(journey => 
			applyAttributionModel(journey)
		);
		
		const report = calculateAttributionReporting(attributedJourneys);
		
		// Calculate additional dashboard metrics
		const contentROI = calculateContentROI(attributedJourneys);
		const channelEfficiency = calculateChannelEfficiency(attributedJourneys);
		const attributionScores = calculateAttributionScores(attributedJourneys, attributionModel);
		const contentInfluenceScore = calculateContentInfluenceScore(attributedJourneys, touchpoints);
		
		res.json({
			report,
			dashboard: {
				contentROI,
				channelEfficiency,
				attributionScores,
				contentInfluenceScore,
				summary: {
					totalConversions: report.summary.conversionJourneys,
					totalAssistedConversions: report.summary.assistedConversions,
					totalDirectConversions: report.summary.directConversions,
					attributionModel: attributionModel || 'linear',
					timeWindowDays: timeWindowDays ? parseInt(timeWindowDays, 10) : 30
				}
			}
		});
	} catch (error) {
		res.status(500).json({
			error: "Failed to generate attribution dashboard",
			detail: error?.message || String(error),
		});
	}
});

/**
 * Calculate Content ROI: (AttributedRevenue – ContentCost)/ContentCost
 * @param {Array} journeys - Array of attributed journeys
 * @returns {Object} Content ROI metrics
 */
function calculateContentROI(journeys) {
	// In a real implementation, we would have actual content cost data
	// For now, we'll use a placeholder content cost
	const contentCostPerPiece = 50; // $50 per content piece (placeholder)
	
	const totalAttributedRevenue = journeys.reduce((sum, journey) => {
		return sum + journey.attributionCredits.reduce((creditSum, touchpoint) => {
			return creditSum + (touchpoint.attributionCredit * (journey.conversion?.value || 1));
		}, 0);
	}, 0);
	
	// Estimate number of content pieces (unique campaigns)
	const uniqueCampaigns = new Set();
	journeys.forEach(journey => {
		journey.attributionCredits.forEach(touchpoint => {
			if (touchpoint.campaign) {
				uniqueCampaigns.add(touchpoint.campaign);
			}
		});
	});
	
	const contentCost = uniqueCampaigns.size * contentCostPerPiece;
	const contentROI = contentCost > 0 ? (totalAttributedRevenue - contentCost) / contentCost : 0;
	
	return {
		contentROI: parseFloat(contentROI.toFixed(4)),
		contentROIPercentage: parseFloat((contentROI * 100).toFixed(2)),
		totalAttributedRevenue: parseFloat(totalAttributedRevenue.toFixed(2)),
		estimatedContentCost: contentCost,
		contentPiecesCount: uniqueCampaigns.size
	};
}

/**
 * Calculate Channel Efficiency: (AttributedConversions ÷ Spend)
 * @param {Array} journeys - Array of attributed journeys
 * @returns {Object} Channel efficiency metrics
 */
function calculateChannelEfficiency(journeys) {
	// In a real implementation, we would have actual spend data per channel
	// For now, we'll use placeholder values
	const channelSpend = {
		facebook: 100,
		pinterest: 150,
		instagram: 120,
		email: 80,
		organic_search: 0,  // Free but has opportunity cost
		default: 100
	};
	
	// Calculate attributed conversions per channel
	const channelConversions = {};
	journeys.forEach(journey => {
		journey.attributionCredits.forEach(touchpoint => {
			const channel = touchpoint.channel || 'unknown';
			if (!channelConversions[channel]) {
				channelConversions[channel] = 0;
			}
			channelConversions[channel] += touchpoint.attributionCredit;
		});
	});
	
	// Calculate efficiency for each channel
	const channelEfficiency = {};
	Object.keys(channelConversions).forEach(channel => {
		const spend = channelSpend[channel] || channelSpend.default;
		channelEfficiency[channel] = spend > 0 ? channelConversions[channel] / spend : 0;
	});
	
	return {
		channelEfficiency: Object.entries(channelEfficiency).map(([channel, efficiency]) => ({
			channel,
			efficiency: parseFloat(efficiency.toFixed(4)),
			attributedConversions: parseFloat((channelConversions[channel] || 0).toFixed(2)),
			estimatedSpend: channelSpend[channel] || channelSpend.default
		})).sort((a, b) => b.efficiency - a.efficiency)
	};
}

/**
 * Calculate Attribution Scores based on model
 * @param {Array} journeys - Array of attributed journeys
 * @param {string} model - Attribution model being used
 * @returns {Object} Attribution scores
 */
function calculateAttributionScores(journeys, model) {
	// Calculate scores based on the selected model
	const scores = {};
	
	journeys.forEach(journey => {
		journey.attributionCredits.forEach(touchpoint => {
			const channel = touchpoint.channel || 'unknown';
			if (!scores[channel]) {
				scores[channel] = {
					firstTouch: 0,
					middleTouch: 0,
					lastTouch: 0,
					totalScore: 0
				};
			}
			
			// Determine if this touchpoint is first, middle, or last in its journey
			const touchpointIndex = journey.attributionCredits.findIndex(tp => tp.id === touchpoint.id);
			const isFirst = touchpointIndex === 0;
			const isLast = touchpointIndex === journey.attributionCredits.length - 1;
			const isMiddle = !isFirst && !isLast;
			
			if (isFirst) {
				scores[channel].firstTouch += touchpoint.attributionCredit;
			} else if (isLast) {
				scores[channel].lastTouch += touchpoint.attributionCredit;
			} else if (isMiddle) {
				scores[channel].middleTouch += touchpoint.attributionCredit;
			}
			
			scores[channel].totalScore += touchpoint.attributionCredit;
		});
	});
	
	return {
		attributionScores: Object.entries(scores).map(([channel, scores]) => {
			return {
				channel,
				firstTouchScore: parseFloat(scores.firstTouch.toFixed(4)),
				middleTouchScore: parseFloat(scores.middleTouch.toFixed(4)),
				lastTouchScore: parseFloat(scores.lastTouch.toFixed(4)),
				totalScore: parseFloat(scores.totalScore.toFixed(4)),
				// Calculate position-based score (40% first, 40% last, 20% middle)
				positionBasedScore: parseFloat((
					0.4 * scores.firstTouch +
					0.2 * scores.middleTouch +
					0.4 * scores.lastTouch
				).toFixed(4))
			};
		}).sort((a, b) => b.totalScore - a.totalScore)
	};
}

/**
 * Calculate Content Influence Score: (AssistedConversions + DirectConversions) ÷ ContentViews
 * @param {Array} journeys - Array of attributed journeys
 * @param {Array} touchpoints - Array of all touchpoints (for content views)
 * @returns {Object} Content influence score
 */
function calculateContentInfluenceScore(journeys, touchpoints) {
	// Count assisted + direct conversions
	const conversionJourneys = journeys.filter(j => j.conversion !== null);
	const directConversions = conversionJourneys.filter(journey => 
		journey.touchpoints.length === 1
	).length;
	const assistedConversions = conversionJourneys.length - directConversions;
	
	// Estimate content views (touchpoints that are views or similar)
	// In a real implementation, we'd have explicit view events
	const contentViews = touchpoints.filter(tp => {
		// Consider page views, content views, etc. as content views
		const viewTypes = ['page_view', 'content_view', 'blog_view', 'article_view'];
		return viewTypes.includes(tp.event_type) || 
			(tp.type === 'touchpoint' && !tp.event_type); // Assume generic touchpoints are views
	}).length;
	
	const contentInfluenceScore = contentViews > 0 ? 
		(assistedConversions + directConversions) / contentViews : 0;
	
	return {
		contentInfluenceScore: parseFloat(contentInfluenceScore.toFixed(4)),
		assistedConversions,
		directConversions,
		totalInfluencedConversions: assistedConversions + directConversions,
		contentViews: contentViews
	};
}

app.put("/api/analytics/pinterest/mappings", async (req, res) => {
	try {
		const body = req.body;
		if (Array.isArray(body)) {
			return res.json(await savePinterestPinMappings(body));
		}
		const current = await getPinterestPinMappings();
		const incoming = body ?? {};
		if (!incoming.postId || (!incoming.pinId && !incoming.pinUrl)) {
			return res.status(400).json({ error: "postId and pinId or pinUrl are required" });
		}
		const next = current.filter(
			(entry) =>
				!(
					String(entry?.postId || "") === String(incoming.postId) ||
					(incoming.pinId &&
						String(entry?.pinId || "") === String(incoming.pinId))
				),
		);
		next.push({
			...incoming,
			updatedAt: new Date().toISOString(),
		});
		return res.json(await savePinterestPinMappings(next));
	} catch (error) {
		return res.status(500).json({
			error: "Failed to save Pinterest pin mappings",
			detail: error?.message || String(error),
		});
	}
});

app.post("/api/ai/seo-generate", async (req, res) => {
	try {
		const {
			productName,
			productType,
			audience,
			platformIds = [],
			productProfileId = null,
			postIntent = null,
			campaignPhase = null,
			campaignAngle = null,
			visualHook = null,
			provider,
			model,
			dryRun = false,
		} = req.body ?? {};
		if (!productName || !productType || !audience) {
			return res.status(400).json({
				error: "productName, productType, and audience are required",
			});
		}

		const input = {
			productName,
			productType,
			audience,
			platformIds,
			productProfileId,
			postIntent,
			campaignPhase,
			campaignAngle,
			visualHook,
		};
		const pinterestCreativeContext = await buildPinterestCreativeContext(input);
		const options = { provider, model, pinterestCreativeContext };
		const result = dryRun
			? getDryRunPayload(input, options)
			: await generateSeoPayload(input, options);

		return res.json(result);
	} catch (error) {
		console.error("AI SEO generation failed:", error);
		return res.status(500).json({
			error: "Failed to generate SEO suggestions",
			detail: error?.message || String(error),
		});
	}
});

app.post("/api/ai/campaign-generate", async (req, res) => {
	try {
		const {
			productName,
			productType,
			audience,
			platformIds = [],
			campaignPhases = [],
			productProfileId = null,
			postIntent = null,
			maxPosts = 6,
			provider,
			model,
			dryRun = false,
		} = req.body ?? {};
		if (!productName || !productType || !audience) {
			return res.status(400).json({
				error: "productName, productType, and audience are required",
			});
		}

		const input = {
			productName,
			productType,
			audience,
			platformIds,
			campaignPhases,
			productProfileId,
			postIntent,
			maxPosts,
		};
		const pinterestCreativeContext = await buildPinterestCreativeContext(input);
		const options = { provider, model, pinterestCreativeContext };
		const result = dryRun
			? getCampaignDryRunPayload(input, options)
			: await generateCampaignPosts(input, options);

		return res.json(result);
	} catch (error) {
		console.error("AI campaign generation failed:", error);
		return res.status(500).json({
			error: "Failed to generate campaign posts",
			detail: error?.message || String(error),
		});
	}
});

app.post("/api/media/upload", async (req, res) => {
	try {
		const { dataUrl, fileName = "upload" } = req.body ?? {};
		if (!dataUrl) {
			return res.status(400).json({ error: "dataUrl is required" });
		}
		const parsed = parseDataUrl(dataUrl);
		if (!parsed) {
			return res.status(400).json({ error: "Invalid dataUrl payload" });
		}
		const { mimeType, buffer } = parsed;
		if (buffer.length > 50 * 1024 * 1024) {
			return res.status(413).json({ error: "Media file too large (max 50MB)" });
		}
		const bucket = mediaBucketFromMime(mimeType);
		const stamp = Date.now();
		const slug = safeFileName(fileName);
		const file = `${stamp}_${slug}.${bucket.ext}`;
		const absolutePath = path.join(bucket.dir, file);
		await writeFile(absolutePath, buffer);
		const mediaPath = `/media/${bucket.bucket}/${file}`;
		return res.status(201).json({
			mediaPath,
			mediaUrl: mediaPath,
			mediaType: bucket.mediaType,
			mimeType,
			bytes: buffer.length,
		});
	} catch (error) {
		return res
			.status(500)
			.json({ error: "Failed to upload media", detail: error?.message });
	}
});

app.post("/api/posts", async (req, res) => {
	try {
		const {
			title,
			body,
			platforms = ["reddit"],
			scheduledAt = null,
			targets = [],
			image = null,
			mediaPath = null,
			mediaType = null,
			altText = "",
			metadata = {},
			status = "draft",
			hashtags = null,
			platformOverrides = null,
			tags = [],
		} = req.body ?? {};
		if (!title || !body)
			return res.status(400).json({ error: "title and body required" });
			
		// Validate UTM parameters when product links are present
		if (metadata?.productLinks) {
			const validationError = validateUTMParameters(metadata.productLinks);
			if (validationError) {
				return res.status(400).json({ error: validationError });
			}
		}

		const posts = await listPosts();
		const id = "p_" + Date.now();
		const distributionTargets = distributionTagsToTargets(
			metadata?.distributionTags || [],
		);
		const normalizedTargets = normalizeTargets(
			targets.length ? [...targets, ...distributionTargets] : [...platforms, ...distributionTargets],
		);
		const post = {
			id,
			title,
			body,
			image,
			mediaPath,
			mediaType,
			altText,
			platforms: normalizedTargets.map((target) => target.platform),
			targets: normalizedTargets,
			scheduledAt,
			status: normalizePostStatus(status),
			hashtags,
			platformOverrides,
			metadata: {
				...metadata,
				contentTags: normalizeTagList(metadata?.contentTags || tags),
				distributionTags: normalizeTagList(metadata?.distributionTags || []),
			},
			tags: normalizeTagList(tags),
			createdAt: new Date().toISOString(),
		};
		const duplicate = findDuplicatePost(posts, post);
		if (duplicate) {
			return res.status(409).json({
				error: "Duplicate queue entry",
				detail: `Matches existing post ${duplicate.id}`,
			});
		}
		const pinterestConflict = await findPinterestCreativeConflict(posts, post);
		if (pinterestConflict) {
			return res.status(409).json({
				error: "Pinterest creative conflict",
				detail: `Too similar to recent pin ${pinterestConflict.matchedPostId || "unknown"}`,
				conflict: pinterestConflict,
			});
		}
		await createPost(post);
		const rebalanceSummary = await maybeRebalancePinterestQueue(post);
		res.status(201).json({
			...post,
			rebalanceSummary,
		});
	} catch (e) {
		res.status(500).json({ error: "Failed to create post", detail: String(e) });
	}
});

/**
 * Validate UTM parameters in product links
 * @param {Object} productLinks - Object containing product links
 * @returns {string|null} Error message if validation fails, null if valid
 */
function validateUTMParameters(productLinks) {
	if (!productLinks || typeof productLinks !== 'object') {
		return null;
	}

	// Check if any product links are present
	const links = Object.values(productLinks).filter(link => link && typeof link === 'string');
	if (links.length === 0) {
		return null;
	}

	// For each link, check if it has UTM parameters
	for (const link of links) {
		try {
			const url = new URL(link);
			const hasUTM = ['utm_source', 'utm_medium', 'utm_campaign'].some(param => 
				url.searchParams.has(param)
			);
			
			if (!hasUTM) {
				return `Product link missing UTM parameters: ${link}. Please add utm_source, utm_medium, and utm_campaign.`;
			}
		} catch (e) {
			// If URL parsing fails, it's not a valid URL but we'll let other validation handle that
			continue;
		}
	}
	
	return null;
}

app.put("/api/posts/:id", async (req, res) => {
	try {
		const posts = await listPosts();
		const i = posts.findIndex((p) => p.id === req.params.id);
		if (i === -1) return res.status(404).json({ error: "not found" });
		const previousPost = posts[i];
		const previousStatus = normalizePostStatus(previousPost.status);
		const updates = { ...req.body };
		if ("status" in updates) {
			updates.status = normalizePostStatus(updates.status, posts[i].status || "draft");
		}
		if ("tags" in updates) {
			updates.tags = normalizeTagList(updates.tags);
		}
		if ("metadata" in updates && updates.metadata) {
			updates.metadata = {
				...posts[i].metadata,
				...updates.metadata,
				contentTags: normalizeTagList(
					updates.metadata.contentTags || updates.tags || posts[i].metadata?.contentTags || [],
				),
				distributionTags: normalizeTagList(
					updates.metadata.distributionTags || posts[i].metadata?.distributionTags || [],
				),
			};
		}
		const nextDistributionTargets = distributionTagsToTargets(
			updates.metadata?.distributionTags || posts[i].metadata?.distributionTags || [],
		);
		if (Array.isArray(updates.targets)) {
			const normalizedTargets = normalizeTargets([
				...updates.targets,
				...nextDistributionTargets,
			]);
			updates.targets = normalizedTargets;
			updates.platforms = normalizedTargets.map((target) => target.platform);
		} else if ("metadata" in updates && nextDistributionTargets.length > 0) {
			const existingTargets = Array.isArray(posts[i].targets)
				? posts[i].targets
				: posts[i].platforms || [];
			const normalizedTargets = normalizeTargets([
				...existingTargets,
				...nextDistributionTargets,
			]);
			updates.targets = normalizedTargets;
			updates.platforms = normalizedTargets.map((target) => target.platform);
		}
		posts[i] = {
			...previousPost,
			...updates,
			id: previousPost.id,
			updatedAt: new Date().toISOString(),
		};
		if (normalizePostStatus(posts[i].status) === "posted" && previousStatus !== "posted") {
			await appendPostedLogEntry(posts[i]);
		}
		const duplicate = findDuplicatePost(posts, posts[i], { excludeId: posts[i].id });
		if (duplicate) {
			return res.status(409).json({
				error: "Duplicate queue entry",
				detail: `Matches existing post ${duplicate.id}`,
			});
		}
		const pinterestConflict = await findPinterestCreativeConflict(
			posts.filter((post) => post.id !== posts[i].id),
			posts[i],
		);
		if (pinterestConflict) {
			return res.status(409).json({
				error: "Pinterest creative conflict",
				detail: `Too similar to recent pin ${pinterestConflict.matchedPostId || "unknown"}`,
				conflict: pinterestConflict,
			});
		}
		await updatePostInDb(posts[i].id, posts[i]);
		const rebalanceSummary = await maybeRebalancePinterestQueue(posts[i]);
		res.json({
			...posts[i],
			rebalanceSummary,
		});
	} catch (e) {
		res.status(500).json({ error: "Failed to update post", detail: String(e) });
	}
});

app.post("/api/posts/:id/retry-now", async (req, res) => {
	try {
		const posts = await listPosts();
		const existing = posts.find((p) => p.id === req.params.id);
		if (!existing) return res.status(404).json({ error: "not found" });

		const updatedPost = {
			...existing,
			status: "approved",
			scheduledAt: existing.scheduledAt || existing.scheduled_at || null,
			nextAttemptAt: null,
			attemptCount: 0,
			lastErrorAt: null,
			updatedAt: new Date().toISOString(),
			metadata: {
				...(existing.metadata || {}),
				retryNowAttempt: true,
			},
		};

		await updatePostInDb(updatedPost.id, updatedPost);
		await processQueue();

		const refreshedPosts = await listPosts();
		const refreshedQueueItem = refreshedPosts.find((p) => p.id === req.params.id) || null;
		const archive = await listPostedLog();
		const archivedItem = archive.find((entry) => entry.id === req.params.id) || null;

		res.json({
			ok: true,
			queueItem: refreshedQueueItem,
			archivedItem,
		});
	} catch (e) {
		res.status(500).json({ error: "Failed to retry post now", detail: String(e) });
	}
});

app.delete("/api/posts", async (req, res) => {
	try {
		const scope = String(req.query.scope || "").toLowerCase();
		if (scope !== "posted") {
			return res.status(400).json({ error: "Unsupported bulk delete scope" });
		}
		const removedCount = await clearPostedPostsFromQueue();
		return res.json({ removedCount });
	} catch (e) {
		res.status(500).json({ error: "Failed to clear posted posts", detail: String(e) });
	}
});

app.delete("/api/posts/:id", async (req, res) => {
	try {
		const removed = await deletePostFromDb(req.params.id);
		if (!removed) return res.status(404).json({ error: "not found" });
		res.json(removed);
	} catch (e) {
		res.status(500).json({ error: "Failed to delete post", detail: String(e) });
	}
});

app.post("/api/queue/rebalance-pinterest", async (req, res) => {
	try {
		const {
			startDate = new Date().toISOString().slice(0, 10),
			dryRun = false,
		} = req.body ?? {};
		if (!/^\d{4}-\d{2}-\d{2}$/.test(String(startDate))) {
			return res.status(400).json({ error: "startDate must use YYYY-MM-DD" });
		}

		const snapshot = await readStoreSnapshot();
		const { posts, summary } = rebalancePinterestMix(snapshot.posts, {
			startDate: String(startDate),
		});

		if (!dryRun) {
			await replaceStoreSnapshot({
				posts,
				postedLog: snapshot.postedLog,
				rejections: snapshot.rejections,
			});
		}

		return res.json({
			ok: true,
			dryRun: Boolean(dryRun),
			message: `Rebalanced ${summary.candidates} Pinterest posts from ${summary.startDate} using ${summary.dailyPlan.join(" / ")}`,
			...summary,
		});
	} catch (e) {
		res.status(500).json({
			error: "Failed to rebalance Pinterest queue",
			detail: String(e),
		});
	}
});

// ---- API: Post to all platforms (keeps your route)
app.post("/api/post-to-all", async (req, res) => {
	const { post, platforms = [], targets = [] } = req.body || {};
	if (!post) {
		return res.status(400).json({
			error: "Payload must include post object",
		});
	}
	try {
		const normalizedTargets = normalizeTargets(
			Array.isArray(targets) && targets.length ? targets : platforms,
		);
		if (normalizedTargets.length === 0) {
			return res.status(400).json({
				error: "At least one platform/account target is required",
			});
		}
		const results = await postToAllPlatforms(post, normalizedTargets);
		return res.json({ results });
	} catch (error) {
		console.error("Failed to post to platforms", error);
		return res.status(500).json({
			error: error?.message || "Unexpected error while posting to platforms",
		});
	}
});

// ---- 404 fallback
app.use((req, res) => {
	res.status(404).json({ message: "Not found", url: req.originalUrl });
});

// ---- boot
ensureFiles().then(() => {
	app.listen(PORT, () =>
		console.log(`Backend running on ${PORT} (SQLite: ${getLocalDbPath()})`)
	);
});
