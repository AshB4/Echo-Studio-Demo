# Knowledge Retrieval

Knowledge Retrieval is the layer that finds evidence for Echo Studio before planning or generation.

It sits between registered knowledge sources and KnowledgeContext:

```text
Knowledge Sources
  -> Knowledge Retrieval
  -> KnowledgeContext
  -> Planner
  -> Generator
```

## Responsibilities

Knowledge Retrieval owns finding evidence.

KnowledgeContext owns organizing evidence.

Planner owns strategy.

Generator owns execution.

This separation keeps Echo Studio from mixing source discovery, context structure, campaign strategy, and asset generation into one unstable AI prompt.

## Knowledge Sources

A Knowledge Source is a registered pointer to evidence. In Phase 2.5 the source registry is intentionally simple and in-memory.

Supported source types:

- `product`
- `brand`
- `platform`
- `performance`
- `playbook`
- `general`

Each source contains:

- `id`
- `type`
- `title`
- `description`
- `priority`
- `enabled`
- `tags`
- `location`

`location` is only a pointer for now. The retrieval layer does not parse markdown, crawl files, compute embeddings, or call AI in this phase.

## Assembly

Manual assembly accepts a `missionId` and returns a KnowledgeContext-shaped object.

The first implementation:

1. Reads enabled registered sources.
2. Sorts sources by priority.
3. Buckets them into KnowledgeContext sections:
   - Product Knowledge
   - Brand Rules
   - Platform Rules
   - Previous Campaign Performance
   - Marketing Playbook
   - General Notes
4. Returns the assembled KnowledgeContext.

No Mission is updated automatically. No KnowledgeContext is persisted automatically.

## Future Work

Future retrieval work should add:

- Markdown parsing
- Semantic search
- Embeddings
- Vector database support
- Prompt assembly
- Retrieval ranking
- Caching
- Version history
- Persistence

These should be added inside the retrieval boundary before the planner is allowed to depend on them.

