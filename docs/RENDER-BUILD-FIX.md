# Fix: "could not translate host name dpg-xxx-a to address" on Render

## Why it happens

- Your **Build** runs in an **isolated environment**. There, the **Internal Database URL** hostname (`dpg-d5tnpv14tr6s738oebk0-a`) **does not resolve** — Render’s internal DNS is not available during build.
- So when the build runs `python manage.py migrate`, Django tries to connect to the DB and fails with **"Name or service not known"**.

## Fix: run migrate at START, not at BUILD

Run only things that **don’t need the database** in the build. Run **migrate** (and any seed) when the **service starts**, when it can reach the DB.

### In Render Dashboard

1. Open your **backend Web Service**.
2. **Build Command** — remove `migrate` and `seed_initial_data`. Use only:
   ```bash
   pip install -r requirements.txt && python manage.py collectstatic --noinput
   ```
3. **Start Command** — run migrate and seed before starting the app. For example:
   ```bash
   python manage.py migrate && python manage.py seed_initial_data && gunicorn config.wsgi:application
   ```
   (If your start command is different, just add `python manage.py migrate && python manage.py seed_initial_data &&` at the beginning.)
4. Save and **Redeploy**.

After this, the build should succeed and migrations will run on each start when the service can connect to Postgres.

---

**Running locally on Windows (PowerShell)**  
1. Go to the **backend** folder (where `manage.py` is):  
   `cd "D:\ALX Front-End\code\kareem-khalid\backend"`  
2. PowerShell doesn’t support `&&`; use `;` to chain, or run one by one:  
   `python manage.py migrate; python manage.py seed_initial_data`  
3. To run the server: `python -m gunicorn config.wsgi:application` (or `python manage.py runserver` for development).
