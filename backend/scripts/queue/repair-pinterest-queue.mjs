import path from "path";
import { fileURLToPath } from "url";
import { initLocalDb, readStoreSnapshot, replaceStoreSnapshot } from "../../utils/localDb.mjs";
import { inferPinterestQueueIdentity } from "../../utils/pinterestQueueIdentity.mjs";
import { rebalancePinterestMix } from "./rebalance-pinterest-mix.mjs";
import { findContentDuplicate, findDuplicatePost } from "../../utils/queueGuard.mjs";
import { normalizeTagList } from "../../utils/distributionTags.mjs";
import { normalizePostStatus } from "../../utils/postStatus.mjs";
import { readFile } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "..", "..");

const DEFAULT_BATCHES = [
  "config/affiliate-batches/olaplex-gap-fill-25.json",
  "config/affiliate-batches/laneige-lipmask-25pins-may.json",
  "config/affiliate-batches/vintage-password-logbook-mothersday-evergreen.json",
];
const SEASONAL_CUTOFFS = {
  "passover-seder-survival-kit": "2026-04-15",
};

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    startDate: new Date().toISOString().slice(0, 10),
    dryRun: false,
    importMissing: true,
    batchFiles: [...DEFAULT_BATCHES],
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--start-date") {
      args.startDate = argv[index + 1] || args.startDate;
      index += 1;
      continue;
    }
    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (arg === "--no-import-missing") {
      args.importMissing = false;
      continue;
    }
    if (arg === "--batch") {
      args.batchFiles.push(argv[index + 1]);
      index += 1;
    }
  }
  return args;
}

function hasPinterestTarget(post) {
  return (
    (post.platforms || []).map(String).includes("pinterest") ||
    (post.targets || []).some((target) => String(target?.platform || "").toLowerCase() === "pinterest")
  );
}

function makeId() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeBoardList(value) {
  return normalizeTagList(value);
}

async function readBatchFile(filePath) {
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(BACKEND_ROOT, filePath);
  const raw = await readFile(resolved, "utf8");
  const parsed = JSON.parse(raw);
  return { resolved, parsed };
}

function buildRows(batchData) {
  const sharedLink = String(batchData.parsed.productLink || "").trim();
  const sharedBoard = String(batchData.parsed.board || "").trim();
  const batchLabel = String(
    batchData.parsed.campaign || path.basename(batchData.resolved, ".json"),
  ).trim();
  return batchData.parsed.items.map((item, index) => ({
    batchLabel,
    batchFile: path.basename(batchData.resolved),
    title: String(item.title || "").trim(),
    description: String(item.description || "").trim(),
    image: String(item.image || "").trim(),
    keyword: String(item.keyword || "").trim(),
    angle: String(item.angle || "").trim(),
    cluster: String(item.cluster || "").trim(),
    variantId: String(item.variantId || `${batchLabel}-${index + 1}`).trim(),
    board: String(item.board || sharedBoard || "").trim(),
    boards: normalizeBoardList(item.boards || (item.board || sharedBoard ? [item.board || sharedBoard] : [])),
    tags: normalizeTagList(item.tags || []),
    productLink: String(item.productLink || sharedLink || "").trim(),
  }));
}

