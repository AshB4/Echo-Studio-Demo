import { initLocalDb, readStoreSnapshot, createPost } from "../../utils/localDb.mjs";
import { findContentDuplicate, findDuplicatePost } from "../../utils/queueGuard.mjs";

const id = "p_20260622_devto_content_automation_goblins_01";
const scheduledAt = "2026-06-22T15:00:00.000Z";
const title = "I Started Automating Content and Discovered I Had No Idea What People Wanted";
const tags = ["marketing", "automation", "productivity", "buildinpublic"];
const mediaPath = "frontend/assets/devto/Chaos2clarity.png";
const gumroadLink = "https://fleurdevie.gumroad.com/l/goblin-core-coloring-affirmations";

const body = `# I Started Automating Content and Discovered I Had No Idea What People Wanted

I originally thought I was building a scheduler.

I wasn't.

I just didn't know it yet.

Like a lot of developers, I have more ideas than time.

Coloring books.

Digital products.

Experiments.

Tools.

Projects that seemed brilliant at 2 AM and questionable by lunchtime.

The problem wasn't coming up with ideas.

The problem was getting anyone to see them.

So I started building what eventually became PostPunk.

At first, the goal was simple:

Create content.

Schedule content.

Post content.

Hopefully sell something.

Easy, right?

Yeah. Not even close.

## I Thought Posting Was the Problem

My assumption was that marketing failed because I wasn't posting enough.

That seemed logical.

If nobody sees your stuff, post more.

If posting takes too much time, automate it.

Problem solved.

So I started building tools to help with scheduling, queues, publishing, and content management.

The engineering part made sense.

The marketing part did not.

## Then I Learned Every Platform Wants Something Different

Pinterest isn't Facebook.

Facebook isn't LinkedIn.

LinkedIn isn't Dev.to.

Every platform has its own weird personality.

Pinterest wants visuals.

LinkedIn wants insights.

Dev.to wants stories.

And the same piece of content can perform completely differently depending on where it lands.

I thought I was building a posting engine.

Instead, I accidentally started studying platform behavior.

Then audience behavior.

Then content behavior.

Then discoverability.

The scheduler became one small piece of a much larger problem.

## The Audience Kept Proving Me Wrong

This was probably the most humbling lesson.

I thought I knew what people would like.

I was wrong.

Repeatedly.

I'd spend time on something I thought was clever.

Nothing.

Then I'd post something weird and watch it take off.

Which brings us to the goblins.

## The Goblin Chaos

One of my strangest content experiments involved chaotic goblin-themed humor.

If I'm being honest, I wasn't sure anyone would care.

It was weird.

A little niche.

Definitely not something I expected to outperform more practical ideas.

Then people started clicking.

Saving.

Sharing.

Engaging.

My first reaction wasn't:

"I have successfully validated a market opportunity."

My first reaction was:

"Well shit... that was unexpected."

The goblin content wasn't just getting attention.

People actually liked it.

That surprised me because it felt so specific and strange.

But it also taught me something important.

The audience doesn't care what I think should work.

The audience decides what works.

## The Scheduler Was Never The Product

Looking back, the scheduler wasn't the interesting part.

The interesting part was learning.

Learning what people click.

Learning what people ignore.

Learning what gets shared.

Learning how often my assumptions are wrong.

I started this project because I wanted to automate content distribution.

What I ended up building was a feedback loop.

A system that constantly reminds me:

You are not your audience.

And that's probably a good thing.

## The Unexpected Lesson

The biggest surprise wasn't that automation helped.

It did.

The biggest surprise was discovering how bad I am at predicting winners.

Some of my favorite ideas went nowhere.

Some of the weirdest ideas found an audience.

The goblins taught me that.

The analytics taught me that.

The clicks taught me that.

And honestly, that's probably the most valuable thing the entire project has given me.

Not automation.

Not scheduling.

Not publishing.

Humility.

Because every time I think I've figured out what people want, the internet finds a new way to prove me wrong.

And sometimes, thankfully, it does it with goblins.

## P.S. If You're Still Reading This...

And you're wondering:

"What the hell is goblin chaos?"

Fair question.

One of the biggest surprises from this whole experiment was discovering that some of my weirdest ideas resonated with people far more than the ones I thought would succeed.

What started as a strange creative experiment somehow turned into coloring books, digital products, memes, and an audience that seems to enjoy chaotic woodland nonsense as much as I do.

If you're curious about the goblins that helped teach me this lesson:

👉 [Goblin Core Coloring Affirmations on Gumroad](${gumroadLink})

Turns out the internet wanted more goblins.

I was as surprised as anyone.
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
		productProfileId: "goblin-coloring-affirmations",
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
