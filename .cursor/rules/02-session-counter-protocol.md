## Session Counter Protocol

- الملف المعتمد: `AGENT_SESSION_COUNTER.txt` في جذر المشروع.
- لكل رسالة/سؤال من المستخدم: زِد `total_sessions` بمقدار 1.
- عند تحقق:
  - `total_sessions % 20 == 0`: نفّذ فحص/تحديث المهارات تلقائياً
  - `total_sessions % 10 == 0`: أنشئ تقرير دوري داخل `AGENT_REPORTS/`
- في كل رد: أعرض للمستخدم:
  - `📊 الجلسة #[number] - تحديث المهارات التالي بعد [remaining] سؤال`
