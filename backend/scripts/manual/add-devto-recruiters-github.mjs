import { initLocalDb, readStoreSnapshot, createPost } from "../../utils/localDb.mjs";
import { findContentDuplicate, findDuplicatePost } from "../../utils/queueGuard.mjs";

const id = "p_20260615_devto_github_recruiters_01";
const scheduledAt = "2026-06-15T15:00:00.000Z";
const title = "What Recruiters Can't See On My GitHub";
const tags = ["github", "career", "webdev", "automation"];
const mediaPath = "frontend/assets/devto/IDeasPostsPins.png";

const body = `# What Recruiters Can't See On My GitHub

If you spend about 30 seconds looking at my GitHub profile, you might think I'm all over the place.

React.

Python.

Healthcare.

AI.

Scrapers.

Automation.

Marketing tools.

Job bots.

Honestly, that's something I've worried about.

I have over 100 repositories. Recruiters can see most of them, but not all of them. Some are private because they're client work. Some are private because they're unfinished. Some are private because they contain ideas I've spent years developing and I'm not quite ready to throw the blueprints onto the internet.

From the outside, it can look random.

But recently I realized something.

All of those projects are solving the same problem.

I hate repetitive work.

My GitHub is here: https://github.com/ashb4

## The Job Application That Broke Me

I've applied to thousands of jobs over the years.

Thousands.

And one thing has always driven me absolutely insane.

You upload your resume.

Then the company immediately asks you to type your entire resume into fifteen different boxes.

Your work history.

Your education.

Your skills.

Everything.

The computer already has the information.

The resume is right there.

Yet somehow I'm sitting on page seven of an application retyping information that already exists.

It feels inefficient.

It feels stupid.

And most of all, it feels like a waste of time.

Eventually I got annoyed enough to start building tools to help.

## Then I Noticed a Pattern

At first I thought I was building unrelated projects.

A job application helper.

A content scheduler.

A healthcare platform.

An AI framework.

A browser automation system.

But when I stepped back, I noticed the same motivation behind almost all of them.

Every project started with some version of:

"There has to be a better way to do this."

Take PostPunk.

Most people see a social media scheduler.

I see hours of repetitive posting that I never want to do again.

I like creating content.

I do not like manually posting the same content everywhere.

So I built a system where I can create when I'm feeling creative, queue everything up, and let the system handle the repetitive parts later.

Create once.

Reuse many times.

That's a pattern you'll see all over my GitHub.

## The Projects Aren't Random

One recruiter might see:

* PostPunk
* Orchestrator
* BoxerLogic
* Healthcare applications
* Scrapers
* Automation tools

and think:

"These don't seem related."

I'd argue they're incredibly related.

They're all attempts to reduce repetitive human effort.

Different domains.

Same obsession.

Some developers love graphics.

Some love databases.

Some love distributed systems.

I seem to be drawn toward removing friction.

If something feels repetitive enough, eventually I start asking myself whether a computer should be doing it instead.

## The AI Question

People sometimes assume that because I use AI, the projects are somehow doing all the work for me.

The reality is less exciting.

AI helps.

But AI is not magic.

I've found that the hardest part isn't generating code.

It's understanding workflows.

Understanding edge cases.

Understanding what people are actually trying to accomplish.

The code is often the easy part.

The thinking is the hard part.

That's true whether you're building a healthcare platform, a job application tool, or an automation system.

## What I Hope Recruiters Actually See

I don't expect recruiters to inspect all 100+ repositories.

Nobody has time for that.

But if they do look at my GitHub, I hope they don't see a collection of random technologies.

I hope they see a systems thinker.

Someone who gets annoyed by repetitive work.

Someone who enjoys finding patterns.

Someone who likes building tools that save people time.

Because when I look at my repositories, that's what I see.

Not 100 separate projects.

Just one idea repeated over and over:

If a task is repetitive enough, there's probably a better way to do it.

And sooner or later, I'm probably going to try building it.
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
