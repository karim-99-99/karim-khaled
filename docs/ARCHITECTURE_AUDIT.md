# Architecture Audit — Data & Storage

**Honest assessment of where your data lives and what will survive a redeploy.**

---

## Quick answers to your questions

| Question | Answer |
|----------|--------|
| **Will buying a domain delete my data?** | **No.** A domain only points to your app. It does not touch the server, database, or files. |
| **When to upload data — before or after launch?** | **Before launch.** Test real flows (admin uploads, student progress, permissions) on the **correct** setup (cloud DB + cloud storage) before you go live. |
| **Are videos stored on Render’s disk?** | **Yes.** `FileField(upload_to='videos/')` → `backend/media/` on the Render container. Ephemeral. |
| **Are files (PDFs, etc.) stored locally?** | **Yes.** Same `media/` folder on Render disk. |
| **Using S3 / Cloudinary / Firebase?** | **No.** Everything is local filesystem. You **should** be concerned. |

**Critical rule:** Never store user data, videos, or uploads on a server’s local filesystem in production. Render can redeploy, containers restart, disk resets, scaling wipes files — that’s where people lose everything.

---

## Current Setup (as of this audit)

| Layer | Where it runs | Where data lives | Survives redeploy? |
|-------|----------------|------------------|--------------------|
| **Frontend** | Vercel | N/A (static) | ✅ Yes |
| **Backend API** | Render | — | ✅ Yes (stateless) |
| **Database** | **Render disk** (SQLite) | `backend/db.sqlite3` | ❌ **No** |
| **Files (videos, PDFs, images)** | **Render disk** | `backend/media/` | ❌ **No** |

---

## The Critical Facts

### 1. Database → SQLite on Render disk

- **Config:** `backend/config/settings.py`  
  `DATABASES = { 'default': { 'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'db.sqlite3' } }`
- **No** `DATABASE_URL` or PostgreSQL (or other cloud DB) is used.
- On Render, the app runs in a container. The filesystem is **ephemeral**:
  - Redeploy → new container → **db.sqlite3 is gone**.
  - Restart / scale → same risk.
- **You have no automatic backups.** If the container is recreated, all users, progress, questions, and metadata are lost.

### 2. File storage → Local `media/` on Render disk

- **Config:** `MEDIA_ROOT = BASE_DIR / 'media'`, `MEDIA_URL = '/media/'`
- Models use:
  - `FileField(upload_to='videos/')` — videos
  - `FileField(upload_to='files/')` — PDFs etc.
  - `ImageField(upload_to='questions/')` — question images
- Uploads are written to `backend/media/` on the **same ephemeral disk**.
- Media is served only when `DEBUG=True` (`config/urls.py`). In production you typically use `DEBUG=False` → **media URLs often 404** anyway. Even if you served them, **files are still on Render disk** and disappear on redeploy.
- **Videos, PDFs, and question images are not in any cloud storage.** They are as fragile as the database.

### 3. What you do have

- Frontend on Vercel → ✅ fine.
- Backend on Render → ✅ fine as an API host.
- CORS, env vars for `VITE_API_URL`, etc. → ✅ generally okay.
- **Domain change** (e.g. buying a custom domain) → **does not touch DB or files.** Your risk is **not** the domain; it’s **where DB and files live**.

---

## Correct Architecture (Target)

```
Frontend (Vercel)
       ↓
Backend API (Render)
       ↓
   ┌───┴───┐
   │       │
   ▼       ▼
Database   File storage
(cloud)    (S3 / Cloudinary / etc.)
```

- **Database:** PostgreSQL (or similar) on a **cloud host** with backups (e.g. Render PostgreSQL, Supabase, Neon, MongoDB Atlas for non‑relational).
- **Files:** **Never** on Render disk. Use **S3, Cloudinary, or Firebase Storage**. Store only URLs (or keys) in the DB.

---

## Migration Plan (High Level)

### Step 1 — Move database to cloud

