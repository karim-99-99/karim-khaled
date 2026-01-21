# 🚀 دليل النشر الكامل - Complete Deployment Guide

## 📦 البنية الحالية:
```
kareem-khalid/
├── backend/          # Django Backend
├── src/             # React Frontend
├── package.json      # Frontend dependencies
└── vercel.json      # Vercel config
```

---

## 🎯 الخطوات بالتفصيل:

### **الخطوة 1: نشر Backend على Render.com**

#### 1.1 إنشاء حساب Render
- اذهب إلى: https://render.com
- سجل الدخول بحساب GitHub
- اربط مستودع GitHub الخاص بك

#### 1.2 إنشاء Web Service
1. اضغط **"New +"** → **"Web Service"**
2. اختر مستودع GitHub الخاص بك
3. املأ الإعدادات التالية:

   **Basic Settings:**
   - **Name**: `kareem-khalid-backend`
   - **Region**: `Frankfurt` (أو الأقرب لك)
   - **Branch**: `main` (أو `master`)
   - **Root Directory**: `backend` ⚠️ مهم جداً!

   **Build & Deploy:**
   - **Environment**: `Python 3`
   - **Build Command**: 
     ```bash
     pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput
     ```
   - **Start Command**: 
     ```bash
     gunicorn config.wsgi:application
     ```

#### 1.3 إعداد Environment Variables
في قسم **"Environment"** أضف:

```
SECRET_KEY=django-insecure-change-this-in-production-! (استخدم Django secret key generator)
DEBUG=False
ALLOWED_HOSTS=your-backend-name.onrender.com
```

**ملاحظة**: استبدل `your-backend-name.onrender.com` بـ URL الذي ستحصل عليه بعد النشر.

#### 1.4 النشر
- اضغط **"Create Web Service"**
- انتظر حتى يكتمل البناء (5-10 دقائق)
- **احفظ URL** (مثل: `https://kareem-khalid-backend.onrender.com`)

---

### **الخطوة 2: نشر Frontend على Vercel**

#### 2.1 إنشاء حساب Vercel
- اذهب إلى: https://vercel.com
- سجل الدخول بحساب GitHub
- اربط مستودع GitHub الخاص بك

#### 2.2 استيراد المشروع
1. اضغط **"Add New..."** → **"Project"**
2. اختر مستودع GitHub الخاص بك
3. الإعدادات الافتراضية صحيحة:
   - **Framework Preset**: `Vite` ✅
   - **Root Directory**: `.` ✅
   - **Build Command**: `npm run build` ✅
   - **Output Directory**: `dist` ✅

#### 2.3 إعداد Environment Variables
في قسم **"Environment Variables"** أضف:

```
VITE_API_URL=https://your-backend-name.onrender.com
```

**⚠️ مهم**: استبدل `your-backend-name.onrender.com` بـ URL الـ Backend من الخطوة 1.

#### 2.4 النشر
- اضغط **"Deploy"**
- انتظر حتى يكتمل البناء (2-5 دقائق)
- **احفظ URL** (مثل: `https://kareem-khalid.vercel.app`)

---

### **الخطوة 3: ربط Frontend و Backend**

#### 3.1 تحديث CORS في Render
1. ارجع إلى **Render Dashboard**
2. افتح **Backend Service** → **Environment**
3. أضف/حدّث:
   ```
   CORS_ALLOWED_ORIGINS=https://your-frontend-name.vercel.app
   ```
   (استبدل بـ URL الـ Frontend من الخطوة 2)
4. **احفظ** وأعد تشغيل الخدمة (Manual Deploy)

#### 3.2 تحديث VITE_API_URL في Vercel (إذا لزم الأمر)
- إذا غيرت URL الـ Backend، حدّث `VITE_API_URL` في Vercel
- أعد النشر (Redeploy)

---

### **الخطوة 4: إعداد قاعدة البيانات**

