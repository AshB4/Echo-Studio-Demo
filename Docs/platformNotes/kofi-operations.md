# Ko-fi Operations Strategy

## Ko-fi Role In Ecosystem

Ko-fi is:
- relationship-first
- creator-trust focused
- softer and more personal
- better for supporters than cold discovery

Ko-fi is NOT:
- primary SEO infrastructure
- canonical publishing source
- aggressive sales automation
- high-frequency posting lane

> Ko-fi is your relationship layer, not your SEO layer.

---

## Ko-fi Content Mix

Recommended mix:
- 40% creator/process updates
- 30% useful/free value
- 20% soft product mentions
- 10% direct asks/support reminders

Avoid making every Ko-fi post transactional.

---

## Ko-fi Best Content Types

Strong formats:
- build logs
- sketchbook/devlog posts
- "what I'm working on"
- downloadable freebies
- early previews
- behind-the-scenes process
- personal reflections
- mini tutorials
- resource collections
- supporter-only extras

Weak formats:
- generic engagement bait
- repost spam
- keyword stuffing
- hard CTA copy
- overproduced marketing language

---

## Ko-fi Tone Rules

Tone should feel:
- human
- direct
- appreciative
- slightly informal
- creator-owned

Avoid:
- corporate tone
- fake urgency
- hype-heavy launch copy
- AI-slop feeling

---

## Ko-fi Link Rules

Allowed:
- Gumroad links
- Amazon links
- canonical blog links
- freebie/download links

Preferred behavior:
- explain WHY the link matters first
- link second

Good:
> "I made a printable because I couldn't find one that didn't look cursed."

Bad:
> "LIMITED TIME DOWNLOAD NOW."

---

## Ko-fi Automation Rules

Ko-fi should remain:
- semi-manual
- lightly automated
- curated

Do NOT:
- auto-crosspost every platform post
- flood Ko-fi with Pinterest-style content
- mass syndicate affiliate pins

Best workflow:
- selective reposting only
- creator-aware filtering
- process-focused adaptation

---

## Ko-fi Canonical Rules

Ko-fi posts are:
- supplementary
- relationship-supporting
- not canonical authority targets

If a longform post exists elsewhere:
- link back to canonical source
- optionally use excerpt-first posting

Preferred canonical sources:
- AshB4 Studio (Astro)
- Dev.to
- blog/docs system

---

## Ko-fi CTA Rules

Preferred CTAs:
- soft support asks
- feedback invitations
- community participation
- "follow the build"
- optional downloads

Avoid:
- constant direct selling
- pressure-based language
- scarcity spam

---

## Ko-fi Scheduling Rules

Suggested cadence:
- 1–3 meaningful posts weekly
- prioritize quality over volume

Do NOT optimize for:
- daily posting quotas
- algorithm-chasing behavior

---

## Ko-fi Asset Strategy

Every Ko-fi post should ideally support one of:
- creator trust
- audience familiarity
- product understanding
- supporter retention
- ecosystem migration toward canonical platforms

---

## Content Suitability Scoring

Not every post should go everywhere.

Examples:
- Pinterest pin → terrible for Ko-fi
- Devlog → excellent for Ko-fi
- SEO tutorial → great for Dev.to
- deeply personal creator update → bad for LinkedIn, good for Ko-fi/Facebook

The system prevents "multi-platform everything syndrome" which kills authenticity fast.

---

## Content Intent Filtering

Posts should declare intent from:
- `discovery`
- `authority`
- `relationship`
- `conversion`
- `retention`
- `community`
- `archival`

Platforms filter intelligently by intent:
- Ko-fi rejects `discovery` and `conversion` intents
- Pinterest accepts `discovery` and `conversion`
- Dev.to accepts `authority` and `community`

---

## Webhook Integration (Future)

Ko-fi webhooks send payment notifications:
- **Webhook URL**: Must start with `https://`
- **Data Format**: `application/x-www-form-urlencoded`, `data` field contains JSON string
- **Response**: Return `200` to confirm receipt
- **Types**: `Tip`, `Subscription`, `Commission`, `Shop Order`

Subscription fields:
- `is_subscription_payment`: true for monthly payments
- `is_first_subscription_payment`: true on first payment
- `tier_name`: membership tier name

Shop Orders:
- `shop_items`: details including `direct_link_code`

Important: Check `is_public` field before displaying payments publicly.

Testing: Use [webhook.site](https://webhook.site/) to inspect incoming requests.

Zapier: Connect Ko-fi to hundreds of apps for no-code workflows.