1. Create a Postgres (or other) database:
   - **Render PostgreSQL** (same account, easy): [Render Postgres](https://render.com/docs/databases)
   - **Supabase** (free tier, backups): [Supabase](https://supabase.com)
   - **Neon** (serverless Postgres): [Neon](https://neon.tech)
2. Get the connection URL (e.g. `DATABASE_URL`).
3. In `backend/config/settings.py`:
   - Use `django-environ` or `os.environ` to read `DATABASE_URL`.
   - If set, use it for `DATABASES['default']` (e.g. `dj-database-url`).
   - Keep SQLite only for local dev when `DATABASE_URL` is missing.
4. Add `DATABASE_URL` to Render **Environment** for the backend service.
5. Run migrations on the **new** DB. Optionally migrate existing data from SQLite (export/import or scripts) if you still have it.

**Outcome:** DB lives in a managed service. Redeploys no longer wipe your data.

### Step 2 — Move files to cloud storage

1. Choose a provider:
   - **AWS S3** (or S3‑compatible): [django-storages S3](https://django-storages.readthedocs.io/en/latest/backends/amazon.html)
   - **Cloudinary** (simple, generous free tier): [django-storages Cloudinary](https://django-storages.readthedocs.io/en/latest/backends/cloudinary.html) or [Cloudinary Django](https://cloudinary.com/documentation/django_integration)
2. Install and configure `django-storages` (and provider‑specific packages if needed).
3. Set `DEFAULT_FILE_STORAGE` (or `STORAGES`) to the cloud backend. Keep `MEDIA_URL` pointing at the storage URLs (or CDN).
4. Add required keys (e.g. `AWS_*`, `CLOUDINARY_*`) to Render env. **Never** commit them.
5. **Existing files:** If you have important uploads in `media/`, migrate them to the new storage (one‑off script) and update DB references if necessary. New uploads go straight to cloud.

**Outcome:** Videos, PDFs, and images are in cloud storage. Redeploys do not affect them.

### Step 3 — Environment variables checklist

- [ ] `DATABASE_URL` (or equivalent) for DB.
- [ ] `SECRET_KEY` unique and kept secret.
- [ ] `DEBUG=False` in production.
- [ ] `ALLOWED_HOSTS` and CORS origins include your frontend (and API) domains.
- [ ] Storage keys (S3, Cloudinary, etc.) only in env, not in code.

### Step 4 — Backups

- Enable **automated backups** on your DB provider (e.g. Render Postgres, Supabase).
- Storage providers (S3, Cloudinary) typically have durability and versioning; use them.

### Step 5 — Domain (optional, separate from data)

- Buy a domain (Namecheap, Cloudflare, etc.).
- Point it to Vercel (frontend) and, if you use a custom API domain, to Render.
- Update `VITE_API_URL`, CORS, and `ALLOWED_HOSTS` accordingly.
- **Changing domains does not delete or move DB/files.** Data risk comes only from DB and storage placement.

---

## Pre‑Launch Checklist (Answer YES to All)

Before treating the platform as “launched”:

- [ ] **Database is cloud‑hosted** (no SQLite on Render).
- [ ] **Automatic DB backups** are enabled.
- [ ] **Files are NOT on backend disk** (S3 / Cloudinary / etc.).
- [ ] **Env vars** for DB and storage are set on Render (and Vercel if needed), never hardcoded.
- [ ] **Admin upload** (videos, files) tested against **cloud storage**.
- [ ] **Student flows** (MCQ, progress, media) tested with **cloud DB + cloud files**.
- [ ] **Domain** connected (if you use one).
- [ ] **SEO / Search Console** only after the above are done.

If any is **no**, fix that before relying on the platform for real users or content.

---

## Summary

- **Domain:** Safe. It doesn’t touch DB or files.
- **Database:** Currently on Render disk (SQLite) → **high risk**. Move to cloud Postgres (or similar) and enable backups.
- **Files:** Currently on Render disk (`media/`) → **high risk**. Move to S3 / Cloudinary (or similar) and stop using local `media/` in production.

**Rule:** Never keep user data, videos, or uploads on the server’s local filesystem in production. Your current setup does exactly that; this document is a roadmap to fix it.
