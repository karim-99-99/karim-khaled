import { useEffect, useRef, useState } from "react";
import * as backendApi from "../services/backendApi";

function stripHtml(value) {
  if (!value) return "";
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const LETTER = { a: "أ", b: "ب", c: "ج", d: "د" };

function flattenQuestions(items) {
  const rows = [];
  let questionNo = 0;
  (items || []).forEach((item, idx) => {
    if (item?.type === "passage") {
      rows.push({
        kind: "passage",
        key: `p-${idx}`,
        passageText: item.passage_text,
      });
      (item.questions || []).forEach((q, qi) => {
        questionNo += 1;
        rows.push({
          kind: "question",
          key: `p-${idx}-q-${qi}`,
          numberLabel: `سؤال ${questionNo} — تحت القطعة`,
          question: q,
          nested: true,
        });
      });
      return;
    }
    questionNo += 1;
    rows.push({
      kind: "question",
      key: `q-${idx}`,
      numberLabel: `سؤال ${questionNo}`,
      question: item,
      nested: false,
    });
  });
  return rows;
}

const WordQuestionImport = ({ lessonId, disabled, onImported }) => {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const items = preview?.items || [];
  const errors = preview?.errors || [];
  const warnings = preview?.warnings || [];
  const summary = preview?.summary || {};
  const reviewRows = flattenQuestions(items);
  const questionCount = summary.questions || items.length;

  useEffect(() => {
    if (!preview) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [preview]);

  const openPicker = () => {
    if (disabled || busy) return;
    fileRef.current?.click();
  };

  const readFile = async (chosen) => {
    if (!chosen) return;
    if (!chosen.name.toLowerCase().endsWith(".docx")) {
      setError("الملف يجب أن يكون بصيغة Word (.docx)");
      return;
    }
    setError("");
    setFile(chosen);
    setBusy(true);
    try {
      const data = await backendApi.importQuestionsFromWord(lessonId, chosen, {
        commit: false,
      });
      setPreview(data || { items: [], errors: ["لم يُرجع الخادم أي أسئلة."], warnings: [], summary: {} });
    } catch (err) {
      if (err?.data?.items || err?.data?.errors) {
        setPreview(err.data);
      } else {
        setPreview(null);
        setError(err?.message || "تعذر قراءة الملف");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleFile = (event) => {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    readFile(chosen);
  };

  const handleDownloadTemplate = async () => {
    setError("");
    try {
      await backendApi.downloadWordQuestionTemplate();
    } catch (err) {
      setError(err?.message || "تعذر تحميل ملف المثال");
    }
  };

  const closePreview = () => {
    setPreview(null);
    setFile(null);
  };

  const handleConfirm = async () => {
    if (!file || !lessonId || busy) return;
    if (errors.length) return;
    setBusy(true);
    setError("");
    try {
      const data = await backendApi.importQuestionsFromWord(lessonId, file, {
        commit: true,
      });
      closePreview();
      onImported?.(data);
    } catch (err) {
      if (err?.data?.items || err?.data?.errors?.length) {
        setPreview(err.data);
        setError(err.data.errors?.[0] || err?.message || "تعذر حفظ الأسئلة");
      } else {
        setError(err?.message || "تعذر حفظ الأسئلة");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full">
      <input
        ref={fileRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleFile}
      />
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="bg-teal-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-teal-800 transition font-medium text-sm sm:text-base"
        >
          تحميل ملف المثال
        </button>
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || busy}
          className="bg-teal-500 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-teal-600 transition font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? "جاري قراءة الملف..." : "رفع ملف Word للمراجعة"}
        </button>
      </div>
      {disabled && (
        <p className="text-xs text-gray-500 mt-2">
          اختر المستوى أولاً ثم ارفع ملف الوورد لتظهر الأسئلة هنا قبل الإضافة.
        </p>
      )}
      {error && !preview && (
        <p className="text-sm text-red-600 mt-2 font-medium">{error}</p>
      )}
      {file && !preview && busy && (
        <p className="text-sm text-teal-700 mt-2 font-medium">
          جاري استخراج الأسئلة من: {file.name}
        </p>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-[80] bg-black/50 flex items-stretch sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="word-import-review-title"
        >
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-4xl sm:rounded-2xl shadow-2xl flex flex-col text-right">
            <div className="px-4 sm:px-6 py-4 border-b bg-teal-700 text-white sm:rounded-t-2xl">
              <h3 id="word-import-review-title" className="text-lg sm:text-xl font-bold">
                مراجعة الأسئلة قبل الإضافة
              </h3>
              <p className="text-sm text-teal-100 mt-1">
                {file?.name ? `الملف: ${file.name} — ` : ""}
                أسئلة عادية: {summary.single || 0} — قطع: {summary.passage || 0} — الإجمالي: {questionCount}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
              {error && (
                <p className="text-sm text-red-600 font-medium">{error}</p>
              )}
              {errors.length > 0 && (
                <ul className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 space-y-1">
                  {errors.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              )}
              {warnings.length > 0 && (
                <ul className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 space-y-1">
                  {warnings.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              )}

              {items.length === 0 ? (
                <p className="text-center text-gray-500 py-10">
                  لم يتم العثور على أسئلة في الملف. استخدم عناوين «سؤال» و«قطعة» كما في ملف المثال.
                </p>
              ) : (
                reviewRows.map((row) =>
                  row.kind === "passage" ? (
                    <div
                      key={row.key}
                      className="border-2 border-green-500 rounded-xl p-4 bg-green-50"
                    >
                      <span className="inline-block bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
                        قطعة
                      </span>
                      <p className="text-base text-dark-700 leading-relaxed whitespace-pre-wrap">
                        {stripHtml(row.passageText) || "(نص القطعة فارغ)"}
                      </p>
                    </div>
                  ) : (
                    <QuestionReviewCard
                      key={row.key}
                      label={row.numberLabel}
                      nested={row.nested}
                      question={row.question}
                    />
                  )
                )
              )}
            </div>

            <div className="px-4 sm:px-6 py-4 border-t bg-gray-50 flex flex-col sm:flex-row gap-2 justify-end sm:rounded-b-2xl">
              <button
                type="button"
                onClick={closePreview}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 font-medium"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={busy || errors.length > 0 || !items.length || disabled}
                className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 font-bold"
              >
                {busy
                  ? "جاري الإضافة..."
                  : `تأكيد إضافة ${questionCount || items.length} سؤال`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function QuestionReviewCard({ label, nested, question }) {
  return (
    <article
      className={`border rounded-xl p-4 bg-white ${
        nested ? "border-green-200 mr-3 sm:mr-6" : "border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="inline-block bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full">
          {label}
        </span>
      </div>
      <p className="text-base font-semibold text-dark-800 leading-relaxed whitespace-pre-wrap mb-3">
        {stripHtml(question?.question) || "(نص السؤال فارغ)"}
      </p>
      <ul className="space-y-2">
        {(question?.answers || []).map((ans) => (
          <li
            key={ans.answer_id}
            className={`rounded-lg px-3 py-2 border ${
              ans.is_correct
                ? "bg-green-50 border-green-400 font-bold text-green-800"
                : "bg-gray-50 border-gray-200 text-gray-700"
            }`}
          >
            {LETTER[ans.answer_id] || ans.answer_id}) {stripHtml(ans.text)}
            {ans.is_correct ? "  — الإجابة الصحيحة" : ""}
          </li>
        ))}
      </ul>
      {question?.explanation ? (
        <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          <span className="font-bold">الشرح: </span>
          {stripHtml(question.explanation)}
        </p>
      ) : (
        <p className="mt-3 text-xs text-gray-400">لا يوجد شرح</p>
      )}
    </article>
  );
}

export default WordQuestionImport;
