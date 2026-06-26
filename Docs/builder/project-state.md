# Project State

This is the operational handoff for the current N8tiveFlow / PostPunk repository state.

Read this when you need the short version of what actually exists today.

## 1. Strategic Focus

Current strategic boundary, as implemented in the repo:

- Astro / AshB4 Studio remains the canonical publishing layer outside this repo
- PostPunk remains the workflow, queue, syndication, and automation layer
- content should be modeled as metadata-aware artifacts, not just draft/published blobs
- the system is optimized for discoverability, archive-aware reuse, and platform-specific distribution

Current practical emphasis:

- keep the queue reliable
- keep the proven distribution lanes working
- keep the article/portfolio/RSS pipeline coherent
- avoid broad platform expansion unless a lane is clearly operational

## 2. What PostPunk Is Today

PostPunk is currently:

- a SQLite-backed queue and scheduling system
- a platform dispatch layer for multiple posting adapters
- a content metadata system with lifecycle-aware fields
- a portfolio/article export pipeline
- an RSS feed generator for public and DEV-oriented feeds
- a manual-assist surface for unstable or partially proven platforms
- an operational dashboard for queue recovery, analytics, and affiliate workflows

PostPunk is not:

- the canonical publishing site
- a generic CMS
- a fully automatic multi-platform autoposter
- a finished attribution or analytics platform

## 3. Proven Working Features

The following are implemented and should be treated as real, working capability:

- frontend routing through `frontend/main.jsx`
- calendar, composer, batch, today ops, charts, archive, setup, affiliate, and pSEO pages
- SQLite queue storage in `backend/data/postpunk.sqlite`
- JSON queue mirrors for compatibility
- post create/edit/save/schedule flows
- archive/history logging
- platform/account health checks
- queue duplicate and schedule guardrails
- Telegram alerts from the worker
- Pinterest queue remixing through the calendar action and backend route
- portfolio generation into the external AshB4 GitHub Pages repo
- RSS feed generation for public and DEV import feeds
- article metadata normalization for canonical URL, excerpt, tags, publish date, external URLs, and platform IDs
- DEV cover image prompt generation
- Astro markdown/frontmatter export helpers
- Amazon affiliate batch planning and builder flows

Platform lanes that have been proven live in practice:

- `Dev.to`
- `Facebook`
- `Pinterest`

Operationally proven but still less central:

- browser-based Facebook lane
- Pinterest single-pin Playwright lane
- remote/SSH-based queue recovery and rebuild work on HP

## 4. Experimental Features

These exist in code, but they should still be treated carefully:

- Prisma-backed content API under `backend/routes/content/*`
- attribution event tracking and journey stitching
- RSS auto-generation triggered from the worker
- DEV draft publication automation
- portfolio commit/push automation from the pipeline scripts
- broader platform adapters that are present in code but not operationally proven
- browser-based fallbacks for unstable social lanes beyond the core proven paths

The rule here is simple:

- if it exists only as an adapter or helper, do not assume it is production reliable
- if it is not tied to a known-good flow, treat it as experimental until verified

## 5. Planned or Incomplete Areas

These are not finished:

- full canonical publication living inside PostPunk
- broad multi-platform autopublishing
- fully trusted Reddit automation
- Instagram, Threads, LinkedIn, X, Substack, Tumblr, Ko-fi, Discord, Product Hunt, Hashnode, and Amazon as unattended lanes
- richer Pinterest capabilities like alt text, publish-later, and topic/tag support
- fully integrated attribution reporting
- a single unified content store that replaces both queue storage and Prisma content records
- automatic end-to-end publish-once / syndicate-everywhere behavior without operator review

If a feature sounds nice but has not been tied to a real route, script, or testable flow, it belongs here.

## 6. Platform Status

### Proven working

- `Facebook`
- `Dev.to`
- `Pinterest`

### Working in code, but still cautious

- `Reddit`
- `Substack`
- `Instagram`
- `Threads`
- `X`
- `LinkedIn`
- `Tumblr`
- `Ko-fi`
- `Discord`
- `Hashnode`
- `Product Hunt`
- `Amazon`

### Notes that matter

- Facebook token expiry is less central than it used to be because the browser lane exists, but credential health still matters
- Pinterest is the most operationally mature evergreen lane after DEV and Facebook
- Reddit should still be treated as a lane to prove, not a lane to assume
- DEV is the trusted canonical article syndication lane

## 7. Current Sources of Truth

