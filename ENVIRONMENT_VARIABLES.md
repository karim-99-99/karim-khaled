# Environment Variables المطلوبة - Required Environment Variables

## 🔵 Backend (Render.com) - Environment Variables

### المتغيرات المطلوبة:

#### 1. SECRET_KEY
```
NAME: SECRET_KEY
VALUE: 4$1wa%p3$+__lbd-$rja$d2yn2=!jc%d8%nsr04n=6m)-f5t^3
```
**ملاحظة**: استخدم Django secret key generator أو المفتاح المولّد أعلاه.

#### 2. DEBUG
```
NAME: DEBUG
VALUE: False
```
**ملاحظة**: استخدم `False` في الإنتاج.

#### 3. ALLOWED_HOSTS
```
NAME: ALLOWED_HOSTS
VALUE: your-backend-name.onrender.com
```
**ملاحظة**: استبدل `your-backend-name.onrender.com` بـ URL الـ Backend الفعلي بعد النشر (مثل: `kareem-khalid-backend.onrender.com`)

#### 4. CORS_ALLOWED_ORIGINS (أضف بعد نشر Frontend)
```
NAME: CORS_ALLOWED_ORIGINS
VALUE: https://your-frontend-name.vercel.app
```
**ملاحظة**: أضف هذا بعد الحصول على URL الـ Frontend من Vercel.

---

## 🟢 Frontend (Vercel) - Environment Variables

### المتغيرات المطلوبة:

#### 1. VITE_API_URL
```
NAME: VITE_API_URL
VALUE: https://your-backend-name.onrender.com
```
**ملاحظة**: استبدل `your-backend-name.onrender.com` بـ URL الـ Backend الفعلي من Render (مثل: `https://kareem-khalid-backend.onrender.com`)

---

## 📋 قائمة سريعة للنسخ:

### للـ Backend (Render):
```
SECRET_KEY=4$1wa%p3$+__lbd-$rja$d2yn2=!jc%d8%nsr04n=6m)-f5t^3
DEBUG=False
ALLOWED_HOSTS=kareem-khalid-backend.onrender.com
CORS_ALLOWED_ORIGINS=https://your-frontend-name.vercel.app
```

### للـ Frontend (Vercel):
```
VITE_API_URL=https://kareem-khalid-backend.onrender.com
```

---

## ⚠️ ملاحظات مهمة:

1. **SECRET_KEY**: يجب أن يكون فريداً وقوياً. لا تشاركه مع أحد.
2. **ALLOWED_HOSTS**: يجب أن يحتوي على اسم النطاق الكامل للـ Backend (بدون `https://`)
3. **CORS_ALLOWED_ORIGINS**: يجب أن يحتوي على `https://` في البداية
4. **VITE_API_URL**: يجب أن يحتوي على `https://` في البداية

---

## 🔄 الترتيب الصحيح:

1. **أولاً**: انشر Backend على Render مع:
   - `SECRET_KEY`
   - `DEBUG=False`
   - `ALLOWED_HOSTS=your-backend-name.onrender.com`

2. **ثانياً**: انشر Frontend على Vercel مع:
   - `VITE_API_URL=https://your-backend-name.onrender.com`

3. **ثالثاً**: أضف في Render:
   - `CORS_ALLOWED_ORIGINS=https://your-frontend-name.vercel.app`

---

## 🔑 توليد SECRET_KEY جديد (اختياري):

إذا أردت توليد SECRET_KEY جديد:

### عبر Python:
```python
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())
```

### عبر الموقع:
https://djecrety.ir/
