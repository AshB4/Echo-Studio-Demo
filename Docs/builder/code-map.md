# Code Map

This file is a current-state map of N8tiveFlow / PostPunk.

It is meant to help a new contributor answer one question quickly: what actually owns what right now?

## 1. High-Level Architecture

PostPunk is the workflow, queue, syndication, and automation layer.

The canonical publishing site lives outside this repo in the AshB4 Studio / Astro site. PostPunk supports that site by:

- storing and editing content records
- queueing and scheduling posts
- dispatching to external platforms
- generating RSS feeds
- exporting portfolio pages and article files
- tracking posting history, retries, and failures

The important split is:

- Astro/AshB4 Studio owns canonical publishing and SEO authority
- PostPunk owns operations, metadata, syndication, and automation

Do not treat PostPunk as a full CMS. It is a publishing operations system with a content API attached to it.

## 2. Frontend Structure and Major Routes

The active frontend entrypoint is `frontend/main.jsx`.

`frontend/app.jsx` is deprecated and returns nothing. Do not add new routing there.

Global styling starts in `frontend/index.css`.

### Main routes

- `/` - calendar and queue home
- `/compose` - post composer
- `/lab` - Post Lab
- `/batch` - batch import and staging
- `/affiliate` - affiliate strategy / rules
- `/affiliate/builder` - affiliate row builder
- `/today`, `/today-ops`, `/ops`, `/today/*` - Today Ops / manual queue handling
- `/charts`, `/pinterest-analytics` - Pinterest analytics
- `/archive` - posted archive
- `/setup` - rotation and token health
- `/pseo`, `/pseo/:slug` - pSEO pages
- `*` - 404

### Frontend page ownership

- `frontend/UXUI/Pages/PostCalendar.jsx` - calendar, queue visibility, Pinterest remix action
- `frontend/UXUI/Pages/postComposer.jsx` - composer page
- `frontend/UXUI/Pages/BatchPage.jsx` - batch import flow
- `frontend/UXUI/Pages/AffiliateEnginePage.jsx` - affiliate strategy and prompt guidance
- `frontend/UXUI/Pages/AffiliateBuilderPage.jsx` - row-based affiliate builder
- `frontend/UXUI/Pages/TodayQueue.jsx` - manual ops / recovery surface
- `frontend/UXUI/Pages/ChartsPage.jsx` - analytics dashboard
- `frontend/UXUI/Pages/ArchivePage.jsx` - archive/history
- `frontend/UXUI/Pages/SetupPage.jsx` - settings and platform health
- `frontend/UXUI/Pages/SeoPages.jsx` - pSEO content pages
- `frontend/UXUI/Pages/notFound.jsx` - error page

### Frontend support code

- `frontend/UXUI/Components/*` - shared UI and page-specific component trees
- `frontend/UXUI/Global/PostComposer/*` - composer-specific controls and state
- `frontend/UXUI/utils/*` - client-side helpers for statuses, tags, products, and platform rules
- `frontend/UXUI/scripts/postToAllPlatforms.js` - thin client-side posting helper

Some folders are legacy or parallel support trees, not primary entrypoints. In particular, `frontend/UXUI/Pages/PostLib.jsx` exists, but the live archive route is `/archive`.

## 3. Backend Structure and Major Subsystems

The backend entrypoint is `backend/server.mjs`.

It is an Express app that owns:

- posts CRUD
- archive/history APIs
- account and platform health APIs
- rotation/settings APIs
- media upload
- analytics summaries
- SEO and campaign generation
- Pinterest queue rebalance
- generic platform dispatch
- content API mounting at `/api/content`

### Content API

`backend/routes/content/*` is a separate Prisma-backed content subsystem.

It is not the same thing as the SQLite queue store.

Current content API pieces:

- `backend/routes/content/index.js`
- `backend/routes/content/create.js`
- `backend/routes/content/update.js`
- `backend/routes/content/list.js`
- `backend/routes/content/show.js`
- `backend/routes/content/validators.js`
- `backend/routes/content/serializers.js`

