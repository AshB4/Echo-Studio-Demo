# PostPunk Core Vision

## Product Boundary

PostPunk is not:

- a generic social media scheduler
- a giant CMS
- an AI spam engine
- a productivity app
- an all-platform autoposter

PostPunk is:

- discoverability infrastructure
- metadata-aware publishing operations
- evergreen content workflow tooling
- canonical-aware syndication infrastructure
- operational publishing intelligence

## Clear Ownership

Astro owns:

- canonical publishing
- rendering
- SEO presentation
- archive structure

PostPunk owns:

- workflows
- metadata intelligence
- lifecycle tracking
- syndication
- publishing operations
- discoverability systems

These responsibilities should stay separate.

## Core Direction

Optimize PostPunk for:

- evergreen discoverability
- searchable publishing
- operational consistency
- metadata quality
- reusable content systems
- canonical ownership
- archive-aware workflows

Do not optimize for:

- posting volume
- trend chasing
- engagement bait
- generic creator workflows

## Content Lifecycle

PostPunk should model content evolution, not just draft and published.

Supported lifecycle states:

- `seed`
- `fragment`
- `note`
- `experiment`
- `article`
- `syndicated`
- `refreshed`
- `archived`

Example:

```json
{
  "state": "experiment"
}
```

Publishing queue status remains an operational field.
Lifecycle state is the discoverability field.

## Metadata System

Core discoverability metadata:

- `searchIntent`
- `evergreenScore`
- `contentHalfLife`
- `artifactType`
- `audienceStage`
- `problemType`
- `canonicalSource`
- `syndicationTargets`
- `repurposePriority`
- `relatedContent`
- `series`
- `tags`

This metadata should improve:

- discoverability
- syndication decisions
- resurfacing
- content relationships
- future SEO workflows

## Content Lineage

Every artifact can have canonical-aware lineage:

- original source
- variants
- syndicated versions
- Pinterest variants
- Reddit discussion versions
- Dev.to versions
- Astro canonical source

The goal is lightweight relationship tracking and derivative mapping without turning PostPunk into a giant graph system.

## Platform Profiles

Platform behavior should stay profile-driven rather than generic.

Examples:

- Pinterest: evergreen bias, search-first behavior, visual metadata importance
- Reddit: authenticity-sensitive, anti-promotion, discussion-first
- Dev.to: implementation detail, developer trust, canonical support awareness
- Facebook: process storytelling, relationship-driven
- Ko-fi: supporter relationship, offer clarity, archive-adjacent support lane

PostPunk should understand platform behavior differences when planning syndication and reuse.

Operational framing:

- Reddit is a discussion and validation lane, not a blast channel.
- Ko-fi is a supporter and monetization lane, not the canonical archive.

## Evergreen Systems

Support:

- resurfacing
- refresh reminders
- evergreen prioritization
- content decay awareness
- repurpose recommendations

The point is compounding discoverability over time, not filling a queue.

## UX Direction

The product should feel:

- operational
- metadata-aware
- calm
- systems-oriented
- archival
- discoverability-focused

Avoid:

- gamification
- dopamine-heavy dashboards
- hustle-software energy
- creator-economy sludge

## Long-Term Goal

PostPunk should evolve toward a lifecycle-aware discoverability operating system.
It should not drift into Notion clone behavior, feature accumulation chaos, or generic productivity software.
