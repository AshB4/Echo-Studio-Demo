# AI Generator

The AI Generator is the Echo Studio domain boundary that turns an approved Asset Blueprint into a Campaign Asset.

It does not decide strategy, create campaign plans, or modify blueprints. It executes the structured instructions it receives and stores the generated result as a Campaign Asset.

## Architecture Flow

Mission

->

Knowledge

->

Campaign Planner

->

Asset Blueprint

->

Generation Profile

->

AI Generator

->

Campaign Asset

->

Review

->

Publishing

->

Analytics

## Responsibilities

The Planner decides what should exist.

The Asset Blueprint decides how an asset should be created.

The Generation Profile decides how the AI thinks: model, provider, reasoning level, temperature, token limits, quality target, voice, and image model.

The Generator executes the blueprint.

The Campaign Asset stores the generated result.

## Campaign Asset Lifecycle

Campaign Assets support these statuses:

- draft
- generated
- review
- approved
- rejected
- published
- archived

Phase 4 stores Campaign Assets in memory only. This keeps the domain contract visible while avoiding database, queue, publishing, and review changes.

## Deterministic Foundation

Phase 4 does not call OpenAI, Anthropic, Google, local models, or any AI SDK.

The generator creates deterministic placeholder content from an Asset Blueprint:

- Pinterest assets become `Placeholder Pinterest Pin`.
- Blog assets become `Placeholder Blog`.
- Email assets become `Placeholder Email`.
- Landing Page assets become `Placeholder Landing Page`.

This proves the domain shape without introducing model behavior, external dependencies, cost, or runtime variability.

## Future Work

TODO: OpenAI integration.

TODO: Anthropic integration.

TODO: Streaming.

TODO: Prompt assembly.

TODO: Structured output.

TODO: Image generation.

TODO: Multi-model routing.

TODO: Cost tracking.

TODO: Token accounting.

TODO: Prompt caching.

TODO: Retry handling.
