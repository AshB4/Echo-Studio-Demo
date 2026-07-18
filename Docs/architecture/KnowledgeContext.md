# KnowledgeContext

KnowledgeContext is the evidence packet Echo Studio supplies to AI before campaign planning or asset generation.

Echo Studio should not ask an AI model to reason from arbitrary data or generic assumptions. The system must first assemble the most relevant knowledge in a stable priority order, then pass that context into planning and generation.

## Purpose

KnowledgeContext makes AI reasoning auditable and product-aware.

It collects:

- Product Knowledge
- Brand Rules
- Platform Rules
- Previous Campaign Performance
- Marketing Playbook
- General Notes

Each section supports:

- `title`
- `content`
- `source`
- `priority`
- `lastUpdated`

The priority order is intentional. Product and brand truth should shape the campaign before platform tactics, performance memory, playbook suggestions, or general notes.

## Lifecycle

KnowledgeContext statuses are:

- `pending`
- `collecting`
- `ready`
- `stale`
- `failed`
- `archived`

`pending` means the object exists but evidence has not been collected.

`collecting` means retrieval or manual input is in progress.

`ready` means the context is safe to use for AI planning or generation.

`stale` means Mission inputs or source knowledge changed after this context was assembled.

`failed` means evidence collection could not complete.

`archived` means the context is retained for history but should not be used for new generation.

## Relationship To Mission

A KnowledgeContext may reference a Mission through `missionId`.

A Mission may optionally reference an active KnowledgeContext through `knowledgeContextId`.

This relationship is deliberately loose in Phase 2. KnowledgeContexts are not created automatically, and no planning or asset generation depends on them yet. That keeps the existing PostPunk infrastructure running while Echo Studio's Mission architecture is introduced incrementally.

## Why AI Should Consume KnowledgeContext

Without KnowledgeContext, AI generation tends to query whatever is easiest: stale docs, generic model memory, or broad assumptions. That creates inconsistent marketing output.

KnowledgeContext gives Echo Studio a controlled reasoning boundary:

1. Product facts first.
2. Brand rules second.
3. Platform rules third.
4. Previous performance fourth.
5. Marketing playbook fifth.
6. General notes last.

Future planning and asset-generation services should consume KnowledgeContext instead of independently querying files, settings, platform adapters, or arbitrary data stores.

## Phase 2 Storage

The initial implementation uses an in-memory KnowledgeContext store. No database, Prisma, or SQLite schema changes are part of Phase 2.

Future work should add persistence, version history, embeddings, semantic search, retrieval ranking, and prompt-ready AI context assembly.

