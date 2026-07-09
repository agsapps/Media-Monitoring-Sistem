import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, Info, Search, ShieldAlert, CheckCircle2, 
  MapPin, Calendar, HelpCircle, Plus, X, RotateCcw, Filter
} from 'lucide-react';
import { NewsItem, Sentiment } from '../types';

interface HeatmapWidgetProps {
  periodFilteredNews: NewsItem[];
  searchFilterQuery: string;
  setSearchFilterQuery: (query: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  selectedProvince: string;
  setSelectedProvince: (prov: string) => void;
}

const DEFAULT_KEYWORDS = [
  'BBM', 'Subsidi', 'Inflasi', 'Energi', 'Korupsi', 
  'Demo', 'Infrastruktur', 'IKN', 'Investasi', 'Sembako',
  'Tarif', 'Krisis', 'Pasokan', 'Keamanan'
];

export const HeatmapWidget: React.FC<HeatmapWidgetProps> = ({
  periodFilteredNews,
  searchFilterQuery,
  setSearchFilterQuery,
  showToast,
  selectedProvince,
  setSelectedProvince
}) => {
  const [viewMode, setViewMode] = useState<'time' | 'location'>('time');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [selectedCell, setSelectedCell] = useState<{
    keyword: string;
    keyAxis: string; // date or location
    items: NewsItem[];
  } | null>(null);

  // 1. Add custom keyword
  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWord = newKeywordInput.trim();
    if (!cleanWord) return;

    if (keywords.some(k => k.toLowerCase() === cleanWord.toLowerCase())) {
      showToast(`Kata kunci "${cleanWord}" sudah ada di dalam pemantauan.`, 'warning');
      return;
    }

    setKeywords(prev => [...prev, cleanWord]);
    setNewKeywordInput('');
    showToast(`Kata kunci "${cleanWord}" berhasil ditambahkan ke pemantauan heatmap!`, 'success');
  };

  // 2. Remove keyword
  const handleRemoveKeyword = (wordToRemove: string) => {
    setKeywords(prev => prev.filter(k => k !== wordToRemove));
    showToast(`Kata kunci "${wordToRemove}" dihapus dari pemantauan heatmap.`, 'info');
  };

  // 3. Reset to default keywords list
  const handleResetKeywords = () => {
    setKeywords(DEFAULT_KEYWORDS);
    showToast('Daftar kata kunci dipantau telah direset kembali ke standar.', 'info');
  };

  // 4. Calculate X axis categories based on viewMode
  // Time mode: dates present in active periodFilteredNews (sorted chronologically)
  // Location mode: top locations present in active periodFilteredNews
  const xCategories = useMemo(() => {
    if (viewMode === 'time') {
      const dates = periodFilteredNews
        .map(n => n.publishDate)
        .filter(Boolean);
      
      const uniqueDates = Array.from(new Set(dates)).sort();
      
      // If there are too many dates, fallback or show last 10, otherwise show all
      // Let's keep up to 14 latest active dates so it's fully readable
      return uniqueDates.slice(-14);
    } else {
      // Find top provinces based on news count
      const locCounts: Record<string, number> = {};
      periodFilteredNews.forEach(n => {
        const loc = n.location || 'Nasional';
        locCounts[loc] = (locCounts[loc] || 0) + 1;
      });

      return Object.entries(locCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name)
        .slice(0, 10); // show top 10 regions
    }
  }, [periodFilteredNews, viewMode]);

  // 5. Grid data model calculation: map keyword of row to X-axis columns
  const heatmapData = useMemo(() => {
    const grid: Record<string, Record<string, NewsItem[]>> = {};

    keywords.forEach(kw => {
      grid[kw] = {};
      xCategories.forEach(xCat => {
        grid[kw][xCat] = [];
      });
    });

    periodFilteredNews.forEach(item => {
      const rawTitle = (item.title || '').toLowerCase();
      const rawSummary = (item.summary || '').toLowerCase();
      const rawTags = (item.tags || []).map(t => t.toLowerCase());

      keywords.forEach(kw => {
        const kwLower = kw.toLowerCase();
        // Check if keyword is found inside Title, Summary or Tags
        const matches = rawTitle.includes(kwLower) || 
                        rawSummary.includes(kwLower) || 
                        rawTags.includes(kwLower);

        if (matches) {
          if (viewMode === 'time') {
            const date = item.publishDate;
            if (grid[kw] && grid[kw][date]) {
              grid[kw][date].push(item);
            }
          } else {
            const loc = item.location || 'Nasional';
            if (grid[kw] && grid[kw][loc]) {
              grid[kw][loc].push(item);
            }
          }
        }
      });
    });

    return grid;
  }, [periodFilteredNews, keywords, xCategories, viewMode]);

