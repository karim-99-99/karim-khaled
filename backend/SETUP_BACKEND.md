# Django Backend – Setup and Admin Account

Follow these steps to run the backend and create an **admin (superuser)** account.

---

## 1. Go to the backend folder

```bash
cd backend
```

---

## 2. Create a Python virtual environment (recommended)

**Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**Windows (CMD):**
```cmd
python -m venv .venv
.venv\Scripts\activate.bat
```

**macOS / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

---

## 3. Install dependencies

```bash
pip install -r requirements.txt
```

If you see errors like `No module named 'rest_framework.renderers'`, use a **new** virtual environment and run `pip install -r requirements.txt` again. Do not mix with other projects’ Python envs.

---

## 4. Create and run migrations for the `api` app

**Create migrations (first time only):**
```bash
python manage.py makemigrations api
```

**Apply all migrations:**
```bash
python manage.py migrate
```

This creates `db.sqlite3` and all tables (`api_user`, Section, Subject, Category, Chapter, Lesson, Question, Answer, Video, File, Progress, etc.).

**If you see `no such table: api_user`:** run `makemigrations api` (above), then `migrate` again.

**If you see `InconsistentMigrationHistory` (admin applied before api):** delete `db.sqlite3`, then run `python manage.py migrate` again.

---

## 5. Create a superuser (admin account)

```bash
python manage.py createsuperuser
```

You will be asked:

- **Username:** e.g. `admin`
- **Email:** e.g. `admin@example.com`
- **Password:** (min 8 characters, not too simple)
- **Password (again):** repeat the same password

---

## 6. Set the superuser as “Admin” in the app

The app uses `role` and `is_active_account` on the `User` model. Set them for your superuser.

**Option A – Django shell (recommended):**

```bash
python manage.py shell
```

Then in the shell:

```python
from api.models import User
u = User.objects.get(username='admin')   # use the username you chose
u.role = 'admin'
u.is_active_account = True
u.save()
exit()
```

**Option B – Django Admin in the browser:**

1. Start the server (step 8).
2. Open: **http://127.0.0.1:8000/admin/**
3. Log in with the superuser (username + password).
4. Open **Users** → your user.
5. Set:
   - **Role:** Admin  
   - **Is active account:** ✓  
6. Save.

---

## 7. Seed initial data (sections, subjects, categories, chapters, lessons)

This creates the same structure as the frontend’s default data (تحصيل, قدرات, مواد, تصنيفات, فصول, دروس):

```bash
python manage.py seed_initial_data
```

To **clear** existing structure and reseed from scratch (use with care):

```bash
python manage.py seed_initial_data --clear
```

---

## 8. Run the backend server

```bash
python manage.py runserver
```

By default it uses **port 8000**. If you see `You don't have permission to access that port` or the port is in use, use another port:

```bash
python manage.py runserver 8001
```

Then open:
- **http://127.0.0.1:8001/api/**
- **http://127.0.0.1:8001/admin/**
- **http://127.0.0.1:8001/media/**

If using 8000:
- API: **http://127.0.0.1:8000/api/**
- Django Admin: **http://127.0.0.1:8000/admin/**
- Media files: **http://127.0.0.1:8000/media/**

---

## 9. Useful API endpoints (after login with token)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Register |
| POST | `/api/auth/login/` | Login (returns `token` and `user`) |
| POST | `/api/auth/logout/` | Logout |
| GET | `/api/sections/` | List sections (with nested subjects, categories, chapters, lessons) |
| GET/POST | `/api/subjects/` | Subjects |
| GET/POST | `/api/categories/?subject_id=` | Categories |
| GET/POST | `/api/chapters/?category_id=` | Chapters |
| GET/POST | `/api/lessons/?chapter_id=` | Lessons |
| GET/POST | `/api/questions/?lesson_id=` | Questions |
| GET/POST | `/api/videos/?lesson_id=` | Videos |
| GET/POST | `/api/files/?lesson_id=` | Files |

Use the `token` from login in the header:

```
Authorization: Token YOUR_TOKEN_HERE
```

---

## 10. Media and uploads

- Uploaded files (videos, PDFs, images) are stored in: **`backend/media/`**
- In development they are served at: **`/media/`** (e.g. `http://127.0.0.1:8000/media/videos/...`).
- The `media` folder is created on first upload, or create it: `mkdir media` (or `md media` on Windows).

---

## 11. Connect the frontend later

The frontend currently uses **localStorage** (`storageService.js`, `videoStorage.js`, etc.).  
To make videos, questions, and delete (chapters/lessons) **permanent**:

1. Add an API client (e.g. `axios` or `fetch`) with base URL `http://127.0.0.1:8000/api/`.
2. After login, store the `token` and send it as `Authorization: Token ...` on each request.
3. Replace or mirror:
   - `storageService` → calls to `/api/sections/`, `/api/chapters/`, `/api/lessons/`, etc.
   - `videoStorage` → `/api/videos/` (multipart for file upload).
   - Questions → `/api/questions/`.
   - File uploads → `/api/files/`.

---

## Summary checklist

- [ ] `cd backend`
- [ ] Create and activate virtual environment
- [ ] `pip install -r requirements.txt`
- [ ] `python manage.py makemigrations api` (if `api/migrations/` is missing or empty)
- [ ] `python manage.py migrate`
- [ ] `python manage.py createsuperuser`
- [ ] In shell or Admin: set `role='admin'` and `is_active_account=True` for that user
- [ ] `python manage.py seed_initial_data`
- [ ] `python manage.py runserver`
- [ ] Open **http://127.0.0.1:8000/admin/** and log in with the superuser

---

## 12. ربط الفرونت اند (Frontend) بالـ Backend

لتفعيل استخدام الـ Backend من الواجهة (تسجيل الدخول، إضافة/حذف الفصول والدروس والأسئلة والفيديوهات والملفات):

1. في **جذر المشروع** (بجانب `package.json`) أنشئ ملف **`.env`** وأضف:

   ```
   VITE_API_URL=http://127.0.0.1:8000
   ```

   (إذا كان الخادم يعمل على منفذ آخر، مثلاً 8001، استخدم `http://127.0.0.1:8001`)

2. أعد تشغيل خادم الفرونت اند (`npm run dev`).

3. سجّل الدخول من واجهة التسجيل باستخدام **اسم المستخدم** (وليس البريد فقط عند استخدام الـ Backend) وكلمة المرور الخاصة بحساب المدير في الـ Backend.

بعد ذلك، في لوحة الإدارة:

- **إضافة/حذف فصل** و**إضافة/حذف درس** يتم على الـ Backend.
- **إضافة/تعديل/حذف أسئلة** يتم على الـ Backend.
- **إضافة/حذف فيديو** (عند رفع ملف) يتم على الـ Backend. (الفيديو بالرابط فقط يبقى محلياً.)
- **إضافة/تعديل/حذف ملفات مرفقة** يتم على الـ Backend.

إذا لم تضف `VITE_API_URL`، الواجهة تستمر في استخدام التخزين المحلي (localStorage / IndexedDB) كما في السابق.
