# Manual Content Workflow

This workflow defines the Phase 1 manual process for using PostPunk AI tooling without changing production code.

The operating model is:

```text
Content Idea
-> Draft Generation
-> Taste Skill Voice Pass
-> Stop Slop Validation
-> Human Review
-> Scheduling
-> Publishing
```

## Scope

Use this workflow for manually prepared posts, platform variants, article drafts, affiliate content, and campaign snippets before they enter the PostPunk queue.

This workflow does not automate generation, validation, queue writes, scheduling, or publishing. It defines the human-run process that future tooling should preserve.

## Step 1 - Content Idea

Purpose:

- Capture the seed idea before generation changes its shape.
- Decide whether the idea belongs in PostPunk as a seed, fragment, note, experiment, article, syndicated item, refreshed item, or archived item.
- Identify the platform lane before drafting.

Required inputs:

- Working title or one-sentence concept.
- Target platform or platforms.
- Intended audience.
- Product, campaign, or canonical source, if any.
- Desired outcome, such as save, share, click, reply, subscribe, or purchase.
- Any known constraints, such as seasonal timing, Reddit community rules, affiliate disclosure, or DEV article expectations.

Expected outputs:

- A short content brief.
- Initial platform target list.
- Draft status: `idea` or `seed`.
- Owner decision on whether this item should become a queue candidate.

Approval checkpoint:

- Human confirms the idea is worth drafting and has a clear lane.

## Step 2 - Draft Generation

Purpose:

- Turn the approved content idea into a usable first draft.
- Generate platform-specific variants only when each platform has a reason to exist.

Required inputs:

- Approved content brief.
- Platform profile or prompt guidance from `docs/prompts4echo/`.
- Product profile, campaign angle, or source article when relevant.
- Any required links, media, alt text, disclosure language, or tags.

Expected outputs:

- Base draft.
- Optional platform variants for Facebook, LinkedIn, DEV, Pinterest, Reddit, Ko-fi, or another lane.
- Proposed headline, first line, CTA, hashtags, and media concept when needed.
- Notes about assumptions made during generation.

Approval checkpoint:

- Human checks that the draft answers the brief and is not being stretched across platforms that do not fit.

## Step 3 - Taste Skill Voice Pass

Purpose:

- Make the draft sound like PostPunk/Ash instead of generic AI copy.
- Preserve platform fit while keeping the voice recognizable.
- Prepare future Taste Skill training by using the style files in `content/style/`.

Required inputs:

- Generated draft.
- Relevant style guide from `content/style/`.
- Platform-specific voice notes.
- Known examples of strong prior posts, when available.

Expected outputs:

- Voice-adjusted draft.
- Notes about style decisions, such as tone, pacing, formatting, or phrases preserved.
- Any missing style evidence that should be added to `content/style/`.

Approval checkpoint:

- Human confirms the draft still sounds like the brand and still fits the platform.

## Step 4 - Stop Slop Validation

Purpose:

- Catch AI tells, repeated structures, weak phrasing, banned phrases, and formatting issues before the draft reaches the queue.
- Keep repetitive hooks and endings from accumulating across campaigns.

Required inputs:

- Voice-adjusted draft.
- Stop Slop rules from `tools/stop-slop/`.
- Recent posts from the same product, campaign, or platform when checking repetition.

Expected outputs:

- Validation notes.
- Pass/fail result.
- Revised draft if issues are found.
- List of unresolved concerns for human review.

Approval checkpoint:

- Human confirms the draft passes or explicitly accepts the remaining risk.

## Step 5 - Human Review

Purpose:

- Make the final editorial, platform, compliance, and scheduling decision.
- Prevent automation from confusing "technically valid" with "worth publishing."

Required inputs:

- Stop Slop validated draft.
- Media asset or media prompt, if required.
- Platform-specific metadata.
- Disclosure and link requirements.
- Scheduling context and queue density.

Expected outputs:

- Final approved copy.
- Final targets.
- Final media, alt text, tags, links, and disclosure text.
- Decision: approve, revise, recycle, or reject.

Approval checkpoint:

- Human sets the content to ready for scheduling only after copy, target, and timing checks pass.

## Step 6 - Scheduling

Purpose:

- Add the reviewed item to the PostPunk queue with enough metadata for the worker and future analytics.

Required inputs:

- Approved post copy.
- Target platform or account list.
- Scheduled date and time.
- Media path and alt text, if used.
- Product, campaign, lifecycle, and discoverability metadata.

Expected outputs:

- Queue item in PostPunk.
- Status set according to readiness.
- If ready for worker processing, status should be `approved`.
- If still awaiting assets or review, status should remain `draft` or another non-publishable state.

Approval checkpoint:

- Human verifies scheduled time, target accounts, media, and status before relying on the worker.

## Step 7 - Publishing

Purpose:

- Let the existing PostPunk worker publish approved due posts through the proven lanes.
- Keep manual fallback available for cautious or experimental lanes.

Required inputs:

- Queue item with publishable status.
- Healthy account credentials.
- Active platform configuration.
- Worker schedule or manual worker run.

Expected outputs:

- Published post or recorded failure.
- Archive/history entry.
- Retry, defer, or manual recovery task if publishing fails.
- Telegram or operational alert when configured.

Approval checkpoint:

- Human checks `/today`, `/archive`, logs, or platform output after publish windows for important campaigns.

## Manual Workflow Rules

- Do not publish directly from generation output.
- Do not mark an item `approved` until Taste Skill, Stop Slop, and human review are complete.
- Do not treat every platform variant as required. Each lane needs its own reason.
- Do not use queue JSON mirrors as primary editing targets.
- Keep Reddit and other cautious lanes in manual review unless a future implementation explicitly changes that rule.
- Keep article, portfolio, and RSS workflows separate from normal short-form queue dispatch.

## Minimum Checklist Before Scheduling

- The idea has a clear lane and purpose.
- The draft has passed a voice pass.
- Stop Slop issues are resolved or explicitly accepted.
- The CTA fits the platform.
- Links and disclosures are correct.
- Media and alt text are ready where required.
- Scheduled time does not create a queue density or repetition problem.
- Status reflects actual readiness.
