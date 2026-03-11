# Migrate PostgreSQL from Render to Neon

---

## ⚠️ Before You Start — Check Your Render DB Status

Go to Render dashboard → your PostgreSQL service → check if it's **suspended or still accessible**. If suspended, you may still be able to connect for a short time.

---

## STEP 1 — Create Neon Account & Database (5 mins)

1. Go to **[neon.tech](https://neon.tech)** → Sign up free
2. Click **"New Project"**
3. Give it a name → choose region closest to your Render backend
4. Click **Create Project**
5. Copy the connection string — looks like:

   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
   ```

**Save this somewhere safe.**

---

## STEP 2 — Get Your Render DB Connection String (2 mins)

1. Go to Render dashboard → your **PostgreSQL service**
2. Click **"Connect"** or **"Info"**
3. Copy the **External Database URL** — looks like:

   ```
   postgresql://user:password@dpg-xxx.render.com/dbname
   ```

---

## STEP 3 — Dump (Export) Your Data From Render (10 mins)

Open your terminal and run:

```bash
pg_dump "your_render_external_url" > backup.sql
```

**Full example (Render needs `?sslmode=require` to avoid SSL errors):**

```bash
pg_dump "postgresql://user:password@dpg-xxx.render.com/dbname?sslmode=require" > backup.sql
```

✅ When done, check the file exists:

```bash
ls -lh backup.sql
```

You should see a file with size matching your data (hundreds of MBs).

**If pg_dump is not installed:**

```bash
# Mac
brew install postgresql

# Ubuntu/Debian
sudo apt install postgresql-client

# Windows — Option A: Docker (easiest, no PATH needed)
docker run --rm postgres:16 pg_dump "YOUR_RENDER_URL" > backup.sql
```

**Windows — Option B: Install PostgreSQL manually (no winget needed)**  
1. Go to **[postgresql.org/download/windows](https://www.postgresql.org/download/windows/)**  
2. Download the **EDB installer** for the latest PostgreSQL (e.g. 16.x).  
3. Run the installer. You can **uncheck** "Launch Stack Builder" at the end.  
4. Add to PATH: `C:\Program Files\PostgreSQL\16\bin` (use your version number).  
   - Windows: Settings → System → About → Advanced system settings → Environment Variables → under "System variables" select **Path** → Edit → New → paste the path → OK.  
5. **Close and reopen** PowerShell. If the path has spaces, use quotes:
   ```powershell
   cd "D:\ALX Front-End\code\kareem-khalid"
   ```
   To run `pg_dump` **without relying on PATH** (use your PostgreSQL version number):
   ```powershell
   & "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" "postgresql://user:pass@host/db" > backup.sql
   ```

**Windows — Option C: If you have winget**  
`winget install PostgreSQL.PostgreSQL.16` then add `C:\Program Files\PostgreSQL\16\bin` to PATH and restart the terminal.

---

## STEP 4 — Restore (Import) Data Into Neon (10 mins)

```bash
psql "your_neon_connection_string" < backup.sql
```

**Full example:**

```bash
psql "postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require" < backup.sql
```

⏳ This may take a few minutes depending on data size (e.g. 5–15 mins for 500MB–1GB).

---

## STEP 5 — Verify Your Data (3 mins)

Connect to Neon and check your tables:

```bash
psql "your_neon_connection_string"
```

Then inside `psql`:

```sql
-- List all tables
\dt

-- This project (Django app name: api) — main tables to spot-check
SELECT COUNT(*) FROM api_user;
SELECT COUNT(*) FROM api_lesson;
SELECT COUNT(*) FROM api_question;
SELECT COUNT(*) FROM api_section;
SELECT COUNT(*) FROM api_subject;
```

Type `\q` to exit. If tables and row counts look correct — ✅ data is safe.

---

## STEP 6 — Update Your Backend on Render (2 mins)

1. Go to Render → your **backend Web Service**
2. Click **Environment** (or Environment Variables)
3. Find **`DATABASE_URL`**
4. Replace the old Render DB URL with your **Neon connection string**
5. Click **Save Changes** → Render will auto-redeploy

This project uses `DATABASE_URL` in `backend/config/settings.py`; no code changes needed.

---

## STEP 7 — Test Everything (5 mins)

After redeploy finishes:

- Open your website
- Test login / register
- Test loading lessons, questions, any DB-heavy feature
- Check Render logs for any DB connection errors

---

## 🔒 Safety Checklist

- [ ] `backup.sql` file exists and has correct size
- [ ] Neon tables match Render tables (`\dt`)
- [ ] Row counts look correct (e.g. `api_user`, `api_question`, `api_lesson`)
- [ ] `DATABASE_URL` updated in Render env vars
- [ ] Backend redeployed successfully
- [ ] App is working normally
- [ ] Keep `backup.sql` on your machine (don’t delete it)

---

## ⚡ If Something Goes Wrong

| Issue | What to do |
|--------|------------|
| **Connection refused on pg_dump** | Use the **External** URL from Render, not Internal |
| **SSL connection closed unexpectedly** (Render) | See **Workaround for Render SSL** below. |
| **SSL error on Neon restore** | Add `?sslmode=require` to the end of your Neon URL |
| **Tables missing after restore** | Re-run the `psql ... < backup.sql` command (large dumps sometimes need a second pass) |
| **App crashes after update** | Check `DATABASE_URL` has no extra spaces or missing characters; check Render logs for the exact error |
| **could not translate host name "dpg-xxx-a" to address** | `DATABASE_URL` is truncated. Paste the **full** URL (host must end with `.frankfurt-postgres.render.com` or similar). One line, no line break in the middle. |

### Workaround for Render SSL (when pg_dump fails locally)

If `pg_dump` from your PC always fails with *SSL connection has been closed unexpectedly*:

1. **Use Render’s export (if your plan allows)**  
   - Render Dashboard → your PostgreSQL service → **Recovery** tab.  
   - If you see **Create export**, use it. When the export is ready, download the `.dir.tar.gz` file.  
   - Then restore into Neon using `pg_restore` with that directory (see Render’s “Restoring from a backup file” docs).  
   - *Note: Free Render Postgres does not offer Create export; it’s for paid instances.*

2. **Run pg_dump from an environment that can connect**  
   - From **WSL (Ubuntu)** on the same PC: `sudo apt install postgresql-client` then run `pg_dump "URL?sslmode=require" > backup.sql`.  
   - Or use a **cloud shell** (e.g. GitHub Codespaces, GitPod) with `postgresql-client` installed and run the same `pg_dump` there, then download `backup.sql`.

3. **Use Django to dump data (if your backend can connect)**  
   - Set `DATABASE_URL` to your Render DB URL, then from the **backend** folder run the UTF-8-safe script (avoids Windows `UnicodeEncodeError`):  
     `python dumpdata_utf8.py`  
     This writes `../backup.json` in UTF-8.  
   - Or on Linux/WSL: `python manage.py dumpdata --natural-foreign --exclude contenttypes --exclude auth.Permission -o backup.json`  
   - After migrating to Neon, load with: `python manage.py loaddata backup.json`.

4. **No export option and pg_dump fails from your PC — export from Render itself**  
   Your backend on Render *can* connect to Render Postgres (server-to-server). Use the **export endpoint**:
   - In Render Dashboard → your **backend Web Service** → **Environment**.
   - Add: `DB_EXPORT_SECRET` = a random string you choose (e.g. `mySecretExportKey123`).
   - Save and wait for redeploy.
   - In your browser open:  
     `https://YOUR-BACKEND-URL.onrender.com/api/export-db/?secret=mySecretExportKey123`  
     (use your real backend URL and the same secret.)
   - The page will download **backup.json**. Save it.
   - Create your Neon DB, run migrations, then load:  
     `python manage.py loaddata backup.json`  
     (with `DATABASE_URL` set to Neon).
   - Remove or change `DB_EXPORT_SECRET` after you finish the migration (so the URL is no longer usable).
