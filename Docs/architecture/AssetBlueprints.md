# Asset Blueprints

Asset Blueprints define how campaign assets should be generated.

They are the contract between Campaign Planner and future AI generators.

```text
Mission
  -> Knowledge
  -> Campaign Plan
  -> Asset Blueprints
  -> AI Asset Generator
  -> Campaign Assets
  -> Review
  -> Publishing
```

## Responsibility Split

Campaign Planner decides what should be created.

Asset Blueprints define how each planned asset should be created.

AI Asset Generator will eventually execute against the blueprint.

Campaign Assets will contain generated content.

Review will approve, reject, or request changes.

Publishing will distribute approved assets.

## Blueprint Contents

An Asset Blueprint includes:

- campaign and mission references
- recommended asset reference
- asset type and platform
- goal, purpose, and audience
- persona and tone
- hook strategy
- CTA strategy
- SEO strategy
- knowledge source references
- structured generation instructions
- review checklist
- metadata

Knowledge source references are pointers only:

```json
{
  "sourceId": "ks_123",
  "sourceType": "brand",
  "reason": "Apply brand voice constraints."
}
```

Phase 3.5 does not load files, call AI, create content, publish, or touch legacy queue behavior.

## Deterministic Blueprint Rules

Phase 3.5 uses deterministic mappings:

- Pinterest uses professional persona, curiosity hooks, and vertical pin format.
- Blog uses long length and evergreen SEO.
- Email uses direct CTA.
- Landing Page uses conversion CTA.

These rules create generation settings, not prompts.

## Future Work

Future work should add:

- LLM prompt assembly
- Prompt templates
- Multi-model routing
- Image generation
- SEO optimization
- Brand adaptation
- A/B blueprint variants
- Performance feedback

