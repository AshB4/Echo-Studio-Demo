# Reddit Guardrails

## Purpose

Reddit is not a normal outbound distribution lane inside PostPunk.
It should behave like a community-aware trust lane with deliberate friction.

## Product Rule

Do not optimize Reddit for autoposting volume.
Optimize it for:

- pacing
- trust
- subreddit context
- discussion quality
- anti-extraction behavior

## Baseline Safeguards

- Reddit posts default to manual review.
- Reddit posts require a subreddit.
- Reddit posts require a stored reason answering:
  `Why would this subreddit care?`
- Reddit posts should be interesting even without the product link.
- Direct-link pressure should be treated as suspicious.
- Hard-sell Reddit post types should be blocked.

## Goblin-Specific Guidance

Goblin content on Reddit should usually be:

- humor-first
- lore-aware
- identity-forward
- low-pressure
- product-adjacent at most

Avoid:

- repetitive product drops
- obvious batch behavior
- direct sales framing
- community extraction patterns

## Future Extensions

Later, PostPunk should track:

- subreddit-specific pacing
- consecutive self-promotional posts
- soft content mix ratios
- community drift warnings

That layer should be framed as community-aware publishing safeguards, not Reddit automation.
