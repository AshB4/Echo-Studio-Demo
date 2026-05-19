/** @format */

import { readStoreSnapshot, replaceStoreSnapshot } from "../../utils/localDb.mjs";

const DEFAULT_SLOTS_UTC = ["15:00", "15:20", "15:40", "16:00"];
const DEFAULT_DAILY_PLAN = ["amazon-a", "amazon-b", "digital", "wildcard"];
const DEFAULT_MAX_SAME_PRODUCT_PER_DAY = 2;
const DEFAULT_MEDIA_COOLDOWN_SLOTS = 6;

function parseArgs(argv = process.argv.slice(2)) {
	const args = {
		startDate: null,
		dryRun: false,
		slotsUtc: DEFAULT_SLOTS_UTC,
		dailyPlan: DEFAULT_DAILY_PLAN,
		maxSameProductPerDay: DEFAULT_MAX_SAME_PRODUCT_PER_DAY,
		mediaCooldownSlots: DEFAULT_MEDIA_COOLDOWN_SLOTS,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--dry-run") {
			args.dryRun = true;
			continue;
		}
		if (arg === "--start-date") {
			args.startDate = argv[index + 1] || null;
			index += 1;
			continue;
		}
		if (arg === "--slots") {
			args.slotsUtc = String(argv[index + 1] || "")
				.split(",")
				.map((item) => item.trim())
				.filter(Boolean);
			index += 1;
			continue;
		}
		if (arg === "--plan") {
			args.dailyPlan = String(argv[index + 1] || "")
				.split(",")
				.map((item) => item.trim())
				.filter(Boolean);
			index += 1;
			continue;
		}
		if (arg === "--max-same-product") {
			args.maxSameProductPerDay = Number(argv[index + 1] || DEFAULT_MAX_SAME_PRODUCT_PER_DAY);
			index += 1;
			continue;
		}
		if (arg === "--media-cooldown-slots") {
			args.mediaCooldownSlots = Number(argv[index + 1] || DEFAULT_MEDIA_COOLDOWN_SLOTS);
			index += 1;
		}
	}

	if (!args.startDate) {
		args.startDate = new Date().toISOString().slice(0, 10);
	}
	if (!/^\d{4}-\d{2}-\d{2}$/.test(args.startDate)) {
		throw new Error("--start-date must use YYYY-MM-DD");
	}
	if (!args.slotsUtc.length) {
		throw new Error("--slots must include at least one HH:MM UTC slot");
	}
	if (!args.dailyPlan.length) {
		throw new Error("--plan must include at least one category");
	}
	if (!Number.isFinite(args.maxSameProductPerDay) || args.maxSameProductPerDay < 1) {
		throw new Error("--max-same-product must be 1 or greater");
	}
	if (!Number.isFinite(args.mediaCooldownSlots) || args.mediaCooldownSlots < 0) {
		throw new Error("--media-cooldown-slots must be 0 or greater");
	}
	return args;
}

function hasPinterestTarget(post) {
	return (
		(post.platforms || []).map(String).includes("pinterest") ||
		(post.targets || []).some(
			(target) => String(target?.platform || "").toLowerCase() === "pinterest",
		)
	);
}

function productGroup(post) {
	const id = String(post?.metadata?.productProfileId || "").trim();
	if (id && id !== "restored-batch" && id !== "unknown") return id;
	return String(
		post?.metadata?.productProfileLabel ||
			post?.metadata?.keyword ||
			post?.canonicalUrl ||
			post?.id ||
			"unknown",
	).trim();
}

function productText(post) {
	return [
		productGroup(post),
		post?.title,
		post?.body,
		post?.canonicalUrl,
		post?.affiliateUrl,
		post?.metadata?.productProfileLabel,
		post?.metadata?.keyword,
		post?.metadata?.angle,
		...(post?.metadata?.pinterestTags || []),
	]
		.map((value) => String(value || "").toLowerCase())
		.join(" ");
}

function isAmazonPost(post) {
	const productId = String(post?.metadata?.productProfileId || "").toLowerCase();
	if (productId.startsWith("amazon-")) {
		return true;
	}
	return [
		post?.canonicalUrl,
		post?.affiliateUrl,
		post?.metadata?.productLinks?.amazon,
		post?.metadata?.productLinks?.primary,
	]
		.map((value) => String(value || "").toLowerCase())
		.join(" ")
		.includes("amazon.com");
}