function buildPost(row, scheduledAt) {
  const contentTags = ["affiliate", "amazon", ...row.tags];
  const identity = inferPinterestQueueIdentity(row, {
    batchLabel: row.batchLabel,
    batchFile: row.batchFile,
    campaign: row.batchLabel,
    keyword: row.keyword,
    angle: row.angle,
    cluster: row.cluster,
    productLink: row.productLink,
    tags: row.tags,
    image: row.image,
  });
  return {
    id: makeId(),
    title: row.title,
    body: row.description,
    image: null,
    mediaPath: row.image || null,
    mediaType: row.image ? "image" : null,
    productProfileId: identity.productProfileId,
    altText: "",
    platforms: ["pinterest"],
    targets: [{ platform: "pinterest", accountId: null }],
    scheduledAt,
    status: normalizePostStatus("approved"),
    hashtags: null,
    platformOverrides: null,
    metadata: {
      contentMode: "affiliate",
      batchLabel: identity.batchLabel || row.batchLabel,
      productProfileId: identity.productProfileId,
      intentPrimary: identity.intentPrimary,
      intentSecondary: identity.intentSecondary,
      awarenessStage: identity.awarenessStage,
      painProximity: identity.painProximity,
      commercialityScore: identity.commercialityScore,
      emotionTags: identity.emotionTags,
      identityTags: identity.identityTags,
      queryChainDepth: identity.queryChainDepth,
      evergreenScore: identity.evergreenScore,
      jtbd: identity.jtbd,
      pinAngle: identity.pinAngle,
      keyword: row.keyword,
      angle: row.angle,
      cluster: row.cluster,
      variantId: row.variantId,
      sourceBatchFile: row.batchFile,
      pinterestBoard: row.board || "",
      pinterestBoards: row.boards,
      pinterestTags: row.tags,
      productLink: row.productLink,
      productLinks: {
        primary: row.productLink,
        amazon: row.productLink,
      },
      includeProductLink: true,
      contentTags: normalizeTagList(contentTags),
      distributionTags: ["post:pinterest"],
    },
    tags: normalizeTagList(["affiliate", "amazon", row.angle, row.cluster, ...row.tags]).filter(Boolean),
    createdAt: new Date().toISOString(),
  };
}

function classifyRestoredPost(post) {
  const identity = inferPinterestQueueIdentity(post, {
    batchLabel: post?.metadata?.batchLabel,
    keyword: post?.metadata?.keyword,
    angle: post?.metadata?.angle,
    cluster: post?.metadata?.cluster,
    productLink: post?.metadata?.productLink || post?.metadata?.productLinks?.primary,
    tags: post?.metadata?.pinterestTags || post?.tags,
    image: post?.mediaPath || post?.image,
  });
  return {
    ...post,
    productProfileId: identity.productProfileId || post?.productProfileId || null,
    metadata: {
      ...(post?.metadata || {}),
      batchLabel: identity.batchLabel || post?.metadata?.batchLabel || null,
      productProfileId: identity.productProfileId || post?.metadata?.productProfileId || null,
      intentPrimary: identity.intentPrimary || post?.metadata?.intentPrimary || null,
      intentSecondary: identity.intentSecondary || post?.metadata?.intentSecondary || null,
      awarenessStage: identity.awarenessStage || post?.metadata?.awarenessStage || null,
      painProximity: identity.painProximity ?? post?.metadata?.painProximity ?? null,
      commercialityScore: identity.commercialityScore ?? post?.metadata?.commercialityScore ?? null,
      emotionTags: identity.emotionTags.length ? identity.emotionTags : post?.metadata?.emotionTags || [],
      identityTags: identity.identityTags.length ? identity.identityTags : post?.metadata?.identityTags || [],
      queryChainDepth: identity.queryChainDepth ?? post?.metadata?.queryChainDepth ?? null,
      evergreenScore: identity.evergreenScore ?? post?.metadata?.evergreenScore ?? null,
      jtbd: identity.jtbd || post?.metadata?.jtbd || null,
      pinAngle: identity.pinAngle || post?.metadata?.pinAngle || null,
    },
  };
}

function needsIdentityRepair(post) {
  if (!hasPinterestTarget(post)) return false;
  const productId = String(post?.metadata?.productProfileId || post?.productProfileId || "").trim();
  return !productId || productId === "unknown" || productId === "restored-batch";
}

function pullIntoRebalanceWindow(post, startDate) {
  if (!hasPinterestTarget(post)) return post;
  if (String(post?.status || "").toLowerCase() !== "approved") return post;
  const currentDate = String(post?.scheduledAt || post?.scheduled_at || "").slice(0, 10);
  if (!currentDate || currentDate >= startDate) return post;
  return {
    ...post,
    scheduledAt: `${startDate}T00:00:00.000Z`,
    updatedAt: new Date().toISOString(),
  };
}

