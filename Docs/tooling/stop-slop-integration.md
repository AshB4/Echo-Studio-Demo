# Stop Slop Integration Plan

This document defines how Stop Slop should eventually integrate into the PostPunk publishing pipeline.

No implementation is included in this phase.

## Purpose

Stop Slop should become a quality gate for content before scheduling and publishing. It should catch AI-sounding language, repeated structures, duplicate content, banned phrases, and formatting violations while leaving final editorial judgment with the operator.

## Target Pipeline Position

Stop Slop belongs after the Taste Skill voice pass and before human scheduling approval:

```text
Draft Generation
-> Taste Skill Voice Pass
-> Stop Slop Validation
-> Human Review
-> Scheduling
-> Publishing
```

It should not run as a replacement for human review. It should produce evidence for review.

## Phase 1 - Manual Validation

Manual validation means the operator runs a draft through Stop Slop rules before entering or approving a queue item.

Process:

- Generate or write the draft.
- Apply the relevant platform style guide from `content/style/`.
- Review the draft against `tools/stop-slop/SKILL.md`.
- Check phrases and structures in `tools/stop-slop/references/`.
- Revise until the draft passes or the operator accepts a specific exception.
- Record unresolved concerns in the draft notes when needed.

Best for:

- Early adoption.
- Sensitive posts.
- New platform lanes.
- Campaigns where voice consistency matters more than speed.

Expected output:

- Pass/fail decision.
- Short list of issues found.
- Revised final draft.

## Phase 2 - Semi-Automated Validation

Semi-automated validation means PostPunk or a helper script prepares a validation report, but a human still decides whether to schedule.

Possible workflow:

- Operator saves a draft in PostPunk or `content/drafts/`.
- A local command analyzes the draft against Stop Slop rules.
- The command produces a report with warnings and suggested review areas.
- The operator edits the draft manually.
- The operator approves scheduling only after warnings are cleared or accepted.

Potential integration points:

- Composer review action.
- Batch import staging.
- Today Ops recovery for failed or recycled content.
- Pre-scheduling checklist.
- Local CLI command for drafts in `content/drafts/`.

Expected output:

- Validation score or status.
- Warning categories.
- Matched phrases or structures.
- Repetition warnings compared with recent queue items.
- Suggested next action: revise, approve with exception, or reject.

## Phase 3 - Fully Automated Validation

Fully automated validation means PostPunk blocks or flags content based on Stop Slop results before the worker can publish it.

Possible workflow:

- Queue item is created or updated.
- Validation runs before status can become `approved`.
- Hard failures keep the item in `draft` or `needs_action`.
- Soft warnings allow approval only with an explicit override.
- Worker refuses to publish items with unresolved hard failures.

Potential integration points:

- Backend post create/update validation.
- Queue guard layer.
- Worker preflight before dispatch.
- Batch import approval flow.
- Platform-specific validation profiles.

Expected output:

- Stored validation status.
- Validation timestamp.
- Failure categories.
- Override reason, if human-approved.
- Audit trail for why a post was blocked or allowed.

## Failure States

### Duplicate Content

Definition:

- Draft is identical or too similar to a recent post, same campaign variant, or known published item.

Examples:

- Same body reused with a different title.
- Same product post recycled too soon.
- Platform variants differ only by hashtags.

Desired response:

- Manual phase: warn operator.
- Semi-automated phase: report similarity candidates.
- Fully automated phase: block approval unless an override is recorded.

### Repetitive Hooks

Definition:

- Opening lines repeat the same structure across multiple posts.

Examples:

- Repeated question hooks.
- Repeated "I made this because" framing.
- Repeated problem/solution opener in a campaign batch.

Desired response:

- Manual phase: revise opening.
- Semi-automated phase: compare against recent queue and archive.
- Fully automated phase: soft fail unless hook repetition exceeds a configured threshold.

### AI-Sounding Language

Definition:

- Draft contains formulaic phrasing, empty emphasis, vague claims, or narrator-from-a-distance voice.

Examples:

- Abstract claims without specific evidence.
- Generic motivational cadence.
- Performative transitions.

Desired response:

- Manual phase: revise using active, specific language.
- Semi-automated phase: flag likely AI tells.
- Fully automated phase: block only high-confidence or repeated patterns.

### Banned Phrases

Definition:

- Draft includes phrases listed in Stop Slop references or project-specific banned lists.

Examples:

- Throat-clearing openers.
- Generic business jargon.
- Emphasis crutches.
- Vague declaratives.

Desired response:

- Manual phase: remove or replace.
- Semi-automated phase: list exact matches.
- Fully automated phase: hard fail exact banned phrase matches unless platform-specific exception exists.

### Formatting Violations

Definition:

- Draft violates platform or PostPunk formatting expectations.

Examples:

- Too many hashtags.
- Dense unbroken paragraph.
- Missing required disclosure.
- Unsupported symbols or punctuation rules.
- Bad line breaks for platform readability.

Desired response:

- Manual phase: edit formatting before scheduling.
- Semi-automated phase: report platform-specific warnings.
- Fully automated phase: block required compliance failures, warn on style-only issues.

## Risk Notes

- Stop Slop should not flatten strong voice into sterile copy.
- A phrase match alone is not always a publishing risk.
- Platform-specific needs can conflict with generic writing rules.
- Fully automated blocking should start conservative.
- Similarity checks need access to recent queue and archive data to be useful.

## Adoption Recommendation

Start with manual validation for all AI-assisted drafts. Add semi-automated reports once failure categories stabilize. Move to automated queue blocking only after the team has reviewed enough false positives and agreed on hard-fail rules.
