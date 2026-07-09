import React, { useState, useEffect } from 'react';
import { useAppState } from '../AppContext';
import { 
  Users, UserPlus, Shield, Trash2, Edit3, Key, 
  CheckCircle, XCircle, Search, Plus, Save, X, AlertTriangle,
  Info, UserCheck, Calendar, Mail, FileText, RefreshCw, ScrollText
} from 'lucide-react';
import { User, ActivityLog } from '../types';

export const UsersView: React.FC = () => {
  const { user: currentUser, authFetch, showToast, logs, loadLogs } = useAppState();
  
  // State definitions
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  // Form states (Add/Edit)
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Admin' | 'Analis' | 'Viewer' | 'Editor'>('Analis');
  const [status, setStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Reset Password Form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Guard role
  if (currentUser?.role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#121118] border border-slate-100 dark:border-white/5 rounded-3xl shadow-sm text-center space-y-4 max-w-lg mx-auto mt-8">
        <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/20 rounded-full flex items-center justify-center text-rose-500">
          <Shield className="w-7 h-7" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display uppercase tracking-wider">Akses Terbatas</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Maaf, halaman Manajemen Pengguna &amp; Sistem Keamanan hanya dapat diakses oleh administrator utama dengan hak akses **ADMIN**.
        </p>
      </div>
    );
  }

  // Load all users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        showToast('Gagal memuat daftar pengguna sistem', 'error');
      }
    } catch (err) {
      showToast('Koneksi terputus saat mengambil data pengguna', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    loadLogs();
  }, []);

  const resetForm = () => {
    setName('');
    setUsername('');
    setEmail('');
    setRole('Analis');
    setStatus('Aktif');
    setPassword('');
    setConfirmPassword('');
    setIsEditing(false);
    setSelectedUser(null);
    setIsResettingPassword(false);
    setNewPassword('');
    setConfirmNewPassword('');
  };

  // Switch to editing mode with user data pre-filled
  const handleEditClick = (userToEdit: User) => {
    setSelectedUser(userToEdit);
    setIsEditing(true);
    setIsResettingPassword(false);
    setName(userToEdit.name || '');
    setUsername(userToEdit.username || '');
    setEmail(userToEdit.email || '');
    setRole(userToEdit.role || 'Analis');
    setStatus(userToEdit.status || 'Aktif');
  };

  // Convert status display / DB compatibility
  const normalizeStatus = (s: string | undefined): 'Aktif' | 'Nonaktif' => {
    if (!s) return 'Aktif';
    if (s.toLowerCase() === 'aktif') return 'Aktif';
    return 'Nonaktif';
  };

  // Handle addition of new user system
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      showToast('Konfirmasi kata sandi tidak cocok!', 'error');
      return;
    }

    try {
      const res = await authFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          username,
          email,
          password,
          role,
          status,
          user: currentUser
        })
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        showToast(`Pengguna baru "${username}" berhasil ditambahkan!`, 'success');
        resetForm();
        fetchUsers();
      } else {
        showToast(data.message || 'Gagal menambahkan pengguna baru.', 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan jaringan.', 'error');
    }
  };

  // Handle edit user details update
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const res = await authFetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          username,
          email,
          role,
          status,
          user: currentUser
        })
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        showToast(`Informasi akun "${username}" berhasil diperbarui!`, 'success');
        resetForm();
        fetchUsers();
      } else {
        showToast(data.message || 'Gagal merubah informasi pengguna.', 'error');
      }
    } catch (err) {
      showToast('Koneksi bermasalah saat merubah data.', 'error');
    }
  };

  // Reset user password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (newPassword !== confirmNewPassword) {
      showToast('Konfirmasi sandi baru tidak cocok!', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showToast('Kata sandi minimal berisi 8 karakter!', 'error');
      return;
    }

    try {
      const res = await authFetch(`/api/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword,
          user: currentUser
        })
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        showToast(`Kata sandi untuk pengguna "${selectedUser.username}" berhasil diatur ulang!`, 'success');
        resetForm();
      } else {
        showToast(data.message || 'Gagal mengatur ulang kata sandi.', 'error');
      }
    } catch (err) {
      showToast('Koneksi terganggu saat mereset kata sandi.', 'error');
    }
  };

  // Delete User with prevention
  const handleDeleteUser = async (userToDelete: User) => {
    if (userToDelete.id === currentUser?.id) {
      showToast('Anda tidak diperbolehkan menghapus akun Anda sendiri!', 'error');
      return;
    }

    const confirmDeletion = window.confirm(
      `Apakah Anda yakin ingin menghapus pengguna "${userToDelete.name}" (@${userToDelete.username}) secara permanen dari pangkalan data?`
    );

    if (!confirmDeletion) return;

    try {
      const res = await authFetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: currentUser
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast('Pengguna berhasil dihapus secara permanen.', 'success');
        if (selectedUser?.id === userToDelete.id) {
          resetForm();
        }
        fetchUsers();
      } else {
        showToast(data.message || 'Gagal menghapus pengguna.', 'error');
      }
    } catch (err) {
      showToast('Gagal terhubung dengan server pengolah data.', 'error');
    }
  };

  // Count aggregate values for stats Cards
  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'Admin').length;
  const analisCount = users.filter(u => u.role === 'Analis').length;
  const activeCount = users.filter(u => normalizeStatus(u.status) === 'Aktif').length;

  // Filter users based on query matching
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Upper Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/55 dark:border-white/5 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-display text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Manajemen Akun &amp; Hak Akses Role</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Daftarkan analis baru, atur klasifikasi wewenang penelusuran, ubah status keanggotaan, dan pantau pengamanan platform.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 border border-slate-200 dark:border-white/5 text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Aggregate Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Stat Card 1 */}
        <div className="p-4 bg-white dark:bg-[#121118] border border-slate-100 dark:border-white/5 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
            <Users className="w-5 h-5 text-indigo-505 text-indigo-500" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Pengguna</span>
            <span className="text-base sm:text-lg font-black text-slate-800 dark:text-white font-mono">{totalUsers}</span>
          </div>
        </div>

        {/* Stat Card 2 */}
        <div className="p-4 bg-white dark:bg-[#121118] border border-slate-100 dark:border-white/5 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-50 dark:bg-amber-950/10 rounded-xl flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Administrator</span>
            <span className="text-base sm:text-lg font-black text-slate-800 dark:text-white font-mono">{adminCount}</span>
          </div>
        </div>

        {/* Stat Card 3 */}
        <div className="p-4 bg-white dark:bg-[#121118] border border-slate-100 dark:border-white/5 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/10 rounded-xl flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sistem Analis</span>
            <span className="text-base sm:text-lg font-black text-slate-800 dark:text-white font-mono">{analisCount}</span>
          </div>
        </div>

        {/* Stat Card 4 */}
        <div className="p-4 bg-white dark:bg-[#121118] border border-slate-100 dark:border-white/5 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-950/10 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-emerald-505 text-emerald-500" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status Aktif</span>
            <span className="text-base sm:text-lg font-black text-slate-800 dark:text-white font-mono">{activeCount} / {totalUsers}</span>
          </div>
        </div>

      </div>

      {/* Main Split Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Table & search Panel (Left 2 cols) */}
        <div className="p-5 bg-white dark:bg-[#121118] border border-slate-105 border-slate-100 dark:border-white/5 rounded-2xl shadow-sm lg:col-span-2 space-y-4">
          
          {/* Header Action bar inside list panel */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white font-display uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              Daftar Account Pengguna Aktif
            </h3>
            
            {/* Search inputs */}
            <div className="relative w-full sm:w-60">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama, role, atau email..."
                className="w-full pl-8.5 pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* User Table Element */}
          <div className="overflow-x-auto rounded-xl border border-slate-150 border-slate-105 border-slate-100 dark:border-white/5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-900/35 border-b border-slate-100 dark:border-white/5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  <th className="py-3 px-4">Nama Pengguna</th>
                  <th className="py-3 px-4">Akun / Email</th>
                  <th className="py-3 px-4 text-center">Hak Akses Role</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      Sedang mengambil data sistem...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      {searchQuery ? 'Tidak ada pengguna yang cocok dengan kueri Anda.' : 'Pangkalan database kosong.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((item) => {
                    const isSelf = item.id === currentUser?.id;
                    const statusVal = normalizeStatus(item.status);
                    
                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-slate-50/55 dark:hover:bg-white/1 duration-100 transition ${isSelf ? 'bg-indigo-50/20 dark:bg-indigo-950/5' : ''}`}
                      >
                        {/* Column 1: Avatar + Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg font-bold text-xs uppercase flex items-center justify-center shrink-0 ${
                              item.role === 'Admin' 
                                ? 'bg-amber-100 dark:bg-amber-955 bg-amber-550 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400' 
                                : item.role === 'Analis'
                                ? 'bg-indigo-55 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400'
                                : 'bg-slate-105 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'
                            }`}>
                              {item.name ? item.name.substring(0, 2) : 'US'}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800 dark:text-slate-205 dark:text-white flex items-center gap-1">
                                <span>{item.name}</span>
                                {isSelf && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
                                    SAYA
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">@{item.username}</span>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Account Details */}
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-650 dark:text-slate-400">
                          {item.email || '-'}
                          {item.createdAt && (
                            <span className="block text-[9.5px] font-sans font-light text-slate-400 dark:text-slate-500">
                              Dibuat: {new Date(item.createdAt).toLocaleDateString('id-ID')}
                            </span>
                          )}
                        </td>

                        {/* Column 3: Role Badge */}
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            item.role === 'Admin' 
                              ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/20' 
                              : item.role === 'Analis'
                              ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/20'
                              : item.role === 'Editor'
                              ? 'bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-900/20'
                              : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5'
                          }`}>
                            <Shield className="w-3 h-3 flex-shrink-0" />
                            {item.role}
                          </span>
                        </td>

                        {/* Column 4: Status badge */}
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                            statusVal === 'Aktif' 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {statusVal === 'Aktif' ? (
                              <CheckCircle className="w-3.5 h-3.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            {statusVal}
                          </span>
                        </td>

                        {/* Column 5: Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit Action */}
                            <button
                              onClick={() => handleEditClick(item)}
                              title="Sunting Informasi Pengguna"
                              className="p-1 px-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-150 border-slate-200 dark:border-white/5 text-slate-650 hover:text-slate-900 dark:text-slate-350 dark:hover:text-white rounded-lg transition active:scale-95 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            
                            {/* Edit password action */}
                            <button
                              onClick={() => {
                                setSelectedUser(item);
                                setIsResettingPassword(true);
                                setIsEditing(false);
                                setNewPassword('');
                                setConfirmNewPassword('');
                              }}
                              title="Ubah Kata Sandi"
                              className="p-1 px-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-205 border-slate-200 dark:border-white/5 text-slate-650 hover:text-slate-900 dark:text-slate-350 dark:hover:text-white rounded-lg transition active:scale-95 cursor-pointer"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Action (guarded for self-delete) */}
                            <button
                              onClick={() => handleDeleteUser(item)}
                              disabled={isSelf}
                              title={isSelf ? 'Anda tidak dapat menghapus diri sendiri' : 'Hapus akun dari sistem'}
                              className="p-1 px-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/20 rounded-lg transition active:scale-95 disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Security Information Panel */}
          <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/10 rounded-xl border border-indigo-150 border-indigo-100 dark:border-indigo-900/10 flex gap-3 text-[11px] leading-relaxed text-slate-605 text-slate-600 dark:text-slate-400">
            <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-200">Panduan Klasifikasi Peran Keamanan (RBAC):</span>
              <p>
                - <span className="font-semibold text-amber-600 dark:text-amber-400">Admin</span>: Akses total konfigurasi sistem, parameter crawler, dan manajemen akun analis.
                <br />
                - <span className="font-semibold text-indigo-600 dark:text-indigo-400">Analis</span>: Hak akses penuh penulisan analisis Gemini AI, pengeditan dan pendefinisian isu.
                <br />
                - <span className="font-semibold text-teal-600 dark:text-teal-400">Editor &amp; Viewer</span>: Hak akses terbatas pada melihat grafik laporan, memfilter media monitoring wilayah, dan melacak data.
              </p>
            </div>
          </div>

        </div>

        {/* Create/Edit action form inputs (Right 1 col) */}
        <div>
          
          {/* Main Container Wrapper */}
          <div className="p-5 bg-white dark:bg-[#121118] border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm space-y-4">
            
            {/* Header Switch description */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white font-display uppercase tracking-widest flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Edit3 className="w-4 h-4 text-emerald-500" />
                    <span>Ubah Info Akun</span>
                  </>
                ) : isResettingPassword ? (
                  <>
                    <Key className="w-4 h-4 text-amber-500" />
                    <span>Ubah Sandi Akun</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 text-indigo-500" />
                    <span>Tambah Pengguna</span>
                  </>
                )}
              </h3>

              {(isEditing || isResettingPassword) && (
                <button
                  onClick={resetForm}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* FORM CONTAINER SWITCH */}
            {isResettingPassword && selectedUser ? (
              
              /* Password Resetting Sub-form */
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex gap-2 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    Mengubah password untuk akun <strong>@{selectedUser.username}</strong> ({selectedUser.name}).
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Password Baru
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Sandi baru minimal 8 Karakter..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Ulangi Password Baru
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    placeholder="Lakukan verifikasi sandi..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Submit resetting password */}
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-amber-500/10 transition transform active:scale-95 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update Kata Sandi Akun</span>
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 text-xs font-bold rounded-xl transition duration-150 cursor-pointer"
                >
                  Gagalkan Perubahan
                </button>
              </form>

            ) : isEditing ? (
              
              /* Editing existing user Form */
              <form onSubmit={handleUpdateUser} className="space-y-4">
                
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Contoh: Brigadier Ahmad"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Username (Guarded) */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Nama Akun / Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Contoh: ahmad_intel"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Alamat Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Contoh: ahmad@platform.gov.id"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Role dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Klasifikasi Hak Akses *
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Admin">Admin (Full Control)</option>
                    <option value="Analis">Analis (Manage &amp; Write AI)</option>
                    <option value="Editor">Editor (Data Control)</option>
                    <option value="Viewer">Viewer (View-Only Portal)</option>
                  </select>
                </div>

                {/* Status Toggle option */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status Akun Portal
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStatus('Aktif')}
                      className={`flex-1 py-2 px-2.5 text-[10.5px] font-bold rounded-xl border transition duration-150 cursor-pointer text-center ${
                        status === 'Aktif'
                          ? 'bg-emerald-500 border-transparent text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      Aktif
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('Nonaktif')}
                      className={`flex-1 py-2 px-2.5 text-[10.5px] font-bold rounded-xl border transition duration-150 cursor-pointer text-center ${
                        status === 'Nonaktif'
                          ? 'bg-rose-500 border-transparent text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      Non-Aktif
                    </button>
                  </div>
                </div>

                {/* Submit update user */}
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition transform active:scale-95 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan Akun</span>
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 text-xs font-bold rounded-xl transition duration-150 cursor-pointer"
                >
                  Batal
                </button>
              </form>

            ) : (
              
              /* Default adding new user Form */
              <form onSubmit={handleAddUser} className="space-y-4">
                
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Contoh: Brigadier Ahmad"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Username / Nama Akun *
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Contoh: ahmad_intel"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Contoh: ahmad@platform.gov.id"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Password Policy info */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-905 bg-slate-950/20 border border-slate-100 dark:border-white/5 rounded-xl text-[9.5px] leading-relaxed text-slate-500 dark:text-slate-400 space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-350 block">Kebijakan Kata Sandi Sistem:</span>
                  <p>Min 8 Karakter, kombinasi Huruf Besar, Kecil, Angka, &amp; Simbol.</p>
                </div>

                {/* Password field */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Kata Sandi Akun *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Kata sandi rahasia..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Ulangi Sandi Akun *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Lakukan kesesuaian sandi..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Role dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Klasifikasi Hak Akses *
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Admin">Admin (Full Control)</option>
                    <option value="Analis">Analis (Manage &amp; Write AI)</option>
                    <option value="Editor">Editor (Data Control)</option>
                    <option value="Viewer">Viewer (View-Only Portal)</option>
                  </select>
                </div>

                {/* Status Options */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status Awal Akun
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStatus('Aktif')}
                      className={`flex-1 py-1.5 px-2 text-[10.5px] font-bold rounded-xl border transition duration-150 cursor-pointer text-center ${
                        status === 'Aktif'
                          ? 'bg-emerald-500 border-transparent text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      Aktif
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('Nonaktif')}
                      className={`flex-1 py-1.5 px-2 text-[10.5px] font-bold rounded-xl border transition duration-150 cursor-pointer text-center ${
                        status === 'Nonaktif'
                          ? 'bg-rose-500 border-transparent text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      Nonaktif
                    </button>
                  </div>
                </div>

                {/* Submit button Bar */}
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-indigo-500/10 transition transform active:scale-95 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Daftarkan Pengguna Baru</span>
                </button>
              </form>
            )}

          </div>

        </div>

      </div>

      {/* FULL WIDTH SYSTEM AUDIT TRAIL LOGS */}
      <div className="bg-white dark:bg-[#121118] border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-105 border-slate-100 dark:border-white/5 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-950/20">
          <ScrollText className="w-4 h-4 text-indigo-500" id="users-scroll-icon"/>
          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-display">Log Aktivitas Paling Terbaru (System Security Trail)</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/30 dark:bg-slate-950/40 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-white/5">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Operator User</th>
                <th className="py-3 px-4">Peran / Role</th>
                <th className="py-3 px-4">Aksi Audit</th>
                <th className="py-3 px-4">Keterangan / Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs text-slate-600 dark:text-slate-400 font-mono">
              {logs && logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 dark:text-slate-500">
                      {new Date(log.timestamp).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-300">
                      @{log.username}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        log.role === 'Admin' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400' : 
                        log.role === 'Editor' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400' : 
                        log.role === 'Analis' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {log.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 truncate max-w-xs text-slate-500 dark:text-slate-400">
                      {log.target}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    Belum ada audit log terekam dalam database file.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
