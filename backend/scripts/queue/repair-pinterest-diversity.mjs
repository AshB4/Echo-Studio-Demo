import {
  initLocalDb,
  readStoreSnapshot,
  replaceStoreSnapshot,
} from "../../utils/localDb.mjs";
import { inferPinterestQueueIdentity } from "../../utils/pinterestQueueIdentity.mjs";
import { rebalanceQueueMediaOnly } from "../postingJob.mjs";

function parseArgs(argv = process.argv.slice(2)) {
  return {
    dryRun: argv.includes("--dry-run"),
  };
}

function hasPinterestTarget(post) {
  return (
    (post.platforms || []).map((item) => String(item).toLowerCase()).includes("pinterest") ||
    (post.targets || []).some((target) => String(target?.platform || "").toLowerCase() === "pinterest")
  );
}

function canonicalizeProductLink(link) {
  const raw = String(link || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    if (/(^|\.)amazon\./i.test(parsed.hostname)) {
      const asin = parsed.pathname.match(/\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i)?.[1]?.toUpperCase() || "";
      return asin ? `amazon:${asin}` : `${parsed.origin}${parsed.pathname}`;
    }
    return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, "");
  } catch {
    return raw.toLowerCase();
  }
}

function buildProductKey(post) {
  const metadata = post?.metadata || {};
  return (
    canonicalizeProductLink(
      metadata?.productLink ||
      metadata?.productLinks?.primary ||
      metadata?.productLinks?.amazon ||
      metadata?.productLinks?.gumroad ||
      "",
    ) ||
    String(post?.productProfileId || metadata?.productProfileId || "").trim() ||
    String(post?.title || "").trim() ||
    String(post?.id || "").trim()
  );
}

function groupScheduleByDay(posts = []) {
  const days = [];
  let currentDay = null;
  let currentPosts = [];

  for (const post of posts) {
    const dayKey = String(post?.scheduledAt || post?.scheduled_at || "").slice(0, 10);
    if (dayKey !== currentDay) {
      if (currentPosts.length > 0) days.push(currentPosts);
      currentDay = dayKey;
      currentPosts = [];
    }
    currentPosts.push(post);
  }

  if (currentPosts.length > 0) days.push(currentPosts);
  return days;
}

function spreadPostsAcrossDays(posts = []) {
  const days = groupScheduleByDay(posts);
  const buckets = new Map();

  for (const post of posts) {
    const key = buildProductKey(post);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(post);
  }

  const keys = [...buckets.keys()].sort();
  const ordered = [];
  let rotationIndex = 0;

  for (const dayPosts of days) {
    const usedToday = new Set();
    for (let slotIndex = 0; slotIndex < dayPosts.length; slotIndex += 1) {
      let selectedKey = null;

      for (let offset = 0; offset < keys.length; offset += 1) {
        const key = keys[(rotationIndex + offset) % keys.length];
        const bucket = buckets.get(key);
        if (bucket?.length && !usedToday.has(key)) {
          selectedKey = key;
          rotationIndex = (rotationIndex + offset + 1) % keys.length;
          break;
        }
      }

      if (!selectedKey) {
        for (let offset = 0; offset < keys.length; offset += 1) {
          const key = keys[(rotationIndex + offset) % keys.length];
          const bucket = buckets.get(key);
          if (bucket?.length) {
            selectedKey = key;
            rotationIndex = (rotationIndex + offset + 1) % keys.length;
            break;
          }
        }
      }

      if (!selectedKey) break;
      ordered.push(buckets.get(selectedKey).shift());
      usedToday.add(selectedKey);
    }
  }

  return ordered;
}

function repairIdentity(post) {
  const sanitizedPost = {
    ...post,
    productProfileId: null,
    metadata: {
      ...(post?.metadata || {}),
      productProfileId: null,
    },
  };

  const identity = inferPinterestQueueIdentity(sanitizedPost, {
    batchLabel: post?.metadata?.batchLabel,
    batchFile: post?.metadata?.sourceBatchFile,
    campaign: post?.metadata?.batchLabel,
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
    },
  };
}

function countSameDayDuplicates(posts = []) {
  const duplicateRows = [];
  const grouped = new Map();

  for (const post of posts) {
    const day = String(post?.scheduledAt || post?.scheduled_at || "").slice(0, 10);
    const product = buildProductKey(post);
    const key = `${day}::${product}`;
    grouped.set(key, (grouped.get(key) || 0) + 1);
  }

  for (const [key, count] of grouped.entries()) {
    if (count <= 1) continue;
    const [day, product] = key.split("::");
    duplicateRows.push({ day, product, count });
  }

  return duplicateRows;
}

async function main() {
  const args = parseArgs();
  await initLocalDb();
  const snapshot = await readStoreSnapshot();
  const updatedPosts = snapshot.posts.map((post) => (hasPinterestTarget(post) ? repairIdentity(post) : post));

  const scheduledPinterest = updatedPosts
    .filter((post) => hasPinterestTarget(post) && post?.scheduledAt)
    .sort((left, right) => String(left.scheduledAt || "").localeCompare(String(right.scheduledAt || "")));

  const originalSlots = scheduledPinterest.map((post) => post.scheduledAt);
  const reordered = spreadPostsAcrossDays(scheduledPinterest);
  const reassignedIds = new Set(reordered.map((post) => post.id));

  const rewrittenById = new Map();
  let rescheduledCount = 0;
  for (let index = 0; index < reordered.length; index += 1) {
    const post = reordered[index];
    const scheduledAt = originalSlots[index] || post.scheduledAt || null;
    const changed = scheduledAt !== post.scheduledAt;
    rewrittenById.set(post.id, {
      ...post,
      scheduledAt,
      updatedAt: changed ? new Date().toISOString() : post.updatedAt,
    });
    if (changed) rescheduledCount += 1;
  }

  const nextPosts = updatedPosts.map((post) => {
    if (!reassignedIds.has(post.id)) return post;
    return rewrittenById.get(post.id) || post;
  });

  const beforeDuplicates = countSameDayDuplicates(scheduledPinterest);
  const afterDuplicates = countSameDayDuplicates(
    nextPosts
      .filter((post) => hasPinterestTarget(post) && post?.scheduledAt)
      .sort((left, right) => String(left.scheduledAt || "").localeCompare(String(right.scheduledAt || ""))),
  );

  if (!args.dryRun) {
    await replaceStoreSnapshot({
      posts: nextPosts,
      postedLog: snapshot.postedLog,
      rejections: snapshot.rejections,
    });
    await rebalanceQueueMediaOnly();
  }

  console.log(
    JSON.stringify(
      {
        dryRun: args.dryRun,
        scheduledPinterest: scheduledPinterest.length,
        rescheduledCount,
        beforeDuplicateDays: beforeDuplicates.length,
        afterDuplicateDays: afterDuplicates.length,
        remainingDuplicateDays: afterDuplicates.slice(0, 20),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
