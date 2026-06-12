---
title: "The Platforms Didn't Break. My Mental Model Did."
platform: "dev.to"
status: "draft"
type: "build-in-public"
project: "PostPunk"
tags:
  - automation
  - debugging
  - javascript
  - buildinpublic
canonical: ""
notes: "Drafted as Article 2 after Everything Is a Witness Until Proven Innocent. Focus: platform assumptions, Facebook constraints, Pinterest rotation logic, and success logs."
created: "2026-06-12"
---

# The Platforms Didn't Break. My Mental Model Did.

I kept trying to treat every weird platform behavior like a bug.

Facebook posted something weird?

Bug.

Pinterest kept clumping the same type of content together?

Bug.

Telegram failed to send a notification?

Bug.

Something in my scheduler looked off?

Definitely bug.

That is my default setting as a developer.

When something behaves differently than expected, I start looking for the broken piece.

The problem is that sometimes the broken piece is not the code.

Sometimes it is the expectation.

## Facebook Wasn't Broken

The Facebook problem annoyed me the most because it felt like the kind of thing that should have been simple.

I had a Facebook Page.

I had a post.

I wanted that post to also reach my personal profile.

That feels like a normal human workflow.

A creator posts something on their Page and wants to share it personally.

Simple.

Reasonable.

Obvious.

Facebook's APIs did not care about my feelings.

The platform did not support the workflow the way I expected it to. So I started trying to figure out what was wrong with my system.

Was the code firing twice?

Was the retry logic weird?

Was something being triggered again?

Did I harden the Facebook posting flow and accidentally create a different problem?

Those were fair questions.

But eventually I had to admit something annoying.

Facebook wasn't broken.

My assumption about Facebook was.

I assumed the platform would support what seemed like an obvious creator workflow.

It did not.

That is a very specific kind of developer frustration: being able to see a workflow that makes sense, knowing the platform could allow it, and still not being able to build it cleanly because someone else's system says no.

That is not a bug in your code.

That is a boundary around someone else's product.

## Pinterest Was Different

Pinterest frustrated me too, but for a different reason.

With Facebook, I was fighting an external limitation.

With Pinterest, I was fighting my own definition of good.

At first, I just wanted posts to go out.

Then I wanted them to rotate better.

Then I wanted them to avoid clumping.

Then I wanted each post cycle to pull from a different product.

Then I realized that product variety was only part of the problem.

The real problem was that I kept changing what I wanted the system to optimize for.

Random is not the same as balanced.

Balanced is not the same as strategic.

Strategic is not the same as useful.

Useful is not the same as save-worthy.

Every time I rewrote the logic, I was not just fixing code.

I was refining the mental model.

That is where Pinterest is sneaky.

It is not really a traditional social platform.

It behaves more like visual search, future planning, and identity bookmarking smashed into one weird little machine.

So if I treat it like Facebook with taller images, I am already thinking about it wrong.

Pinterest does not just need content.

It needs distribution logic that respects how people actually use it.

That means avoiding clumps.

It means rotating products.

It means changing angles.

It means not shoving the same idea into the feed over and over just because I happen to be excited about it that day.

The code can only enforce the strategy I give it.

If the strategy changes, the code has to change too.

## The Code Wasn't Always the Problem

This was the part I had to sit with.

Sometimes the system was doing exactly what I told it to do.

I just no longer liked what I had told it.

That is humbling.

Because it is much easier to say:

> The algorithm is weird.

or

> The API is broken.

or

> My scheduler is acting up.

than it is to say:

> I designed this around an assumption I no longer agree with.

That is not failure.

That is iteration.

But it does mean I have to be careful about what I blame.

Sometimes the platform deserves the blame.

Sometimes the code deserves the blame.

Sometimes the logs need to be better.

And sometimes my mental model is the guilty little gremlin sitting in the corner eating crackers.

## Why Success Logs Matter

One thing I learned through all of this is that success logs matter almost as much as error logs.

A failure tells me where to investigate.

A success tells me I do not have to.

That sounds small, but it matters.

When I see a notification that says a Facebook post succeeded, I feel relief.

Not because I need applause from my own software.

Because it is evidence.

The system did what I expected.

Reality matched the model.

That tiny confirmation keeps me from spiraling into "what if everything broke and I just don't know it yet?"

Automation without feedback is just anxiety with a timer.

If the system is going to act on my behalf, it needs to report back clearly.

Not just when it fails.

When it works too.

## The Lesson

The longer I build PostPunk, the more I realize I am not just building posting tools.

I am building trust.

Trust that the queue knows what it is supposed to do.

Trust that the scheduler is not duplicating things.

Trust that Facebook succeeded or failed for a reason I can actually understand.

Trust that Pinterest rotation is not just random, but intentionally shaped.

Trust that when something breaks, I have enough evidence to know where to look first.

That is the difference between debugging code and debugging a system.

A system includes the code.

But it also includes APIs, platform rules, user expectations, product strategy, logs, anxiety, assumptions, and whatever weird thing Facebook decided to allow this week.

The platforms did not always break.

Sometimes my mental model did.

Fortunately, those can be debugged too.
