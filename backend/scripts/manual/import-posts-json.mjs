import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { initLocalDb, listPosts, createPost } from "../../utils/localDb.mjs";
import { distributionTagsToTargets, normalizeTagList } from "../../utils/distributionTags.mjs";
import { normalizePostStatus } from "../../utils/postStatus.mjs";
import { findDuplicatePost } from "../../utils/queueGuard.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "..", "..");

function makeId() {
	return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTargets(inputTargets = [], platforms = [], distributionTags = []) {
	const distributionTargets = distributionTagsToTargets(distributionTags);
	const rawTargets = Array.isArray(inputTargets) && inputTargets.length
		? [...inputTargets, ...distributionTargets]
		: [...platforms.map((platform) => ({ platform, accountId: null })), ...distributionTargets];
	const seen = new Set();
	const normalized = [];
	for (const target of rawTargets) {
		const platform = String(target?.platform || target || "").trim().toLowerCase();
		if (!platform) continue;
		const accountId = target?.accountId ?? null;
		const key = `${platform}::${accountId ?? ""}`;
		if (seen.has(key)) continue;
		seen.add(key);
		normalized.push({ platform, accountId });
	}
	return normalized;
}

function normalizePost(input = {}) {
	const metadata = {
		...(input.metadata || {}),
		contentTags: normalizeTagList(input?.metadata?.contentTags || input.tags || []),
		distributionTags: normalizeTagList(input?.metadata?.distributionTags || []),
	};
	const targets = normalizeTargets(input.targets || [], input.platforms || [], metadata.distributionTags);
	return {
		id: makeId(),
		title: String(input.title || "").trim(),
		body: String(input.body || "").trim(),
		image: input.image || null,
		mediaPath: input.mediaPath || null,
		mediaType: input.mediaType || null,
		altText: input.altText || "",
		platforms: targets.map((target) => target.platform),
		targets,
		scheduledAt: input.scheduledAt || null,
		status: normalizePostStatus(input.status || "approved"),
		hashtags: input.hashtags || null,
		platformOverrides: input.platformOverrides || null,
		metadata,
		tags: normalizeTagList(input.tags || []),
		createdAt: new Date().toISOString(),
	};
}

async function main() {
	const batchArg = process.argv[2];
	if (!batchArg) {
		throw new Error("Usage: node backend/scripts/manual/import-posts-json.mjs <batch.json>");
	}
	const batchPath = path.isAbsolute(batchArg) ? batchArg : path.join(BACKEND_ROOT, batchArg);
	const parsed = JSON.parse(await readFile(batchPath, "utf8"));
	if (!Array.isArray(parsed)) {
		throw new Error("Batch file must be a JSON array.");
	}

	await initLocalDb();
	const existing = await listPosts();
	const inserted = [];
	const skipped = [];

	for (const row of parsed) {
		const post = normalizePost(row);
		if (!post.title || !post.body) {
			skipped.push({ title: row?.title || "(untitled)", reason: "missing title/body" });
			continue;
		}
		const duplicate = findDuplicatePost([...existing, ...inserted], post);
		if (duplicate) {
			skipped.push({ title: post.title, reason: `duplicate:${duplicate.id}` });
			continue;
		}
		await createPost(post);
		inserted.push(post);
	}

	console.log(
		JSON.stringify(
			{
				inserted: inserted.map((post) => ({
					id: post.id,
					title: post.title,
					scheduledAt: post.scheduledAt,
					platforms: post.platforms,
					batchLabel: post.metadata?.batchLabel || null,
				})),
				skipped,
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
