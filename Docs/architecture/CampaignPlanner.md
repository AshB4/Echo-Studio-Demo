# Campaign Planner

Campaign Planner is the Echo Studio domain layer that turns a Mission and KnowledgeContext into a strategy blueprint.

It decides what should be created. It does not write marketing copy, create Campaign Assets, publish content, or call AI.

```text
Mission
  -> Knowledge Retrieval
  -> KnowledgeContext
  -> Campaign Planner
  -> Campaign Assets
  -> Publishing
```

## Responsibilities

Planner owns strategy.

Asset Generator owns execution.

Publishing owns distribution.

The planner receives:

- `missionId`
- an assembled `knowledgeContext`

It produces a `CampaignPlan` containing:

- campaign goal
- audience
- primary platform
- secondary platforms
- recommended asset blueprints
- simple four-week timeline
- success metrics
- risks
- notes

## CampaignPlan Lifecycle

CampaignPlan statuses are:

- `draft`
- `planning`
- `ready`
- `approved`
- `archived`

Phase 3 uses in-memory storage only. No database, Prisma, SQLite, post, queue, worker, frontend, or adapter behavior changes are part of this phase.

## Deterministic Planning

Phase 3 planning is deterministic.

Rules include:

- If the primary platform contains Pinterest, recommend Pinterest pins.
- If the audience contains developers, recommend a Dev.to article.
- If the mission goal contains authority, recommend Blog plus Pinterest.
- If the mission goal contains launch, recommend Email plus Landing Page.

These are deliberately simple. They prove the planner boundary without creating AI coupling too early.

## Future Work

Future planner work should add:

- AI planning
- LLM reasoning with cited evidence
- Winner analysis integration
- Analytics feedback
- Platform optimization
- Budget allocation
- Content calendars
- Seasonality

Those features belong after the Mission, Knowledge Retrieval, and KnowledgeContext contracts are stable.

