import { initLocalDb, readStoreSnapshot, createPost } from "../../utils/localDb.mjs";
import { findContentDuplicate, findDuplicatePost } from "../../utils/queueGuard.mjs";

const id = "p_20260727_devto_ideas_attention_01";
const scheduledAt = "2026-07-27T15:00:00.000Z";
const title = "Ideas Are Cheap. Attention Is Expensive.";
const tags = ["productivity", "creativity", "buildinpublic", "webdev"];
const mediaPath = "frontend/assets/devto/INputChooseAct.png";
const gumroadLink = "https://fleurdevie.gumroad.com/l/100prompt-storm";

const body = `# Ideas Are Cheap. Attention Is Expensive.

For a long time, I thought ideas were valuable.

Now I think attention is.

Ideas are everywhere.

I have more ideas than I could build in ten lifetimes.

Apps.

Books.

Automation tools.

AI projects.

Business ideas.

Side projects.

Random notes scattered across notebooks and text files.

The older I get, the less impressed I am by ideas.

Because ideas are cheap.

Attention is expensive.

## The Problem Was Never Ideas

Whenever a project stalled, I used to think I needed a better idea.

Something more exciting.

More original.

More ambitious.

Then a funny thing would happen.

I'd get a new idea.

I'd be excited for a few days.

Then I'd discover the same problem.

The new idea still needed attention.

The new idea still needed effort.

The new idea still needed execution.

I wasn't solving the problem.

I was changing the scenery.

## New Ideas Feel Like Progress

This is the trap.

A new idea feels productive.

You can spend hours planning.

Researching.

Sketching.

Naming things.

Imagining features.

Your brain gets rewarded before you've built anything.

Meanwhile the current project is sitting in the corner wondering why you've abandoned it again.

Ask me how I know.

## Attention Is The Real Currency

I've started looking at projects differently.

When a new idea shows up, I don't ask:

"Is this a good idea?"

Most ideas are good enough.

Instead I ask:

"Does this deserve my attention right now?"

That's a much harder question.

Because attention is limited.

Every hour spent on a new project is an hour not spent improving an existing one.

Every new idea creates an opportunity cost.

## The Internet Taught Me This

Building content systems taught me something I didn't expect.

The bottleneck isn't content.

The bottleneck isn't ideas.

The bottleneck is attention.

My attention.

The audience's attention.

Everyone's attention.

There are more ideas than any of us could ever consume.

The challenge is deciding what deserves focus.

## What Changed For Me

I still collect ideas.

I'm never going to stop.

That's how my brain works.

But I don't treat every idea like an emergency anymore.

Most ideas can wait.

Some ideas should wait.

A few ideas deserve immediate attention.

Learning the difference has probably saved me more time than any productivity system I've ever built.

## Final Thought

Ideas feel valuable because they're exciting.

Attention feels ordinary because we spend it every day.

But if you gave me a choice between one great idea and six months of focused attention, I'd take the attention every time.

Ideas are abundant.

Execution is scarce.

And attention is the bridge between the two.

## P.S.

If you have too many ideas and need help turning the useful ones into actual publishable angles, I built a prompt pack around that problem:

👉 [100 Prompt Storm on Gumroad](${gumroadLink})
`;

await initLocalDb();
const { posts } = await readStoreSnapshot();

const post = {
	id,
	title,
	body,
	platforms: ["devto"],
	targets: [{ platform: "devto", accountId: null }],
	scheduledAt,
	status: "approved",
	hashtags: tags,
	tags,
	image: null,
	mediaPath,
	mediaType: "image",
	metadata: {
		approvalSource: "manual",
		requiresReview: false,
		distributionTags: ["post:devto"],
		source: "user-provided",
		productProfileId: "prompt-storm",
		productLinks: {
			gumroad: gumroadLink,
			primary: gumroadLink,
		},
		localCoverAsset: mediaPath,
		coverImageNote:
			"Dev.to API requires a public cover image URL; local asset kept for queue/preview.",
	},
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
};

if (posts.some((entry) => entry.id === id)) {
	console.log(JSON.stringify({ created: false, reason: "id_exists", id }, null, 2));
	process.exit(0);
}

const duplicate = findContentDuplicate(posts, post) || findDuplicatePost(posts, post);
if (duplicate) {
	console.log(
		JSON.stringify(
			{ created: false, reason: "duplicate", duplicateId: duplicate.id, id },
			null,
			2,
		),
	);
	process.exit(0);
}

await createPost(post);
console.log(
	JSON.stringify(
		{
			created: true,
			id,
			scheduledAt,
			title,
			tags,
			mediaPath,
			gumroadLink,
		},
		null,
		2,
	),
);
