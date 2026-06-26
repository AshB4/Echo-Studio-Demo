import { initLocalDb, readStoreSnapshot, createPost } from "../../utils/localDb.mjs";
import { findContentDuplicate, findDuplicatePost } from "../../utils/queueGuard.mjs";

const id = "p_20260629_devto_ai_dangerous_01";
const scheduledAt = "2026-06-29T15:00:00.000Z";
const title = "AI Didn't Make Me Lazy. It Made Me Dangerous.";
const tags = ["ai", "productivity", "buildinpublic", "webdev"];
const mediaPath = "frontend/assets/devto/INputChooseAct.png";
const gumroadLink = "https://fleurdevie.gumroad.com/l/100prompt-storm";

const body = `# AI Didn't Make Me Lazy. It Made Me Dangerous.

Every time I hear someone say AI is making developers lazy, I laugh.

Not because they're completely wrong.

Because my experience has been the exact opposite.

AI didn't make me lazy.

It made me dangerous.

## The Problem Was Never Ideas

I've always had ideas.

Too many ideas, honestly.

Stories.

Books.

Automation tools.

Apps.

Side projects.

Business ideas.

Marketing experiments.

For years, most of them ended up in one of three places:

* abandoned
* half-finished
* buried in a notebook somewhere

Not because I didn't care about them.

Because there are only so many hours in a day.

I could imagine faster than I could build.

## Before AI

Before AI, my process looked something like this:

Get excited about an idea.

Start building.

Hit a roadblock.

Research.

Rewrite.

Research again.

Get distracted by another idea.

Repeat.

Some projects survived.

A lot didn't.

I used to write stories and poetry.

I started books I never finished.

I built prototypes that never became products.

Not because the ideas were bad.

Because execution takes time.

And time is expensive.

## Then Something Changed

The first thing AI changed wasn't my code.

It was my momentum.

Suddenly I could:

* prototype in hours instead of weeks
* explore ideas faster
* debug faster
* write faster
* organize my thoughts faster

I wasn't spending all my energy fighting blank pages anymore.

I could focus on building.

For the first time, my execution speed started getting closer to the speed of my ideas.

That's when things got interesting.

## The AI Guru Problem

One funny side effect of all this is watching AI productivity videos.

Sometimes I watch them and think:

"Yeah, I've been doing that for years."

Other times I watch them and immediately steal the idea.

Some of those creators have genuinely improved how I work.

But the biggest realization wasn't learning a specific trick.

It was realizing I finally had leverage.

## The Output Difference Is Ridiculous

I've written books in a weekend.

I've written one in a day.

I've created over a hundred content assets in a single session.

I've built prototypes that would've taken me months a few years ago.

And here's the important part:

The ideas were already there.

AI didn't give me the ideas.

It gave me the ability to execute them.

## The Real Superpower

People think AI is about generating content.

For me, it's about reducing friction.

The biggest benefit isn't code generation.

It's organization.

It's helping me gather scattered thoughts.

It's helping me turn rough concepts into plans.

It's helping me finish things.

That's the part nobody talks about enough.

Finishing matters.

Ideas are everywhere.

Finished projects are rare.

## If AI Disappeared Tomorrow

I'd survive.

I'd still build things.

I'd probably paint more.

Maybe crochet.

Maybe go back to filling notebooks with half-finished ideas.

But I'd miss the partnership.

I'd miss having something that helps me organize chaos.

I'd miss the momentum.

Most of all, I'd miss finishing projects at the rate I've become used to.

## Final Thought

AI didn't make me creative.

I was creative before AI.

AI didn't give me ideas.

I had plenty of those already.

What AI gave me was leverage.

For the first time in my life, my ability to execute started catching up with my imagination.

And that's why I don't feel less capable because of AI.

I feel more capable.

A lot more.

Which is exactly why it feels dangerous.

## P.S.

If you're trying to turn a pile of ideas into actual finished posts, I built a prompt pack for that exact kind of momentum:

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
