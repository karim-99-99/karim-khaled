# Connect Backend (Render) to Neon — Same Tables, Fresh Data

You only want the **backend on Render** to use **Neon** instead of Render PostgreSQL. Same schema (tables, structure), no need to copy old data.

---

## Step 1 — Create Neon database

1. Go to **[neon.tech](https://neon.tech)** → Sign up / Sign in.
2. **New Project** → name it (e.g. `kareem-khalid`) → choose a **region** (e.g. Frankfurt, close to Render).
3. After creation, open the project → **Connection details**.
4. Copy the **connection string** (PSQL). It looks like:
   ```
   postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
   Keep it in one line. Save it somewhere.

---

## Step 2 — Point Render backend to Neon

1. **Render Dashboard** → your **backend** service (e.g. `kareem-khalid-backend`).
2. Go to **Environment**.
3. Find **`DATABASE_URL`**.
4. **Replace** its value with the **Neon connection string** from Step 1.
   - One line only, no spaces or newlines.
   - Must end with `?sslmode=require` (Neon needs SSL).
5. **Save**. Render will redeploy the backend automatically.

---

## Step 3 — Start Command must run migrate (required for tables on Neon)

If you only run `gunicorn`, **no tables are created** on Neon. You must run migrations on start.

1. **Render Dashboard** → your backend service → **Settings** (or **Build & Deploy**).
2. Find **Start Command**.
3. Set it to (all in one line):
   ```bash
   python manage.py migrate && python manage.py seed_initial_data && gunicorn config.wsgi:application
   ```
   If your service **Root Directory** is the repo root (not `backend`), use:
   ```bash
   cd backend && python manage.py migrate && python manage.py seed_initial_data && gunicorn config.wsgi:application
   ```
4. **Save**. Then trigger **Manual Deploy** (or push a commit so Render redeploys).

When the service starts:
- `migrate` → creates all tables on Neon.
- `seed_initial_data` → creates default users (admin, student, etc.).
- `gunicorn` → starts the app.

After deploy finishes, check Neon → **Tables** again; you should see `api_user`, `api_lesson`, etc.

---

## Step 4 — Check that the backend is really using Neon

**1. Neon Dashboard — see tables and connections**

- Go to **[console.neon.tech](https://console.neon.tech)** → your project.
- Open **Tables** (or **SQL Editor**): you should see your app tables (`api_user`, `api_lesson`, `api_question`, etc.). If they exist and have rows (e.g. after login/seed), the app is using Neon.
- In the project overview, check **Connections** or **Monitoring**: when you use the app, you should see active connections or queries. That means Render is talking to Neon.

**2. Do something in the app, then check Neon**

- In your app: register a new user, or log in, or create a lesson (whatever your app allows).
- In Neon: **SQL Editor** → run:
  ```sql
  SELECT * FROM api_user ORDER BY id DESC LIMIT 5;
  ```
  (or check the table that matches what you created). If you see the new row, the backend is writing to Neon.

**3. Render logs**

- Render Dashboard → your backend service → **Logs**.
- Look for errors like “could not connect to database” or “connection refused”. If there are **no** database connection errors and the service is **Live**, it usually means it connected to the DB (Neon) successfully.

**4. Optional: turn off Render PostgreSQL**

- If you still have the old Render PostgreSQL service, you can **suspend** it or leave it. If the app keeps working and you see data in Neon, you’re definitely on Neon.

---

## Summary

| What you do | Result |
|-------------|--------|
| Create Neon project, copy connection string | New empty Postgres in the cloud |
| Set `DATABASE_URL` on Render backend to that string | Backend uses Neon instead of Render Postgres |
| Redeploy (automatic after saving env) | Migrations run on Neon → same tables; seed adds default data |
| No export, no loaddata | You do **not** restore old Render data; you start fresh on Neon with the same structure |

You can delete or leave the old Render PostgreSQL service; the backend no longer uses it.
