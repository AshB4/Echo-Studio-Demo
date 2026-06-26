import { initLocalDb, readStoreSnapshot, createPost } from "../../utils/localDb.mjs";
import { findContentDuplicate, findDuplicatePost } from "../../utils/queueGuard.mjs";

const id = "p_20260713_devto_motivation_systems_01";
const scheduledAt = "2026-07-13T15:00:00.000Z";
const title = "I Thought I Needed More Motivation. I Actually Needed Better Systems.";
const tags = ["productivity", "automation", "career", "buildinpublic"];
const mediaPath = "frontend/assets/devto/Chaos2clarity.png";

const body = `# I Thought I Needed More Motivation. I Actually Needed Better Systems.

For a long time, I thought my problem was motivation.

I thought I needed more discipline.

More willpower.

More consistency.

More grit.

The internet certainly seemed convinced that was the answer.

Every productivity video felt like some variation of:

"Wake up earlier."

"Want it more."

"Work harder."

"Stay disciplined."

So naturally, I blamed myself whenever I wasn't making progress.

Then I noticed something.

Some days I was incredibly productive.

Other days I got almost nothing done.

The difference wasn't motivation.

The difference was friction.

## Motivation Is A Terrible Dependency

Motivation is great when it shows up.

The problem is that it doesn't always show up.

Some days you're excited.

Some days you're tired.

Some days you're distracted.

Some days you'd rather do literally anything else.

If your entire system depends on motivation, eventually the system fails.

Not because you're lazy.

Because you're human...Yes, we are allowed to be human.

## The Job Application Problem

Job hunting taught me this lesson better than anything else.

I've applied to a ridiculous number of jobs over the years.

And every application seemed to ask for the same information.

Upload resume.

Re-enter resume.

Answer questions.

Repeat.

At first I relied on motivation.

Eventually I realized motivation wasn't the bottleneck.

The process was.

The more friction I removed, the easier it became to keep going.

## The Content Problem

The same thing happened with content creation.

I don't mind creating.

I actually enjoy it.

What I hate is repetitive posting.

Copy.

Paste.

Upload.

Repeat.

Every platform.

Every day.

That's not creativity.

That's data entry.

Once I started building systems to handle the repetitive parts, I spent more time creating and less time maintaining.

## The Myth Of Consistency

People often talk about consistency as if it's a personality trait.

I don't think it is.

I think consistency is often the result of good systems.

A bad system requires constant effort.

A good system reduces effort.

One depends on motivation.

The other survives without it.

## The Real Goal

The goal isn't to become a productivity machine.

The goal is to make the right thing easier.

When something important depends entirely on my mood, I know the system is broken.

When the process keeps moving even on low-energy days, I know the system is improving.

That's the difference.

## What Changed For Me

Once I stopped chasing motivation and started building systems, things got easier.

Not perfect.

Just easier.

Projects moved forward more consistently.

Content got published more consistently.

Job applications happened more consistently.

The work didn't disappear.

The friction did.

And that turned out to matter far more than motivation ever did.

## Final Thought

I still like motivation.

It's fun when it shows up.

But I don't trust it anymore.

Motivation is a bonus.

Systems are infrastructure.

And if I have to choose between feeling motivated and having a system that works?

I'll take the system every time.
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
		},
		null,
		2,
	),
);