The schema lives in `backend/prisma/schema.prisma` and includes:

- `users`
- `content_items`
- `content_assets`
- `platform_targets`

This is useful for structured content records, but it is not the primary queue source of truth.

### Main backend utility layers

- `backend/utils/localDb.mjs` - SQLite queue store and JSON mirror sync
- `backend/utils/contentModel.mjs` - canonical content metadata normalization
- `backend/utils/rssSyndication.mjs` - RSS article selection and feed generation
- `backend/utils/articlePipeline.mjs` - portfolio/article export pipeline
- `backend/utils/astroMarkdownExport.mjs` - Astro frontmatter and markdown export
- `backend/utils/accountStore.mjs` - account loading and secret resolution
- `backend/utils/platformHealth.mjs` - credential/platform health checks
- `backend/utils/platformProfiles.mjs` - platform writing guidance
- `backend/utils/postStatus.mjs` - status normalization and rules
- `backend/utils/distributionTags.mjs` - platform/tag target mapping
- `backend/utils/archiveEntry.mjs` - archive/history row shape
- `backend/utils/queueGuard.mjs` - duplicate and schedule safety checks
- `backend/utils/seoGeneration.mjs` - SEO generation helpers
- `backend/utils/campaignGeneration.mjs` - campaign generation helpers
- `backend/utils/devtoCoverPrompt.mjs` - DEV cover image prompt builder
- `backend/utils/pinterestCreative.mjs` - Pinterest creative rules
- `backend/utils/pinterestPerformanceAnalysis.mjs` - Pinterest analytics scoring
- `backend/utils/scheduleHealth.mjs` - schedule health checks
- `backend/utils/analyticsSummary.mjs` - funnel and summary reporting
- `backend/utils/telegramAlerts.mjs` - Telegram status alerts
- `backend/utils/productProfiles.mjs` - product profile metadata

## 4. Queue and Scheduling Flow

The operational queue is SQLite-backed.

Primary queue/history storage lives in `backend/data/postpunk.sqlite` through `backend/utils/localDb.mjs`.

The JSON files under `backend/queue/` are mirrors kept for compatibility:

- `backend/queue/postQueue.json`
- `backend/queue/postedLog.json`
- `backend/queue/rejections.json`

The worker flow is:

1. Load due posts from the SQLite queue
2. Normalize targets and platform/account routing
3. Send each post to the selected platform adapters
4. Record successes and failures
5. Append archive/history rows
6. Retry or defer failed items when appropriate
7. Send Telegram alerts
8. Optionally regenerate RSS feeds

Important queue/status behavior:

- `draft`, `approved`, `queued`, `scheduled`, `posted`, `failed`, and related states are normalized in code
- approved posts are the ones the worker is meant to act on
- per-platform limits and cooldown logic are enforced in the worker
- Pinterest queue remixing is handled separately from normal dispatch

### Pinterest queue flow

- `backend/scripts/queue/rebalance-pinterest-mix.mjs` owns the Pinterest mix logic
- `POST /api/queue/rebalance-pinterest` exposes it in `backend/server.mjs`
- the calendar page has a `Remix Pinterest` action that calls that API

### Worker entrypoint

- `backend/scripts/postingJob.mjs` is the main scheduled worker
- it acquires a lock file at `backend/data/posting-job.lock`
- it respects platform limits, duplicate checks, and Pinterest media-family avoidance
- it can regenerate RSS feeds after processing when RSS auto-generation is enabled

## 5. Attribution Subsystem

The attribution subsystem exists, but it should be treated as experimental / partially integrated.

Files:

- `backend/attribution/events.js`
- `backend/attribution/stitching.js`

Storage:

- `backend/stats/attribution-events.json`
- `backend/stats/attribution-conversions.json`

What it does now:

- records touchpoints and conversions
- stitches journeys by identifier and time window
- applies simple attribution models such as linear, first-touch, last-touch, and time-decay

