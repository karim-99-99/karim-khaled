import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Toast from "../../components/Toast";
import { getTigerBanks, updateTigerBanks } from "../../services/backendApi";

const questionsHref = (bank) => {
  const q = new URLSearchParams({
    itemId: bank.id,
    subjectId: bank.subject_id || "",
    categoryId: bank.category_id || "",
    chapterId: bank.chapter_id || "",
    returnUrl: "/admin/tiger-banks",
  });
  return `/admin/questions?${q.toString()}`;
};

const BankColumn = ({
  title,
  hint,
  side,
  selected,
  available,
  pickId,
  setPickId,
  onAdd,
  onRemove,
  saving,
}) => (
  <section className="bg-white rounded-2xl border shadow-sm p-5 flex flex-col min-h-[420px]">
    <h2 className="text-xl font-black text-dark-700 mb-1">{title}</h2>
    <p className="text-sm text-gray-500 mb-4">{hint}</p>

    <div className="flex gap-2 mb-5">
      <select
        value={pickId}
        onChange={(e) => setPickId(e.target.value)}
        className="flex-1 border rounded-xl px-3 py-2 bg-white"
        disabled={saving || available.length === 0}
      >
        <option value="">
          {available.length ? "اختر بنكاً لإضافته" : "لا توجد بنوك أخرى"}
        </option>
        {available.map((bank) => (
          <option key={bank.id} value={bank.id}>
            {bank.category_name} — {bank.name} ({bank.slot_count} سؤال)
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onAdd}
        disabled={saving || !pickId}
        className="px-4 py-2 rounded-xl bg-green-600 text-white font-bold disabled:opacity-50"
      >
        إضافة
      </button>
    </div>

    {selected.length === 0 ? (
      <p className="text-center text-gray-400 py-8">
        لم يُحدد بنك بعد. المحاكي سيستخدم التجميعات المتاحة تلقائياً.
      </p>
    ) : (
      <ul className="space-y-3">
        {selected.map((bank, index) => (
          <li
            key={bank.id}
            className="border rounded-xl p-4 flex items-start justify-between gap-3"
          >
            <div>
              <p className="text-xs text-gray-400">بنك {index + 1}</p>
              <p className="font-extrabold">{bank.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {bank.category_name} · {bank.chapter_name} · {bank.slot_count}{" "}
                سؤال
              </p>
              <button
                type="button"
                onClick={() => onRemove(side, bank.id, true)}
                className="mt-2 text-sm font-bold text-orange-600"
              >
                فتح الأسئلة
              </button>
            </div>
            <button
              type="button"
              onClick={() => onRemove(side, bank.id, false)}
              disabled={saving}
              className="text-red-600 font-bold text-sm disabled:opacity-50"
            >
              إزالة
            </button>
          </li>
        ))}
      </ul>
    )}
  </section>
);

const TigerBanks = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [verbalPick, setVerbalPick] = useState("");
  const [quantPick, setQuantPick] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const payload = await getTigerBanks();
      setData(payload);
    } catch (err) {
      setToast({ type: "error", message: err.message || "تعذر التحميل" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const verbal = data?.verbal || { selected: [], available: [] };
  const quant = data?.quant || { selected: [], available: [] };

  const save = async (verbalIds, quantIds) => {
    setSaving(true);
    try {
      const payload = await updateTigerBanks(verbalIds, quantIds);
      setData(payload);
      setVerbalPick("");
      setQuantPick("");
      setToast({ type: "success", message: "تم حفظ بنوك محاكي النمر" });
    } catch (err) {
      setToast({ type: "error", message: err.message || "تعذر الحفظ" });
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = (side) => {
    const pick = side === "verbal" ? verbalPick : quantPick;
    if (!pick) return;
    const current = side === "verbal" ? verbal.selected : quant.selected;
    const next = [...current.map((b) => b.id), pick];
    if (side === "verbal") {
      save(next, quant.selected.map((b) => b.id));
    } else {
      save(verbal.selected.map((b) => b.id), next);
    }
  };

  const handleRemove = (side, bankId, openQuestions) => {
    const bank = (side === "verbal" ? verbal.selected : quant.selected).find(
      (item) => item.id === bankId
    );
    if (openQuestions && bank) {
      navigate(questionsHref(bank));
      return;
    }
    if (side === "verbal") {
      save(
        verbal.selected.filter((b) => b.id !== bankId).map((b) => b.id),
        quant.selected.map((b) => b.id)
      );
    } else {
      save(
        verbal.selected.map((b) => b.id),
        quant.selected.filter((b) => b.id !== bankId).map((b) => b.id)
      );
    }
  };

  const unusedNote = useMemo(
    () =>
      "الإزالة من هنا لا تحذف الدرس أو أسئلته، بل تخرجه من اختيار المحاكي فقط.",
    []
  );

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <button
          type="button"
          onClick={() => navigate("/admin/dashboard")}
          className="text-primary-600 font-bold mb-4"
        >
          ← لوحة التحكم
        </button>
        <h1 className="text-2xl md:text-3xl font-black text-dark-700 mb-2">
          بنوك أسئلة محاكي النمر
        </h1>
        <p className="text-dark-600 mb-2">
          حدّد بنوك اللفظي والكمي. كل قسم لفظي يأخذ ١٣ سؤالاً من نافذة داخل بنك
          واحد (١–١٣ ثم ١٤–٢٦…). الكمي يأخذ ١١ سؤالاً عشوائياً من أي بنك محدد.
          أسئلة القطعة تبقى متتالية بالترتيب.
        </p>
        <p className="text-sm text-gray-500 mb-8">{unusedNote}</p>

        {loading && <p className="text-center text-gray-500">جاري التحميل…</p>}

        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <BankColumn
              title="اللفظي"
              hint="كل قسم يختار بنكاً عشوائياً ثم ١٣ سؤالاً بالترتيب من إحدى النوافذ الخمس."
              side="verbal"
              selected={verbal.selected}
              available={verbal.available}
              pickId={verbalPick}
              setPickId={setVerbalPick}
              onAdd={() => handleAdd("verbal")}
              onRemove={handleRemove}
              saving={saving}
            />
            <BankColumn
              title="الكمي"
              hint="كل قسم يختار ١١ سؤالاً عشوائياً من أي بنك كمي محدد، دون الالتزام ببنك واحد."
              side="quant"
              selected={quant.selected}
              available={quant.available}
              pickId={quantPick}
              setPickId={setQuantPick}
              onAdd={() => handleAdd("quant")}
              onRemove={handleRemove}
              saving={saving}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TigerBanks;
