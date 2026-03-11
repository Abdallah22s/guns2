# تشغيل المشروع وشرح سريع

## المتطلبات
- Python 3.10+
- Node.js 20+
- npm

## التثبيت (أول مرة فقط)
1. تثبيت باكجات بايثون:
```powershell
pip install -r requirement.txt
```
2. تثبيت باكجات الواجهة:
```powershell
cd frontend
npm install
cd ..
```

## التشغيل
يوجد طريقتان:

1. من PowerShell:
```powershell
.\run_project.ps1
```

2. من ملف التشغيل المباشر:
```powershell
.\start_project.bat
```

## ماذا يشغّل السكربت
- Backend Flask على المنفذ `5000`
- Webhook/Socket على المنفذ `5001`
- Frontend Next.js على المنفذ `3000`

## الروابط بعد التشغيل
- الواجهة: http://127.0.0.1:3000
- API: http://127.0.0.1:5000/api
- Webhook: http://127.0.0.1:5001

## ملاحظات
- أثناء "معالجة الفيديو" يظهر الآن الوقت المتبقي أسفل شريط التقدم.
- سجلات التشغيل:
  - `backend.out.log`, `backend.err.log`
  - `webhook.out.log`, `webhook.err.log`
  - `frontend\frontend.out.log`, `frontend\frontend.err.log`
