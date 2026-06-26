/** @format */

import { readStoreSnapshot, replaceStoreSnapshot } from "../../utils/localDb.mjs";

const START_DATE = "2026-06-07";

const explicitRewrites = new Map([
	[
		"p_1780086529874_p4s07j",
		{
			title: "Your Instincts Kept Notes",
			body: "A literary reflection on boundaries, self-trust, and emotional clarity.",
		},
	],
	[
		"p_1780086513904_20js2t",
		{
			title: "You Can Choose Calm Now",
			body: "A quiet illustrated book about boundaries, safety, and knowing what no longer needs your energy.",
		},
	],
	[
		"p_1779678458124_lwgzc7",
		{
			title: "This Hoodie Understands Creative Chaos",
			body: "Goblin-core comfort apparel for chaotic introverts trying very hard to stay cozy and slightly mysterious.",
		},
	],
	[
		"p_2026R_0102",
		{
			title: "Low Energy Coloring Page (One Small Step)",
			body: "A printable coloring page for slow days, tiny wins, and choosing one manageable thing.",
		},
	],
	[
		"p_1778571846815",
		{
			title: "My Self-Care System Should Concern Several Agencies",
			body: "Current routine: coping potions, chaos snacks, questionable decisions, and pretending this counts as personal growth.",
		},
	],
	[
		"p_1780086521005_0z1eo3",
		{
			title: "You Can Choose Calm Now",
			body: "A quiet illustrated book about boundaries, self-respect, and putting down what was never yours to manage.",
		},
	],
	[
		"p_2026R_0142",
		{
			title: "Still Learning. Still Trying.",
			body: "Messy progress still counts.",
		},
	],
	[
		"p_2026R_0115",
		{
			title: "Anxiety Reset Printable (Calm Is Progress)",
			body: "For the days when nothing went wrong and that already feels like a win. Relatable goblin printable for grounding and calm.",
		},
	],
	[
		"p_2026R_0129",
		{
			title: "You Deserve A Little Treat (Yes, You)",
			body: "Handling a weird day counts. Treat yourself accordingly.",
		},
	],
	[
		"p_2026R_0099",
		{
			title: "Low Energy Coloring Page (Some Days This Is Enough)",
			body: "If all you did today was one tiny thing, that counts. Printable goblin-style coloring page for slow days and quiet wins.",
		},
	],
	[
		"p_2026R_0103",
		{
			title: "Motivational Quote Printable (But Actually Honest)",
			body: "Not rise and grind. More like you handled the chaos and that counts. A realistic motivational printable for people tired of fake positivity.",
		},
	],
	[
		"p_2026R_0120",
		{
			title: "Moving Slowly Is Not Failure",
			body: "If you are tired, slowing down can be strategy, not failure.",
		},
	],
	[
		"p_2026R_0101",
		{
			title: "Goblin Core Affirmation Coloring Page (Soft but Real)",
			body: "Not toxic positivity. Just real goblin energy for people doing their best in messy ways.",
		},
	],
	[
		"p_2026R_0100",
		{
			title: "Burnout Reset Printable (Low Energy Days Count)",
			body: "For the days when doing less was the practical choice. Relatable goblin-core printable for low-energy humans.",
		},
	],
	[
		"p_2026R_0116",
		{
			title: "Goblin Core Affirmation (Peaceful Chaos Edition)",
			body: "Soft, quiet, slightly feral calm. A cozy goblin-core printable for people choosing not to spiral today.",
		},
	],
	[
		"p_2026R_0130",
		{
			title: "You Handled More Chaos Than Expected",
			body: "That deserves kindness, snacks, and fewer unrealistic expectations.",
		},
	],
]);