function dedupeApprovedPinterestPosts(posts = []) {
  const seen = new Set();
  const kept = [];
  let removed = 0;
  for (const post of posts) {
    if (!hasPinterestTarget(post) || String(post?.status || "").toLowerCase() !== "approved") {
      kept.push(post);
      continue;
    }
    const duplicate = findContentDuplicate(kept, post);
    if (duplicate) {
      removed += 1;
      continue;
    }
    kept.push(post);
	}
	return { posts: kept, removed };
}

function pruneBrokenApprovedPinterestPosts(posts = []) {
	const kept = [];
	let removed = 0;
	for (const post of posts) {
		if (!hasPinterestTarget(post) || String(post?.status || "").toLowerCase() !== "approved") {
			kept.push(post);
			continue;
		}
		const mediaPath = String(post?.mediaPath || post?.image || "").trim();
		if (!mediaPath) {
			removed += 1;
			continue;
		}
		kept.push(post);
	}
	return { posts: kept, removed };
}

function pruneExpiredSeasonalPinterestPosts(posts = [], startDate) {
  const kept = [];
  let removed = 0;
  for (const post of posts) {
    if (!hasPinterestTarget(post) || String(post?.status || "").toLowerCase() !== "approved") {
      kept.push(post);
      continue;
    }
    const productId = String(post?.metadata?.productProfileId || post?.productProfileId || "").trim();
    const cutoff = SEASONAL_CUTOFFS[productId];
    if (cutoff && startDate > cutoff) {
      removed += 1;
      continue;
    }
    kept.push(post);
  }
  return { posts: kept, removed };
}

async function main() {
  const args = parseArgs();
  await initLocalDb();
  const snapshot = await readStoreSnapshot();
  const queue = snapshot.posts || [];
  const repaired = [];
  const untouched = [];

  for (const post of queue) {
    if (needsIdentityRepair(post)) {
      repaired.push(pullIntoRebalanceWindow(classifyRestoredPost(post), args.startDate));
    } else {
      untouched.push(pullIntoRebalanceWindow(post, args.startDate));
    }
  }

  let workingPosts = [...untouched, ...repaired];
  const imported = [];

  if (args.importMissing) {
    const batches = await Promise.all(args.batchFiles.map(readBatchFile));
    for (const batch of batches) {
      for (const row of buildRows(batch)) {
        const candidate = buildPost(row, `${args.startDate}T15:00:00.000Z`);
        const duplicate =
          findContentDuplicate(workingPosts, candidate) ||
          findDuplicatePost(workingPosts, candidate);
        if (duplicate) continue;
        workingPosts.push(candidate);
        imported.push(candidate);
      }
    }
  }

  const seasonalPruned = pruneExpiredSeasonalPinterestPosts(workingPosts, args.startDate);
  const pruned = pruneBrokenApprovedPinterestPosts(seasonalPruned.posts);
  const deduped = dedupeApprovedPinterestPosts(pruned.posts);
  const rebalanced = rebalancePinterestMix(deduped.posts, { startDate: args.startDate });

  if (!args.dryRun) {
    await replaceStoreSnapshot({
      posts: rebalanced.posts,
      postedLog: snapshot.postedLog,
      rejections: snapshot.rejections,
    });
  }

  console.log(
    JSON.stringify(
      {
        dryRun: args.dryRun,
        startDate: args.startDate,
        repairedRestoredPosts: repaired.length,
        importedMissingPosts: imported.length,
        prunedExpiredSeasonalPinterestPosts: seasonalPruned.removed,
        prunedBrokenApprovedPinterestPosts: pruned.removed,
        dedupedApprovedPinterestPosts: deduped.removed,
        summary: rebalanced.summary,
      },
      null,
      2,
    ),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error?.stack || String(error));
    process.exitCode = 1;
  });
}
