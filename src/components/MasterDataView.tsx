import React, { useState, useEffect } from 'react';
import { useAppState } from '../AppContext';
import { PROVINCES } from '../types';
import { 
  Database, Plus, Trash2, Calendar, 
  Tag, Radio, Edit2, X, Check
} from 'lucide-react';

export const MasterDataView: React.FC = () => {
  const { 
    categories, medias, createCategory, updateCategory, deleteCategory, createMedia, loadLogs, showToast 
  } = useAppState();

  // Load audit trail logs upon mounting master panel
  useEffect(() => {
    loadLogs();
  }, []);

  // --- Category Create Inputs ---
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('bg-blue-500 text-white');

  // --- Category Editing state ---
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatColor, setEditCatColor] = useState('bg-blue-500 text-white');

  // --- Media Create Inputs ---
  const [medName, setMedName] = useState('');
  const [medType, setMedType] = useState<'Online' | 'Cetak' | 'TV' | 'Radio'>('Online');
  const [medReach, setMedReach] = useState<'Nasional' | 'Lokal' | 'Internasional'>('Nasional');
  const [medDate, setMedDate] = useState(new Date().toISOString().slice(0, 10));
  const [medProvinsi, setMedProvinsi] = useState('DKI Jakarta');

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;

    const ok = await createCategory(catName, catColor);
    if (ok) {
      setCatName('');
      showToast('Kategori baru ditambahkan ke log!', 'success');
    }
  };

  const startEditCategory = (cat: any) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatColor(cat.color || 'bg-blue-500 text-white');
  };

  const cancelEditCategory = () => {
    setEditingCatId(null);
    setEditCatName('');
    setEditCatColor('bg-blue-500 text-white');
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCatId || !editCatName) return;

    const ok = await updateCategory(editingCatId, editCatName, editCatColor);
    if (ok) {
      cancelEditCategory();
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus kategori "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      await deleteCategory(id);
    }
  };

  const handleCreateMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName || !medDate || !medProvinsi) return;

    const ok = await createMedia(medName, medType, medReach, medDate, medProvinsi);
    if (ok) {
      setMedName('');
      setMedDate(new Date().toISOString().slice(0, 10));
      setMedProvinsi('DKI Jakarta');
      showToast('Sumber media baru ditambahkan ke log!', 'success');
    }
  };

  // Color options for Tailwind badges
  const COLOR_OPTIONS = [
    { label: 'Corporate Blue', value: 'bg-blue-500 text-white' },
    { label: 'Emerald Green', value: 'bg-emerald-500 text-white' },
    { label: 'Crimson Red', value: 'bg-red-500 text-white' },
    { label: 'Amber Yellow', value: 'bg-amber-500 text-white' },
    { label: 'Navy Blue', value: 'bg-blue-700 text-white' },
    { label: 'Teal Green', value: 'bg-teal-500 text-white' },
    { label: 'Indigo Ocean', value: 'bg-indigo-500 text-white' },
    { label: 'Slate Gray', value: 'bg-slate-500 text-white' }
  ];

  return (
    <div className="space-y-6">
      {/* Header and Call to create */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-display text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-indigo-600" id="master-db-icon" />
            Master Kategori
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Pengaturan Sistem Kategori & Media.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Panel 1: Categories Settings */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 font-display">
            <Tag className="w-4.5 h-4.5 text-blue-500" id="master-tag-icon"/>
            Kelola Kategori Isu
          </h3>
          
          <form onSubmit={handleCreateCategory} className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/40">
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase mb-1">Tambah Kategori Baru</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  value={catName}
                  onChange={e => setCatName(e.target.value)}
                  placeholder="Nama Kategori (contoh: Pajak Transisi)"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div>
                <select
                  value={catColor}
                  onChange={e => setCatColor(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {COLOR_OPTIONS.map((opt, idx) => (
                    <option key={idx} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" id="master-cat-plus"/>
              <span>Simpan Kategori</span>
            </button>
          </form>

          {/* Current categories table representation */}
          <div className="space-y-2">
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">Daftar Kategori Aktif</span>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {categories.map((cat) => {
                const isEditing = editingCatId === cat.id;
                return (
                  <div key={cat.id} className="flex flex-col p-2.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl border border-slate-200/40 dark:border-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition">
                    {isEditing ? (
                      <form onSubmit={handleUpdateCategory} className="space-y-2 w-full">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editCatName}
                            onChange={e => setEditCatName(e.target.value)}
                            className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            required
                          />
                          <select
                            value={editCatColor}
                            onChange={e => setEditCatColor(e.target.value)}
                            className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          >
                            {COLOR_OPTIONS.map((opt, idx) => (
                              <option key={idx} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={cancelEditCategory}
                            className="flex items-center gap-1 py-1 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-[10px] font-bold transition cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                            <span>Batal</span>
                          </button>
                          <button
                            type="submit"
                            className="flex items-center gap-1 py-1 px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[10px] font-bold transition cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Simpan</span>
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{cat.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${cat.color}`}>
                            {cat.color ? cat.color.split(' ')[0].replace('bg-', '').replace('-500', '') : 'slate'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEditCategory(cat)}
                            className="p-1 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Ubah kategori"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Hapus kategori"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panel 2: Medias source setup */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 font-display">
            <Radio className="w-4.5 h-4.5 text-indigo-500" id="master-radio-icon"/>
            Kelola Saluran Media Eksternal
          </h3>

          <form onSubmit={handleCreateMedia} className="space-y-4 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/40">
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">Registrasi Sumber Media</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Nama Media */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Nama Sumber Media</label>
                <input
                  type="text"
                  value={medName}
                  onChange={e => setMedName(e.target.value)}
                  placeholder="Nama Media (Kompas, Detikcom...)"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
                  required
                />
              </div>

              {/* Lokasi Provinsi */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Provinsi</label>
                <select
                  value={medProvinsi}
                  onChange={e => setMedProvinsi(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold text-indigo-600 dark:text-indigo-400"
                  required
                >
                  {PROVINCES.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['Nasional', 'DKI Jakarta', 'Jawa Barat', 'Jawa Timur', 'Sumatera Utara', 'Kalimantan Timur'].map((prov) => (
                    <button
                      type="button"
                      key={prov}
                      onClick={() => setMedProvinsi(prov)}
                      className="text-[9px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/40 bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded font-sans transition"
                    >
                      {prov}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Calendar */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Tanggal Terdaftar</label>
                <div className="relative group">
                  <input
                    type="date"
                    value={medDate}
                    onChange={e => setMedDate(e.target.value)}
                    onClick={e => {
                      try {
                        (e.currentTarget as any).showPicker();
                      } catch (err) {}
                    }}
                    className="w-full pl-3 pr-10 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition duration-150"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-400 transition-colors">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                </div>
                
                {/* Shortcuts */}
                <div className="flex items-center gap-2 mt-1 pl-0.5">
                  <button
                    type="button"
                    onClick={() => setMedDate(new Date().toISOString().slice(0, 10))}
                    className="text-[10px] font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors"
                  >
                    Hari Ini
                  </button>
                  <span className="text-[9px] text-slate-300 dark:text-slate-700 select-none">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      setMedDate(yesterday.toISOString().slice(0, 10));
                    }}
                    className="text-[10px] font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors"
                  >
                    Kemarin
                  </button>
                </div>
              </div>

              {/* Tipe Media buttons instead of select dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Tipe Media</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['Online', 'Cetak', 'TV', 'Radio'] as const).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setMedType(t)}
                      className={`text-center py-1.5 px-1.5 text-[10px] font-bold rounded-lg border transition ${
                        medType === t
                          ? 'bg-indigo-600 text-white border-transparent shadow shadow-indigo-500/20'
                          : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      {t === 'Online' ? '🌐 Online' : t === 'Cetak' ? '📰 Cetak' : t === 'TV' ? '📺 TV' : '📻 Radio'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Reach buttons instead of select dropdown */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Jangkauan Distribusi Media</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Nasional', 'Lokal', 'Internasional'] as const).map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setMedReach(r)}
                    className={`text-center py-1.5 px-1.5 text-[10px] font-bold rounded-lg border transition ${
                      medReach === r
                        ? 'bg-blue-600 text-white border-transparent shadow shadow-blue-500/20'
                        : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" id="master-med-plus"/>
              <span>Simpan Sumber Media Baru</span>
            </button>
          </form>

          {/* Current medias listing representation */}
          <div className="space-y-2">
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">Daftar Sumber Media</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {medias.map((med) => (
                <div key={med.id} className="p-2.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl border border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between text-xs transition hover:border-slate-200 hover:bg-slate-50/80">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">{med.name}</span>
                    <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-slate-400 font-semibold uppercase mt-0.5">
                      <span>{med.reach}</span>
                      <span>•</span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold">{med.provinsi || 'DKI Jakarta'}</span>
                    </div>
                    {med.date && (
                      <span className="block text-[8px] text-slate-400 italic font-mono mt-0.5">Terdaftar: {med.date}</span>
                    )}
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                    {med.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