What it is not:

- a primary production source of truth
- a fully wired reporting system in the main publishing loop

## 6. Platform Integrations and Current Status

### Proven working

- `Facebook`
- `Dev.to`
- `Pinterest`

These are the lanes the project currently treats as live and operational.

### Active but more cautious

- `Reddit`

The adapter exists and the code routes to it, but it should still be treated as less operationally proven than the three lanes above.

### Present in code but not current strategic focus

- `X`
- `LinkedIn`
- `Instagram`
- `Threads`
- `Substack`
- `Hashnode`
- `Product Hunt`
- `Tumblr`
- `Ko-fi`
- `Discord`
- `Amazon`

### Platform dispatch

`backend/scripts/platforms/post-to-all.js` is the platform router.

It:

- resolves platform handlers dynamically
- applies affiliate/product-link helpers
- normalizes targets and accounts
- keeps platform-specific logic out of the worker

Per-platform handlers live under:

- `backend/scripts/platforms/social/*`
- `backend/scripts/platforms/dev/*`
- `backend/scripts/platforms/content/*`
- `backend/scripts/platforms/marketplaces/*`
- `backend/scripts/platforms/adult/*`

The important reality is that adapter files existing in the tree does not mean the lane is operationally proven.

## 7. Data Storage Locations and Sources of Truth

### Primary source of truth

- `backend/data/postpunk.sqlite`

Used by `backend/utils/localDb.mjs` for:

- queue posts
- posted log
- rejections
- settings
- Pinterest metrics snapshots

### Compatibility mirrors

- `backend/queue/postQueue.json`
- `backend/queue/postedLog.json`
- `backend/queue/rejections.json`

These are mirrors, not the primary store.

### Separate structured content store

- `backend/prisma/schema.prisma`
- database pointed to by `DATABASE_URL`

This powers the content API tables and should not be confused with the queue DB.

### Generated or derived outputs

- `backend/public/portfolio/blog/*`
- `backend/public/rss/*`
- `backend/stats/*`
- `backend/media/*`
- `backend/tmp/*`
- `backend/backups/*`

These are outputs, logs, or operational artifacts, not canonical source data.

### Configuration and planning data

- `backend/config/settings.json`
- `backend/config/accounts.json`
- `backend/config/pinterest-boards.json`
- `backend/config/product-media-pools.json`
- `backend/config/affiliate-batches/*`
- `backend/config/recycle.js`
- `backend/config/2BpostedQ.js`
- `backend/config/rejected-log.js`
- `backend/config/posted-log.js`

### Frontend and content assets

- `frontend/assets/*`
- `frontend/posts/seoVault.json`
- `backend/posts/seoVault.json`
- `content/drafts/*`
- `content/bts/*`

### External portfolio target

The article pipeline writes to the external AshB4 GitHub Pages repo at:

- `/Users/ash/Desktop/Portfolio/AshB4.github.io`

That repo is outside this tree and is treated as the portfolio deployment target.

## 8. Worker and Automation Flow

The core automation entrypoint is `backend/scripts/postingJob.mjs`.

In practice it does this:

1. acquire a lock
2. read queue state from SQLite
3. choose due approved posts
4. normalize targets
5. dispatch to `postToAllPlatforms`
6. record success/failure outcomes
7. archive successful posts
8. reschedule or retry failures
9. send Telegram alerts
10. optionally regenerate RSS feeds
11. release the lock

Supporting automation:

- `backend/scripts/backup/snapshot.mjs` - queue/data snapshotting
- `backend/scripts/health/check-tokens.mjs` - credential checks
- `backend/scripts/health/daily-summary.mjs` - daily summary output
- `backend/scripts/health/storage-audit-report.mjs` - storage audit
- `backend/scripts/daily-cron.sh` - shell wrapper for scheduled work
- `backend/systemd/*` - Linux service/timer units
- `backend/launchd/*` - macOS launchd units