const replacements = [
	[/survived things no one saw/gi, "handled more chaos than expected"],
	[/you survived/gi, "you handled the chaos"],
	[/surviving hard things/gi, "handling weird days"],
	[/surviving today/gi, "getting through today"],
	[/surviving creatively/gi, "creating through the chaos"],
	[/surviving on/gi, "running on"],
	[/survive capitalism/gi, "handle adulting"],
	[/survive/gi, "handle"],
	[/surviving/gi, "handling"],
	[/survival strategy/gi, "chaos strategy"],
	[/survival plan/gi, "summer plan"],
	[/survival energy/gi, "goblin energy"],
	[/survival wins/gi, "quiet wins"],
	[/survival/gi, "chaos strategy"],
	[/trauma recovery/gi, "clarity and boundaries"],
	[/trauma/gi, "old patterns"],
	[/emotional wounds/gi, "old patterns"],
	[/hidden wounds/gi, "old patterns"],
	[/emotional scars/gi, "old lessons"],
	[/emotional damage/gi, "creative chaos"],
	[/emotional survival/gi, "goblin logistics"],
	[/depression support/gi, "low energy"],
	[/depression/gi, "low energy"],
	[/suicide/gi, "crisis"],
	[/self[- ]?harm/gi, "crisis"],
	[/eating disorders?/gi, "wellness concerns"],
	[/substance abuse/gi, "wellness concerns"],
	[/healing journey/gi, "self-care system"],
	[/healing through/gi, "working through"],
	[/healing can look like/gi, "growth can look like"],
	[/healing/gi, "growth"],
	[/recovery info/gi, "reset info"],
	[/recovery details/gi, "reset details"],
	[/anxiety recovery/gi, "anxiety reset"],
	[/burnout recovery/gi, "burnout reset"],
	[/recovery/gi, "reset"],
	[/crisis content/gi, "sensitive content"],
	[/the crisis ended first/gi, "the chaos ended first"],
	[/crisis/gi, "chaos"],
	[/pain/gi, "confusion"],
	[/barely hanging on/gi, "running on fumes"],
	[/nobody would notice/gi, "the details got missed"],
	[/you.?re still here/gi, "one small step counts"],
	[/still fighting/gi, "still trying"],
	[/body kept the receipts/gi, "instincts kept notes"],
	[/nervous system awareness/gi, "self-trust"],
	[/nervous system/gi, "instincts"],
	[/you can rest now/gi, "you can choose calm now"],
	[/finally stops bracing/gi, "finally gets a quiet minute"],
	[/finally allowing yourself to rest/gi, "finally choosing a quieter standard"],
	[/putting down what was never yours to carry/gi, "putting down what was never yours to manage"],
];

function hasPinterestTarget(post) {
	return (
		(post.platforms || []).map(String).includes("pinterest") ||
		(post.targets || []).some(
			(target) => String(target?.platform || "").toLowerCase() === "pinterest",
		)
	);
}

function isFuturePinterest(post) {
	return (
		String(post.status || "").toLowerCase() === "approved" &&
		hasPinterestTarget(post) &&
		String(post.scheduledAt || post.scheduled_at || "").slice(0, 10) >= START_DATE
	);
}

function rewriteText(value) {
	let next = String(value || "");
	for (const [pattern, replacement] of replacements) {
		next = next.replace(pattern, replacement);
	}
	return next;
}

const snapshot = await readStoreSnapshot();
const changed = [];
const posts = snapshot.posts.map((post) => {
	if (!isFuturePinterest(post)) return post;

	const rewrite = explicitRewrites.get(post.id);
	const next = { ...post, metadata: { ...(post.metadata || {}) } };
	const before = {
		title: next.title || "",
		body: next.body || "",
		description: next.description || "",
		metadataDescription: next.metadata.description || "",
	};

	if (rewrite) {
		next.title = rewrite.title;
		next.body = rewrite.body;
		if (next.description) next.description = rewrite.body;
		if (next.metadata.description) next.metadata.description = rewrite.body;
	} else {
		next.title = rewriteText(next.title);
		next.body = rewriteText(next.body);
		next.description = rewriteText(next.description);
		if (next.metadata.description) {
			next.metadata.description = rewriteText(next.metadata.description);
		}
	}

	const after = {
		title: next.title || "",
		body: next.body || "",
		description: next.description || "",
		metadataDescription: next.metadata.description || "",
	};

	if (JSON.stringify(before) !== JSON.stringify(after)) {
		next.updatedAt = new Date().toISOString();
		changed.push({
			id: next.id,
			scheduledAt: next.scheduledAt,
			before: before.title,
			after: after.title,
		});
	}

	return next;
});

await replaceStoreSnapshot({
	posts,
	postedLog: snapshot.postedLog,
	rejections: snapshot.rejections,
});

console.log(JSON.stringify({ changed: changed.length, posts: changed }, null, 2));