1. في **Render Dashboard**: افتح **Backend Service** → **Shell**
2. شغّل الأوامر التالية:
   ```bash
   python manage.py migrate
   python manage.py seed_initial_data
   ```

---

### **الخطوة 5: اختبار**

1. افتح **Frontend URL** من Vercel
2. سجّل الدخول:
   - **Username**: `admin`
   - **Password**: `admin123`
3. تحقق من:
   - ✅ عرض البيانات من Backend
   - ✅ إضافة/تعديل/حذف الفصول والدروس
   - ✅ رفع الفيديوهات والملفات
   - ✅ إدارة الأسئلة

---

## 🔑 توليد SECRET_KEY:

### الطريقة 1: عبر Python
```python
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())
```

### الطريقة 2: عبر الموقع
اذهب إلى: https://djecrety.ir/

---

## ⚠️ ملاحظات مهمة:

### Render.com:
- ✅ **مجاني** لكن الخدمة قد "تنام" بعد 15 دقيقة من عدم الاستخدام
- ⏰ أول طلب بعد "النوم" قد يستغرق 30-60 ثانية
- 💰 للخدمة المستمرة، تحتاج خطة مدفوعة ($7/شهر)

### Vercel:
- ✅ **مجاني تماماً**
- ✅ **استضافة مستمرة** (لا "ينام")
- ✅ **CDN سريع** عالمياً

### الأمان:
- 🔒 استخدم `DEBUG=False` في الإنتاج
- 🔒 استخدم `SECRET_KEY` قوي
- 🔒 لا ترفع `.env` إلى GitHub

---

## 🐛 استكشاف الأخطاء:

### ❌ Frontend لا يتصل بالـ Backend
**الحل:**
1. تحقق من `VITE_API_URL` في Vercel
2. تحقق من `CORS_ALLOWED_ORIGINS` في Render
3. تأكد من أن Backend يعمل (افتح URL في المتصفح)

### ❌ 401 Unauthorized
**الحل:**
1. تأكد من تسجيل الدخول
2. تحقق من أن Token موجود في localStorage
3. تحقق من أن `VITE_API_URL` صحيح

### ❌ Backend لا يعمل
**الحل:**
1. تحقق من **Logs** في Render Dashboard
2. تأكد من جميع Environment Variables
3. تأكد من أن `requirements.txt` محدث
4. تحقق من أن `Procfile` موجود وصحيح

### ❌ Database errors
**الحل:**
1. شغّل `python manage.py migrate` في Render Shell
2. تأكد من أن قاعدة البيانات تم إنشاؤها

---

## 📝 Checklist قبل النشر:

- [ ] ✅ تم تحديث `requirements.txt` (يحتوي على gunicorn و whitenoise)
- [ ] ✅ تم إنشاء `Procfile` في مجلد backend
- [ ] ✅ تم إنشاء `runtime.txt` في مجلد backend
- [ ] ✅ تم تحديث `settings.py` لدعم CORS
- [ ] ✅ تم تحديث `settings.py` لدعم WhiteNoise
- [ ] ✅ تم رفع جميع الملفات إلى GitHub
- [ ] ✅ تم نشر Backend على Render
- [ ] ✅ تم نشر Frontend على Vercel
- [ ] ✅ تم إعداد Environment Variables
- [ ] ✅ تم تشغيل migrations
- [ ] ✅ تم تشغيل seed_initial_data
- [ ] ✅ تم اختبار الاتصال

---

## 🎉 بعد النشر:

1. **احفظ URLs:**
   - Frontend: `https://your-app.vercel.app`
   - Backend: `https://your-backend.onrender.com`

2. **شارك الرابط** مع المستخدمين

3. **راقب Logs** في Render و Vercel للتأكد من عدم وجود أخطاء

---

## 📞 الدعم:

إذا واجهت مشاكل:
1. تحقق من Logs في Render و Vercel
2. تأكد من أن جميع Environment Variables صحيحة
3. تأكد من أن الملفات موجودة في GitHub
