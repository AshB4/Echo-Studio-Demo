# AGENTS.md

## Project
This repo is `N8tiveFlow`, also referred to as PostPunk.

PostPunk is a workflow and distribution layer for publishing operations. It handles queueing, scheduling, metadata, syndication, manual posting support, platform workflows, analytics, and operational tooling.

It is not the canonical publishing home. Astro/AshB4 Studio owns canonical publishing and SEO authority.

Read first:
- `Docs/builder/project-state.md`
- `Docs/builder/README-OPERATIONS.md`
- `Docs/builder/terminal-commands.md`

## Current Product Direction
Favor features that support:
- queue and scheduling reliability
- markdown/content export toward Astro
- platform-specific syndication workflows
- Dev.to, Facebook, Pinterest, and Reddit support
- metadata, CTR, intent, image planning, and content lineage
- lightweight creator operations
- analytics and feedback loops

Do not turn this into broad all-platform autoposting unless explicitly asked.

## Source of Truth
- SQLite is the real queue/store.
- JSON queue files are compatibility mirrors.
- Do not treat JSON mirrors as the primary state.
- Be careful with queue migrations, schedule logic, and worker behavior.

## Work Style
- Make the smallest useful change.
- Preserve existing behavior.
- Match existing code style.
- Inspect relevant files before editing.
- Do not rewrite unrelated files.
- Do not rename, move, or reorganize files unless asked.
- Do not add new architecture, libraries, services, or major abstractions without explaining why first.
- Prefer fixing the current system over inventing a new one.

## MVP Rules
This project is still evolving. When requirements are unclear:
- state the ambiguity
- choose the safest small step
- keep changes reversible
- avoid scope creep
- ask before expanding the feature

## Testing and Safety
Before finishing:
- summarize changed files
- mention commands/tests run
- flag anything untested, risky, or incomplete

For tests and commands, check:
- `Docs/builder/terminal-commands.md`

## Platform Priorities
Core/current:
- Dev.to
- Facebook
- Pinterest
- Reddit, but only if treated carefully because it is not proven live at the same reliability level

De-prioritized unless explicitly requested:
- X
- LinkedIn
- Instagram
- Threads
- Substack
- broad all-platform autoposting

## Personal Workflow Preferences
- Keep explanations practical.
- Tell me when an idea is getting too big.
- Do not silently “improve” unrelated things.
- Do not change art/style/content direction unless asked.
- If something is risky, say so before touching it.
