# Mission

Echo Studio is an AI Marketing Operations platform. Its root object is the Mission.

A Mission begins with a business goal, such as launching a book, promoting a restaurant weekend, running a seasonal sale, or marketing a consulting offer. Every plan, generated asset, review decision, publishing job, notification, and analytics result should trace back to a Mission.

## Purpose

Mission gives Echo Studio a durable business-objective layer above individual posts. Posts remain useful execution artifacts, but they are not the product's center of gravity.

The Mission owns:

- the user's goal
- audience and offer context
- timing constraints
- channel intent
- success criteria
- lifecycle state
- relationships to future planning, knowledge, assets, review, publishing, and analytics records

## Lifecycle

Mission statuses are:

- `draft`
- `intake_complete`
- `planning`
- `planned`
- `generating_assets`
- `assets_ready`
- `in_review`
- `approved`
- `publishing`
- `live`
- `completed`
- `paused`
- `failed`
- `archived`

The lifecycle is intentionally broader than a post lifecycle. A Mission can be planned before any assets exist, reviewed before publishing starts, and completed after analytics or operator review.

## Relationships

A Mission will eventually own or link to:

- `KnowledgeContext`: product knowledge, brand rules, platform rules, performance memory, and marketing playbook evidence used before AI reasoning.
- `CampaignPlan`: the strategic plan for channels, messages, timing, and asset requirements.
- `CampaignAsset`: concrete outputs such as posts, email copy, ad copy, image prompts, or landing page copy.
- `ReviewDecision`: human approvals, rejections, and requested changes.
- `PublishingJob`: scheduled or executed publishing/export work.
- Analytics and learnings: results that improve future missions.

## Why Mission Is The Root Object

Echo Studio is not a social media scheduler. A solo creator or small business owner does not start with a post; they start with a business goal.

Mission keeps the system aligned with that goal while allowing the current PostPunk queue and publishing infrastructure to continue operating underneath it. During the incremental migration, CampaignAssets can be adapted into existing post records. That preserves existing calendar, queue, worker, archive, and platform behavior while new Mission-first workflows are introduced beside them.

## Phase 1 Storage

The initial implementation uses an in-memory Mission store. No database, Prisma, or SQLite schema changes are part of Phase 1.

Future persistence should be added after the Mission contract stabilizes.

