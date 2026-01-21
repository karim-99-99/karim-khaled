# خطوات النشر السريعة - Quick Deployment Steps

## 📋 الخطوات بالترتيب:

### 1️⃣ إعداد Backend على Render.com

1. **اذهب إلى**: https://render.com
2. **سجل الدخول** بحساب GitHub
3. **اضغط**: "New +" → "Web Service"
4. **اختر**: مستودع GitHub الخاص بك
5. **املأ الإعدادات:**
   ```
   Name: kareem-khalid-backend
   Region: Frankfurt (أو أي region قريب)
   Branch: main
   Root Directory: backend
   Environment: Python 3
   Build Command: pip install -r requirements.txt && python manage.py migrate && python manage.py seed_initial_data && python manage.py collectstatic --noinput
   Start Command: gunicorn config.wsgi:application
   ```
6. **أضف Environment Variables:**
   ```
   SECRET_KEY=استخدم Django secret key generator
   DEBUG=False
   ALLOWED_HOSTS=your-backend-name.onrender.com
   ```
7. **احفظ URL الـ Backend** (مثل: `https://kareem-khalid-backend.onrender.com`)

### 2️⃣ إعداد Frontend على Vercel

1. **اذهب إلى**: https://vercel.com
2. **سجل الدخول** بحساب GitHub
3. **اضغط**: "Add New..." → "Project"
4. **اختر**: مستودع GitHub الخاص بك
5. **الإعدادات الافتراضية صحيحة** (Vite)
6. **أضف Environment Variable:**
   ```
   VITE_API_URL=https://your-backend-name.onrender.com
   ```
   (استبدل بـ URL الـ Backend من الخطوة 1)
7. **اضغط**: "Deploy"
8. **احفظ URL الـ Frontend** (مثل: `https://kareem-khalid.vercel.app`)

### 3️⃣ تحديث CORS في Backend

1. **ارجع إلى Render Dashboard**
2. **افتح Backend Service → Environment**
3. **أضف/حدّث:**
   ```
   CORS_ALLOWED_ORIGINS=https://your-frontend-name.vercel.app
   ```
   (استبدل بـ URL الـ Frontend من الخطوة 2)
4. **احفظ وأعد تشغيل الخدمة**

### 4️⃣ إعداد قاعدة البيانات

1. **في Render Dashboard**: Backend Service → Shell
2. **شغّل:**
   ```bash
   python manage.py migrate
   python manage.py seed_initial_data
   ```

### 5️⃣ اختبار

1. افتح Frontend URL
2. سجّل الدخول:
   - Username: `admin`
   - Password: `admin123`
3. تحقق من أن كل شيء يعمل!

---

## 🔑 توليد SECRET_KEY:

استخدم هذا الأمر في Python:
```python
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())
```

أو استخدم: https://djecrety.ir/

---

## ⚠️ ملاحظات:

- Render.com مجاني لكن قد "ينام" بعد 15 دقيقة من عدم الاستخدام
- Vercel مجاني تماماً ويدعم الاستضافة المستمرة
- تأكد من أن جميع Environment Variables صحيحة
- بعد أي تغيير في Environment Variables، أعد تشغيل الخدمة
