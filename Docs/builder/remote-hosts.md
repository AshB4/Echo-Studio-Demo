# Remote Hosts

Primary command reference for SSH, rsync, and host ops:

- `Docs/builder/terminal-commands.md`

## HP over Tailscale

- Host label: `ash-HP`
- User: `ash`
- Tailscale IPv4: `100.69.25.68`
- Repo path: `/home/ash/N8tiveFlow`
- Affiliate batch path: `/home/ash/N8tiveFlow/backend/config/affiliate-batches`

## Notes

- HP has `tailscale`, `rsync`, and `ssh` installed at `/usr/bin/...`
- Mac local hostname observed during this session: `MacBook-Pro.local`
- Keep long-form remote commands in `Docs/builder/terminal-commands.md` and keep this file focused on host facts.
- Remote Pinterest batch import proved working on `2026-05-07` via:
  - `ssh ash@100.69.25.68 "cd /home/ash/N8tiveFlow/backend && node scripts/import-affiliate-batch.mjs --start-date 2026-05-07 --cadence-mode random_4_6 --random-seed remote-hp-mix config/affiliate-batches/scary-kawaii-halloween-25pins.json config/affiliate-batches/vintage-password-logbook-mothersday-evergreen.json"`
- That run created `55` scheduled Pinterest posts on the HP queue with no UI interaction on the host itself.
