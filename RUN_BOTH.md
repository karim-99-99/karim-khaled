# تشغيل الفرونت اند والـ Backend معاً | Run Frontend and Backend

## 1. الـ Backend (Django)

**طرفية (Terminal) واحدة:**

```bash
cd backend
```

تفعيل البيئة الافتراضية (إن وُجدت):

- **Windows (PowerShell):**  
  `.\.venv\Scripts\Activate.ps1`

- **Windows (CMD):**  
  `.venv\Scripts\activate.bat`

- **macOS / Linux:**  
  `source .venv/bin/activate`

ثم:

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

- الـ API: **http://127.0.0.1:8000/api/**
- لوحة Django: **http://127.0.0.1:8000/admin/**

إذا كان المنفذ 8000 مستخدماً:

```bash
python manage.py runserver 8001
```

ثم استخدم `http://127.0.0.1:8001` بدلاً من 8000.

---

## 2. الفرونت اند (Vite + React)

**طرفية ثانية** (اترك الأولى شغالة للـ Backend):

من **جذر المشروع** (المجلد الذي فيه `package.json`):

```bash
npm install
npm run dev
```

- الواجهة: **http://localhost:5173** (أو المنفذ الذي يظهر في الطرفية)

---

## 3. ربط الفرونت اند بالـ Backend

في **جذر المشروع** أنشئ ملف **`.env`**:

```
VITE_API_URL=http://127.0.0.1:8000
```

إذا استخدمت المنفذ 8001:

```
VITE_API_URL=http://127.0.0.1:8001
```

أعد تشغيل الفرونت اند (`Ctrl+C` ثم `npm run dev`) بعد إضافة أو تعديل `.env`.

---

## 4. ترتيب التشغيل المقترح

| الخطوة | الأمر | الطرفية |
|--------|-------|----------|
| 1 | `cd backend` ثم تفعيل الـ venv ثم `pip install -r requirements.txt` | 1 |
| 2 | `python manage.py migrate` (أول مرة) | 1 |
| 3 | `python manage.py runserver` | 1 ← **اتركها تعمل** |
| 4 | `npm install` (أول مرة) | 2 (جذر المشروع) |
| 5 | `npm run dev` | 2 ← **اتركها تعمل** |

ثم افتح **http://localhost:5173** وسجّل الدخول باستخدام حساب المدير في الـ Backend.

---

## 5. أول استخدام للـ Backend؟

راجع **`backend/SETUP_BACKEND.md`** لـ:

- إنشاء قاعدة البيانات (`migrate`)
- إنشاء حسابات المدير (`createsuperuser`)
- تعبئة البيانات الأولى (`seed_initial_data`)
