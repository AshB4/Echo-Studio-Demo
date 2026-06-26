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

## RSS Syndication

PostPunk owns RSS metadata and feed generation. Feeds are generated outputs, not hand-maintained source files.

Canonical article metadata should live on the existing post/content record:

- `title`
- `excerpt`
- `publishDate`
- `tags`
- `canonicalUrl` / `metadata.canonicalUrl`
- `metadata.externalUrls`
- `metadata.syndicationStatus`
- `metadata.platformIds`
- `metadata.syndicationTargets`

Supported generated feeds:

- public feed: `feed.xml`
- DEV import feed: `devto.xml`

Backend commands:

```bash
npm run rss:backfill-devto
npm run rss:generate
```

RSS generation reads the active PostPunk store, merges queued posts and posted archive entries by ID, and emits multiple feed types without duplicating article definitions.

The posting worker regenerates RSS after a successful store snapshot write. Set `POSTPUNK_RSS_AUTOGENERATE=false` to disable this.

## Write Once Article Pipeline

PostPunk is the authoring surface. The portfolio is the canonical publication surface. DEV is a distribution channel and DEV auto-publish is required for DEV-targeted article records.

Article records should stay centralized on the existing post/content model:

- `id`
- `title`
- `slug`
- `excerpt`
- `body`
- `tags`
- `publishDate`
- `canonicalUrl`
- `devUrl`
- `status`
- `autoPublishDev`
- `syndicationTargets`
- `metadata.pipelineStatus`
- `metadata.pipelineHistory`

Generated portfolio outputs:

- `/blog/index.html`
- `/blog/:slug/index.html`
- `/blog/feed.xml`
- `/blog/devto.xml`

Backend commands:

```bash
npm run portfolio:generate
npm run portfolio:deploy
npm run devto:publish-drafts
```

`portfolio:generate` writes static portfolio blog pages and feeds from queued plus posted archive article records. `portfolio:deploy` writes into `POSTPUNK_PORTFOLIO_REPO_DIR`, commits `blog`, pushes `main`, and only marks article records `portfolio_deployed` after a successful push.

DEV RSS import can create unpublished DEV drafts. `devto:publish-drafts` reads authenticated DEV unpublished articles, matches only drafts whose canonical URL belongs to a PostPunk article with `autoPublishDev: true`, publishes the draft, and stores the resulting DEV URL and article ID back on the PostPunk record.

Pipeline status progression:

```text
draft -> generated -> portfolio_deployed -> rss_detected -> dev_draft_created -> dev_published
```

DEV-targeted article records default `autoPublishDev` to `true`. The current DEV API publisher sends `published: true`, so the automated DEV path is publish-by-default rather than draft-only.

Useful environment overrides:

- `POSTPUNK_RSS_SITE_URL`
- `POSTPUNK_RSS_OUT_DIR`
- `POSTPUNK_RSS_PUBLIC_PATH`
- `POSTPUNK_RSS_DEVTO_PATH`
- `POSTPUNK_RSS_TITLE`
- `POSTPUNK_RSS_DESCRIPTION`
- `POSTPUNK_PORTFOLIO_OUT_DIR`
- `POSTPUNK_PORTFOLIO_REPO_DIR`
- `POSTPUNK_PORTFOLIO_COMMIT_MESSAGE`

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