function categoryForPost(post) {
	const text = productText(post);
	if (isAmazonPost(post) && /nail|beauty|spa|gel|polish|manicure/.test(text)) {
		return "amazon-beauty";
	}
	if (
		isAmazonPost(post) &&
		/toddler|kid|kids|egg|easter|montessori|princess|plush|toy|cars|basket|bath/.test(text)
	) {
		return "amazon-kids";
	}
	if (
		/gumroad|creator-spring|teespring|prompt|goblin|passover|start-anyway|frog|ai-powered-grad|coloring/.test(
			text,
		)
	) {
		return "digital";
	}
	return "wildcard";
}

function categoryMatches(category, preferred) {
	if (preferred === "amazon" || preferred === "amazon-a" || preferred === "amazon-b") {
		return category.startsWith("amazon-");
	}
	return category === preferred;
}

function scheduledMs(post) {
	const ms = Date.parse(post?.scheduledAt || post?.scheduled_at || "");
	return Number.isFinite(ms) ? ms : Number.MAX_SAFE_INTEGER;
}

function isoFor(startDate, dayIndex, slot) {
	const base = new Date(`${startDate}T00:00:00.000Z`);
	base.setUTCDate(base.getUTCDate() + dayIndex);
	const [hour, minute] = slot.split(":").map(Number);
	base.setUTCHours(hour, minute, 0, 0);
	return base.toISOString();
}

function buildCandidates(posts, startDate) {
	return posts
		.filter((post) => String(post.status || "").toLowerCase() === "approved")
		.filter(hasPinterestTarget)
		.filter((post) => String(post.scheduledAt || post.scheduled_at || "").slice(0, 10) >= startDate)
		.sort((a, b) => scheduledMs(a) - scheduledMs(b) || String(a.id).localeCompare(String(b.id)));
}

function buildQueues(candidates, dailyPlan) {
	const categories = Array.from(new Set([...dailyPlan, "wildcard"]));
	const queues = new Map(categories.map((category) => [category, []]));
	const initialCategoryCounts = {};

	for (const post of candidates) {
		const category = categoryForPost(post);
		if (!queues.has(category)) queues.set(category, []);
		queues.get(category).push(post);
		initialCategoryCounts[category] = (initialCategoryCounts[category] || 0) + 1;
	}

	return { queues, initialCategoryCounts };
}

function totalRemaining(queues) {
	return [...queues.values()].reduce((sum, list) => sum + list.length, 0);
}

function basenameWithoutExt(value) {
	const raw = String(value || "").trim();
	if (!raw) return "";
	const normalized = raw.split("?")[0];
	const base = normalized.split("/").pop() || normalized;
	return base.replace(/\.[a-z0-9]+$/i, "");
}

