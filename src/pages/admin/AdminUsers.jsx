import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers, updateUser, deleteUser, getCurrentUser } from '../../services/storageService';
import Header from '../../components/Header';
import { isArabicBrowser } from '../../utils/language';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/');
      return;
    }
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, filterStatus]);

  const loadUsers = () => {
    const allUsers = getUsers();
    // Don't show admin users in the list (or show them but mark them differently)
    const studentUsers = allUsers.filter(u => u.role === 'student');
    setUsers(studentUsers);
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by status
    if (filterStatus === 'active') {
      filtered = filtered.filter(u => u.isActive === true);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter(u => u.isActive !== true);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u => 
        (u.name && u.name.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.username && u.username.toLowerCase().includes(term)) ||
        (u.phone && u.phone.includes(term))
      );
    }

    setFilteredUsers(filtered);
  };

  const handleToggleActive = (userId) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      updateUser(userId, { isActive: !user.isActive });
      loadUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      alert(error.message || 'حدث خطأ أثناء تحديث حالة المستخدم');
    }
  };

  const handleDelete = (userId, userName) => {
    if (!window.confirm(`هل أنت متأكد من حذف المستخدم "${userName}"؟\nهذا الإجراء لا يمكن التراجع عنه.`)) {
      return;
    }

    try {
      deleteUser(userId);
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error.message || 'حدث خطأ أثناء حذف المستخدم');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-dark-600">
              {isArabicBrowser() ? 'إدارة المستخدمين' : 'User Management'}
            </h1>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="bg-dark-600 text-white px-4 py-2 rounded-lg hover:bg-dark-700 transition font-medium"
            >
              ← {isArabicBrowser() ? 'رجوع' : 'Back'}
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-2">
                  {isArabicBrowser() ? 'البحث' : 'Search'}
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={isArabicBrowser() ? 'ابحث بالاسم، البريد، اسم المستخدم، أو الهاتف' : 'Search by name, email, username, or phone'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-2">
                  {isArabicBrowser() ? 'الحالة' : 'Status'}
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  dir="rtl"
                >
                  <option value="all">{isArabicBrowser() ? 'الكل' : 'All'}</option>
                  <option value="active">{isArabicBrowser() ? 'مفعّل' : 'Active'}</option>
                  <option value="inactive">{isArabicBrowser() ? 'غير مفعّل' : 'Inactive'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-primary-500 text-white">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold">{isArabicBrowser() ? 'الاسم' : 'Name'}</th>
                    <th className="px-4 py-3 text-right font-semibold">{isArabicBrowser() ? 'اسم المستخدم' : 'Username'}</th>
                    <th className="px-4 py-3 text-right font-semibold">{isArabicBrowser() ? 'البريد الإلكتروني' : 'Email'}</th>
                    <th className="px-4 py-3 text-right font-semibold">{isArabicBrowser() ? 'الهاتف' : 'Phone'}</th>
                    <th className="px-4 py-3 text-center font-semibold">{isArabicBrowser() ? 'الحالة' : 'Status'}</th>
                    <th className="px-4 py-3 text-center font-semibold">{isArabicBrowser() ? 'تاريخ التسجيل' : 'Registered'}</th>
                    <th className="px-4 py-3 text-center font-semibold">{isArabicBrowser() ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-dark-600">
                        {isArabicBrowser() ? 'لا توجد حسابات مسجلة' : 'No registered accounts'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-dark-600">{user.name || '-'}</td>
                        <td className="px-4 py-3 text-dark-600 font-mono text-sm">{user.username || '-'}</td>
                        <td className="px-4 py-3 text-dark-600">{user.email}</td>
                        <td className="px-4 py-3 text-dark-600">{user.phone || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              user.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {user.isActive
                              ? (isArabicBrowser() ? 'مفعّل' : 'Active')
                              : (isArabicBrowser() ? 'غير مفعّل' : 'Inactive')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-dark-600">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString('ar-SA', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleToggleActive(user.id)}
                              className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                                user.isActive
                                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                  : 'bg-green-100 text-green-800 hover:bg-green-200'
                              }`}
                              title={user.isActive ? (isArabicBrowser() ? 'تعطيل' : 'Deactivate') : (isArabicBrowser() ? 'تفعيل' : 'Activate')}
                            >
                              {user.isActive
                                ? (isArabicBrowser() ? 'تعطيل' : 'Deactivate')
                                : (isArabicBrowser() ? 'تفعيل' : 'Activate')}
                            </button>
                            <button
                              onClick={() => handleDelete(user.id, user.name || user.username)}
                              className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-sm font-medium hover:bg-red-200 transition"
                              title={isArabicBrowser() ? 'حذف' : 'Delete'}
                            >
                              {isArabicBrowser() ? 'حذف' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-dark-600 mb-1">{isArabicBrowser() ? 'إجمالي المستخدمين' : 'Total Users'}</div>
              <div className="text-2xl font-bold text-primary-500">{users.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-dark-600 mb-1">{isArabicBrowser() ? 'مفعّل' : 'Active'}</div>
              <div className="text-2xl font-bold text-green-500">
                {users.filter(u => u.isActive === true).length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-dark-600 mb-1">{isArabicBrowser() ? 'غير مفعّل' : 'Inactive'}</div>
              <div className="text-2xl font-bold text-red-500">
                {users.filter(u => u.isActive !== true).length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;

