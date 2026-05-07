# Discoverability Ops Spec

## Purpose

This document defines the product model that separates PostPunk from Astro and keeps PostPunk aligned with discoverability-oriented publishing operations.

## Responsibility Split

Astro:

- canonical publishing
- rendering
- SEO presentation
- archive structure

PostPunk:

- workflows
- metadata intelligence
- lifecycle tracking
- syndication
- publishing operations
- discoverability systems

## Content Record Shape

Recommended content record:

```json
{
  "title": "PostPunk discoverability model",
  "status": "approved",
  "lifecycleState": "article",
  "canonicalSource": "https://archive.example.com/postpunk/discoverability-model",
  "metadata": {
    "searchIntent": "discoverability publishing operations",
    "evergreenScore": 84,
    "contentHalfLife": "12 months",
    "artifactType": "guide",
    "audienceStage": "consideration",
    "problemType": "workflow design",
    "canonicalSource": "https://archive.example.com/postpunk/discoverability-model",
    "syndicationTargets": ["devto", "pinterest"],
    "repurposePriority": 5,
    "relatedContent": ["canonical-strategy", "archive-ia"],
    "series": "discoverability-ops",
    "tags": ["postpunk", "astro", "seo"]
  },
  "lineage": {
    "originalSource": "postpunk-discoverability-model",
    "variants": ["postpunk-discoverability-model-linkedin"],
    "syndicatedVersions": ["devto:456"],
    "pinterestVariants": ["pin-a", "pin-b"],
    "redditDiscussionVersions": ["reddit:thread-123"],
    "devtoVersions": ["devto:456"],
    "astroCanonicalSource": "https://archive.example.com/postpunk/discoverability-model"
  }
}
```

## Operational Rule

Keep `status` and `lifecycleState` separate.

- `status` controls operational publishing readiness.
- `lifecycleState` describes the maturity and reuse stage of the artifact.

Examples:

- `status=approved` and `lifecycleState=experiment`
- `status=posted` and `lifecycleState=syndicated`
- `status=draft` and `lifecycleState=seed`

## Astro Export

Markdown export should generate frontmatter that Astro can consume directly.

Expected frontmatter fields:

- `title`
- `description`
- `state`
- `canonicalURL`
- `canonicalSource`
- `artifactType`
- `searchIntent`
- `evergreenScore`
- `contentHalfLife`
- `audienceStage`
- `problemType`
- `repurposePriority`
- `series`
- `tags`
- `relatedContent`
- `syndicationTargets`
- `lineage`

## Platform Behavior

Platform profiles should influence syndication decisions:

- Pinterest favors searchable evergreen packaging and visual metadata quality.
- Reddit favors authentic discussion and punishes generic promotion.
- Dev.to favors implementation detail and canonical clarity.
- Facebook favors process narrative and relationship context.
- Ko-fi favors supporter warmth, offer clarity, and relationship-driven updates.

Recommended PostPunk treatment:

- Reddit should usually be modeled as a discussion derivative with subreddit-aware metadata and minimal CTA pressure.
- Ko-fi should usually be modeled as a supporter derivative or offer-adjacent artifact, often linked to a canonical Astro article, archive entry, or product context.

Reddit guardrails should be operational, not optional:

- Reddit defaults to manual review rather than approved-for-worker autoposting.
- Reddit requires a target subreddit and a stored answer to: `Why would this subreddit care?`
- Reddit should block obvious hard-sell copy and direct-link pressure.
- Goblin-adjacent Reddit posts should bias toward humor, identity, lore, or community participation rather than extraction behavior.
- The system should prefer slowing Reddit down over helping it scale irresponsibly.

Useful metadata emphasis by lane:

- Reddit: `problemType`, `audienceStage`, `canonicalSource`, `relatedContent`
- Ko-fi: `artifactType`, `canonicalSource`, `repurposePriority`, `series`, `tags`

## Anti-Drift Rules

Do not expand PostPunk toward:

- generic productivity software
- giant CMS behavior
- creator dashboard bloat
- all-platform autoposting for its own sake
- feature accumulation without discoverability impact