  // Helper: Format Date String to friendly short format (e.g. "14 Jun")
  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const day = parts[2];
      const monthNum = parseInt(parts[1], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${day} ${months[monthNum - 1] || ''}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Helper: calculate cell color based on intensity of occurrences and dominant sentiment
  const getCellColorClass = (items: NewsItem[]) => {
    const count = items.length;
    if (count === 0) {
      return 'bg-slate-50 dark:bg-[#121118]/40 text-slate-350 dark:text-slate-650 hover:border-slate-350 hover:bg-slate-100/80';
    }

    const hasCriticalNegative = items.some(n => n.sentiment === 'Negatif');
    const negativeRatio = items.filter(n => n.sentiment === 'Negatif').length / count;

    if (hasCriticalNegative && negativeRatio >= 0.5) {
      // Hot Crimson / Rose for negative dominance
      if (count <= 2) return 'bg-rose-500/10 text-rose-650 border border-rose-200/40 hover:bg-rose-500/20';
      if (count <= 5) return 'bg-rose-500/30 text-rose-700 border border-rose-300 dark:bg-rose-500/25 dark:text-rose-450 hover:bg-rose-500/40';
      return 'bg-rose-600/70 text-white font-black hover:bg-rose-600 animate-pulse';
    }

    // Classic dynamic violet/blue scheme
    if (count <= 1) return 'bg-blue-700/10 text-violet-650 border border-blue-100/30 dark:bg-blue-700/5 dark:text-blue-400 hover:bg-blue-700/20';
    if (count <= 3) return 'bg-blue-700/20 text-violet-750 dark:bg-blue-700/15 dark:text-violet-350 hover:bg-blue-700/30';
    if (count <= 7) return 'bg-blue-700/45 text-blue-950 dark:bg-blue-700/35 dark:text-white hover:bg-blue-700/55';
    return 'bg-blue-800 text-white font-black hover:bg-blue-900';
  };

  // 6. Automatically extract insights for deep kehumasan analytics recommendations
  const dynamicInsight = useMemo(() => {
    let peakKeyword = '';
    let peakAxis = '';
    let maxCount = 0;
    let peakItems: NewsItem[] = [];

    keywords.forEach(kw => {
      xCategories.forEach(xCat => {
        const items = heatmapData[kw]?.[xCat] || [];
        if (items.length > maxCount) {
          maxCount = items.length;
          peakKeyword = kw;
          peakAxis = xCat;
          peakItems = items;
        }
      });
    });

    if (maxCount === 0) {
      return {
        status: 'AMAN',
        colorClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400',
        title: 'Situasi Stabil & Aman',
        desc: 'Sistem monitoring belum mendeteksi lonjakan kata kunci tertentu. Stabilitas opini publik terpelihara dengan baik.',
        Icon: CheckCircle2
      };
    }

    const negCount = peakItems.filter(n => n.sentiment === 'Negatif').length;
    const isNegDominant = negCount > peakItems.length * 0.3;

    let friendlyAxisLabel = viewMode === 'time' ? formatShortDate(peakAxis) : peakAxis;

    if (isNegDominant) {
      return {
        status: 'PERINGATAN TINGGI (ALERT)',
        colorClass: 'bg-rose-500/14 border-rose-500/25 text-rose-700 dark:text-rose-455',
        title: `Lonjakan Sentimen Negatif Komponen "${peakKeyword}"`,
        desc: `Isu "${peakKeyword}" terdeteksi meningkat secara eksponensial di sebaran ${friendlyAxisLabel} dengan intensitas sebaran mencapai ${maxCount} publikasi teraktif. Sentimen negatif mendominasi (${Math.round((negCount/peakItems.length)*100)}%). Direkomendasikan segera menyusun rilis klarifikasi pers sektoral.`,
        Icon: ShieldAlert
      };
    }

    return {
      status: 'PERHATIAN MODERAT (WASPADA)',
      colorClass: 'bg-[#1e3a8a]/10 border-blue-700/20 text-blue-900 dark:text-blue-400',
      title: `Konsentrasi Isu Dominan "${peakKeyword}"`,
      desc: `Aktivitas bahasan komponen "${peakKeyword}" cukup aktif di sebaran ${friendlyAxisLabel} (Volume: ${maxCount} Berita). Situasi saat ini terpantau kondusif namun perlu monitoring intensif berkelanjutan agar mencegah misinformasi publik.`,
      Icon: Activity
    };
  }, [heatmapData, keywords, xCategories, viewMode]);

  // Click handler to instantly trigger filter in Dashboard
  const handleCellClick = (keyword: string, keyAxis: string, items: NewsItem[]) => {
    setSelectedCell({ keyword, keyAxis, items });

    // Instantly filter the search box on dashboard to this keyword
    setSearchFilterQuery(keyword);
    
    if (viewMode === 'location' && keyAxis !== 'Nasional') {
      setSelectedProvince(keyAxis);
    }

    const formattedAxis = viewMode === 'time' ? formatShortDate(keyAxis) : keyAxis;
    showToast(`Dashboard disaring berdasarkan kata kunci "${keyword}" pada konteks ${formattedAxis}`, 'info');
  };

  return (
    <div className="w-full bg-white dark:bg-[#121118] border border-slate-200/50 dark:border-white/5 rounded-[22px] shadow-lg p-5 sm:p-6 transition-all duration-300">
      
      {/* Consolidated Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/30 dark:border-white/[0.03] pb-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-700/10 dark:bg-blue-700/20 text-blue-800 dark:text-blue-400 mt-0.5">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black uppercase text-slate-950 dark:text-white tracking-wide flex items-center gap-1.5">
              <span>Heatmap Intensitas Kata Kunci</span>
              <span className="text-[10px] lowercase font-normal text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded border border-slate-250/25">real-time</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xl font-medium mt-0.5 leading-tight">
              Visualisasi dinamika isu nasional melalui pemetaan densitas keyword terorganisir per rentang tanggal rilis atau sebaran wilayah geografis.
            </p>
          </div>
        </div>

        {/* View Mode Controllers */}
        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200/50 dark:border-white/5 shadow-inner">
            <button
              onClick={() => { setViewMode('time'); setSelectedCell(null); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition-all tracking-wider ${
                viewMode === 'time'
                  ? 'bg-white dark:bg-[#1c1a24] text-[#1e3a8a] dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Berdasarkan Waktu</span>
            </button>
            <button
              onClick={() => { setViewMode('location'); setSelectedCell(null); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition-all tracking-wider ${
                viewMode === 'location'
                  ? 'bg-white dark:bg-[#1c1a24] text-[#1e3a8a] dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Berdasarkan Lokasi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid Layout containing Keyword Managers, Heatmap Grid & Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFTPANEL: Keyword Trackers list (lg:col-span-3) */}
        <div className="lg:col-span-3 flex flex-col justify-between space-y-4 border-r border-slate-100 dark:border-white/[0.03] lg:pr-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-450 dark:text-slate-500 tracking-wider font-mono">Daftar Kata Kunci ({keywords.length})</span>
              <button
                type="button"
                onClick={handleResetKeywords}
                className="text-[9px] font-bold text-blue-800 hover:underline flex items-center gap-0.5 uppercase tracking-wide cursor-pointer"
                title="Reset daftar kata kunci ke default"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Keyword Pills List Box with fine scroll */}
            <div className="flex flex-wrap lg:flex-col gap-1.5 max-h-[190px] lg:max-h-[280px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
              {keywords.map(kw => (
                <div 
                  key={kw} 
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all text-xs font-bold leading-none ${
                    searchFilterQuery.toLowerCase() === kw.toLowerCase()
                      ? 'bg-blue-700/10 text-blue-800 border-blue-700/30'
                      : 'bg-slate-50 hover:bg-slate-100/50 dark:bg-white/[0.02] dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-350 border-slate-200/60 dark:border-white/5'
                  }`}
                >
                  <span 
                    onClick={() => { setSearchFilterQuery(kw); showToast(`Dashboard disaring: "${kw}"`, 'success'); }}
                    className="cursor-pointer hover:underline truncate pr-1"
                  >
                    #{kw}
                  </span>
                  <button
                    onClick={() => handleRemoveKeyword(kw)}
                    className="text-slate-400 hover:text-red-500 cursor-pointer h-3.5 w-3.5 flex items-center justify-center rounded-full hover:bg-slate-200/50 dark:hover:bg-white/10"
                    title={`Hapus #${kw}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Form to add custom keyword */}
          <form onSubmit={handleAddKeyword} className="pt-2 border-t border-slate-100 dark:border-white/[0.03]">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Tambah kata kunci..."
                value={newKeywordInput}
                onChange={e => setNewKeywordInput(e.target.value.replace(/[^A-Za-z0-9\s]/g, ''))}
                maxLength={20}
                className="w-full text-[11px] pl-3 pr-8 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-[#1e3a8a] transition"
              />
              <button
                type="submit"
                className="absolute right-1 text-white bg-blue-800 hover:bg-blue-900 h-6 w-6 rounded-lg flex items-center justify-center cursor-pointer transition active:scale-95 shadow-sm"
                title="Tambahkan Kata Kunci"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* MIDDLE HEATMAP GRID (lg:col-span-9) */}
        <div className="lg:col-span-9 space-y-4">
          
          {/* Legend and Legend guide */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-450 dark:text-slate-500 bg-slate-50/50 dark:bg-black/10 px-3.5 py-2.5 rounded-2xl border border-slate-150/45 dark:border-white/5 font-medium select-none">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-700" />
              <span>Pilih sel untuk memfilter berita; baris label kata kunci bersifat statis & dapat diklik.</span>
            </span>

            <div className="flex items-center gap-2 whitespace-nowrap">
              <span>Intensitas:</span>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200/50 block" title="0 Berita" />
                <span className="w-2.5 h-2.5 rounded bg-violet-550/15 block" title="Lemah (1 Isu)" />
                <span className="w-2.5 h-2.5 rounded bg-violet-550/35 block" title="Sedang (2-3 Isu)" />
                <span className="w-2.5 h-2.5 rounded bg-violet-550/65 block" title="Kuat (4-7 Isu)" />
                <span className="w-2.5 h-2.5 rounded bg-rose-500/25 block text-center" title="Sentimen Negatif Dominan (Alert)" />
                <span className="w-2.5 h-2.5 bg-rose-600 rounded block animate-pulse" title="Sangat Kuat Negatif" />
              </div>
            </div>
          </div>

          {/* HTML Responsive Scroll Heatmap Framework */}
          <div className="w-full overflow-x-auto border border-slate-200/40 dark:border-white/5 rounded-2xl bg-slate-50/20 dark:bg-[#1a1824]/20">
            {xCategories.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-2">
                <HelpCircle className="w-8 h-8 text-slate-350" />
                <div className="text-xs font-black uppercase">Penyaringan Data Kosong</div>
                <div className="text-[10px] font-medium max-w-xs text-center leading-normal">
                  Tidak ada berita yang terdokumentasi dalam rentang filter saat ini untuk merakit heatmap.
                </div>
              </div>
            ) : (
              <table className="min-w-full border-collapse translate-0 text-left">
                {/* Columns Header (X Axis details) */}
                <thead>
                  <tr className="border-b border-slate-200/50 dark:border-white/5 bg-slate-100/30 dark:bg-white/[0.01]">
                    {/* Sticky Column for spacing label */}
                    <th className="sticky left-0 z-20 px-3.5 py-3 text-[10px] font-black uppercase tracking-widest text-[#1e3a8a] dark:text-blue-400 font-mono bg-white dark:bg-[#121118] border-r border-slate-200/60 dark:border-white/5 shadow-md">
                      Kata Kunci dipantau
                    </th>
                    {xCategories.map(xCat => (
                      <th 
                        key={xCat} 
                        className="px-3.5 py-3 text-[10px] font-black tracking-wider text-slate-650 dark:text-slate-300 border-r border-slate-100 dark:border-white/[0.01]"
                      >
                        <div className="text-center min-w-[70px]">
                          {viewMode === 'time' ? formatShortDate(xCat) : xCat}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Rows body (Keywords details) */}
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.02]">
                  {keywords.length === 0 ? (
                    <tr>
                      <td 
                        colSpan={xCategories.length + 1} 
                        className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs"
                      >
                        <div className="flex flex-col items-center justify-center space-y-2 py-4">
                          <HelpCircle className="w-6 h-6 text-slate-350 dark:text-slate-600" />
                          <p className="font-bold uppercase text-[10px] tracking-wider text-slate-450 dark:text-slate-550">Daftar Kata Kunci Kosong</p>
                          <p className="text-[10px] text-slate-450 dark:text-slate-500 max-w-sm mt-1 leading-normal px-4">
                            Silakan tambahkan kata kunci baru pada kolom kiri atau klik tombol <strong className="text-blue-800 dark:text-blue-400 bg-blue-700/10 dark:bg-blue-700/20 px-1.5 py-0.5 rounded cursor-pointer hover:underline" onClick={handleResetKeywords}>"Reset"</strong> untuk memuat daftar bawaan.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    keywords.map(kw => (
                      <tr 
                        key={kw} 
                        className={`hover:bg-slate-100/30 dark:hover:bg-white/[0.01] ${
                          searchFilterQuery.toLowerCase() === kw.toLowerCase() ? 'bg-blue-700/5' : ''
                        }`}
                      >
                        {/* Sticky Row header keyword */}
                        <td className="sticky left-0 z-20 px-3.5 py-2.5 text-xs font-extrabold text-slate-800 dark:text-slate-200 bg-white dark:bg-[#121118] border-r border-slate-200/60 dark:border-white/5 cursor-pointer hover:text-blue-800 hover:underline shadow-md"
                            onClick={() => { setSearchFilterQuery(kw); showToast(`Menyaring seluruh isu dengan keyword: #${kw}`, 'success'); }}
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="text-blue-400">#</span>
                            <span>{kw}</span>
                          </span>
                        </td>

                        {/* Interactive heatmap boxes */}
                        {xCategories.map(xCat => {
                          const items = heatmapData[kw]?.[xCat] || [];
                          const count = items.length;
                          return (
                            <td 
                              key={`${kw}-${xCat}`}
                              onClick={() => handleCellClick(kw, xCat, items)}
                              className="p-1 border-r border-slate-150/40 dark:border-white/[0.02] cursor-pointer"
                            >
                              <div className={`h-8 sm:h-9 text-xs font-black font-mono rounded-xl transition-all flex flex-col items-center justify-center relative ${getCellColorClass(items)}`}>
                                <span>{count > 0 ? count : '-'}</span>
                                
                                {/* Small critical pill indication */}
                                {count > 0 && items.some(n => n.sentiment === 'Negatif') && (
                                  <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-rose-500" title="Terdeteksi Berita Negatif" />
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Interactive Cell Breakdown details popover */}
          <AnimatePresence>
            {selectedCell && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="bg-slate-50 dark:bg-white/[0.01] border border-slate-200/60 dark:border-white/5 rounded-2xl p-4 space-y-3.5"
                id="heatmap-cell-detail-popover"
              >
                <div className="flex items-center justify-between border-b border-slate-200/40 dark:border-white/[0.03] pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-black text-[#1e3a8a] dark:text-blue-400 font-mono uppercase tracking-widest">Detail Sel Analitik</span>
                    <span className="text-[10px] font-extrabold text-slate-800 bg-white dark:bg-[#1a1824] px-2.5 py-1 rounded-full border border-slate-200 dark:border-white/5 shadow-xs">
                      #{selectedCell.keyword} @ {viewMode === 'time' ? formatShortDate(selectedCell.keyAxis) : selectedCell.keyAxis}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setSearchFilterQuery(selectedCell.keyword);
                        showToast(`Disaring ke #${selectedCell.keyword}`, 'success');
                      }}
                      className="text-[9.5px] font-black text-rose-550 border border-slate-200 hover:border-[#1e3a8a] dark:border-white/5 bg-white dark:bg-transparent rounded-lg px-2.5 py-1 transition flex items-center gap-1 hover:text-[#1e3a8a] cursor-pointer"
                    >
                      <Filter className="w-3 h-3" />
                      <span>Filter Dashboard</span>
                    </button>
                    <button 
                      onClick={() => setSelectedCell(null)}
                      className="text-slate-400 hover:text-slate-650 dark:hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {selectedCell.items.length === 0 ? (
                  <p className="text-[10px] text-slate-400 font-medium text-center py-2">
                    Tidak ada berita aktif yang ditemukan untuk gabungan pemantauan ini.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="bg-white dark:bg-[#1a1824]/50 border border-slate-200/50 dark:border-white/5 p-2 rounded-xl text-center">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block whitespace-nowrap">Volume Kunci</span>
                        <span className="text-sm font-black text-[#1e3a8a] dark:text-blue-400 font-mono mt-0.5 block">{selectedCell.items.length} Berita</span>
                      </div>
                      <div className="bg-white dark:bg-[#1a1824]/50 border border-slate-200/50 dark:border-white/5 p-2 rounded-xl text-center">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Positif</span>
                        <span className="text-sm font-black text-emerald-500 font-mono mt-0.5 block">
                          {selectedCell.items.filter(n => n.sentiment === 'Positif').length} Isu
                        </span>
                      </div>
                      <div className="bg-white dark:bg-[#1a1824]/50 border border-slate-200/50 dark:border-white/5 p-2 rounded-xl text-center col-span-2 sm:col-span-1">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Negatif</span>
                        <span className="text-sm font-black text-rose-500 font-mono mt-0.5 block">
                          {selectedCell.items.filter(n => n.sentiment === 'Negatif').length} Isu
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 border-t border-slate-100 dark:border-white/[0.02] pt-3">
                      <span className="text-[9.5px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-wider font-mono block">Daftar Berita Utama Terkait ({selectedCell.items.length}):</span>
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {selectedCell.items.map(news => (
                          <div 
                            key={news.id}
                            className="bg-white dark:bg-[#1c1a24] border border-slate-200/50 dark:border-white/5 p-2 rounded-xl flex items-start justify-between gap-3 text-xs shadow-xs"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="font-extrabold text-slate-800 dark:text-slate-200 hover:underline cursor-pointer block truncate"
                                    onClick={() => window.open(news.link, '_blank')}
                              >
                                {news.title}
                              </span>
                              <div className="flex items-center gap-2 mt-1 text-[9.5px] text-slate-400 font-semibold font-sans">
                                <span>{news.mediaName}</span>
                                <span>•</span>
                                <span>{news.categoryName}</span>
                                <span>•</span>
                                <span className="font-mono text-[9px]">{news.publishDate}</span>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-center ${
                              news.sentiment === 'Positif'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : news.sentiment === 'Negatif'
                                ? 'bg-red-500/10 text-red-650'
                                : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400'
                            }`}>
                              {news.sentiment}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* DYNAMIC RECOMMENDATION ACTION BOX (Based on heatmap peaks) */}
          <div className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row gap-3 items-start select-none ${dynamicInsight.colorClass}`}>
            <div className="p-2.5 bg-white/60 dark:bg-black/20 rounded-xl shrink-0">
              <dynamicInsight.Icon className="w-5 h-5 animate-pulse" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider font-mono text-slate-400 dark:text-slate-450 block">KEHUMASAN DECISION SUPPORT SYSTEM (DSS)</span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-black/5 dark:bg-white/5 tracking-wider">
                  STATUS: {dynamicInsight.status}
                </span>
              </div>
              <h4 className="text-xs font-black uppercase tracking-tight">{dynamicInsight.title}</h4>
              <p className="text-[10.5px] font-semibold leading-relaxed text-slate-600 dark:text-slate-350">
                {dynamicInsight.desc}
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
