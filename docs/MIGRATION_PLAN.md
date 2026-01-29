# Migration Plan: DB + File Storage

Concrete steps to move **database** and **files** off Render’s disk. Do **Step 1** first, then **Step 2**.

**تم التنفيذ في المشروع:** دعم Postgres عبر `DATABASE_URL`، وتخزين الملفات عبر **Cloudinary** عند `USE_CLOUDINARY=true`. متغيرات البيئة على Render: [RENDER_ENV_VARS.md](RENDER_ENV_VARS.md).

---

## Step 1 — Cloud database (PostgreSQL)

### 1.1 Create a Postgres database

- **Option A — Render:** [Dashboard → New → PostgreSQL](https://dashboard.render.com/). Create a DB, copy **Internal Database URL** (or External if your app is elsewhere).
- **Option B — Supabase:** [Supabase](https://supabase.com) → New Project → **Settings → Database** → Connection string (URI).
- **Option C — Neon:** [Neon](https://neon.tech) → Create project → connection string.

### 1.2 Install Django DB helpers

```bash
cd backend
pip install dj-database-url psycopg2-binary
```

Add to `requirements.txt`:

```
dj-database-url
psycopg2-binary
```

### 1.3 Update `backend/config/settings.py`

At the top (with other imports):

```python
import os
import dj_database_url
```

Replace the `DATABASES` block with:

```python
DATABASES = {
    'default': {}
}
db_url = os.environ.get('DATABASE_URL')
if db_url:
    DATABASES['default'] = dj_database_url.parse(db_url, conn_max_age=600)
else:
    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
```

### 1.4 Set env var on Render

- Backend service → **Environment** → Add:
  - **Key:** `DATABASE_URL`
  - **Value:** your Postgres connection URL (from 1.1).

### 1.5 Migrate

- Redeploy backend (or run `python manage.py migrate` via Render shell).
- If you have existing SQLite data you care about, export it first (e.g. `python manage.py dumpdata`) and load into Postgres **before** switching, or use a one-off migration script.

**Result:** DB runs in the cloud. Redeploys no longer wipe it.

---

## Step 2 — Cloud file storage (S3 or Cloudinary)

### Option A — AWS S3 (via django-storages)

1. **Install:**

   ```bash
   pip install django-storages boto3
   ```

   Add to `requirements.txt`:

   ```
   django-storages
   boto3
   ```

2. **Create S3 bucket** (AWS Console): private, no public list. Enable CORS if frontend loads files directly from S3.

3. **IAM user:** Create a user with `s3:PutObject`, `s3:GetObject` (and optionally `s3:DeleteObject`) on that bucket. Save **Access Key** and **Secret Key**.

4. **`settings.py`** — add after `MEDIA_ROOT` / `MEDIA_URL`:

   ```python
   # Cloud storage (production)
   if os.environ.get('USE_S3_STORAGE', 'false').lower() == 'true':
       AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
       AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
       AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')
       AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME', 'us-east-1')
       AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com'
       AWS_DEFAULT_ACL = 'private'  # or 'public-read' if you serve directly from S3
       DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
       MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'
   ```

   If using Django 4.2+ `STORAGES`:

   ```python
   if os.environ.get('USE_S3_STORAGE', 'false').lower() == 'true':
       STORAGES = {
           'default': {
               'BACKEND': 'storages.backends.s3boto3.S3Boto3Storage',
               'OPTIONS': {
                   'bucket_name': os.environ.get('AWS_STORAGE_BUCKET_NAME'),
                   'custom_domain': f"{os.environ.get('AWS_STORAGE_BUCKET_NAME')}.s3.{os.environ.get('AWS_S3_REGION_NAME', 'us-east-1')}.amazonaws.com",
                   'location': 'media',
               },
           },
       }
       MEDIA_URL = f"https://{STORAGES['default']['OPTIONS']['custom_domain']}/media/"
   ```

5. **Render env vars:**

   - `USE_S3_STORAGE=true`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_STORAGE_BUCKET_NAME`
   - `AWS_S3_REGION_NAME` (e.g. `us-east-1`)

6. **Existing files:** Write a one-off management command or script that:
   - Reads from `media/` (current `MEDIA_ROOT`),
   - Uploads to S3 (same paths under `media/`),
   - Ensures DB still points at the same relative paths (usually yes with `upload_to`).

---

### Option B — Cloudinary (simpler)

1. **Install:**

   ```bash
   pip install django-storages cloudinary
   ```

   Add to `requirements.txt`:

   ```
   django-storages
   cloudinary
   ```

2. **Cloudinary:** Sign up at [cloudinary.com](https://cloudinary.com). Dashboard → **API Keys** → copy **Cloud name**, **API Key**, **API Secret**.

3. **`settings.py`** — e.g.:

   ```python
   if os.environ.get('USE_CLOUDINARY', 'false').lower() == 'true':
       CLOUDINARY_STORAGE = {
           'CLOUD_NAME': os.environ.get('CLOUDINARY_CLOUD_NAME'),
           'API_KEY': os.environ.get('CLOUDINARY_API_KEY'),
           'API_SECRET': os.environ.get('CLOUDINARY_API_SECRET'),
       }
       DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
       # MEDIA_URL is often set by Cloudinary
   ```

   (Exact config depends on [django-cloudinary-storage](https://github.com/klis87/django-cloudinary-storage) or [cloudinary documentation](https://cloudinary.com/documentation/django_integration).)

4. **Render env vars:**

   - `USE_CLOUDINARY=true`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

5. **Existing files:** Same idea — one-off script to upload `media/` to Cloudinary and keep DB in sync.

---

## Step 3 — Serving media in production (Django)

- **Current:** Media is served by Django only when `DEBUG=True` (`config/urls.py`). In production, `DEBUG=False` → Django doesn’t serve `MEDIA_ROOT`.
- **With S3/Cloudinary:** Files are served from the storage URL (or CDN). Your serializers already use `build_absolute_uri` for file URLs; point that at the storage base (e.g. S3/Cloudinary URL). No need to serve `media/` from Django.
- **Optional:** If you use a CDN in front of S3/Cloudinary, set `MEDIA_URL` (or equivalent) to the CDN base.

---

## Step 4 — Quick verification

After migration:

1. **DB:** Create a user, add a question, redeploy backend. User and question still exist.
2. **Files:** Upload a video or PDF, redeploy. File still accessible, URL still works.
3. **Frontend:** Play video, open PDF, load question image. All work.

---

## Order of operations

1. **Database first.** Migrate to Postgres, run migrations, add `DATABASE_URL` on Render. Verify.
2. **Files second.** Add S3 or Cloudinary, set env vars, deploy. Test upload + access.
3. **Optional:** Migrate existing `media/` contents to cloud, then stop using local `media/` in production entirely.

Never store user data, videos, or uploads on the server’s local filesystem in production. This plan moves you to that.
