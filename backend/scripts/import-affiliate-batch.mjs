import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { initLocalDb, listPosts, createPost } from "../utils/localDb.mjs";
import { normalizeTagList } from "../utils/distributionTags.mjs";
import { normalizePostStatus } from "../utils/postStatus.mjs";
import { findDuplicatePost } from "../utils/queueGuard.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "..");

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    batchFiles: [],
    startDate: new Date().toISOString().slice(0, 10),
    defaultPostsPerDay: 4,
    cadenceMode: "random_4_6",
    randomMin: 4,
    randomMax: 6,
    randomSeed: "postpunk-remote-import",
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--batch") {
      args.batchFiles.push(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--start-date") {
      args.startDate = argv[index + 1] || args.startDate;
      index += 1;
      continue;
    }
    if (arg === "--default-posts-per-day") {
      args.defaultPostsPerDay = Number(argv[index + 1] || args.defaultPostsPerDay);
      index += 1;
      continue;
    }
    if (arg === "--cadence-mode") {
      args.cadenceMode = argv[index + 1] || args.cadenceMode;
      index += 1;
      continue;
    }
    if (arg === "--random-min") {
      args.randomMin = Number(argv[index + 1] || args.randomMin);
      index += 1;
      continue;
    }
    if (arg === "--random-max") {
      args.randomMax = Number(argv[index + 1] || args.randomMax);
      index += 1;
      continue;
    }
    if (arg === "--random-seed") {
      args.randomSeed = argv[index + 1] || args.randomSeed;
      index += 1;
      continue;
    }
    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    args.batchFiles.push(arg);
  }

  if (!args.batchFiles.length) {
    throw new Error("Provide at least one batch file via --batch <path> or positional args.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.startDate)) {
    throw new Error("--start-date must use YYYY-MM-DD");
  }
  return args;
}

function hashSeed(input) {
  const text = String(input || "postpunk");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seedText) {
  const value = hashSeed(seedText);
  return value / 4294967296;
}

function randomIntInclusive(seedText, min, max) {
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  const unit = seededUnit(seedText);
  return safeMin + Math.floor(unit * (safeMax - safeMin + 1));
}

function addDays(dateOnly, count) {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

function buildTimesForCount(count) {
  if (count <= 1) return ["15:00"];
  if (count === 2) return ["15:00", "15:30"];
  if (count === 3) return ["15:00", "15:20", "15:40"];
  if (count === 4) return ["15:00", "15:20", "15:40", "16:00"];
  if (count === 5) return ["15:00", "15:15", "15:30", "15:45", "16:00"];
  return ["15:00", "15:12", "15:24", "15:36", "15:48", "16:00"];
}

function buildSchedulePlan(totalRows, startDate, options = {}) {
  const cadenceMode = options.cadenceMode || "random_4_6";
  const randomMin = Number(options.randomMin || 4);
  const randomMax = Number(options.randomMax || 6);
  const randomSeed = String(options.randomSeed || "postpunk-4-6");
  const defaultPostsPerDay = Number(options.defaultPostsPerDay || 4);
  const plan = [];
  let cursorDate = startDate;
  let rowIndex = 0;

  while (rowIndex < totalRows) {
    const postsPerDay =
      cadenceMode === "random_4_6"
        ? randomIntInclusive(`${randomSeed}:${cursorDate}`, randomMin, randomMax)
        : defaultPostsPerDay;
    const slots = buildTimesForCount(postsPerDay);
    for (const time of slots) {
      if (rowIndex >= totalRows) break;
      plan.push(`${cursorDate}T${time}:00`);
      rowIndex += 1;
    }
    cursorDate = addDays(cursorDate, 1);
  }

  return plan;
}

function normalizeBoardList(value) {
  return normalizeTagList(value);
}

function makeId() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readBatchFile(filePath) {
  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.join(BACKEND_ROOT, filePath);
  const raw = await readFile(resolved, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.items)) {
    throw new Error(`Batch file ${resolved} must contain an items array.`);
  }
  return {
    resolved,
    parsed,
  };
}

function buildRows(batchData) {
  const sharedLink = String(batchData.parsed.productLink || "").trim();
  const sharedBoard = String(batchData.parsed.board || "").trim();
  const batchLabel = String(
    batchData.parsed.campaign || path.basename(batchData.resolved, ".json"),
  ).trim();

  return batchData.parsed.items.map((item, index) => ({
    batchLabel,
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

function buildMixKey(row) {
  return `${row.productLink}::${row.cluster || row.board || "default"}`;
}

function mixRows(rows) {
  const buckets = new Map();
  for (const row of rows) {
    const key = buildMixKey(row);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(row);
  }

  const keys = [...buckets.keys()].sort();
  const mixed = [];
  let added = true;
  while (added) {
    added = false;
    for (const key of keys) {
      const bucket = buckets.get(key);
      if (bucket?.length) {
        mixed.push(bucket.shift());
        added = true;
      }
    }
  }
  return mixed;
}

function buildPost(row, scheduledAt) {
  const contentTags = ["affiliate", "amazon", ...row.tags];
  return {
    id: makeId(),
    title: row.title,
    body: row.description,
    image: null,
    mediaPath: row.image || null,
    mediaType: row.image ? "image" : null,
    altText: "",
    platforms: ["pinterest"],
    targets: [{ platform: "pinterest", accountId: null }],
    scheduledAt,
    status: normalizePostStatus("approved"),
    hashtags: null,
    platformOverrides: null,
    metadata: {
      contentMode: "affiliate",
      batchLabel: row.batchLabel,
      keyword: row.keyword,
      angle: row.angle,
      cluster: row.cluster,
      variantId: row.variantId,
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

async function main() {
  const args = parseArgs();
  await initLocalDb();
  const existingPosts = await listPosts();
  const batches = await Promise.all(args.batchFiles.map(readBatchFile));
  const mixedRows = mixRows(batches.flatMap(buildRows));
  const schedule = buildSchedulePlan(mixedRows.length, args.startDate, args);
  const created = [];
  const skipped = [];
  const workingPosts = [...existingPosts];

  for (let index = 0; index < mixedRows.length; index += 1) {
    const row = mixedRows[index];
    const post = buildPost(row, schedule[index] || null);
    const duplicate = findDuplicatePost(workingPosts, post);
    if (duplicate) {
      skipped.push({ title: row.title, reason: `duplicate:${duplicate.id}` });
      continue;
    }
    if (!args.dryRun) {
      await createPost(post);
    }
    workingPosts.push(post);
    created.push({
      id: post.id,
      title: post.title,
      scheduledAt: post.scheduledAt,
      board: post.metadata.pinterestBoard,
      batchLabel: post.metadata.batchLabel,
    });
  }

  console.log(
    JSON.stringify(
      {
        dryRun: args.dryRun,
        batches: batches.map((batch) => batch.resolved),
        requested: mixedRows.length,
        created: created.length,
        skipped: skipped.length,
        createdItems: created,
        skippedItems: skipped,
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
