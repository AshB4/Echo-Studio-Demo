import { initLocalDb, readStoreSnapshot, createPost } from "../../utils/localDb.mjs";
import { findContentDuplicate, findDuplicatePost } from "../../utils/queueGuard.mjs";

const id = "p_20260720_devto_systems_builder_01";
const scheduledAt = "2026-07-20T15:00:00.000Z";
const title = "The Day I Realized I Wasn't Building Apps";
const tags = ["webdev", "automation", "productivity", "buildinpublic"];
const mediaPath = "frontend/assets/devto/IDeasPostsPins.png";

const body = `# The Day I Realized I Wasn't Building Apps

For years, I thought I was building apps.

That's what I called them anyway.

A scheduler.

A job bot.

A healthcare platform.

An AI project.

A content tool.

A browser automation system.

Looking at my GitHub, they seem completely unrelated.

Honestly, that's something I've worried about before.

I have over a hundred repositories.

If someone spends thirty seconds scrolling through them, I can imagine them thinking:

"Wow. This person is all over the place."

The funny thing is that I eventually realized the opposite was true.

My GitHub is here: https://github.com/ashb4

## The Scheduler That Wasn't A Scheduler

One of my projects started life as a simple scheduler.

That was the goal.

I hated posting content manually.

Open platform.

Paste content.

Upload image.

Repeat.

Again.

And again.

And again.

It felt repetitive.

It felt annoying.

Most of all, it felt like something a computer should be doing instead of me.

So I built a scheduler.

At least, that's what I thought I was building.

## Then Things Got Weird

The scheduler worked.

But now I needed content.

Then I needed analytics.

Then I needed to know what content was working.

Then I needed a way to track winners.

Then I needed a way to reuse content.

Then I needed platform-specific strategies.

At some point I looked up and realized I wasn't building a scheduler anymore.

I was building a system.

A system for discovering, creating, publishing, measuring, and improving content.

The scheduler was just one piece.

## Then I Started Looking At Everything Else

That's when I noticed the same thing happening in almost every project I'd ever built.

My job application tools weren't really job application tools.

They were systems designed to reduce repetitive effort.

My automation projects weren't really automation projects.

They were systems designed to reduce repetitive effort.

Even my AI projects weren't really about AI.

They were systems designed to reduce repetitive effort.

Different technologies.

Different domains.

Same obsession.

## The Pattern I Couldn't See

For a long time I thought I had a focus problem.

Too many ideas.

Too many projects.

Too many directions.

Then I started looking at the actual problems I was solving.

Almost all of them started with the same thought:

"This is stupid. There has to be a better way."

Job applications.

Content posting.

Data entry.

Decision making.

Workflow management.

The technology changed.

The frustration stayed the same.

## I Think I'm A Systems Builder

This realization changed how I think about my work.

When people ask what I build, I still usually undersell it.

I'll say:

"It's a scheduler."

Or:

"It's a content tool."

Or:

"It's an automation project."

Technically those answers are correct.

They're also incomplete.

Because what I'm usually building is a system.

A collection of tools, workflows, feedback loops, and automation working together to solve a problem.

The app is just the visible part.

## The Lesson

For a long time I thought my projects looked random.

Now I think they look consistent.

Not because they use the same technology.

Because they're all trying to solve the same problem.

Reducing repetitive human effort.

Helping people make decisions.

Creating systems that keep moving even when motivation disappears.

Once I saw that pattern, a lot of things suddenly made sense.

## Final Thought

I still build apps.

At least that's what I tell people.

But somewhere along the way I realized the apps were never the interesting part.

The interesting part was always the system behind them.

And once I saw that, I started understanding my own projects a lot better.

Maybe even myself.
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
		githubProfile: "https://github.com/ashb4",
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
