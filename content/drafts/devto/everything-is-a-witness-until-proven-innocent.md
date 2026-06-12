---
title: "Everything Is a Witness Until Proven Innocent"
platform: "dev.to"
status: "draft"
type: "build-in-public"
project: "PostPunk"
tags:
  - debugging
  - automation
  - javascript
  - buildinpublic
canonical: ""
notes: "Drafted from PostPunk automation debugging / Facebook duplicate post / observability lesson. Keep as draft until cover image, tags, and final polish are ready."
created: "2026-06-12"
---

# Everything Is a Witness Until Proven Innocent

I opened Facebook and discovered I'd apparently decided to become my own spam bot.

Two identical posts.

Same image.

Same text.

Same link.

My first thought wasn't:

> *Oh no. What will people think?*

It was:

> *Which one of you little bastards did this?*

Everything was immediately a suspect.

The scheduler.

The retry logic.

Facebook.

The API.

My own code.

Everything was a witness until proven innocent.

When you're building your own tools, this becomes a habit. You stop accepting "because" as an explanation.

You interrogate.

What changed?

What assumption failed?

Did the code actually run twice?

Did the API retry?

Did Facebook lie to me?

Did I accidentally create a duplicate?

Did I break something trying to fix something else?

The funny part is that the duplicate Facebook posts weren't caused by some mysterious bug hiding in the shadows.

I was trying to solve what I thought should be a very normal problem.

I wanted a post published to my Facebook Page to also make its way to my personal profile.

Reasonable, right?

Facebook's APIs disagreed.

The more I dug into it, the more I realized I wasn't debugging broken code. I was negotiating with someone else's constraints.

Sometimes the problem isn't technical.

Sometimes it's architectural.

Sometimes the platform simply doesn't support the workflow you assumed it would.

And sometimes you spend an embarrassing amount of time interrogating innocent code because you had the wrong mental model.

That lesson showed up elsewhere too.

Pinterest wasn't "broken."

I kept rewriting my own posting logic because my definition of success kept changing.

First I wanted random.

Then I wanted variety.

Then I wanted product rotation.

Then I wanted to prevent clumping.

Every time I thought I'd solved it, I realized I'd changed my mind about what "good" actually looked like.

The code wasn't unstable.

My expectations were evolving.

What surprised me most wasn't how often things failed.

It was how much relief I got from seeing a simple success notification.

A Telegram message saying:

> Facebook: Success.

or

> Pinterest: Success.

shouldn't make me as happy as it does.

But it does.

Because before that notification, my brain can invent a hundred possible disasters.

Did it fail?

Did it duplicate?

Did I break something?

Did the scheduler go rogue?

Did the platform silently reject it?

Then I see the notification.

Reality matches expectation.

I don't have to investigate this one.

The anxiety quiets down.

I trust evidence more than reassurance.

That's probably the real lesson.

If another developer told me their scheduler was acting weird and they were ready to rewrite everything from scratch, I'd tell them:

Before you tear apart your code, make sure your system tells the truth.

Log failures.

But log successes too.

Know what retried.

Know what duplicated.

Know what actually happened.

Because if you can't trust your observability, you're interrogating a witness that keeps changing its story.

I don't mind doing hard things.

I don't mind debugging.

I don't even mind interrogating code until it confesses.

What I mind is doing the same repetitive thing after I've already learned the lesson.

The goal of automation was never to automate creativity.

It wasn't to remove me from the process.

It was to buy back enough attention to spend it on things that actually matter: building, writing, experimenting, and coming up with terrible new ideas that might accidentally turn into good ones.

So these days, when something weird happens, I don't immediately assume I know who's guilty.

I gather evidence.

I revise my assumptions.

I interrogate the witnesses.

The scheduler.

The API.

The platform.

The logs.

Even myself.

Everything is a witness until proven innocent.