function mediaFamily(post) {
	const base = basenameWithoutExt(post?.mediaPath || post?.image || "");
	if (!base) return "";
	return base
		.replace(/_pinterest_\d+x\d+$/i, "")
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

function interleaveByMedia(posts = []) {
	const buckets = new Map();
	for (const post of posts) {
		const key = mediaFamily(post) || `no-media:${post.id}`;
		if (!buckets.has(key)) buckets.set(key, []);
		buckets.get(key).push(post);
	}
	for (const list of buckets.values()) {
		list.sort((a, b) => scheduledMs(a) - scheduledMs(b) || String(a.id).localeCompare(String(b.id)));
	}
	const keys = [...buckets.keys()].sort(
		(a, b) => (buckets.get(b)?.length || 0) - (buckets.get(a)?.length || 0) || a.localeCompare(b),
	);
	const mixed = [];
	let added = true;
	while (added) {
		added = false;
		for (const key of keys) {
			const list = buckets.get(key) || [];
			if (!list.length) continue;
			mixed.push(list.shift());
			added = true;
		}
	}
	return mixed;
}

function buildProductBuckets(candidates) {
	const buckets = new Map();
	const initialCategoryCounts = {};
	for (const post of candidates) {
		const group = productGroup(post);
		const category = categoryForPost(post);
		if (!buckets.has(group)) {
			buckets.set(group, {
				group,
				category,
				posts: [],
			});
		}
		buckets.get(group).posts.push(post);
		initialCategoryCounts[category] = (initialCategoryCounts[category] || 0) + 1;
	}
	for (const bucket of buckets.values()) {
		bucket.posts = interleaveByMedia(bucket.posts);
	}
	return { buckets, initialCategoryCounts };
}

function recentHitCount(recentDays, group, lookback = 3) {
	let count = 0;
	for (let index = Math.max(0, recentDays.length - lookback); index < recentDays.length; index += 1) {
		if (recentDays[index]?.has(group)) count += 1;
	}
	return count;
}

function categoryRecentHitCount(recentDays, category, bucketByGroup, lookback = 2) {
	let count = 0;
	for (let index = Math.max(0, recentDays.length - lookback); index < recentDays.length; index += 1) {
		const groups = recentDays[index];
		if (!groups) continue;
		for (const group of groups) {
			if (bucketByGroup.get(group)?.category === category) {
				count += 1;
				break;
			}
		}
	}
	return count;
}

function totalRemainingBuckets(buckets) {
	let total = 0;
	for (const bucket of buckets.values()) total += bucket.posts.length;
	return total;
}

function recentMediaHitCount(recentMediaFamilies, family, lookback = DEFAULT_MEDIA_COOLDOWN_SLOTS) {
	if (!family) return 0;
	let count = 0;
	for (
		let index = Math.max(0, recentMediaFamilies.length - lookback);
		index < recentMediaFamilies.length;
		index += 1
	) {
		if (recentMediaFamilies[index] === family) count += 1;
	}
	return count;
}

function takeFromBuckets(
	buckets,
	preferred,
	dayCounts,
	dayMediaCounts,
	lastGroup,
	lastMedia,
	recentDays,
	recentMediaFamilies,
	globalCounts,
	maxSameProductPerDay,
	mediaCooldownSlots,
) {
	const choices = [];
	for (const bucket of buckets.values()) {
		if (!bucket.posts.length) continue;
		if ((dayCounts.get(bucket.group) || 0) >= maxSameProductPerDay) continue;
		const post = bucket.posts[0];
		const family = mediaFamily(post);
		choices.push({
			bucket,
			post,
			group: bucket.group,
			category: bucket.category,
			family,
			preferredMatch: categoryMatches(bucket.category, preferred),
			sameGroupToday: dayCounts.has(bucket.group),
			sameMediaToday: Boolean(family && (dayMediaCounts.get(family) || 0) > 0),
			sameCategoryToday: Array.from(dayCounts.keys()).some(
				(group) => buckets.get(group)?.category === bucket.category,
			),
			recentGroupHits: recentHitCount(recentDays, bucket.group, 3),
			recentCategoryHits: categoryRecentHitCount(recentDays, bucket.category, buckets, 2),
			recentMediaHits: recentMediaHitCount(recentMediaFamilies, family, mediaCooldownSlots),
			globalCount: globalCounts.get(bucket.group) || 0,
			sameAsLastGroup: bucket.group === lastGroup,
			sameAsLastMedia: Boolean(family && family === lastMedia),
			remainingInBucket: bucket.posts.length,
		});
	}

	choices.sort((a, b) => {
		if (a.sameMediaToday !== b.sameMediaToday) return a.sameMediaToday ? 1 : -1;
		if (a.recentMediaHits !== b.recentMediaHits) return a.recentMediaHits - b.recentMediaHits;
		if (a.sameGroupToday !== b.sameGroupToday) return a.sameGroupToday ? 1 : -1;
		if (a.recentGroupHits !== b.recentGroupHits) return a.recentGroupHits - b.recentGroupHits;
		if (a.globalCount !== b.globalCount) return a.globalCount - b.globalCount;
		if (a.sameCategoryToday !== b.sameCategoryToday) return a.sameCategoryToday ? 1 : -1;
		if (a.preferredMatch !== b.preferredMatch) return a.preferredMatch ? -1 : 1;
		if (a.recentCategoryHits !== b.recentCategoryHits) return a.recentCategoryHits - b.recentCategoryHits;
		if (a.sameAsLastGroup !== b.sameAsLastGroup) return a.sameAsLastGroup ? 1 : -1;
		if (a.sameAsLastMedia !== b.sameAsLastMedia) return a.sameAsLastMedia ? 1 : -1;
		if (a.remainingInBucket !== b.remainingInBucket) return b.remainingInBucket - a.remainingInBucket;
		return scheduledMs(a.post) - scheduledMs(b.post) || String(a.post.id).localeCompare(String(b.post.id));
	});

	const selected = choices[0];
	if (!selected) return null;
	selected.bucket.posts.shift();
	return selected;
}

export function rebalancePinterestMix(posts, options = {}) {
	const startDate = options.startDate || new Date().toISOString().slice(0, 10);
	const slotsUtc = options.slotsUtc || DEFAULT_SLOTS_UTC;
	const dailyPlan = options.dailyPlan || DEFAULT_DAILY_PLAN;
	const candidates = buildCandidates(posts, startDate);
	const { buckets, initialCategoryCounts } = buildProductBuckets(candidates);
	const maxSameProductPerDay =
		options.maxSameProductPerDay || DEFAULT_MAX_SAME_PRODUCT_PER_DAY;
	const mediaCooldownSlots =
		Number.isFinite(Number(options.mediaCooldownSlots))
			? Number(options.mediaCooldownSlots)
			: DEFAULT_MEDIA_COOLDOWN_SLOTS;

	let dayIndex = 0;
	let moved = 0;
	let lastGroup = null;
	let lastMedia = "";
	const recentDays = [];
	const recentMediaFamilies = [];
	const globalCounts = new Map();

	while (totalRemainingBuckets(buckets) > 0) {
		const dayCounts = new Map();
		const dayMediaCounts = new Map();
		for (let slotIndex = 0; slotIndex < slotsUtc.length && totalRemainingBuckets(buckets) > 0; slotIndex += 1) {
			const selected = takeFromBuckets(
				buckets,
				dailyPlan[slotIndex] || "wildcard",
				dayCounts,
				dayMediaCounts,
				lastGroup,
				lastMedia,
				recentDays,
				recentMediaFamilies,
				globalCounts,
				maxSameProductPerDay,
				mediaCooldownSlots,
			);
			if (!selected) break;
			const nextScheduledAt = isoFor(startDate, dayIndex, slotsUtc[slotIndex]);
			if (selected.post.scheduledAt !== nextScheduledAt) moved += 1;
			selected.post.scheduledAt = nextScheduledAt;
			selected.post.updatedAt = new Date().toISOString();
			delete selected.post.scheduled_at;
			dayCounts.set(selected.group, (dayCounts.get(selected.group) || 0) + 1);
			if (selected.family) {
				dayMediaCounts.set(selected.family, (dayMediaCounts.get(selected.family) || 0) + 1);
			}
			globalCounts.set(selected.group, (globalCounts.get(selected.group) || 0) + 1);
			lastGroup = selected.group;
			lastMedia = selected.family || lastMedia;
			if (selected.family) {
				recentMediaFamilies.push(selected.family);
				if (recentMediaFamilies.length > Math.max(1, mediaCooldownSlots)) {
					recentMediaFamilies.shift();
				}
			}
		}
		recentDays.push(new Set(dayCounts.keys()));
		dayIndex += 1;
	}

	return {
		posts,
		summary: {
			startDate,
			candidates: candidates.length,
			daysUsed: dayIndex,
			moved,
			dailyPlan,
			slotsUtc,
			maxSameProductPerDay,
			mediaCooldownSlots,
			initialCategoryCounts,
		},
	};
}

async function main() {
	const args = parseArgs();
	const snapshot = await readStoreSnapshot();
	const { posts, summary } = rebalancePinterestMix(snapshot.posts, args);

	if (!args.dryRun) {
		await replaceStoreSnapshot({
			posts,
			postedLog: snapshot.postedLog,
			rejections: snapshot.rejections,
		});
	}

	console.log(JSON.stringify({ ...summary, dryRun: args.dryRun }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		console.error(error?.message || error);
		process.exitCode = 1;
	});
}
