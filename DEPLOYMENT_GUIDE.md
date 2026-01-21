# دليل النشر - Deployment Guide

## الخطوات الكاملة لنشر Frontend و Backend

### الخطوة 1: إعداد Backend للنشر على Render.com

#### 1.1 إنشاء ملفات إعداد Backend

تم إنشاء الملفات التالية:
- `backend/Procfile` - لتشغيل Django على Render
- `backend/runtime.txt` - لتحديد إصدار Python
- `backend/build.sh` - سكريبت البناء

#### 1.2 تحديث settings.py لدعم CORS

تم تحديث `backend/config/settings.py` لدعم CORS من أي origin في الإنتاج.

### الخطوة 2: نشر Backend على Render.com

1. **سجل الدخول إلى Render.com**
   - اذهب إلى https://render.com
   - سجل الدخول بحساب GitHub

2. **إنشاء Web Service جديد**
   - اضغط على "New +" → "Web Service"
   - اختر مستودع GitHub الخاص بك
   - اختر الفرع (Branch): `main` أو `master`

3. **إعدادات الخدمة:**
   - **Name**: `kareem-khalid-backend` (أو أي اسم تريده)
   - **Region**: اختر الأقرب لك (مثلاً: Frankfurt)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt && python manage.py migrate && python manage.py seed_initial_data && python manage.py collectstatic --noinput`
   - **Start Command**: `gunicorn config.wsgi:application`

4. **إعداد Environment Variables:**
   اضغط على "Environment" وأضف:
   ```
   SECRET_KEY=your-secret-key-here (استخدم Django secret key generator)
   DEBUG=False
   ALLOWED_HOSTS=your-backend-url.onrender.com
   CORS_ALLOWED_ORIGINS=https://your-frontend-url.vercel.app
   ```

5. **انقر "Create Web Service"**
   - انتظر حتى يكتمل البناء (قد يستغرق 5-10 دقائق)
   - بعد اكتمال البناء، ستحصل على URL مثل: `https://kareem-khalid-backend.onrender.com`

### الخطوة 3: نشر Frontend على Vercel

1. **سجل الدخول إلى Vercel**
   - اذهب إلى https://vercel.com
   - سجل الدخول بحساب GitHub

2. **استيراد المشروع**
   - اضغط على "Add New..." → "Project"
   - اختر مستودع GitHub الخاص بك
   - اختر الفرع: `main` أو `master`

3. **إعدادات المشروع:**
   - **Framework Preset**: Vite
   - **Root Directory**: `.` (المجلد الرئيسي)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **إعداد Environment Variables:**
   اضغط على "Environment Variables" وأضف:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com
   ```
   (استبدل `your-backend-url.onrender.com` بـ URL الـ Backend من Render)

5. **انقر "Deploy"**
   - انتظر حتى يكتمل البناء (قد يستغرق 2-5 دقائق)
   - بعد اكتمال البناء، ستحصل على URL مثل: `https://kareem-khalid.vercel.app`

### الخطوة 4: تحديث CORS في Backend

بعد الحصول على URL الـ Frontend من Vercel:

1. **ارجع إلى Render Dashboard**
2. **افتح Backend Service → Environment**
3. **حدّث `CORS_ALLOWED_ORIGINS`:**
   ```
   CORS_ALLOWED_ORIGINS=https://your-frontend-url.vercel.app
   ```
4. **احفظ وأعد تشغيل الخدمة**

### الخطوة 5: إعداد قاعدة البيانات الأولية

1. **افتح Render Shell** (من Backend Service → Shell)
2. **شغّل الأوامر التالية:**
   ```bash
   python manage.py migrate
   python manage.py seed_initial_data
   ```

### الخطوة 6: اختبار الاتصال

1. افتح Frontend URL من Vercel
2. سجّل الدخول بحساب المدير:
   - Username: `admin`
   - Password: `admin123`
3. تحقق من أن البيانات تظهر من Backend

---

## ملاحظات مهمة:

1. **Render.com** يقدم خطة مجانية لكن الخدمة قد "تنام" بعد 15 دقيقة من عدم الاستخدام
2. **Vercel** مجاني تماماً ويدعم الاستضافة المستمرة
3. تأكد من أن `VITE_API_URL` في Vercel يشير إلى URL الـ Backend الصحيح
4. في الإنتاج، استخدم `DEBUG=False` في Backend

---

## استكشاف الأخطاء:

### المشكلة: Frontend لا يتصل بالـ Backend
- تحقق من `VITE_API_URL` في Vercel Environment Variables
- تحقق من `CORS_ALLOWED_ORIGINS` في Render Environment Variables
- تأكد من أن Backend يعمل (افتح URL في المتصفح)

### المشكلة: 401 Unauthorized
- تأكد من تسجيل الدخول
- تحقق من أن Token يتم حفظه في localStorage

### المشكلة: Backend لا يعمل
- تحقق من Logs في Render Dashboard
- تأكد من أن جميع Environment Variables صحيحة
- تأكد من أن `requirements.txt` محدث
