# HP Runtime Truth

This file exists to stop the HP box from "feeling wrong" when it is actually reading partial or stale state.

Use this as the operating reference for the HP deployment.

## Core rule

The HP is only as accurate as the source it is reading.

When HP reports the wrong facts, the cause is usually one of:

- stale repo files
- stale queue/runtime state
- stale agent context
- wrong browser profile
- wrong env/session data
- overlapping workers

The fix is almost never "poke it more."
The fix is to identify which source of truth is out of sync.

## Canonical sources of truth

### Code truth

- GitHub `main` is canonical for committed code and docs.
- HP should either:
  - pull cleanly from GitHub, or
  - receive exact file updates via `rsync`
- Do not assume HP is current just because one file was copied over.

### Queue truth

- Primary operational store:
  - `backend/data/postpunk.sqlite`
- Compatibility mirrors:
  - `backend/queue/postQueue.json`
  - `backend/queue/postedLog.json`
  - `backend/queue/rejections.json`

If the queue JSON and SQLite disagree, treat the SQLite-backed app state as more authoritative and investigate why mirrors drifted.

### Runtime truth

- Worker behavior is determined by:
  - current code on disk
  - `.env`
  - resolved account config
  - browser session/profile state
  - current queue state

Do not trust old agent memory over current runtime files.

### Browser truth

For browser-driven lanes like Facebook and Pinterest, the real truth is:

- the exact Chrome profile directory the automation launches
- the saved session inside that profile

Being logged into a different visible Chrome profile does not help if PostPunk launches another profile path.

## Current HP lanes

Treat these as the active operational lanes unless changed in code/env:

- `facebook`
- `pinterest`

De-prioritized or inactive lanes should not be left as approved queue items:

- `linkedin`
- `reddit`
- `x`

If those old targets remain in approved/retry state, they create fake overdue noise and misleading alerts.

## Known account identifiers

Facebook:

- `fb-color-with-ash`
- `fb-main-profile`

`fb-main-profile` is the guarded personal lane:

- opt-in
- not a blind duplicate lane
- weekends-only by default
- capped at `3/week`

## Known failure pattern categories

### 1. Posted successfully, queue says failed

Usually caused by:

- overlapping worker runs
- browser clone/session cleanup errors after publish
- stale queue state not being reconciled

Check:

- whether the post is actually live on the platform
- whether `postedLog.json` or archive state contains the post
- whether the worker lock prevented overlap

### 2. "Nothing is connected"

Usually caused by:

- stale code on HP
- wrong `.env`
- missing session file
- wrong Chrome profile path
- an agent inspecting the wrong repo copy or stale context

Check:

- repo path
- active platform list
- account IDs
- browser profile paths

### 3. "No posts ready" when Telegram sounded alarming

Usually caused by:

- stale overdue items from inactive lanes
- future scheduled times not actually due yet
- alerting logic surfacing old queue noise

Check:

- due timestamps relative to HP clock
- active platforms
- whether overdue items are on disabled lanes

## Operational rules

### 1. Keep one code truth

- Prefer GitHub `main` as canonical.
- If HP is dirty, `rsync` exact changed files instead of doing a risky pull.
- Avoid letting HP stay half-updated.

### 2. Keep one queue truth

- Remove approved posts that only target inactive lanes.
- Remove stale rejection noise for dead lanes when it starts polluting alerts.
- Do not leave queue junk around "just in case."

### 3. Keep one browser truth

- Automation must use the same Chrome profile/session you intend it to use.
- If user logs into one profile and automation launches another, HP will report nonsense.

### 4. Keep one runtime truth

- One worker at a time.
- Respect the worker lock.
- Do not infer runtime health from fan noise, old logs, or partial alerts.

## What to check first when HP seems wrong

1. Confirm the repo path you are inspecting is the real one.
2. Confirm the code on HP matches the intended local/GitHub version.
3. Confirm the queue does not contain stale approved dead-lane posts.
4. Confirm the worker is not overlapping another run.
5. Confirm the browser automation is using the intended Chrome profile.
6. Confirm the post is actually due right now, not just "today."

## Recommended status command

PostPunk should grow a dedicated diagnostic command such as:

- `npm run ops:status`

That command should report:

- active platforms
- resolved account IDs
- queue counts by status/platform
- next due posts
- worker lock status
- browser profile/session paths
- obvious missing env/config files

Until that exists, treat ad hoc checks as necessary but inferior.

## Practical conclusion

The HP does not need to become more complex.

It needs:

- fewer contradictory sources
- cleaner queue state
- explicit browser profile truth
- a simple diagnostic surface

That is how the box gets "smarter."
