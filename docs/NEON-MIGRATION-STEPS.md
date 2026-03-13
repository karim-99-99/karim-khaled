# Move Your Data to Neon and Connect Backend (short steps)

Use this when your Render PostgreSQL is working and you want to **export the data** and **connect the backend to Neon** instead.

---

## Step 1 — Create Neon and get connection string (≈5 min)

1. Open **[neon.tech](https://neon.tech)** and sign in (or sign up).
2. Click **New Project** → choose a name and a **region near your Render backend** (e.g. Frankfurt).
3. After the project is created, open the **Dashboard** and copy the **connection string** (Connection string / PSQL).
   - It should look like:  
     `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`
4. Save it somewhere safe (you’ll use it in Step 3 and Step 5).

---

## Step 2 — Export data from Render (backend does it for you)

Your backend on Render can connect to Render Postgres, so we use an **export URL** instead of `pg_dump` from your PC.

1. In **Render Dashboard** → open your **backend** service (**kareem-khalid-backend**).
2. Go to **Environment** and add a variable:
   - **Key:** `DB_EXPORT_SECRET`  
   - **Value:** a long random string only you know (e.g. `MySecretExportKey2024XyZ`).
3. Save and wait for the service to **redeploy** and become **Live**.
4. In your browser, open (replace with your real backend URL and secret):  
   **`https://kareem-khalid-backend.onrender.com/api/export-db/?secret=MySecretExportKey2024XyZ`**  
   (Use the URL from Render for your backend, e.g. `https://your-service-name.onrender.com`.)
5. The page will **download a file** named `backup.json`. Save it (e.g. in your project folder).
6. **(Security)** In Render → Environment, **delete** `DB_EXPORT_SECRET` (or change it) so the export URL stops working.

---

## Step 3 — Point the backend to Neon

1. In **Render Dashboard** → your **backend** service → **Environment**.
2. Find **`DATABASE_URL`**.
3. **Replace** its value with the **Neon connection string** from Step 1 (one line, no spaces/newlines).  
   Example:  
   `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`
4. Save. Render will **redeploy** the backend.  
   On start, the backend will run `migrate` and create empty tables on Neon.

---

## Step 4 — Load your data into Neon

After the backend has successfully deployed (and migrations have run on Neon), load the exported data.

**Option A — From your PC (recommended if Neon is reachable):**

1. Open PowerShell and go to the backend folder:
   ```powershell
   cd "D:\ALX Front-End\code\kareem-khalid\backend"
   ```
2. Set Neon as the database for this session (use your real Neon URL):
   ```powershell
   $env:DATABASE_URL = "postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
   ```
3. Run (if `backup.json` is in the project root):
   ```powershell
   python manage.py loaddata ../backup.json
   ```
   Or if `backup.json` is inside `backend`:
   ```powershell
   python manage.py loaddata backup.json
   ```
4. If you see errors about duplicate keys or existing data, you can run loaddata once on a **fresh** Neon DB (right after the first deploy with Neon, before any other data is added).

**Option B — If your backend has a “Shell” on Render:**  
Upload `backup.json` (e.g. via a temporary endpoint or paste), then in the shell set `DATABASE_URL` to the Neon URL and run `python manage.py loaddata backup.json`.

---

## Step 5 — Check that the backend uses Neon

1. Open your app (or backend health URL) and check that login, data, etc. work.
2. In Render → backend **Logs**, you should see no errors about the old Render database.

---

## Summary

| Step | What you do |
|------|-------------|
| 1 | Create Neon project, copy connection string. |
| 2 | Add `DB_EXPORT_SECRET` on Render, open export URL in browser, save `backup.json`, then remove the secret. |
| 3 | Set `DATABASE_URL` on Render backend to the Neon connection string; let it redeploy. |
| 4 | Run `python manage.py loaddata backup.json` (from PC or Render Shell) with `DATABASE_URL` pointing to Neon. |
| 5 | Test the app and logs. |

After this, your **data is in Neon** and the **backend is connected to Neon** (PostgreSQL on Render is no longer used by this app).
