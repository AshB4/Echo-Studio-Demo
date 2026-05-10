# Terminal Commands

This is the practical command reference for PostPunk.

Use this file when you need to run something, not when you need strategy or architecture context.

Related docs:

- `Docs/builder/README-OPERATIONS.md` for overall operating flow
- `Docs/builder/code-map.md` for ownership and source-of-truth notes
- `Docs/builder/project-state.md` for current platform/runtime state
- `Docs/builder/remote-hosts.md` for host facts
- `Docs/hp-runtime-truth.md` for HP debugging rules

## Local App

Install dependencies:

```bash
cd /path/to/N8tiveFlow/backend && npm install
cd /path/to/N8tiveFlow/frontend && npm install
```

Run backend API:

```bash
cd /path/to/N8tiveFlow/backend
npm run start
```

Run frontend:

```bash
cd /path/to/N8tiveFlow/frontend
npm run dev
```

Run worker manually:

```bash
cd /path/to/N8tiveFlow/backend
npm run worker
```

## Backend Scripts

Health/tokens:

```bash
cd /path/to/N8tiveFlow/backend
npm run health:tokens
```

Queue dry run:

```bash
cd /path/to/N8tiveFlow/backend
npm run queue:dry-run
```

Pinterest remix/rebalance:

```bash
cd /path/to/N8tiveFlow/backend
npm run queue:rebalance-pinterest
```

Daily summary:

```bash
cd /path/to/N8tiveFlow/backend
npm run summary:daily
npm run summary:daily -- --send
```

Snapshot backup:

```bash
cd /path/to/N8tiveFlow/backend
npm run backup:snapshot
```

Revenue export template:

```bash
cd /path/to/N8tiveFlow/backend
npm run revenue:export
```

Product finder:

```bash
cd /path/to/N8tiveFlow/backend
npm run product-finder
npm run product-finder -- --source creators --dry-run
```

Tests:

```bash
cd /path/to/N8tiveFlow/backend
npm test
node --test test/post-to-kofi.test.mjs
```

## Platform Session Helpers

Capture X session:

```bash
cd /path/to/N8tiveFlow/backend
node scripts/capture-x-session.mjs
```

Capture Ko-fi session with dedicated profile:

```bash
cd /path/to/N8tiveFlow/backend
node scripts/capture-kofi-session.mjs
```

Capture Facebook session with dedicated profile:

```bash
cd /path/to/N8tiveFlow/backend
node scripts/capture-facebook-session.mjs
```

Test a Ko-fi post by post id:

```bash
cd /path/to/N8tiveFlow/backend
node scripts/manual/test-kofi-post.mjs --post-id YOUR_POST_ID --headless false
```

Test a Ko-fi post ad hoc:

```bash
cd /path/to/N8tiveFlow/backend
node scripts/manual/test-kofi-post.mjs --title "Quick Ko-fi test" --body "Testing the browser flow." --media ../frontend/assets/devto/DevRage.png --headless false
```

Pinterest state/session capture:

```bash
cd /path/to/N8tiveFlow/backend
node scripts/platforms/social/capture-pinterest-state.js
```

## Remote HP

Host:

```bash
ssh ash@100.69.25.68
```

Basic remote status:

```bash
ssh ash@100.69.25.68 "hostname && date && cd /home/ash/N8tiveFlow/backend && pwd"
```

Tail worker log:

```bash
ssh ash@100.69.25.68 "cd /home/ash/N8tiveFlow/backend && tail -n 80 worker.out"
```

Run worker on HP:

```bash
ssh ash@100.69.25.68 "cd /home/ash/N8tiveFlow/backend && npm run worker"
```

Sync files to HP:

```bash
rsync -avz LOCAL_PATH ash@100.69.25.68:/home/ash/N8tiveFlow/REMOTE_PATH
```

Sync a whole asset folder to HP:

```bash
rsync -avz frontend/assets/devto/ ash@100.69.25.68:/home/ash/N8tiveFlow/frontend/assets/devto/
```

Remote Pinterest affiliate import:

```bash
ssh ash@100.69.25.68 "cd /home/ash/N8tiveFlow/backend && node scripts/import-affiliate-batch.mjs --start-date 2026-05-07 --cadence-mode random_4_6 --random-seed remote-hp-mix config/affiliate-batches/scary-kawaii-halloween-25pins.json config/affiliate-batches/vintage-password-logbook-mothersday-evergreen.json"
```

## Queue / DB Inspection

List queued Dev.to posts locally:

```bash
cd /path/to/N8tiveFlow
node --input-type=module -e "import { initLocalDb, readStoreSnapshot } from './backend/utils/localDb.mjs'; await initLocalDb(); const s=await readStoreSnapshot(); const rows=s.posts.filter(p=>((p.targets||[]).some(t=>String(t.platform||'').toLowerCase()==='devto')||(p.platforms||[]).includes('devto'))).sort((a,b)=>String(a.scheduledAt||'').localeCompare(String(b.scheduledAt||''))).map(p=>({id:p.id,title:p.title,status:p.status,scheduledAt:p.scheduledAt})); console.log(JSON.stringify(rows,null,2));"
```

List queued Dev.to posts on HP:

```bash
ssh ash@100.69.25.68 "cd /home/ash/N8tiveFlow && node --input-type=module -e 'import { initLocalDb, readStoreSnapshot } from \"./backend/utils/localDb.mjs\"; await initLocalDb(); const s=await readStoreSnapshot(); const rows=s.posts.filter(p=>((p.targets||[]).some(t=>String(t.platform||\"\").toLowerCase()===\"devto\")||(p.platforms||[]).includes(\"devto\"))).sort((a,b)=>String(a.scheduledAt||\"\").localeCompare(String(b.scheduledAt||\"\"))).map(p=>({id:p.id,title:p.title,status:p.status,scheduledAt:p.scheduledAt})); console.log(JSON.stringify(rows,null,2));'"
```

## Linux Service Commands

Systemd status:

```bash
systemctl status postpunk-api.service
systemctl status postpunk-worker.timer
systemctl status postpunk-backup.timer
systemctl list-timers | rg postpunk
```

Linux service logs:

```bash
tail -f /opt/postpunk/backend/api.log
tail -f /opt/postpunk/backend/worker.log
tail -f /opt/postpunk/backend/worker.err.log
tail -f /opt/postpunk/backend/backup.log
```

## macOS launchd

Install:

```bash
mkdir -p ~/Library/LaunchAgents
cp /path/to/N8tiveFlow/backend/launchd/com.postpunk.api.plist ~/Library/LaunchAgents/
cp /path/to/N8tiveFlow/backend/launchd/com.postpunk.worker.plist ~/Library/LaunchAgents/
launchctl unload ~/Library/LaunchAgents/com.postpunk.api.plist 2>/dev/null || true
launchctl unload ~/Library/LaunchAgents/com.postpunk.worker.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.postpunk.api.plist
launchctl load ~/Library/LaunchAgents/com.postpunk.worker.plist
```

Check:

```bash
launchctl list | rg postpunk
tail -n 100 /path/to/N8tiveFlow/backend/api.log
tail -n 100 /path/to/N8tiveFlow/backend/worker.log
```

## Notes

- If a command is operationally important, prefer putting it here instead of burying it in strategy docs.
- If a command is very platform-specific, keep the full command here and link to it from the relevant builder doc.
- If HP is dirty, prefer exact `rsync` file sync over risky remote pulls.
