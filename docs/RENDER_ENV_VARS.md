# متغيرات البيئة على Render — بعد تنفيذ الهجرة

بعد تطبيق [MIGRATION_PLAN](MIGRATION_PLAN.md)، ضع القيم التالية في **Backend Service → Environment** على Render.

---

## 1. قاعدة البيانات (Postgres) — إلزامي

| المفتاح        | القيمة                                                    | ملاحظة                                 |
| -------------- | --------------------------------------------------------- | -------------------------------------- |
| `DATABASE_URL` | `postgresql://user:pass@host:port/dbname?sslmode=require` | من Render Postgres أو Supabase أو Neon |

- **Render Postgres:** Dashboard → إنشاء PostgreSQL → نسخ **Internal Database URL** (أو External إن كان الـ Backend خارج Render).
- **Supabase:** Project → Settings → Database → Connection string (URI).
- **Neon:** مشروع جديد → نسخ connection string.

بدون `DATABASE_URL` يستمر الـ Backend باستخدام SQLite على القرص (يُفقد عند إعادة النشر).

---

## 2. تخزين الملفات (Cloudinary) — إلزامي للإنتاج

| المفتاح                 | القيمة                          | ملاحظة                                       |
| ----------------------- | ------------------------------- | -------------------------------------------- |
| `USE_CLOUDINARY`        | `true`                          | تفعيل رفع الفيديوهات والملفات إلى Cloudinary |
| `CLOUDINARY_CLOUD_NAME` | من لوحة Cloudinary (انظر أدناه) | **ليس** "Root" — هو المعرف الفريد للسحابة    |
| `CLOUDINARY_API_KEY`    | من لوحة Cloudinary              | رقم مثل `868421519827555`                    |
| `CLOUDINARY_API_SECRET` | من لوحة Cloudinary              | سلسلة سرية، لا تضعها في الكود أبداً          |

- تسجيل حساب: [cloudinary.com](https://cloudinary.com)
- **Cloud name:** من [Dashboard](https://console.cloudinary.com) → **Product Credentials** أو **API Keys**. يظهر كـ **Cloud name** (مثلاً `dxyz123abc` أو `my-app-cloud`). القيمة `Root` عادةً **خطأ** — استخدم الاسم الحقيقي من اللوحة.
- بدون هذه القيم (أو مع `USE_CLOUDINARY=false`) تُخزَّن الملفات محلياً على قرص Render ويُفقد عند إعادة النشر.

---

## 3. باقي المتغيرات (كما هي)

| المفتاح                | مثال / ملاحظة                           |
| ---------------------- | --------------------------------------- |
| `SECRET_KEY`           | مفتاح سري قوي (مولّد Django)            |
| `DEBUG`                | `False` في الإنتاج                      |
| `ALLOWED_HOSTS`        | `your-backend.onrender.com` (وفق نطاقك) |
| `CORS_ALLOWED_ORIGINS` | `https://your-frontend.vercel.app`      |

---

## ترتيب التنفيذ

1. إنشاء **Postgres** (Render / Supabase / Neon) وإضافة `DATABASE_URL` → إعادة نشر الـ Backend → تشغيل `migrate` (يحدث تلقائياً في الـ build).
2. إنشاء حساب **Cloudinary** وإضافة `USE_CLOUDINARY` + `CLOUDINARY_*` → إعادة نشر.
3. (اختياري) تشغيل `seed_initial_data` مرة واحدة من Render Shell إذا احتجت بيانات أولية.

---

## التحقق

- بعد النشر: إنشاء مستخدم، إضافة سؤال، رفع فيديو أو ملف.
- إعادة نشر الـ Backend.
- التأكد أن المستخدم والأسئلة والملفات لا تزال موجودة وتعرض بشكل صحيح.
