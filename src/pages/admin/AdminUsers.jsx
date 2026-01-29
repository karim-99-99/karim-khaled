import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getUsers as getUsersLocal,
  updateUser as updateUserLocal,
  deleteUser as deleteUserLocal,
  getCurrentUser,
} from "../../services/storageService";
import * as backendApi from "../../services/backendApi";
import Header from "../../components/Header";
import { isArabicBrowser } from "../../utils/language";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, active, inactive
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({
    hasAbilitiesAccess: false,
    // "تحصيلي" section removed — keep only abilities permissions.
    abilitiesSubjects: {
      verbal: false,
      quantitative: false,
    },
    abilitiesCategories: {
      foundation: false,
      collections: false,
    },
  });
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const useBackend = backendApi.isBackendOn();

  useEffect(() => {
    if (!currentUser || currentUser.role !== "admin") {
      navigate("/");
      return;
    }
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, filterStatus]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      if (useBackend) {
        const allUsers = await backendApi.getUsers();
        // Filter out admin users, show only students
        const studentUsers = allUsers.filter((u) => u.role === "student");
        setUsers(studentUsers);
      } else {
        const allUsers = getUsersLocal();
        const studentUsers = allUsers.filter((u) => u.role === "student");
        setUsers(studentUsers);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      alert(error.message || "حدث خطأ أثناء تحميل المستخدمين");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by status
    if (filterStatus === "active") {
      filtered = filtered.filter((u) => u.isActive === true);
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter((u) => u.isActive !== true);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(term)) ||
          (u.email && u.email.toLowerCase().includes(term)) ||
          (u.username && u.username.toLowerCase().includes(term)) ||
          (u.phone && u.phone.includes(term)),
      );
    }

    setFilteredUsers(filtered);
  };

  const handleToggleActive = async (userId) => {
    try {
      const user = users.find((u) => u.id === userId);
      if (!user) return;

      if (useBackend) {
        await backendApi.updateUser(userId, { isActive: !user.isActive });
      } else {
        updateUserLocal(userId, { isActive: !user.isActive });
      }
      await loadUsers();
    } catch (error) {
      console.error("Error toggling user status:", error);
      alert(error.message || "حدث خطأ أثناء تحديث حالة المستخدم");
    }
  };

  const handleDelete = async (userId, userName) => {
    if (
      !window.confirm(
        `هل أنت متأكد من حذف المستخدم "${userName}"؟\nهذا الإجراء لا يمكن التراجع عنه.`,
      )
    ) {
      return;
    }

    try {
      if (useBackend) {
        await backendApi.deleteUser(userId);
      } else {
        deleteUserLocal(userId);
      }
      await loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert(error.message || "حدث خطأ أثناء حذف المستخدم");
    }
  };

  const handleOpenPermissions = (user) => {
    setSelectedUser(user);
    const p = user.permissions || {};
    setPermissions({
      hasAbilitiesAccess: !!p.hasAbilitiesAccess,
      abilitiesSubjects: {
        verbal: !!p.abilitiesSubjects?.verbal,
        quantitative: !!p.abilitiesSubjects?.quantitative,
      },
      abilitiesCategories: {
        foundation: !!p.abilitiesCategories?.foundation,
        collections: !!p.abilitiesCategories?.collections,
      },
    });
    setShowPermissionsModal(true);
  };

  const handleClosePermissions = () => {
    setShowPermissionsModal(false);
    setSelectedUser(null);
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    const base = selectedUser.permissions || {
      hasAbilitiesAccess: false,
      abilitiesSubjects: { verbal: false, quantitative: false },
      abilitiesCategories: { foundation: false, collections: false },
    };
    const subj = {
      ...(base.abilitiesSubjects || {}),
      ...(permissions.abilitiesSubjects || {}),
    };
    const cats = {
      ...(base.abilitiesCategories || {}),
      ...(permissions.abilitiesCategories || {}),
    };

    const merged = {
      ...base,
      ...permissions,
      abilitiesSubjects: subj,
      abilitiesCategories: cats,
    };

    // عند منح التأسيس أو التجميعات، تفعيل وصول قسم القدرات تلقائياً حتى تطبق الصلاحيات
    if (
      merged.abilitiesCategories?.foundation ||
      merged.abilitiesCategories?.collections
    ) {
      merged.hasAbilitiesAccess = true;
    }

    try {
      if (useBackend) {
        await backendApi.updateUser(selectedUser.id, { permissions: merged });
      } else {
        updateUserLocal(selectedUser.id, { permissions: merged });
      }
      await loadUsers();
      handleClosePermissions();
    } catch (error) {
      console.error("Error updating permissions:", error);
      alert(error.message || "حدث خطأ أثناء تحديث الصلاحيات");
    }
  };

  const handlePermissionChange = (field, value) => {
    if (field === "verbal" || field === "quantitative") {
      setPermissions({
        ...permissions,
        abilitiesSubjects: {
          ...permissions.abilitiesSubjects,
          [field]: value,
        },
      });
    } else if (field === "foundation" || field === "collections") {
      setPermissions({
        ...permissions,
        abilitiesCategories: {
          ...(permissions.abilitiesCategories || {
            foundation: false,
            collections: false,
          }),
          [field]: value,
        },
      });
    } else {
      setPermissions({
        ...permissions,
        [field]: value,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-dark-600">
              {isArabicBrowser() ? "إدارة المستخدمين" : "User Management"}
            </h1>
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="bg-dark-600 text-white px-4 py-2 rounded-lg hover:bg-dark-700 transition font-medium"
            >
              ← {isArabicBrowser() ? "رجوع" : "Back"}
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-2">
                  {isArabicBrowser() ? "البحث" : "Search"}
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    isArabicBrowser()
                      ? "ابحث بالاسم، البريد، اسم المستخدم، أو الهاتف"
                      : "Search by name, email, username, or phone"
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-2">
                  {isArabicBrowser() ? "الحالة" : "Status"}
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  dir="rtl"
                >
                  <option value="all">
                    {isArabicBrowser() ? "الكل" : "All"}
                  </option>
                  <option value="active">
                    {isArabicBrowser() ? "مفعّل" : "Active"}
                  </option>
                  <option value="inactive">
                    {isArabicBrowser() ? "غير مفعّل" : "Inactive"}
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-dark-600">
                {isArabicBrowser() ? "جاري التحميل..." : "Loading..."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-primary-500 text-white">
                    <tr>
                      <th className="px-4 py-3 text-right font-semibold">
                        {isArabicBrowser() ? "الاسم" : "Name"}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        {isArabicBrowser() ? "اسم المستخدم" : "Username"}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        {isArabicBrowser() ? "البريد الإلكتروني" : "Email"}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        {isArabicBrowser() ? "الهاتف" : "Phone"}
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">
                        {isArabicBrowser() ? "الحالة" : "Status"}
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">
                        {isArabicBrowser() ? "الصلاحيات" : "Permissions"}
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">
                        {isArabicBrowser() ? "تاريخ التسجيل" : "Registered"}
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">
                        {isArabicBrowser() ? "الإجراءات" : "Actions"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan="8"
                          className="px-4 py-8 text-center text-dark-600"
                        >
                          {isArabicBrowser()
                            ? "لا توجد حسابات مسجلة"
                            : "No registered accounts"}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-dark-600">
                            {user.name || "-"}
                          </td>
                          <td className="px-4 py-3 text-dark-600 font-mono text-sm">
                            {user.username || "-"}
                          </td>
                          <td className="px-4 py-3 text-dark-600">
                            {user.email}
                          </td>
                          <td className="px-4 py-3 text-dark-600">
                            {user.phone || "-"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${
                                user.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {user.isActive
                                ? isArabicBrowser()
                                  ? "مفعّل"
                                  : "Active"
                                : isArabicBrowser()
                                  ? "غير مفعّل"
                                  : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col gap-1 items-center">
                              {user.permissions?.hasAbilitiesAccess && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                  {isArabicBrowser() ? "قدرات" : "Abilities"}
                                </span>
                              )}
                              {!user.permissions?.hasAbilitiesAccess && (
                                <span className="text-xs text-gray-500">
                                  {isArabicBrowser()
                                    ? "لا توجد صلاحيات"
                                    : "No permissions"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-dark-600">
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString(
                                  "ar-SA",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  },
                                )
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                              <button
                                onClick={() => handleOpenPermissions(user)}
                                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium hover:bg-blue-200 transition"
                                title={
                                  isArabicBrowser()
                                    ? "إدارة الصلاحيات"
                                    : "Manage Permissions"
                                }
                              >
                                {isArabicBrowser() ? "صلاحيات" : "Permissions"}
                              </button>
                              <button
                                onClick={() => handleToggleActive(user.id)}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                                  user.isActive
                                    ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                    : "bg-green-100 text-green-800 hover:bg-green-200"
                                }`}
                                title={
                                  user.isActive
                                    ? isArabicBrowser()
                                      ? "تعطيل"
                                      : "Deactivate"
                                    : isArabicBrowser()
                                      ? "تفعيل"
                                      : "Activate"
                                }
                              >
                                {user.isActive
                                  ? isArabicBrowser()
                                    ? "تعطيل"
                                    : "Deactivate"
                                  : isArabicBrowser()
                                    ? "تفعيل"
                                    : "Activate"}
                              </button>
                              <button
                                onClick={() =>
                                  handleDelete(
                                    user.id,
                                    user.name || user.username,
                                  )
                                }
                                className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-sm font-medium hover:bg-red-200 transition"
                                title={isArabicBrowser() ? "حذف" : "Delete"}
                              >
                                {isArabicBrowser() ? "حذف" : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-dark-600 mb-1">
                {isArabicBrowser() ? "إجمالي المستخدمين" : "Total Users"}
              </div>
              <div className="text-2xl font-bold text-primary-500">
                {users.length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-dark-600 mb-1">
                {isArabicBrowser() ? "مفعّل" : "Active"}
              </div>
              <div className="text-2xl font-bold text-green-500">
                {users.filter((u) => u.isActive === true).length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-dark-600 mb-1">
                {isArabicBrowser() ? "غير مفعّل" : "Inactive"}
              </div>
              <div className="text-2xl font-bold text-red-500">
                {users.filter((u) => u.isActive !== true).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Permissions Modal */}
      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-dark-600">
                  {isArabicBrowser() ? "إدارة الصلاحيات" : "Manage Permissions"}
                </h2>
                <button
                  onClick={handleClosePermissions}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="mb-4">
                <p className="text-dark-600 font-medium mb-2">
                  {isArabicBrowser() ? "المستخدم:" : "User:"}{" "}
                  {selectedUser.name ||
                    selectedUser.username ||
                    selectedUser.email}
                </p>
              </div>

              {/* Section Access */}
              <div className="space-y-4 mb-6">
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold text-dark-600 mb-3">
                    {isArabicBrowser()
                      ? "الوصول إلى الأقسام"
                      : "Section Access"}
                  </h3>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.hasAbilitiesAccess}
                        onChange={(e) =>
                          handlePermissionChange(
                            "hasAbilitiesAccess",
                            e.target.checked,
                          )
                        }
                        className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
                      />
                      <span className="text-dark-600 font-medium">
                        {isArabicBrowser()
                          ? "الوصول إلى قسم القدرات"
                          : "Access to Abilities Section"}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Abilities Subjects (only show if abilities access is enabled) */}
                {permissions.hasAbilitiesAccess && (
                  <>
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-semibold text-dark-600 mb-3">
                        {isArabicBrowser()
                          ? "المواد في قسم القدرات"
                          : "Abilities Section Subjects"}
                      </h3>

                      <div className="space-y-3 pr-6">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={permissions.abilitiesSubjects.verbal}
                            onChange={(e) =>
                              handlePermissionChange("verbal", e.target.checked)
                            }
                            className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
                          />
                          <span className="text-dark-600 font-medium">
                            {isArabicBrowser() ? "اللفظي" : "Verbal"}
                          </span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={permissions.abilitiesSubjects.quantitative}
                            onChange={(e) =>
                              handlePermissionChange(
                                "quantitative",
                                e.target.checked,
                              )
                            }
                            className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
                          />
                          <span className="text-dark-600 font-medium">
                            {isArabicBrowser() ? "الكمي" : "Quantitative"}
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Abilities Categories (only show if abilities access is enabled) */}
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-semibold text-dark-600 mb-3">
                        {isArabicBrowser()
                          ? "التصنيفات في قسم القدرات"
                          : "Abilities Section Categories"}
                      </h3>

                      <div className="space-y-3 pr-6">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              permissions.abilitiesCategories?.foundation ||
                              false
                            }
                            onChange={(e) =>
                              handlePermissionChange(
                                "foundation",
                                e.target.checked,
                              )
                            }
                            className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
                          />
                          <span className="text-dark-600 font-medium">
                            {isArabicBrowser() ? "التأسيس" : "Foundation"}
                          </span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              permissions.abilitiesCategories?.collections ||
                              false
                            }
                            onChange={(e) =>
                              handlePermissionChange(
                                "collections",
                                e.target.checked,
                              )
                            }
                            className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
                          />
                          <span className="text-dark-600 font-medium">
                            {isArabicBrowser() ? "التجميعات" : "Collections"}
                          </span>
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleClosePermissions}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  {isArabicBrowser() ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={handleSavePermissions}
                  className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition font-medium"
                >
                  {isArabicBrowser() ? "حفظ" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
