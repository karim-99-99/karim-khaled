# Quick Start Guide

## الخطوات السريعة لإعداد المشروع

### 1. تأكد أنك في مجلد backend وتفعيل Virtual Environment:

```powershell
cd backend
# إذا لم تكن مفعلة، قم بتفعيلها:
venv\Scripts\activate
```

### 2. تثبيت المتطلبات:

```powershell
pip install -r requirements.txt
```

### 3. إنشاء Migrations:

```powershell
python manage.py makemigrations
```

### 4. تطبيق Migrations:

```powershell
python manage.py migrate
```

### 5. إنشاء Superuser (Admin):

```powershell
python manage.py createsuperuser
```

### 6. تشغيل السيرفر:

```powershell
python manage.py runserver
```

---

**ملاحظة**: إذا واجهت أي خطأ في التثبيت، تأكد من:
- تفعيل virtual environment أولاً
- استخدام Python 3.8 أو أحدث
- تحديث pip: `python -m pip install --upgrade pip`
