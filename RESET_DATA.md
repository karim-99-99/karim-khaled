# كيفية إعادة تعيين البيانات

إذا كان هناك مشاكل في البيانات، افتح Console المتصفح (F12) وقم بتنفيذ:

```javascript
localStorage.removeItem('sections');
localStorage.removeItem('users');
localStorage.removeItem('questions');
localStorage.removeItem('videos');
localStorage.removeItem('progress');
localStorage.removeItem('currentUser');
location.reload();
```

أو افتح الملف `src/services/storageService.js` وابحث عن `initializeDefaultData` وقم بتشغيله.



