Operator-only scripts live under `backend/scripts/manual/*` and should be treated as repair/test tools, not normal automation.

## 9. Important Scripts and Utilities

### Portfolio and article pipeline

- `backend/scripts/pipeline/generate-portfolio.mjs`
- `backend/scripts/pipeline/deploy-portfolio.mjs`
- `backend/scripts/pipeline/publish-one-article.mjs`
- `backend/scripts/pipeline/publish-devto-drafts.mjs`

### RSS pipeline

- `backend/scripts/rss/generate-feeds.mjs`
- `backend/scripts/rss/backfill-devto-metadata.mjs`
- `backend/utils/rssSyndication.mjs`

### Article/SEO helpers

- `backend/utils/articlePipeline.mjs`
- `backend/utils/astroMarkdownExport.mjs`
- `backend/utils/devtoCoverPrompt.mjs`
- `backend/utils/seoGeneration.mjs`
- `backend/scripts/generateSeo.js`
- `backend/scripts/generateSummary.js`
- `backend/scripts/seoCheckRunner.js`
- `backend/scripts/seoChecker.js`

### Queue and Pinterest helpers

- `backend/scripts/queue/rebalance-pinterest-mix.mjs`
- `backend/scripts/queue/repair-pinterest-queue.mjs`
- `backend/scripts/queue/repair-pinterest-diversity.mjs`
- `backend/scripts/queue/dry-run-next24h.mjs`
- `backend/scripts/pinterest/capture-pin-analytics.mjs`
- `backend/scripts/pinterest/capture-pin-analytics-batch.mjs`
- `backend/scripts/pinterest/analyze-pin-performance.mjs`

### Platform helpers

- `backend/scripts/platforms/post-to-all.js`
- `backend/scripts/platforms/social/post-to-facebook.js`
- `backend/scripts/platforms/social/post-to-facebook-browser.js`
- `backend/scripts/platforms/social/post-to-pinterest.js`
- `backend/scripts/platforms/social/capture-pinterest-state.js`
- `backend/scripts/platforms/dev/post-to-devto.js`
- `backend/scripts/platforms/social/post-to-reddit.js`
- `backend/scripts/platforms/social/post-to-substack.js`

### Product / revenue / security / health

- `backend/scripts/productFinder/*`
- `backend/scripts/revenue/export-template.mjs`
- `backend/scripts/security/block-compromised-deps.mjs`
- `backend/utils/platformHealth.mjs`
- `backend/utils/scheduleHealth.mjs`
- `backend/utils/telegramAlerts.mjs`
- `backend/utils/productProfiles.mjs`
- `backend/utils/pinterestPerformanceAnalysis.mjs`

## 10. Known Areas of Technical Debt or Caution

- There are two content systems in the repo: the SQLite queue system and the Prisma content API. They are related, but they are not the same source of truth.
- JSON mirrors still exist for compatibility. Do not hand-edit them unless you know exactly why.
- The frontend has some legacy or parallel folders, so check the route entrypoint before adding new pages.
- Some platform adapters exist only as adapters. Presence in code is not proof of operational reliability.
- RSS and portfolio generation are real now, but they depend on the article pipeline and external repo paths being correct.
- The worker can look healthy while the queue shape is wrong. Use queue and schedule health checks, not just process status.
- `Docs/` and `docs/` both exist in the repository tree. References in the codebase still point at `Docs/`.
- Generated assets, backups, queue files, and affiliate batch files are large and should stay out of normal source commits.

## Bottom Line

If you are changing core behavior, start in this order:

1. `backend/utils/localDb.mjs`
2. `backend/scripts/postingJob.mjs`
3. `backend/scripts/platforms/post-to-all.js`
4. `backend/server.mjs`
5. `frontend/main.jsx`

If you are changing article syndication or portfolio publishing, check:

- `backend/utils/contentModel.mjs`
- `backend/utils/rssSyndication.mjs`
- `backend/utils/articlePipeline.mjs`
- `backend/scripts/pipeline/*`

