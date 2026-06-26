import test from "node:test";
import assert from "node:assert/strict";
import {
	facebookTextSimilarity,
	findRecentFacebookConflict,
	findRecentPinterestConflict,
	pickTodaysFacebookPostId,
} from "../scripts/postingJob.mjs";

test("facebookTextSimilarity scores near-duplicate copy above unrelated copy", () => {
	const repeated = {
		title: "You Deserve A Little Treat",
		body: "For surviving the things no one saw.",
	};
	const variant = {
		title: "Tiny Treat. Massive Emotional Victory.",
		body: "Sometimes the smallest reward carries the biggest weight for surviving the things no one saw.",
	};
	const unrelated = {
		title: "Backyard water play for toddlers",
		body: "This burns energy fast and gets kids outside.",
	};

	assert.ok(facebookTextSimilarity(repeated, variant) > 0.2);
	assert.ok(facebookTextSimilarity(repeated, unrelated) < 0.3);
});

test("findRecentFacebookConflict blocks recent same-family goblin reposts", () => {
	const nowMs = Date.parse("2026-05-17T12:00:00.000Z");
	const post = {
		title: "self improvement is temporary",
		body: "Forest cryptid status is forever.",
		mediaPath: "frontend/assets/goblinaffs/DeserveATreat.png",
		metadata: {
			productProfileId: "goblin-coloring-affirmations",
		},
		platforms: ["facebook"],
	};
	const postedLog = [
		{
			title: "You Deserve A Little Treat",
			body: "For surviving the things no one saw.",
			mediaPath: "frontend/assets/goblinaffs/DeserveATreat.png",
			metadata: {
				productProfileId: "goblin-coloring-affirmations",
			},
			platforms: ["facebook"],
			processedAt: "2026-05-17T11:30:00.000Z",
		},
	];

	const conflict = findRecentFacebookConflict(post, postedLog, nowMs);
	assert.ok(conflict);
	assert.equal(conflict.reason, "facebook media family cooldown");
});

test("pickTodaysFacebookPostId prefers an unseen goblin meme family over recently used family", () => {
	const nowMs = Date.parse("2026-05-17T12:00:00.000Z");
	const readyPosts = [
		{
			id: "fb_recent_family",
			title: "You Deserve A Little Treat",
			body: "Surviving hard things counts.",
			mediaPath: "frontend/assets/goblinaffs/DeserveATreat.png",
			platforms: ["facebook"],
			targets: [{ platform: "facebook", accountId: null }],
			scheduledAt: "2026-05-17T15:00:00.000Z",
			metadata: { productProfileId: "goblin-coloring-affirmations" },
		},
		{
			id: "fb_unseen_family",
			title: "Drink Water, Tiny Cryptid",
			body: "Hydration still counts as progress.",
			mediaPath: "frontend/assets/goblinaffs/DrinkWater.png",
			platforms: ["facebook"],
			targets: [{ platform: "facebook", accountId: null }],
			scheduledAt: "2026-05-17T15:20:00.000Z",
			metadata: { productProfileId: "goblin-coloring-affirmations" },
		},
	];
	const postedLog = [
		{
			title: "Tiny Treat. Massive Emotional Victory.",
			body: "Sometimes the smallest reward carries the biggest weight.",
			mediaPath: "frontend/assets/goblinaffs/DeserveATreat.png",
			platforms: ["facebook"],
			processedAt: "2026-05-17T11:30:00.000Z",
			metadata: { productProfileId: "goblin-coloring-affirmations" },
		},
	];

	const selected = pickTodaysFacebookPostId(readyPosts, postedLog, nowMs);
	assert.equal(selected, "fb_unseen_family");
});

test("pickTodaysFacebookPostId prefers less-used facebook product families", () => {
	const nowMs = Date.parse("2026-05-17T12:00:00.000Z");
	const readyPosts = [
		{
			id: "fb_goblin",
			title: "Goblin Meme Again",
			body: "Still extremely goblin.",
			mediaPath: "frontend/assets/goblinaffs/DrinkWater.png",
			platforms: ["facebook"],
			targets: [{ platform: "facebook", accountId: null }],
			scheduledAt: "2026-05-17T15:00:00.000Z",
			metadata: { productProfileId: "goblin-coloring-affirmations" },
		},
		{
			id: "fb_bees",
			title: "Bee Coloring Book",
			body: "Soft hobby energy.",
			mediaPath: "frontend/assets/buzzingbees/5minsOfCalmBigBee.png",
			platforms: ["facebook"],
			targets: [{ platform: "facebook", accountId: null }],
			scheduledAt: "2026-05-17T15:20:00.000Z",
			metadata: { productProfileId: "buzzing-adventures-coloring-book" },
		},
	];
	const postedLog = [
		{
			title: "Older Goblin 1",
			body: "Goblin.",
			mediaPath: "frontend/assets/goblinaffs/ExploringSideQuests.png",
			platforms: ["facebook"],
			processedAt: "2026-05-10T15:00:00.000Z",
			metadata: { productProfileId: "goblin-coloring-affirmations" },
		},
		{
			title: "Older Goblin 2",
			body: "Still goblin.",
			mediaPath: "frontend/assets/goblinaffs/MoveslowNotFail.png",
			platforms: ["facebook"],
			processedAt: "2026-05-12T15:00:00.000Z",
			metadata: { productProfileId: "goblin-coloring-affirmations" },
		},
	];

	const selected = pickTodaysFacebookPostId(readyPosts, postedLog, nowMs);
	assert.equal(selected, "fb_bees");
});

test("findRecentPinterestConflict blocks recent same-family goblin pin reposts", () => {
	const nowMs = Date.parse("2026-05-17T12:00:00.000Z");
	const post = {
		title: "my inner light has been outsourced to raccoons",
		body: "Goblin affirmation energy.",
		mediaPath: "frontend/assets/goblinaffs/DeserveTreats.png",
		metadata: {
			productProfileId: "goblin-coloring-affirmations",
		},
		platforms: ["pinterest"],
	};
	const postedLog = [
		{
			title: "Introvert Rest Day Coloring Page (Recharge Mode)",
			body: "Different angle, same visual family.",
			mediaPath: "frontend/assets/goblinaffs/DeserveTreats.png",
			metadata: {
				productProfileId: "goblin-coloring-affirmations",
			},
			platforms: ["pinterest"],
			processedAt: "2026-05-17T11:30:00.000Z",
		},
	];

	const conflict = findRecentPinterestConflict(post, postedLog, nowMs);
	assert.ok(conflict);
	assert.equal(conflict.reason, "pinterest media family cooldown");
});
