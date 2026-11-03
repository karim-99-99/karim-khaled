# Production outage: empty site + HTTP 500

## Symptom

- https://www.qodrateman.com shows no sections / lessons / questions
- Public API routes return **HTTP 500**
- `GET https://kareem-khalid-backend.onrender.com/api/health/?db=1` returns `{"status":"ok","db":"error"}`

## Root cause

Render’s Django backend cannot open Postgres (Neon). Without a working `DATABASE_URL`, every model query fails → 500 / empty UI.

Observed timeline (GitHub “Keep Neon awake” cron):

| Time (UTC) | `/api/health/?db=1` |
|------------|---------------------|
| 2026-09-29 23:09 | `db: ok` |
| 2026-09-30 14:27 | `db: error` |

No app deploy happened between those pings. Typical causes:

1. **Neon Free compute hours exhausted** (project suspended until next billing cycle or plan upgrade)
2. Neon password / connection string rotated but **Render `DATABASE_URL` not updated**
3. Neon project deleted or branch reset

The previous keepalive cron pinged Neon every **4 minutes** for ~12 hours/day. That keeps compute warm and can burn the free **~100 CU-hour** monthly cap in about a week.

## Fix (ops — required)

1. Open [Neon Console](https://console.neon.tech) → project used by qodrateman.
2. If suspended / out of CU: restore, upgrade, or create a new project and restore data.
3. Copy connection string ending with `?sslmode=require`.
4. Render → `kareem-khalid-backend` → **Environment** → set `DATABASE_URL` to that string (one line).
5. Confirm Start Command still runs migrate + optional seed:
   ```bash
   python manage.py migrate && python manage.py seed_initial_data --only-if-empty && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 1 --threads 8 --timeout 90 --keep-alive 5
   ```
   (Prefix with `cd backend &&` if Root Directory is the repo root.)
6. Manual Deploy, then verify:
   ```bash
   curl -sS 'https://kareem-khalid-backend.onrender.com/api/health/?db=1&detail=1'
   ```
   Expect `"db":"ok"`. Then:
   ```bash
   curl -sS 'https://kareem-khalid-backend.onrender.com/api/sections/'
   ```
   Expect JSON array, not 500.

## Neon keepalive schedule (Asia/Riyadh)

| Window | Behavior |
|--------|----------|
| **09:00 → 01:00** (next day) | Keep awake (WSGI every 4 min + GitHub cron `*/4` at 06–21 UTC) |
| **01:00 → 09:00** | No keepalive — Neon Free may autosuspend overnight |

Override on Render with `NEON_KEEPALIVE_START_HOUR=9` / `NEON_KEEPALIVE_END_HOUR=1` (end exclusive), or `NEON_KEEPALIVE_DISABLED=1`.

~16h/day worst case ≈ 480 CU-hours/month — **still far above Neon Free (~100)**. Prefer upgrading Neon, or shorten the window, if the monthly limit hits again.

## Code changes in this branch

- Health `?db=1` returns sanitized `db_error` + `database` host metadata.
- Bunny health no longer crashes with 500 when the DB is down.
- Keepalive limited to **09:00–13:00 Riyadh**; cron **fails** when `db != ok`.