### Primary queue store

- `backend/data/postpunk.sqlite`

This is the main operational store for:

- queue posts
- posted log
- rejections
- settings
- Pinterest metrics snapshots

### Compatibility mirrors

- `backend/queue/postQueue.json`
- `backend/queue/postedLog.json`
- `backend/queue/rejections.json`

These exist for compatibility and backup-style mirroring, not as primary truth.

### Structured content store

- Prisma schema: `backend/prisma/schema.prisma`
- content API routes: `backend/routes/content/*`
- backing DB is whatever `DATABASE_URL` points to

This is a separate content system, not the queue store.

### Generated outputs

- `backend/public/portfolio/blog/*`
- `backend/public/rss/*`
- `backend/stats/*`
- `backend/media/*`
- `backend/tmp/*`
- `backend/backups/*`

These are derived outputs, not canonical source.

### Configuration and workflow inputs

- `backend/config/settings.json`
- `backend/config/accounts.json`
- `backend/config/pinterest-boards.json`
- `backend/config/product-media-pools.json`
- `backend/config/affiliate-batches/*`
- `backend/config/recycle.js`
- `backend/config/2BpostedQ.js`
- `backend/config/rejected-log.js`
- `backend/config/posted-log.js`

### External repository target

- AshB4 GitHub Pages repo at `/Users/ash/Desktop/Portfolio/AshB4.github.io`

That repo is the portfolio deployment target for the article pipeline.

## 8. Major Data Flows

### Queue to platform

1. content is created or edited in the UI
2. it is saved to SQLite through the backend
3. the worker reads due approved items
4. `post-to-all.js` normalizes target/platform dispatch
5. platform adapters post to external services
6. results are archived back into SQLite
7. Telegram notifications are sent for success/failure

### Article to portfolio/RSS

1. a queue article is normalized as an article record
2. the article pipeline writes portfolio data to the external Astro repo
3. the portfolio repo is committed and pushed
4. RSS feeds are generated from the normalized records
5. DEV-specific feed items and external URLs/platform IDs are preserved

### Pinterest recovery flow

1. the calendar page or backend route triggers Pinterest rebalance
2. the mix logic reorders or reschedules approved Pinterest posts
3. queue state is rewritten in SQLite
4. the worker later consumes the updated schedule

### Affiliate flow

1. product and angle research is prepared
2. the affiliate builder creates pin-oriented rows
3. rows are mixed and queued into the main schedule
4. Pinterest-specific behavior is applied during dispatch

## 9. Recent Architectural Decisions

The repo currently reflects these decisions:

- SQLite is the real queue source of truth
- JSON queue files are compatibility mirrors, not the primary store
- the portfolio/RSS/article pipeline is real and should stay separate from normal queue dispatch
- the content API is a separate Prisma-backed system, not the queue store
- the frontend router lives in `frontend/main.jsx`, not the deprecated `frontend/app.jsx`
- `frontend/UXUI/Pages/PostLib.jsx` is legacy; `/archive` is the active archive route
- `backend/scripts/postingJob.mjs` is the worker entrypoint and is also responsible for RSS auto-generation when enabled
- `backend/scripts/platforms/post-to-all.js` remains the dispatch layer for all adapters
- `backend/utils/contentModel.mjs` now carries the centralized metadata normalization rules
- `backend/utils/rssSyndication.mjs` is the core RSS/article selector and feed builder
- `backend/utils/articlePipeline.mjs` is the core portfolio export pipeline

## 10. Immediate Next Constraints

These are the constraints that matter right now:

- do not assume a lane is proven just because an adapter file exists
- do not assume `Docs/` and `docs/` are already consolidated; both trees still exist
- do not treat queue JSON files as editable primary state
- do not rewrite the Prisma content API as if it were the queue store
- do not expand the platform surface until the current proven lanes stay healthy
- do not change article/portfolio/RSS behavior without checking the external repo path and feed outputs
- keep worker changes conservative because schedule integrity is still the easiest thing to break

## Operational Summary

The current system is stable enough to run, but not finished enough to stop being cautious.

If you are touching the core path, inspect these first:

- `backend/utils/localDb.mjs`
- `backend/scripts/postingJob.mjs`
- `backend/scripts/platforms/post-to-all.js`
- `backend/server.mjs`
- `backend/utils/rssSyndication.mjs`
- `backend/utils/articlePipeline.mjs`
- `backend/utils/contentModel.mjs`
- `frontend/main.jsx`

