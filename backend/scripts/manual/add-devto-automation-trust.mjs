import { initLocalDb, readStoreSnapshot, createPost } from "../../utils/localDb.mjs";
import { findContentDuplicate, findDuplicatePost } from "../../utils/queueGuard.mjs";

const id = "p_20260706_devto_automation_trust_01";
const scheduledAt = "2026-07-06T15:00:00.000Z";
const title = "Most Automation Tools Feel Impressive Right Up Until You Trust Them";
const tags = ["automation", "webdev", "productivity", "buildinpublic"];
const mediaPath = "frontend/assets/devto/DevRage.png";

const body = `# Most Automation Tools Feel Impressive Right Up Until You Trust Them

Automation is easy.

Trust is hard.

I can build a demo in an afternoon.

I can make a script work once.

I can record a video and make everything look magical.

The real challenge starts when I stop watching.

Because that's the moment automation becomes either useful or dangerous.

And I've learned those are very different things.

## The Demo Phase

Every automation project looks impressive during a demo.

Click button.

Thing happens.

Everyone claps.

You feel like a magical wizard.

The problem is that demos happen under perfect conditions.

You know exactly when to click.

The website hasn't changed.

The network isn't slow.

Nothing unexpected happens.

Real life is less cooperative.

## The First Time It Fails

The first failure is always educational.

Maybe a website changes.

Maybe a selector breaks.

Maybe an API times out.

Maybe a browser decides today is a great day to behave differently.

Suddenly the magical automation becomes a support ticket.

Now you're not building features.

You're debugging assumptions.

## Trust Changes Everything

When I'm actively watching an automation, failure isn't a big deal.

I can step in.

Fix it.

Restart it.

Move on.

But the moment I want to walk away?

Everything changes.

Now I care about:

* retries
* logging
* error handling
* recovery
* monitoring

The boring stuff.

The stuff nobody puts in YouTube thumbnails.

## The Bug That Changed My Perspective

One of my favorite bugs only appeared when I wasn't watching.

Seriously.

The automation worked when I monitored it.

The automation worked when I tested it.

The automation worked when I expected it to run.

Then it failed when left alone.

Those are the bugs that teach humility.

Because they force you to stop asking:

"Does it work?"

And start asking:

"Will it keep working?"

Those are very different questions.

## Reliability Is A Feature

I think a lot of developers underestimate this.

The most valuable automation isn't usually the smartest.

It's the one that quietly does its job every day.

No drama.

No intervention.

No surprises.

Just consistent execution.

That's what creates trust.

And trust is what creates value.

## What I Look For Now

Whenever I build automation today, I think less about features and more about confidence.

Can it recover?

Can it retry?

Can it explain what happened?

Can it fail safely?

Can I leave it alone for a week?

Those questions matter more than almost any feature request.

## Final Thought

Most automation tools look impressive the first time they run.

The real test comes six months later.

When you've forgotten about them.

When you're busy doing something else.

When you're depending on them.

That's when you discover whether you built a demo or a system.

And honestly?

The difference is trust.
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
