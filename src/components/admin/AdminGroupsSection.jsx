import { useState, useEffect } from "react";
import * as backendApi from "../../services/backendApi";
import { isArabicBrowser } from "../../utils/language";

export default function AdminGroupsSection({ students, onRefreshUsers }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createName, setCreateName] = useState("");
  const [createParentId, setCreateParentId] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [addMemberGroupId, setAddMemberGroupId] = useState(null);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const list = await backendApi.getStudentGroups();
      setGroups(Array.isArray(list) ? list : []);
    } catch (e) {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (backendApi.isBackendOn()) loadGroups();
  }, []);

  const flattenGroups = (list, out = []) => {
    (list || []).forEach((g) => {
      out.push(g);
      if (g.children && g.children.length) flattenGroups(g.children, out);
    });
    return out;
  };

  const allGroups = flattenGroups(groups);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createName.trim()) return;
    try {
      await backendApi.createStudentGroup({
        name: createName.trim(),
        parent: createParentId || null,
      });
      setCreateName("");
      setCreateParentId("");
      await loadGroups();
    } catch (err) {
      alert(err?.message || "فشل إنشاء المجموعة");
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!editingId || !editName.trim()) return;
    try {
      await backendApi.updateStudentGroup(editingId, { name: editName.trim() });
      setEditingId(null);
      setEditName("");
      await loadGroups();
    } catch (err) {
      alert(err?.message || "فشل تعديل الاسم");
    }
  };

  const handleDelete = async (g) => {
    if (!window.confirm(isArabicBrowser() ? `حذف المجموعة "${g.name}"؟` : `Delete group "${g.name}"?`)) return;
    try {
      await backendApi.deleteStudentGroup(g.id);
      await loadGroups();
    } catch (err) {
      alert(err?.message || "فشل الحذف");
    }
  };

  const handleAddMember = async (groupId, userId) => {
    try {
      await backendApi.addGroupMember(groupId, userId);
      setAddMemberGroupId(null);
      await loadGroups();
    } catch (err) {
      alert(err?.message || "فشل إضافة الطالب");
    }
  };

  const handleRemoveMember = async (groupId, userId) => {
    try {
      await backendApi.removeGroupMember(groupId, userId);
      await loadGroups();
    } catch (err) {
      alert(err?.message || "فشل إزالة الطالب");
    }
  };

  if (!backendApi.isBackendOn()) return null;

  const renderGroup = (g, depth = 0) => {
    const members = g.members || [];
    const memberIds = new Set(members.map((m) => m.user_id || m.user?.id));
    const availableStudents = (students || []).filter((s) => !memberIds.has(s.id));
    const isEditing = editingId === g.id;
    const showAddMember = addMemberGroupId === g.id;

    return (
      <div key={g.id} className="border border-gray-200 rounded-lg mb-3 overflow-hidden" style={{ marginRight: depth * 24 }}>
        <div className="bg-gray-100 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {isEditing ? (
              <form onSubmit={handleRename} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="px-3 py-1 border rounded"
                  autoFocus
                />
                <button type="submit" className="bg-primary-500 text-white px-3 py-1 rounded text-sm">
                  حفظ
                </button>
                <button type="button" onClick={() => { setEditingId(null); setEditName(""); }} className="text-gray-600">
                  إلغاء
                </button>
              </form>
            ) : (
              <span className="font-bold text-dark-700">{g.name}</span>
            )}
            {!isEditing && (
              <>
                <button
                  onClick={() => { setEditingId(g.id); setEditName(g.name); }}
                  className="text-sm bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                >
                  تعديل الاسم
                </button>
                <button
                  onClick={() => handleDelete(g)}
                  className="text-sm bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                >
                  حذف
                </button>
                <button
                  onClick={() => setAddMemberGroupId(addMemberGroupId === g.id ? null : g.id)}
                  className="text-sm bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                >
                  إضافة طالب
                </button>
              </>
            )}
          </div>
          <span className="text-sm text-gray-600">{members.length} طالب</span>
        </div>
        {showAddMember && availableStudents.length > 0 && (
          <div className="px-4 py-2 bg-green-50 border-t flex flex-wrap gap-2">
            {availableStudents.slice(0, 20).map((s) => (
              <button
                key={s.id}
                onClick={() => handleAddMember(g.id, s.id)}
                className="bg-white border border-green-300 px-3 py-1 rounded text-sm hover:bg-green-100"
              >
                {s.first_name || s.username} +
              </button>
            ))}
            {availableStudents.length > 20 && <span className="text-sm text-gray-500">...</span>}
          </div>
        )}
        <div className="px-4 py-2 divide-y">
          {members.map((m) => (
            <div key={m.id || m.user_id} className="py-2 flex justify-between items-center">
              <span className="text-dark-700">{m.first_name || m.username} — {m.email}</span>
              <button
                onClick={() => handleRemoveMember(g.id, m.user_id || m.user)}
                className="text-red-600 text-sm hover:underline"
              >
                إزالة
              </button>
            </div>
          ))}
          {members.length === 0 && <p className="text-gray-500 text-sm py-2">لا يوجد طلاب في هذه المجموعة</p>}
        </div>
        {g.children && g.children.length > 0 && (
          <div className="pr-4 pb-3">
            {g.children.map((ch) => renderGroup(ch, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold text-dark-600 mb-4">المجموعات</h2>
      <form onSubmit={handleCreate} className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          value={createName}
          onChange={(e) => setCreateName(e.target.value)}
          placeholder="اسم المجموعة الجديدة"
          className="px-3 py-2 border rounded-lg flex-1 min-w-[180px]"
        />
        <select
          value={createParentId}
          onChange={(e) => setCreateParentId(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">مجموعة رئيسية</option>
          {allGroups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <button type="submit" className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600">
          إنشاء مجموعة
        </button>
      </form>
      {loading ? (
        <p className="text-gray-600">جاري التحميل...</p>
      ) : (
        <div>{groups.map((g) => renderGroup(g))}</div>
      )}
      {!loading && groups.length === 0 && (
        <p className="text-gray-500">لا توجد مجموعات. أنشئ مجموعة ثم أضف طلاباً إليها.</p>
      )}
    </div>
  );
}
