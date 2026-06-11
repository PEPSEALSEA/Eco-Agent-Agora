---
name: sheets-db
description: >-
  Read live Google Sheets data via Cloudflare Worker for Eco-Agent Agora.
  Use when checking campaign/scenario progress, DB state, what content exists,
  session stats, XP/streak, or whether dev work matches production data.
---

# Google Sheets / DB context (Eco-Agent Agora)

Production data lives in **Google Sheets**, accessed via **Cloudflare Worker** (`read_all`).

Cursor cannot open Sheets directly unless MCP is configured. Use the snapshot workflow below.

## Refresh snapshot (preferred)

```bash
npm run db:snapshot
```

Requires `.env.local` with:
- `NEXT_PUBLIC_GAS_URL`
- `NEXT_PUBLIC_GAS_SECRET_KEY`

Output: `data/db-snapshot.json` (local only, gitignored)

Then read `data/db-snapshot.json` for:
- `summary` — row counts
- `campaign` — full campaign scenario rows from DB
- `scenarios` — all scenarios (slim fields)
- `recent_sessions` — last 20 plays
- `users` / `skill_progress` — streak & XP

Run `db:snapshot` before answering questions about:
- ด่าน campaign มีกี่ด่าน / ครบหรือยัง
- content ใน DB vs `devProgress.json`
- playtest / session / evaluation status

## One-off API (no file)

```bash
# PowerShell — replace from .env.local
$url = $env:NEXT_PUBLIC_GAS_URL
$key = $env:NEXT_PUBLIC_GAS_SECRET_KEY
Invoke-RestMethod "$url`?action=read&table=scenarios&key=$key"
```

Tables: `users`, `scenarios`, `sessions`, `messages`, `feedback_logs`, `skill_progress`, `real_world_journals`

## Optional: Google Sheets MCP

For live Sheet editing in Cursor, add a Google Sheets MCP server in Cursor Settings → MCP.
Share the spreadsheet with the service account email. This project does not ship MCP config by default.

## Compare with dev progress

| DB signal | devProgress task |
|-----------|------------------|
| `campaign_stages >= 3` | d7-7.7 campaign content |
| `skill_progress_rows > 0` | p1-12 XP |
| users have `streak_count` | p1-13 streak |
| freeplay count | p1-10 |

Campaign content is **DB-only** — do not expect `src/data/scenarios/*.json`.

## Phase system migration

Campaign scenarios must have **4 phases**: `opening` → `conflict` → `negotiation` → `resolution`.

```bash
npm run db:migrate-phases          # dry-run
npm run db:migrate-phases:apply    # write to Sheets
```

Validate: `db-snapshot.json` → `campaign[].phase_rules.phases.length` should be 4.
