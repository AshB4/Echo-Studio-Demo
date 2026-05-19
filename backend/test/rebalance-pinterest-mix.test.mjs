import test from "node:test";
import assert from "node:assert/strict";
import { rebalancePinterestMix } from "../scripts/queue/rebalance-pinterest-mix.mjs";

function makePost(id, title, mediaPath, scheduledAt, productProfileId, keyword = "") {
	return {
		id,
		title,
		body: `${title} body`,
		mediaPath,
		platforms: ["pinterest"],
		targets: [{ platform: "pinterest", accountId: null }],
		status: "approved",
		scheduledAt,
		metadata: {
			productProfileId,
			productProfileLabel: productProfileId,
			keyword,
			pinterestTags: [keyword].filter(Boolean),
		},
	};
}

test("rebalancePinterestMix spaces repeated media families across nearby slots", () => {
	const posts = [
		makePost(
			"a1",
			"Treat angle one",
			"frontend/assets/goblinaffs/DeserveATreat.png",
			"2026-05-17T15:00:00.000Z",
			"goblin-coloring-affirmations",
			"treat angle one",
		),
		makePost(
			"a2",
			"Treat angle two",
			"frontend/assets/goblinaffs/DeserveATreat.png",
			"2026-05-17T15:20:00.000Z",
			"goblin-coloring-affirmations",
			"treat angle two",
		),
		makePost(
			"a3",
			"Treat angle three",
			"frontend/assets/goblinaffs/DeserveATreat.png",
			"2026-05-17T15:40:00.000Z",
			"goblin-coloring-affirmations",
			"treat angle three",
		),
		makePost(
			"b1",
			"Olaplex result",
			"frontend/assets/spring2026/Olaplex3mins.jpg",
			"2026-05-17T16:00:00.000Z",
			"amazon-beauty-olaplex",
			"hair repair",
		),
		makePost(
			"c1",
			"Password notebook",
			"frontend/assets/passwordbook/KeepWhatMatters.png",
			"2026-05-18T15:00:00.000Z",
			"amazon-password-logbook",
			"password organizer",
		),
		makePost(
			"d1",
			"Start anyway tee",
			"https://mockup-api.teespring.com/v3/image/fEaLBX6CWYMipUEzreinLgq6sK8/1200/1200.jpg",
			"2026-05-18T15:20:00.000Z",
			"start-anyway-frog-tee",
			"start anyway tee",
		),
		makePost(
			"e1",
			"Laneige lip mask",
			"frontend/assets/spring2026/LipLaneige1.jpg",
			"2026-05-18T15:40:00.000Z",
			"amazon-beauty-laneige-lip-mask",
			"lip mask",
		),
		makePost(
			"f1",
			"Password organizer",
			"frontend/assets/passwordbook/Organizeyourlife.png",
			"2026-05-18T16:00:00.000Z",
			"amazon-password-logbook-2",
			"password book",
		),
		makePost(
			"g1",
			"Bee coloring",
			"frontend/assets/buzzingbees/5minsOfCalmBigBee.png",
			"2026-05-19T15:00:00.000Z",
			"buzzing-adventures-coloring-book",
			"bee coloring",
		),
	];

	const result = rebalancePinterestMix(posts, {
		startDate: "2026-05-17",
		mediaCooldownSlots: 4,
	});

	const treatPosts = result.posts
		.filter((post) => post.mediaPath.includes("DeserveATreat.png"))
		.sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)));
	const treatSlots = treatPosts.map((post) => post.scheduledAt);

	assert.equal(treatSlots.length, 3);
	assert.notEqual(treatSlots[0].slice(0, 10), treatSlots[1].slice(0, 10));
	assert.notEqual(treatSlots[1].slice(0, 10), treatSlots[2].slice(0, 10));
});
