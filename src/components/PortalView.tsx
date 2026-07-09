import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppState } from '../AppContext';
import { 
  Search, Filter, BookOpen, Share2, Download, ExternalLink, Calendar, 
  ChevronRight, Copy, Check, MessageSquare, AlertCircle, FileText, Globe, RefreshCcw, X,
  LayoutGrid, List
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Sentiment, NewsItem, formatDateDDMMYYYY, formatSummaryText } from '../types';
import { HighlightCarousel } from './HighlightCarousel';
import { OSMMap } from './OSMMap';
import { safeHtml2Canvas } from '../utils/safeHtml2Canvas';
import { generatePDFReport as compileStudioPDFReport } from '../utils/pdfReportGenerator';

const PROVINCES = [
  'Nasional',
  'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau', 'Jambi',
  'Sumatera Selatan', 'Kepulauan Bangka Belitung', 'Bengkulu', 'Lampung',
  'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur', 'Banten',
  'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
  'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
  'Sulawesi Utara', 'Sulawesi Tengah', 'Sulawesi Selatan', 'Sulawesi Tenggara', 'Gorontalo', 'Sulawesi Barat',
  'Maluku', 'Maluku Utara', 'Papua', 'Papua Barat', 'Papua Selatan', 'Papua Tengah', 'Papua Pegunungan', 'Papua Barat Daya'
];

interface MultiSelectProps {
  label: string;
  options: { value: string; label: string }[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  searchPlaceholder?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  selectedValues,
  onChange,
  placeholder,
  searchPlaceholder = "Cari..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    return options.filter(opt =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  const toggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(options.map(o => o.value));
  };

  const displayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === options.length) return "Semua Terpilih";
    if (selectedValues.length > 2) return `${selectedValues.length} Terpilih`;
    return selectedValues
      .map(v => options.find(o => o.value === v)?.label || v)
      .join(", ");
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">
        {label}
      </label>
      
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus-within:ring-2 focus-within:ring-blue-500/20 cursor-pointer shadow-xs transition hover:border-slate-350 dark:hover:border-slate-700 min-h-[36px]"
      >
        <span className="truncate max-w-[150px] text-left">
          {displayText()}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selectedValues.length > 0 && (
            <button
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full min-w-[220px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-2 overflow-hidden"
          >
            {/* Search Input */}
            <div className="px-2 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Actions */}
            <div className="px-2 py-1.5 flex items-center justify-between text-[10px] font-bold text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <button onClick={handleSelectAll} className="hover:underline cursor-pointer">
                Pilih Semua
              </button>
              <button onClick={handleClear} className="hover:underline cursor-pointer">
                Bersihkan
              </button>
            </div>

            {/* Options List */}
            <div className="max-h-48 overflow-y-auto pt-1 py-0.5 select-none custom-scrollbar">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400 text-center">
                  Tidak ada kecocokan
                </div>
              ) : (
                filteredOptions.map(opt => {
                  const isChecked = selectedValues.includes(opt.value);
                  return (
                    <div
                      key={opt.value}
                      onClick={() => toggleOption(opt.value)}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs text-slate-705 dark:text-slate-300 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent div click
                        className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500/20 w-3.5 h-3.5 cursor-pointer shrink-0"
                      />
                      <span className={`truncate ${isChecked ? 'font-bold text-slate-900 dark:text-white' : ''}`}>
                        {opt.label}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const PortalView: React.FC = () => {
  const { 
    user, news, categories, medias, loadNews, showToast, settings, setSelectedProvince, setTab, 
    portalLocationFilter, setPortalLocationFilter, highlights, authFetch,
    saveHighlight, removeHighlight, saveNewsItem, removeNewsItem 
  } = useAppState();

  const [searchVal, setSearchVal] = useState('');
  const [debouncedSearchVal, setDebouncedSearchVal] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchVal(searchVal);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchVal]);
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedSent, setSelectedSent] = useState('all');
  const [selectedMed, setSelectedMed] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [startHour, setStartHour] = useState<number>(0);
  const [endHour, setEndHour] = useState<number>(23);

  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('portal_auto_refresh_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const saved = localStorage.getItem('portal_refresh_interval');
    return saved !== null ? parseInt(saved, 10) : 5;
  });
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const savedInt = localStorage.getItem('portal_refresh_interval');
    const interval = savedInt !== null ? parseInt(savedInt, 10) : 5;
    return interval * 60;
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Active detail modal item
  const [activeItem, setActiveItem] = useState<NewsItem | null>(null);

  // Edit News form states
  const [editingNewsItem, setEditingNewsItem] = useState<NewsItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editMediaId, setEditMediaId] = useState('');
  const [editSentiment, setEditSentiment] = useState<Sentiment>('Netral');
  const [editLocation, setEditLocation] = useState('DKI Jakarta');
  const [editPublishDate, setEditPublishDate] = useState('');
  const [editPublishTime, setEditPublishTime] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editStatus, setEditStatus] = useState<'Draft' | 'Published'>('Published');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    if (editingNewsItem) {
      setEditTitle(editingNewsItem.title || '');
      setEditSummary(editingNewsItem.summary || '');
      setEditCategoryId(editingNewsItem.categoryId || '');
      setEditMediaId(editingNewsItem.mediaId || '');
      setEditSentiment(editingNewsItem.sentiment || 'Netral');
      setEditLocation(editingNewsItem.location || 'DKI Jakarta');
      setEditPublishDate(editingNewsItem.publishDate || '');
      setEditPublishTime(editingNewsItem.publishTime || '12:00');
      setEditLink(editingNewsItem.link || '');
      setEditImageUrl(editingNewsItem.imageUrl || '');
      setEditStatus(editingNewsItem.status || 'Published');
    }
  }, [editingNewsItem]);

  const handleSaveEdit = async () => {
    if (!editingNewsItem) return;
    if (!editTitle.trim()) {
      showToast('Judul tidak boleh kosong', 'error');
      return;
    }
    setIsSavingEdit(true);
    try {
      const selectedCategory = categories.find(c => c.id === editCategoryId);
      const selectedMedia = medias.find(m => m.id === editMediaId);
      
      const payload = {
        title: editTitle.trim(),
        summary: editSummary.trim(),
        link: editLink.trim(),
        mediaId: editMediaId,
        mediaName: selectedMedia ? selectedMedia.name : (editingNewsItem.mediaName || 'Sumber Media'),
        publishDate: editPublishDate,
        publishTime: editPublishTime,
        location: editLocation,
        categoryId: editCategoryId,
        categoryName: selectedCategory ? selectedCategory.name : (editingNewsItem.categoryName || 'Lainnya'),
        sentiment: editSentiment,
        imageUrl: editImageUrl.trim(),
        status: editStatus,
        tags: editingNewsItem.tags || []
      };

      const success = await saveNewsItem(payload, true, editingNewsItem.id);
      if (success) {
        showToast('Berita berhasil diperbarui', 'success');
        setEditingNewsItem(null);
        setRefreshTrigger(prev => prev + 1);
      } else {
        showToast('Gagal memperbarui berita', 'error');
      }
    } catch (err) {
      console.error('Failed to save news edit:', err);
      showToast('Terjadi kesalahan saat menyimpan berita', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };
  
  // Shared status helpers
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Map snapshot state & province calculations for offscreen container
  const [selectedProvinceMap, setSelectedProvinceMap] = useState<string>('Nasional');

  // Pagination simulator
  const [visibleCount, setVisibleCount] = useState(6);

  // Responsive state for mobile filters panel
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showPdfConfirm, setShowPdfConfirm] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const hasFiltersSelected = useMemo(() => {
    return (
      searchVal.trim() !== '' ||
      selectedCat !== 'all' ||
      selectedSent !== 'all' ||
      selectedMed !== 'all' ||
      selectedDate !== '' ||
      startDate !== '' ||
      endDate !== '' ||
      (portalLocationFilter !== 'all' && portalLocationFilter.trim() !== '')
    );
  }, [searchVal, selectedCat, selectedSent, selectedMed, selectedDate, startDate, endDate, portalLocationFilter]);

  // Generate list of the last 30 days starting from today to always populate the dropdown option list
  const dateOptions = React.useMemo(() => {
    const list: { value: string; label: string }[] = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const value = `${yyyy}-${mm}-${dd}`;
      
      const label = d.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      list.push({ value, label });
    }
    return list;
  }, []);


  const sortedNews = useMemo(() => {
    return [...news]
      .filter(n => {
        // Must strictly be Published status on the public portal view
        if (n.status !== 'Published') {
          return false;
        }
        const hour = n.publishTime ? parseInt(n.publishTime.split(':')[0], 10) : 12;
        if (!isNaN(hour)) {
          if (hour < startHour || hour > endHour) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const getSafeTime = (item: NewsItem) => {
          const pubDate = String(item.publishDate || '').trim();
          if (!pubDate) return 0;
          const cleanTime = (item.publishTime && /^\d{2}:\d{2}/.test(String(item.publishTime).trim())) 
            ? String(item.publishTime).trim().slice(0, 5) 
            : '12:00';
          const parsed = Date.parse(`${pubDate}T${cleanTime}:00`);
          if (!isNaN(parsed)) return parsed;
          const parsedDate = Date.parse(pubDate);
          return isNaN(parsedDate) ? 0 : parsedDate;
        };
        const d1 = getSafeTime(a);
        const d2 = getSafeTime(b);
        if (sortBy === 'newest') return d2 - d1;
        return d1 - d2;
      });
  }, [news, startHour, endHour, sortBy]);

  const provinceStatsForMap = useMemo(() => {
    const map: Record<string, { newsCount: number; mediaCount: number; positif: number; negatif: number; netral: number; criticalIssues: string[] }> = {};
    
    const seedProvinces = ['Nasional', 'DKI Jakarta', 'Jawa Barat', 'Jawa Timur', 'Sumatera Utara', 'Kalimantan Timur', 'Sulawesi Selatan', 'Papua'];
    seedProvinces.forEach(p => {
      map[p] = { newsCount: 0, mediaCount: 0, positif: 0, negatif: 0, netral: 0, criticalIssues: [] };
    });

    sortedNews.forEach(item => {
      const prov = item.location || 'Nasional';

      if (!map[prov]) {
        map[prov] = { newsCount: 0, mediaCount: 0, positif: 0, negatif: 0, netral: 0, criticalIssues: [] };
      }

      map[prov].newsCount += 1;
      if (item.sentiment === 'Positif') map[prov].positif += 1;
      else if (item.sentiment === 'Negatif') map[prov].negatif += 1;
      else map[prov].netral += 1;
    });

    return map;
  }, [sortedNews]);

  useEffect(() => {
    // Trigger news loading when filter states change
    loadNews({
      search: debouncedSearchVal,
      category: selectedCat,
      sentiment: selectedSent,
      media: selectedMed,
      date: selectedDate,
      startDate: startDate,
      endDate: endDate,
      location: portalLocationFilter,
      status: 'Published' // Force only published on the public portal
    });
    setSecondsLeft(refreshInterval * 60);
  }, [debouncedSearchVal, selectedCat, selectedSent, selectedMed, selectedDate, startDate, endDate, portalLocationFilter, refreshTrigger]);

  useEffect(() => {
    localStorage.setItem('portal_auto_refresh_enabled', String(autoRefreshEnabled));
    setSecondsLeft(refreshInterval * 60);
  }, [autoRefreshEnabled, refreshInterval]);

  useEffect(() => {
    localStorage.setItem('portal_refresh_interval', String(refreshInterval));
  }, [refreshInterval]);

  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const intervalId = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [autoRefreshEnabled, refreshInterval]);

  useEffect(() => {
    if (secondsLeft === 0) {
      setRefreshTrigger(t => t + 1);
      showToast('Data portal otomatis diperbarui.', 'info');
      setSecondsLeft(refreshInterval * 60);
    }
  }, [secondsLeft, refreshInterval, showToast]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleClearFilters = () => {
    setSearchVal('');
    setSelectedCat('all');
    setSelectedSent('all');
    setSelectedMed('all');
    setSelectedDate('');
    setStartDate('');
    setEndDate('');
    setPortalLocationFilter('all');
    setSortBy('newest');
    setStartHour(0);
    setEndHour(23);
    showToast('Filter dikosongkan.', 'info');
  };

  const handleCopyLink = (item: NewsItem, isDetail = false) => {
    const fakeUrl = `${window.location.origin}/portal/news/${item.id}`;
    navigator.clipboard.writeText(fakeUrl);
    setCopiedId(item.id);
    showToast('Tautan berita disalin ke papan klip!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = (item: NewsItem, platform: 'wa' | 'x' | 'tel') => {
    const cleanTitle = encodeURIComponent(item.title);
    const link = encodeURIComponent(item.link || `${window.location.origin}/news/${item.id}`);
    
    let url = '';
    if (platform === 'wa') {
      url = `https://api.whatsapp.com/send?text=*${cleanTitle}*%0A%0ASumber:%20${link}`;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // ===================================
  // enterprise hI-FIDELITY PDF GENERATOR
  // ===================================
  const generatePDFReport = async (item?: NewsItem) => {
    setIsDownloadingPdf(true);
    // PDF Generation is fully enabled for all roles to support detail reporting
    showToast('Memproses laporan PDF...', 'info');

    let generatedHighlight = '';
    if (item) {
      showToast('Membuat Highlight...', 'info');
      try {
        const response = await authFetch('/api/gemini/generate-highlight', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: item.title,
            summary: item.summary,
            mediaName: item.mediaName,
            publishDate: item.publishDate,
            location: item.location,
            categoryName: item.categoryName,
            sentiment: item.sentiment,
          })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.highlight) {
            generatedHighlight = data.highlight;
          }
        }
      } catch (err) {
        console.error('Failed to generate AI highlight:', err);
      }
    }
    
    // Secure wrapping helper to prevent news titles or long unspaced words and emojis from passing page borders or crashing jsPDF
    const wrapAndSanitiseText = (doc: any, text: string, maxWidth: number): string[] => {
      if (!text) return [];
      let clean = text
        .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '')
        .replace(/[^\x00-\x7F]/g, "") // non-ASCII
        .replace(/\s+/g, ' ')
        .trim();

      const lines = doc.splitTextToSize(clean, maxWidth);
      const finalLines: string[] = [];

      lines.forEach((line: string) => {
        if (doc.getTextWidth(line) <= maxWidth) {
          finalLines.push(line);
        } else {
          let currentLine = '';
          const words = line.split(' ');
          words.forEach((word) => {
            const testWordLine = currentLine ? currentLine + ' ' + word : word;
            if (doc.getTextWidth(testWordLine) <= maxWidth) {
              currentLine = testWordLine;
            } else {
              if (currentLine) {
                finalLines.push(currentLine);
              }
              let remainingWord = word;
              while (doc.getTextWidth(remainingWord) > maxWidth) {
                let sliceEnd = remainingWord.length - 1;
                while (sliceEnd > 0 && doc.getTextWidth(remainingWord.slice(0, sliceEnd)) > maxWidth) {
                  sliceEnd--;
                }
                if (sliceEnd === 0) sliceEnd = 1;
                finalLines.push(remainingWord.slice(0, sliceEnd));
                remainingWord = remainingWord.slice(sliceEnd);
              }
              currentLine = remainingWord;
            }
          });
          if (currentLine) {
            finalLines.push(currentLine);
          }
        }
      });
      return finalLines;
    };

    // Helper to extract main summary and strategic analysis cleanly (No brackets, no unrequested AI larping)
    const splitSummaryIntoParagraphs = (text: string) => {
      let cleanText = text || '';
      const bracketRegex = /\[\s*(?:Analisis\s+Strategis\s+AI|Analisis\s+Mitigasi\s+AI|Analisis\s+AI|Analisis\s+Ai|Analisis\s+Mitigasi|Strategic\s+Analysis\s+AI|Strategic\s+Analysis|Analisis\s+Strategis|Stategis\s+AI|Analisis)\s*\]/gi;
      const parts = cleanText.split(bracketRegex);
      if (parts.length > 1) {
        return {
          mainText: parts[0].trim(),
          analysisText: parts.slice(1).join('\n').trim()
        };
      }
      const nonBracketRegex = /(?:\n+|^)\s*(?:Analisis\s+Strategis\s+AI|Analisis\s+Mitigasi\s+AI|Analisis\s+AI|Analisis\s+Ai|Analisis\s+Mitigasi|Strategic\s+Analysis\s+AI|Strategic\s+Analysis|Analisis\s+Strategis|Stategis\s+AI|Analisis)\s*:\s*/gi;
      const partsNoBrackets = cleanText.split(nonBracketRegex);
      if (partsNoBrackets.length > 1) {
        return {
          mainText: partsNoBrackets[0].trim(),
          analysisText: partsNoBrackets.slice(1).join('\n').trim()
        };
      }
      const simpleLineRegex = /\n+\s*(?:Analisis\s+Strategis\s+AI|Analisis\s+Mitigasi\s+AI|Analisis\s+AI|Analisis\s+Ai|Analisis\s+Mitigasi|Strategic\s+Analysis\s+AI|Strategic\s+Analysis|Analisis\s+Strategis|Stategis\s+AI|Analisis)\s*(?:\n+|$)/gi;
      const partsSimple = cleanText.split(simpleLineRegex);
      if (partsSimple.length > 1) {
        return {
          mainText: partsSimple[0].trim(),
          analysisText: partsSimple.slice(1).join('\n').trim()
        };
      }
      return {
        mainText: cleanText.trim(),
        analysisText: ''
      };
    };

    try {
      // Capture map snapshot dynamically
      let mapSnapshotBase64: string | undefined = undefined;
      const mapElement = document.getElementById('portal-offscreen-map-container') || document.getElementById('osm-map-container');
      if (mapElement) {
        try {
          const canvas = await safeHtml2Canvas(mapElement, {
            useCORS: true,
            allowTaint: true,
            logging: false,
            scale: 2
          });
          mapSnapshotBase64 = canvas.toDataURL('image/jpeg', 0.85);
        } catch (mapErr) {
          console.error('Failed to capture map snapshot for Portal report:', mapErr);
        }
      }

      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const todayStr = new Date().toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });

      const pdfTimestampStr = new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const hexToRgb = (hexStr?: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexStr || '#0f172a');
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 15, g: 23, b: 42 };
      };
      const brandColor = hexToRgb(settings.primaryColor);

      if (item) {
        // --- INDIVIDUAL COVERAGE CLIP REPORT WITH HI-FI STYLING ---

        // Top Primary Border Branded Accent
        doc.setFillColor(brandColor.r, brandColor.g, brandColor.b);
        doc.rect(0, 0, 210, 16, 'F');

        // Logo text or Branding Header
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(settings.companyName.toUpperCase(), 15, 10.5);

        // Subheader metadata block
        doc.setTextColor(200, 210, 230);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('LAPORAN MEDIA MONITORING', 195, 10.5, { align: 'right' });

        // Meta Header info
        doc.setTextColor(51, 65, 85);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`ID ISU: ${item.id || 'N/A'}`, 15, 24);

        // Date of report
        doc.setTextColor(51, 65, 85);
        doc.text(`Tanggal Cetak: ${todayStr}`, 195, 24, { align: 'right' });

        // Divider
        doc.setLineWidth(0.4);
        doc.setDrawColor(226, 232, 240);
        doc.line(15, 27, 195, 27);

        // News Header Title
        doc.setTextColor(15, 23, 42); // slate-900
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        const titleLines = wrapAndSanitiseText(doc, item.title, 180);
        const titleY = 36;
        doc.text(titleLines, 15, titleY);

        let y = titleY + (titleLines.length * 6) + 3;

        // Structured Dossier Metadata Grid Box
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, 180, 24, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.35);
        doc.rect(15, y, 180, 24, 'S');

        // Grid column 1
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text('SUMBER MEDIA:', 20, y + 6.5);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(item.mediaName || '-', 48, y + 6.5);

        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('LOKASI:', 20, y + 15.5);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(item.location || 'DKI Jakarta', 48, y + 15.5);

        // Grid column 2
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('WAKTU TERBIT:', 110, y + 6.5);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(`${item.publishDate} ${item.publishTime || '12:00'}`, 140, y + 6.5);

        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('KATEGORI TOPIK:', 110, y + 15.5);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(item.categoryName || '-', 140, y + 15.5);

        y += 29;

        // Sentiment & Publication Status Badge Row
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text('ANALISIS SENTIMEN:', 15, y + 5);

        let badgeColor = [100, 116, 139]; // default gray
        const sentVal = item.sentiment ? item.sentiment : 'Netral';
        if (sentVal === 'Positif') badgeColor = [16, 185, 129]; // green
        if (sentVal === 'Negatif') badgeColor = [239, 68, 68];  // red
        
        doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
        doc.rect(53, y + 1.2, 32, 6, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(sentVal.toUpperCase(), 53 + 16, y + 5.3, { align: 'center' });

        // Publication Status Badge
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text('STATUS:', 102, y + 5);

        let statusColor = [59, 130, 246]; // blue
        const statusVal = item.status ? item.status : 'Published';
        if (statusVal === 'Draft') statusColor = [234, 179, 8]; // Amber
        
        doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.rect(142, y + 1.2, 32, 6, 'F');
        if (statusVal === 'Draft') {
          doc.setTextColor(15, 23, 42);
        } else {
          doc.setTextColor(255, 255, 255);
        }
        doc.setFontSize(8);
        doc.text(statusVal.toUpperCase(), 142 + 16, y + 5.3, { align: 'center' });

        y += 12;

        // Executive Highlights Card box - HIGHLY DYNAMIC AND NO OVERLAPPING
        const paragraphs = splitSummaryIntoParagraphs(item.summary || '');
        const mainText = paragraphs.mainText;
        const analysisText = paragraphs.analysisText;

        const mainLines = wrapAndSanitiseText(doc, mainText, 168);
        const analysisLines = analysisText ? wrapAndSanitiseText(doc, analysisText, 168) : [];
        const mainHeight = mainLines.length * 5.2;
        const analysisHeight = analysisText ? 10 + (analysisLines.length * 5.2) : 0;

        const headerSpacing = 10;
        const contentSpacing = mainHeight + analysisHeight;
        const totalBoxHeight = Math.max(30, headerSpacing + contentSpacing + 10);

        // Prevent overflow of the summary card by automatically splitting into the next page if space is insufficient
        if (y + totalBoxHeight > 250) {
          doc.addPage();
          doc.setFillColor(brandColor.r, brandColor.g, brandColor.b);
          doc.rect(0, 0, 210, 16, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(10);
          doc.text(settings.companyName.toUpperCase(), 15, 10.5);
          y = 28;
        }

        doc.setFillColor(250, 250, 250);
        doc.rect(15, y, 180, totalBoxHeight, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(15, y, 180, totalBoxHeight, 'S');

        // Small Brand highlight bar on left side of Executive summary
        doc.setFillColor(brandColor.r, brandColor.g, brandColor.b);
        doc.rect(15, y, 2.5, totalBoxHeight, 'F');

        doc.setTextColor(brandColor.r, brandColor.g, brandColor.b);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('HIGHLIGHT:', 21, y + 7.5);

        // Layout divider inside summary card
        doc.setLineWidth(0.3);
        doc.setDrawColor(226, 232, 240);
        doc.line(21, y + 10.5, 95, y + 10.5);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        
        let textY = y + 16;
        doc.text(mainText, 21, textY, { align: 'justify', maxWidth: 168 });

        if (analysisText) {
          textY += mainHeight + 4;
          
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(brandColor.r, brandColor.g, brandColor.b);
          doc.text('Analisis', 21, textY);
          
          textY += 4.5;
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(15, 23, 42);
          doc.text(analysisText, 21, textY, { align: 'justify', maxWidth: 168 });
        }

        y += totalBoxHeight + 8;

        // Keywords tags section - styled as pill badges
        if (item.tags && item.tags.length > 0) {
          if (y + 14 > 250) {
            doc.addPage();
            doc.setFillColor(brandColor.r, brandColor.g, brandColor.b);
            doc.rect(0, 0, 210, 16, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(settings.companyName.toUpperCase(), 15, 10.5);
            y = 28;
          }
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(30, 41, 59);
          doc.text('KATA KUNCI/TAGS:', 15, y + 4);
          
          let tagX = 53;
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          
          item.tags.forEach(tag => {
            const cleanTag = tag.trim();
            if (!cleanTag) return;
            const tagW = doc.getTextWidth(cleanTag) + 6;
            if (tagX + tagW > 195) {
              y += 7;
              tagX = 53;
            }
            doc.setFillColor(239, 246, 255); // light blue
            doc.rect(tagX, y + 0.5, tagW - 2, 5.5, 'F');
            doc.setDrawColor(191, 219, 254);
            doc.rect(tagX, y + 0.5, tagW - 2, 5.5, 'S');
            doc.setTextColor(29, 78, 216);
            doc.text(cleanTag, tagX + 2, y + 4.3);
            tagX += tagW;
          });
          
          y += 12;
        }

        // Tautan Original Berita - dynamically placed below summary/tags
        const targetLink = item.link || `https://google.com/search?q=${encodeURIComponent(item.title)}`;
        if (targetLink) {
          const linkLines = wrapAndSanitiseText(doc, targetLink, 180);
          const requiredH = (linkLines.length * 4.5) + 12;
          if (y + requiredH > 250) {
            doc.addPage();
            doc.setFillColor(brandColor.r, brandColor.g, brandColor.b);
            doc.rect(0, 0, 210, 16, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(settings.companyName.toUpperCase(), 15, 10.5);
            y = 28;
          }
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42);
          doc.text('TAUTAN BERITA (KLIK UNTUK MEMBUKA):', 15, y + 3);
          
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(79, 70, 229);
          
          let lineY = y + 8;
          linkLines.forEach((line: string) => {
            doc.textWithLink(line, 15, lineY, { url: targetLink });
            lineY += 4.5;
          });
        }

        // Footer block placed neatly at bottom limits
        doc.setFillColor(241, 245, 249);
        doc.rect(15, 265, 180, 15, 'F');
        doc.setTextColor(100, 116, 139);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(settings.footerText, 20, 271);
        doc.text('Sistem Dokumentasi Media Monitoring.', 20, 276);
        doc.text(`Halaman 1 dari 2 | Generated on: ${pdfTimestampStr}`, 190, 274, { align: 'right' });

        // --- PAGE 2: AGENT AI HIGHLIGHT GENERATOR ---
        doc.addPage();

        // Top Primary Border Branded Accent for Page 2
        doc.setFillColor(brandColor.r, brandColor.g, brandColor.b);
        doc.rect(0, 0, 210, 16, 'F');

        // Logo text or Branding Header for Page 2
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(settings.companyName.toUpperCase(), 15, 10.5);

        // Subheader metadata block
        doc.setTextColor(200, 210, 230);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('LAPORAN MEDIA MONITORING - HIGHLIGHT AI', 195, 10.5, { align: 'right' });

        // Meta Header info
        doc.setTextColor(51, 65, 85);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`ID ISU: ${item.id || 'N/A'}`, 15, 24);

        // Date of report
        doc.setTextColor(51, 65, 85);
        doc.text(`Tanggal Cetak: ${todayStr}`, 195, 24, { align: 'right' });

        // Divider
        doc.setLineWidth(0.4);
        doc.setDrawColor(226, 232, 240);
        doc.line(15, 27, 195, 27);

        // Title of Page 2
        doc.setTextColor(brandColor.r, brandColor.g, brandColor.b);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('SOROTAN & HIGHLIGHT INTELIJEN STRATEGIS', 15, 38);

        // Calculate dynamic height for box holding generated highlight
        const highlightLines = wrapAndSanitiseText(doc, generatedHighlight || 'Highlight tidak tersedia.', 166);
        const contentHeight = highlightLines.length * 6;
        const boxHeight = Math.max(80, 30 + contentHeight);

        // Render Box
        doc.setFillColor(249, 250, 251); 
        doc.rect(15, 45, 180, boxHeight, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.35);
        doc.rect(15, 45, 180, boxHeight, 'S');

        // Brand Highlight Left line
        doc.setFillColor(brandColor.r, brandColor.g, brandColor.b);
        doc.rect(15, 45, 3, boxHeight, 'F');

        // Inside Box Content
        doc.setTextColor(15, 23, 42);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text('INTISARI EKSEKUTIF SENIOR (AGENT AI)', 22, 54);

        doc.setTextColor(100, 116, 139);
        doc.setFont('Helvetica', 'oblique');
        doc.setFontSize(8.5);
        doc.text('Formulasi otomatis oleh Analis Senior Agent AI', 22, 59);

        // Inner Divider
        doc.setLineWidth(0.25);
        doc.setDrawColor(226, 232, 240);
        doc.line(22, 63, 185, 63);

        // Highlight Paragraph
        doc.setTextColor(30, 41, 59);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);

        let page2LineY = 71;
        highlightLines.forEach((line) => {
          doc.text(line, 22, page2LineY);
          page2LineY += 6.2;
        });

        // Page 2 Footer
        doc.setFillColor(241, 245, 249);
        doc.rect(15, 265, 180, 15, 'F');
        doc.setTextColor(100, 116, 139);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(settings.footerText, 20, 271);
        doc.text('Laporan Hasil Analisis Agent AI Intelijen Strategis.', 20, 276);
        doc.text(`Halaman 2 dari 2 | Generated on: ${pdfTimestampStr}`, 190, 274, { align: 'right' });

        doc.save(`Report_Isu_${item.id || 'export'}.pdf`);
        showToast('Report berita PDF berhasil diunduh.', 'success');

      } else {
        // --- ENTIRE FILTER BULLETIN RAPORT ---
        if (sortedNews.length === 0) {
          showToast('Tidak ada rilis berita terfilter untuk diekspor.', 'error');
          return;
        }

        showToast('Memproses Unduhan Report...', 'info');

        let dateRangeLabel = 'Tidak Ada Berita';
        if (sortedNews.length > 0) {
          const dates = sortedNews
            .map((n) => n.publishDate)
            .filter(Boolean)
            .sort();
          if (dates.length > 0) {
            dateRangeLabel = dates.length === 1 ? dates[0] : `${dates[0]} s/d ${dates[dates.length - 1]}`;
          } else {
            dateRangeLabel = 'Periode Juni 2026';
          }
        }

        let customReportText = `**Kebijakan Energi & Tata Kelola**
- Pengawasan distribusi BBM subsidi diperketat melalui verifikasi QR Code dan STNK guna memastikan ketepatan sasaran.
- Regulasi kebijakan publik regional dioptimalkan untuk meminimalkan potensi kebocoran energi bersubsidi.

---

**Pengamanan & Logistik Regional**
- Patroli keamanan laut dan darat ditingkatkan di wilayah perbatasan untuk menganticipasi potensi kerawanan logistik.`;

        showToast('Membuat Highlight Utama dengan Agent AI...', 'info');
        try {
          const response = await authFetch('/api/gemini/generate-highlight', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              articles: sortedNews.slice(0, 20).map(n => ({
                title: n.title,
                summary: n.summary,
                mediaName: n.mediaName,
                publishDate: n.publishDate,
                location: n.location,
                categoryName: n.categoryName,
                sentiment: n.sentiment
              }))
            })
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.highlight) {
              customReportText = data.highlight;
            }
          }
        } catch (err) {
          console.error('Failed to generate AI highlight for bulk report:', err);
        }

        const catFreq: Record<string, number> = {};
        sortedNews.forEach((n) => {
          const name = n.categoryName || 'Lainnya';
          catFreq[name] = (catFreq[name] || 0) + 1;
        });
        const sortedCats = Object.entries(catFreq).sort((a, b) => b[1] - a[1]);
        const topTopic = sortedCats.length > 0 ? sortedCats[0][0] : 'Umum';

        const provFreq: Record<string, number> = {};
        sortedNews.forEach((n) => {
          const name = n.location || 'Nasional';
          provFreq[name] = (provFreq[name] || 0) + 1;
        });
        const sortedProvs = Object.entries(provFreq).sort((a, b) => b[1] - a[1]);
        const topRegion = sortedProvs.length > 0 ? sortedProvs[0][0] : 'Nasional';

        let riskLevel = 'RENDAH';
        const negC = sortedNews.filter(n => n.sentiment === 'Negatif').length;
        if (negC > sortedNews.length * 0.45) {
          riskLevel = 'TINGGI (AWAS)';
        } else if (negC > sortedNews.length * 0.2) {
          riskLevel = 'SEDANG (WASPADA)';
        }

        const statsPayload = {
          total: sortedNews.length,
          positif: sortedNews.filter(n => n.sentiment === 'Positif').length,
          netral: sortedNews.filter(n => n.sentiment === 'Netral').length,
          negatif: negC,
          topTopic,
          topRegion,
          riskLevel
        };

        const provinceStats: Record<string, { newsCount: number; positif: number; netral: number; negatif: number }> = {};
        sortedNews.forEach((item) => {
          const prov = item.location || 'Nasional';
          if (!provinceStats[prov]) {
            provinceStats[prov] = { newsCount: 0, positif: 0, netral: 0, negatif: 0 };
          }
          provinceStats[prov].newsCount += 1;
          if (item.sentiment === 'Positif') provinceStats[prov].positif += 1;
          else if (item.sentiment === 'Netral') provinceStats[prov].netral += 1;
          else if (item.sentiment === 'Negatif') provinceStats[prov].negatif += 1;
        });

        compileStudioPDFReport(
          'LAPORAN KHUSUS MEDIA MONITORING',
          'Custom',
          dateRangeLabel,
          customReportText,
          statsPayload,
          mapSnapshotBase64,
          provinceStats,
          highlights,
          sortedNews
        );

        showToast('Berkas PDF Berhasil Diunduh!', 'success');
      }
    } catch (e) {
      showToast('Gagal memproses dokumen PDF.', 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const getSentimentStyle = (sentiment: Sentiment) => {
    switch (sentiment) {
      case 'Positif':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'Negatif':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/30';
      default:
        return 'bg-blue-50 text-blue-750 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30';
    }
  };

  const isRecentItem = (createdAt: string | undefined): boolean => {
    if (!createdAt) return false;
    const createdAtMs = new Date(createdAt).getTime();
    if (isNaN(createdAtMs)) return false;
    const nowMs = new Date().getTime();
    const diffMinutes = (nowMs - createdAtMs) / (1000 * 60);
    return diffMinutes >= 0 && diffMinutes <= 60;
  };

  // Calculated count of active filters
  const activeFiltersCount = (selectedCat !== 'all' ? selectedCat.split(',').length : 0) + 
                             (selectedSent !== 'all' ? 1 : 0) + 
                             (selectedMed !== 'all' ? 1 : 0) + 
                             (selectedDate ? 1 : 0) + 
                             (sortBy !== 'newest' ? 1 : 0) +
                             ((startHour !== 0 || endHour !== 23) ? 1 : 0) +
                             (portalLocationFilter !== 'all' ? portalLocationFilter.split(',').length : 0);

  return (
    <div className="space-y-6">
      {/* HIGHLIGHT ISSUES HERO CAROUSEL */}
      <HighlightCarousel key={selectedDate} />

      {/* Search and Filters Header */}
      <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg md:text-xl font-bold tracking-tight font-display text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-5.5 h-5.5 text-blue-600" id="portal-globe-icon" />
              Portal Monitoring
            </h2>
            <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400">Arsip berita, opini publik, dan rilis laporan media.</p>
          </div>
          
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => {
                if (hasFiltersSelected) {
                  generatePDFReport();
                } else {
                  setShowPdfConfirm(true);
                }
              }}
              disabled={isDownloadingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-[10.5px] font-extrabold shadow-sm hover:shadow transition-all duration-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              title="Unduh Laporan Berita PDF"
            >
              {isDownloadingPdf ? (
                <>
                  <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Mengunduh...</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>Unduh Laporan PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search Input Bar (Main Action) */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" id="portal-search-icon" />
            <input
              type="text"
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              placeholder="Cari topik, isi berita, atau kata kunci..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs placeholder:text-slate-400 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Auto-Refresh Toggle Controller */}
          <div className="flex items-center justify-between md:justify-start gap-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 rounded-xl px-3 py-2 transition min-h-[38px] cursor-pointer">
            <button
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none text-slate-700 dark:text-slate-200"
              title={autoRefreshEnabled ? "Matikan Auto-Refresh" : "Aktifkan Auto-Refresh"}
            >
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${autoRefreshEnabled ? 'bg-emerald-500 animate-pulse ring-2 ring-emerald-500/30' : 'bg-slate-400'}`} />
              <span className="font-sans font-bold text-xs whitespace-nowrap">{autoRefreshEnabled ? `Auto refresh (${formatCountdown(secondsLeft)})` : 'Auto refresh Off'}</span>
            </button>
            <span className="text-slate-300 dark:text-white/10 text-[9px] select-none">|</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-transparent border-none text-xs font-black text-blue-600 dark:text-blue-400 focus:ring-0 p-0 pr-4 cursor-pointer outline-none font-sans"
              title="Set Interval Penyegaran"
            >
              <option value={1} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">1 mnt</option>
              <option value={5} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">5 mnt</option>
              <option value={15} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">15 mnt</option>
              <option value={30} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">30 mnt</option>
            </select>
          </div>

          {/* Desktop Filter Toggle Button */}
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`hidden md:flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
              showMobileFilters || activeFiltersCount > 0
                ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filter Lanjutan</span>
            {activeFiltersCount > 0 ? (
              <span className="flex items-center justify-center w-5 h-5 bg-blue-600 text-white font-bold rounded-full text-[10px] ml-1">
                {activeFiltersCount}
              </span>
            ) : (
              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ml-1 ${showMobileFilters ? 'rotate-90' : 'rotate-0'}`} />
            )}
          </button>

          {/* Mobile Buttons Bar */}
          <div className="flex md:hidden gap-2">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-xs font-bold transition active:scale-95 ${
                showMobileFilters || activeFiltersCount > 0
                  ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filter Isu</span>
              {activeFiltersCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 bg-blue-600 text-white font-bold rounded-full text-[10px]">
                  {activeFiltersCount}
                </span>
              )}
            </button>


          </div>
        </div>



        {/* Collapsible Advanced Filters Panel (Responsive Grid with Fluid Motion collapse for both Desktop & Mobile) */}
        <AnimatePresence initial={false}>
          {showMobileFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} // Elegant easeOutQuart transition
              className="overflow-visible"
              style={{ overflow: 'visible' }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9 gap-3.5 p-4 bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl border border-slate-100/75 dark:border-slate-800/80">
                {/* Category Filter */}
                <MultiSelect
                  label="Topik Isu"
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
                  selectedValues={selectedCat === 'all' ? [] : selectedCat.split(',').filter(Boolean)}
                  onChange={(values) => setSelectedCat(values.length === 0 ? 'all' : values.join(','))}
                  placeholder="Semua Topik"
                  searchPlaceholder="Cari topik..."
                />

                {/* Sentiment Filter */}
                <div>
                  <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Sentimen Berita</label>
                  <select
                    value={selectedSent}
                    onChange={e => setSelectedSent(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer shadow-xs"
                  >
                    <option value="all">Semua Sentimen</option>
                    <option value="Positif">Positif</option>
                    <option value="Negatif">Negatif</option>
                    <option value="Netral">Netral</option>
                  </select>
                </div>

                {/* Media Filter Description */}
                <div>
                  <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Sumber Media</label>
                  <select
                    value={selectedMed}
                    onChange={e => setSelectedMed(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer shadow-xs"
                  >
                    <option value="all">Semua Media</option>
                    {medias.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {/* Date range - Dari Tanggal */}
                <div>
                  <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Dari Tanggal</label>
                  <div className="relative group">
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => {
                        setStartDate(e.target.value);
                        setSelectedDate('');
                      }}
                      onClick={e => {
                        try {
                          (e.currentTarget as any).showPicker();
                        } catch (err) {}
                      }}
                      className="w-full pl-3 pr-8 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition shadow-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Date range - Sampai Tanggal */}
                <div>
                  <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Sampai Tanggal</label>
                  <div className="relative group">
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => {
                        setEndDate(e.target.value);
                        setSelectedDate('');
                      }}
                      onClick={e => {
                        try {
                          (e.currentTarget as any).showPicker();
                        } catch (err) {}
                      }}
                      className="w-full pl-3 pr-8 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition shadow-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Province Filter */}
                <MultiSelect
                  label="Provinsi"
                  options={PROVINCES.map(prov => ({ value: prov, label: prov }))}
                  selectedValues={portalLocationFilter === 'all' ? [] : portalLocationFilter.split(',').filter(Boolean)}
                  onChange={(values) => setPortalLocationFilter(values.length === 0 ? 'all' : values.join(','))}
                  placeholder="Semua Provinsi"
                  searchPlaceholder="Cari provinsi..."
                />

                {/* Sort Control */}
                <div>
                  <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Urutan</label>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer shadow-xs"
                  >
                    <option value="newest">Terbaru</option>
                    <option value="oldest">Terlama</option>
                  </select>
                </div>

                {/* Hour Range Filter */}
                <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2">
                  <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Rentang Jam</label>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs h-[38px] justify-between shadow-xs transition hover:border-slate-350 dark:hover:border-slate-705">
                    <select
                      value={startHour}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (val > endHour) {
                          setEndHour(val);
                        }
                        setStartHour(val);
                        showToast(`Jam mulai diset ke ${String(val).padStart(2, '0')}:00`, 'info');
                      }}
                      className="bg-transparent text-slate-700 dark:text-slate-300 cursor-pointer font-semibold focus:outline-none text-[11.5px] hover:text-blue-500 transition"
                    >
                      {Array.from({ length: 24 }).map((_, i) => (
                        <option key={i} value={i} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">{String(i).padStart(2, '0')}:00</option>
                      ))}
                    </select>

                    <span className="text-slate-400 dark:text-slate-500 font-bold px-0.5">s/d</span>

                    <select
                      value={endHour}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (val < startHour) {
                          setStartHour(val);
                        }
                        setEndHour(val);
                        showToast(`Jam akhir diset ke ${String(val).padStart(2, '0')}:59`, 'info');
                      }}
                      className="bg-transparent text-slate-700 dark:text-slate-300 cursor-pointer font-semibold focus:outline-none text-[11.5px] hover:text-blue-500 transition"
                    >
                      {Array.from({ length: 24 }).map((_, i) => (
                        <option key={i} value={i} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">{String(i).padStart(2, '0')}:59</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Clear Button */}
                <div className="sm:col-span-2 lg:col-span-4 xl:col-span-1">
                  <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">&nbsp;</label>
                  <button
                    onClick={() => {
                      handleClearFilters();
                      setShowMobileFilters(false);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/40 dark:border-slate-700/60 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm h-[38px]"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" id="portal-clear-icon"/>
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Active Filter Badges Panel */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-950 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs animate-fade-in mt-2">
          <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mr-1.5">Saringan Terpasang:</span>
          
          {selectedCat !== 'all' && selectedCat.split(',').filter(Boolean).map(catId => {
            const catName = categories.find(c => c.id === catId)?.name || catId;
            return (
              <span key={catId} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-xs">
                <span>Topik: {catName}</span>
                <button 
                  onClick={() => {
                    const next = selectedCat.split(',').filter(id => id !== catId);
                    setSelectedCat(next.length === 0 ? 'all' : next.join(','));
                  }} 
                  className="hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full p-0.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 cursor-pointer transition ml-1"
                  title="Hapus topik"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}

          {selectedSent !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span>Sentimen: {selectedSent}</span>
              <button 
                onClick={() => setSelectedSent('all')} 
                className="hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full p-0.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 cursor-pointer transition ml-1"
                title="Hapus sentimen"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedMed !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span>Media: {medias.find(m => m.id === selectedMed)?.name || selectedMed}</span>
              <button 
                onClick={() => setSelectedMed('all')} 
                className="hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full p-0.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 cursor-pointer transition ml-1"
                title="Hapus media"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedDate && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span>Tanggal: {formatDateDDMMYYYY(selectedDate)}</span>
              <button 
                onClick={() => setSelectedDate('')} 
                className="hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full p-0.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 cursor-pointer transition ml-1"
                title="Hapus tanggal"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {startDate && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-blue-800 dark:text-blue-100 border border-blue-200 dark:border-blue-700 shadow-xs">
              <span>Dari: {formatDateDDMMYYYY(startDate)}</span>
              <button 
                onClick={() => setStartDate('')} 
                className="hover:bg-slate-200 dark:hover:bg-slate-705 rounded-full p-0.5 text-blue-500 hover:text-blue-700 cursor-pointer transition ml-1"
                title="Hapus tanggal mulai"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {endDate && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-blue-800 dark:text-blue-100 border border-blue-200 dark:border-blue-700 shadow-xs">
              <span>Sampai: {formatDateDDMMYYYY(endDate)}</span>
              <button 
                onClick={() => setEndDate('')} 
                className="hover:bg-slate-200 dark:hover:bg-slate-705 rounded-full p-0.5 text-blue-500 hover:text-blue-700 cursor-pointer transition ml-1"
                title="Hapus tanggal sampai"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {portalLocationFilter !== 'all' && portalLocationFilter.split(',').filter(Boolean).map(prov => (
            <span key={prov} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span>Provinsi: {prov}</span>
              <button 
                onClick={() => {
                  const next = portalLocationFilter.split(',').filter(id => id !== prov);
                  setPortalLocationFilter(next.length === 0 ? 'all' : next.join(','));
                }} 
                className="hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full p-0.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 cursor-pointer transition ml-1"
                title="Hapus lokasi"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {(startHour !== 0 || endHour !== 23) && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span>Jam: {String(startHour).padStart(2, '0')}:00 - {String(endHour).padStart(2, '0')}:59</span>
              <button 
                onClick={() => {
                  setStartHour(0);
                  setEndHour(23);
                }} 
                className="hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full p-0.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 cursor-pointer transition ml-1"
                title="Hapus rentang jam"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            onClick={handleClearFilters}
            className="text-[10px] font-extrabold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 underline uppercase tracking-wider ml-auto hover:scale-105 transition cursor-pointer"
          >
            Kosongkan Semua Filter
          </button>
        </div>
      )}

      {/* News Grid Column layout */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60 pb-3">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
            ARSIP PEMBERITAAN ({sortedNews.length})
          </h3>
          
          <div className="flex items-center bg-slate-50 dark:bg-slate-950 p-1 border border-slate-200/50 dark:border-slate-800 rounded-xl self-start sm:self-auto shadow-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-450 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-450 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>
        </div>

        {sortedNews.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {sortedNews.slice(0, visibleCount).map((item) => (
                <article 
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-300 flex flex-col overflow-hidden relative group"
                >
                  {/* Cover representation */}
                  <div className="h-36 bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
                        <FileText className="w-8 h-8 text-slate-300 dark:text-slate-800" id={`clip-file-mock-${item.id}`}/>
                      </div>
                    )}
                    {/* Category overlay */}
                    <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-950/90 py-0.5 px-2.5 rounded-lg text-[9px] font-bold text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200/50 dark:border-slate-800/50 uppercase tracking-wider">
                      {item.categoryName}
                    </div>

                    {/* Sentiment tag badge with possible NEW indicator */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                      {isRecentItem(item.createdAt) && (
                        <div className="flex items-center gap-1 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg shadow-sm animate-pulse select-none tracking-wider font-sans">
                          <span className="w-1.5 h-1.5 rounded-full bg-white opacity-90 inline-block animate-ping" />
                          <span>NEW</span>
                        </div>
                      )}
                      <div className={`text-[9px] font-bold py-0.5 px-2.5 rounded-lg border shadow-sm ${getSentimentStyle(item.sentiment)}`}>
                        {item.sentiment}
                      </div>
                    </div>
                  </div>

                  {/* News details */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 font-mono">
                        <Calendar className="w-3 h-3 text-slate-500 dark:text-slate-400" id={`clip-cal-${item.id}`} />
                        <span>{formatDateDDMMYYYY(item.publishDate)} {item.publishTime || '12:00'}</span>
                        <span>•</span>
                        <span className="text-slate-700 dark:text-slate-200 font-bold">{item.mediaName}</span>
                        <span>•</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProvince(item.location || 'DKI Jakarta');
                            setTab('dashboard');
                            showToast(`Menampilkan lokasi ${item.location || 'DKI Jakarta'} di Peta OpenStreetMap`, 'info');
                          }}
                          className="text-blue-600 dark:text-blue-450 font-bold hover:underline cursor-pointer"
                          title="Klik untuk melihat sebaran isu di Peta Analitik"
                        >
                          📍 {item.location || 'DKI Jakarta'}
                        </button>
                      </div>

                      <h4 
                        onClick={() => setActiveItem(item)}
                        className="text-sm font-bold text-slate-900 dark:text-slate-100 font-display line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 cursor-pointer transition duration-150"
                      >
                        {item.title}
                      </h4>

                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-3 font-normal">
                        {formatSummaryText(item.summary)}
                      </p>
                    </div>

                    {/* Share actions bar */}
                    <div className="pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between text-xs">
                      <button
                        onClick={() => setActiveItem(item)}
                        className="text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Detail Isu</span>
                        <ChevronRight className="w-3.5 h-3.5" id={`clip-chev-${item.id}`}/>
                      </button>

                      <div className="flex items-center gap-2 text-slate-400">
                        <button 
                          onClick={() => handleCopyLink(item)} 
                          className="p-1 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Copy link"
                        >
                          {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" id="clip-check-copied"/> : <Copy className="w-3.5 h-3.5" id={`clip-copy-${item.id}`}/>}
                        </button>
                        

                      </div>
                    </div>

                    {user?.role === 'Admin' && (
                      <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-end gap-1.5 flex-wrap">
                        {(() => {
                          const isFeatured = (highlights || []).some(h => h.title.trim().toLowerCase() === item.title.trim().toLowerCase());
                          return (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const existing = (highlights || []).find(h => h.title.trim().toLowerCase() === item.title.trim().toLowerCase());
                                if (existing) {
                                  if (window.confirm(`Hapus "${item.title}" dari Highlight Hari Ini?`)) {
                                    await removeHighlight(existing.id);
                                    showToast('Highlight berhasil dihapus.', 'success');
                                  }
                                } else {
                                  await saveHighlight({
                                    title: item.title,
                                    summary: item.summary,
                                    categoryName: item.categoryName,
                                    location: item.location || 'Nasional',
                                    mediaName: item.mediaName,
                                    link: item.link || '',
                                    imageUrl: item.imageUrl || '',
                                    sentiment: item.sentiment || 'Netral',
                                    publishDate: item.publishDate,
                                    publishTime: item.publishTime || '12:00',
                                    isPinned: false
                                  });
                                  showToast('Berita ditambahkan ke Highlight Hari Ini.', 'success');
                                }
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                isFeatured 
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs' 
                                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                              }`}
                              title={isFeatured ? "Hapus dari Highlight" : "Tambahkan ke Highlight"}
                            >
                              ★ {isFeatured ? 'Hapus Highlight' : 'Jadikan Highlight'}
                            </button>
                          );
                        })()}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingNewsItem(item);
                          }}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold rounded-lg text-[10px] transition flex items-center gap-1 cursor-pointer"
                          title="Edit Berita"
                        >
                          ✏️ Edit
                        </button>

                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm(`Apakah Anda yakin ingin menghapus berita ini secara permanen dari arsip?`)) {
                              const success = await removeNewsItem(item.id);
                              if (success) {
                                showToast('Berita berhasil dihapus.', 'success');
                                setRefreshTrigger(prev => prev + 1);
                              } else {
                                showToast('Gagal menghapus berita.', 'error');
                              }
                            }
                          }}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-450 font-bold rounded-lg text-[10px] transition flex items-center gap-1 cursor-pointer"
                          title="Hapus Berita"
                        >
                          🗑️ Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedNews.slice(0, visibleCount).map((item) => (
                <article 
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-300 flex flex-row overflow-hidden relative group"
                >
                  {/* Cover representation - Side Image on Mobile and Desktop */}
                  <div className="w-24 xs:w-32 sm:w-48 h-auto min-h-full bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
                        <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300 dark:text-slate-800" id={`clip-file-mock-${item.id}`}/>
                      </div>
                    )}
                    {/* Category overlay */}
                    <div className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 bg-white/90 dark:bg-slate-950/90 py-0.5 px-1.5 sm:px-2.5 rounded-md sm:rounded-lg text-[8px] sm:text-[9.5px] font-bold text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200/50 dark:border-slate-800/50 uppercase tracking-wider truncate max-w-[90%]">
                      {item.categoryName}
                    </div>
                  </div>

                  {/* News details */}
                  <div className="p-3 sm:p-4 md:p-5 flex-1 flex flex-col justify-between space-y-2 sm:space-y-3 min-w-0">
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-bold text-slate-600 dark:text-slate-400 font-mono">
                        <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-500 dark:text-slate-400" id={`clip-cal-${item.id}`} />
                        <span>{formatDateDDMMYYYY(item.publishDate)} <span className="hidden xs:inline">{item.publishTime}</span></span>
                        <span>•</span>
                        <span className="text-slate-700 dark:text-slate-200 font-bold truncate max-w-[70px] sm:max-w-none">{item.mediaName}</span>
                        <span className="hidden xs:inline">•</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProvince(item.location || 'DKI Jakarta');
                            setTab('dashboard');
                            showToast(`Menampilkan lokasi ${item.location || 'DKI Jakarta'} di Peta OpenStreetMap`, 'info');
                          }}
                          className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer hidden xs:inline"
                          title="Klik untuk melihat sebaran isu di Peta Analitik"
                        >
                          📍 {item.location || 'DKI Jakarta'}
                        </button>
                        <span className="ml-auto inline-flex items-center gap-1.5">
                          {isRecentItem(item.createdAt) && (
                            <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-[8px] sm:text-[9.5px] font-black px-1.5 py-0.5 rounded-md sm:rounded-lg shadow-sm animate-pulse select-none tracking-wider font-sans">
                              <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-white opacity-90 inline-block animate-ping" />
                              <span>NEW</span>
                            </span>
                          )}
                          <span className={`text-[8px] sm:text-[9.5px] font-bold py-0.5 px-1.5 sm:px-2.5 rounded-md sm:rounded-lg border shadow-xs ${getSentimentStyle(item.sentiment)}`}>
                            {item.sentiment}
                          </span>
                        </span>
                      </div>

                      <h4 
                        onClick={() => setActiveItem(item)}
                        className="text-xs sm:text-sm md:text-base font-bold text-slate-900 dark:text-slate-100 font-display line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 cursor-pointer transition duration-150"
                      >
                        {item.title}
                      </h4>

                      <p className="text-[10.5px] sm:text-xs text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-2 font-normal">
                        {formatSummaryText(item.summary)}
                      </p>
                    </div>

                    {/* Share actions bar */}
                    <div className="pt-2 sm:pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between text-[11px] sm:text-xs">
                      <button
                        onClick={() => setActiveItem(item)}
                        className="text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Detail Isu</span>
                        <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" id={`clip-chev-${item.id}`}/>
                      </button>

                      <div className="flex items-center gap-2 text-slate-400">
                        <button 
                          onClick={() => handleCopyLink(item)} 
                          className="p-1 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Copy link"
                        >
                          {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" id="clip-check-copied"/> : <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" id={`clip-copy-${item.id}`}/>}
                        </button>
                        

                      </div>
                    </div>

                    {user?.role === 'Admin' && (
                      <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-end gap-1.5 flex-wrap">
                        {(() => {
                          const isFeatured = (highlights || []).some(h => h.title.trim().toLowerCase() === item.title.trim().toLowerCase());
                          return (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const existing = (highlights || []).find(h => h.title.trim().toLowerCase() === item.title.trim().toLowerCase());
                                if (existing) {
                                  if (window.confirm(`Hapus "${item.title}" dari Highlight Hari Ini?`)) {
                                    await removeHighlight(existing.id);
                                    showToast('Highlight berhasil dihapus.', 'success');
                                  }
                                } else {
                                  await saveHighlight({
                                    title: item.title,
                                    summary: item.summary,
                                    categoryName: item.categoryName,
                                    location: item.location || 'Nasional',
                                    mediaName: item.mediaName,
                                    link: item.link || '',
                                    imageUrl: item.imageUrl || '',
                                    sentiment: item.sentiment || 'Netral',
                                    publishDate: item.publishDate,
                                    publishTime: item.publishTime || '12:00',
                                    isPinned: false
                                  });
                                  showToast('Berita ditambahkan ke Highlight Hari Ini.', 'success');
                                }
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                isFeatured 
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs' 
                                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                              }`}
                              title={isFeatured ? "Hapus dari Highlight" : "Tambahkan ke Highlight"}
                            >
                              ★ {isFeatured ? 'Hapus Highlight' : 'Jadikan Highlight'}
                            </button>
                          );
                        })()}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingNewsItem(item);
                          }}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold rounded-lg text-[10px] transition flex items-center gap-1 cursor-pointer"
                          title="Edit Berita"
                        >
                          ✏️ Edit
                        </button>

                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm(`Apakah Anda yakin ingin menghapus berita ini secara permanen dari arsip?`)) {
                              const success = await removeNewsItem(item.id);
                              if (success) {
                                showToast('Berita berhasil dihapus.', 'success');
                                setRefreshTrigger(prev => prev + 1);
                              } else {
                                showToast('Gagal menghapus berita.', 'error');
                              }
                            }
                          }}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-450 font-bold rounded-lg text-[10px] transition flex items-center gap-1 cursor-pointer"
                          title="Hapus Berita"
                        >
                          🗑️ Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )
        ) : (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" id="no-clips-alert"/>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Tidak ada berita ditemukan</h4>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan filter/kategori, atau masukkan kata kunci pencarian yang berbeda.</p>
          </div>
        )}

        {/* Load more container */}
        {sortedNews.length > visibleCount && (
          <div className="flex justify-center pt-4">
            <button
              onClick={() => setVisibleCount(p => p + 6)}
              className="py-2 px-6 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-semibold text-xs rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
            >
              Lihat Berita Lebih Banyak
            </button>
          </div>
        )}
      </div>

      {/* DETAIL NEWS IMMERSIVE MODAL */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-[500px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden my-4">
            {/* Upper colored band */}
            <div className="h-1.5 bg-gradient-to-r from-blue-650 to-blue-700" />
            
            {/* Header row */}
            <div className="p-4 md:p-5 pb-3 border-b border-slate-50 dark:border-slate-850 flex items-start justify-between gap-2">
              <div className="space-y-1 max-w-[88%]">
                <div className="flex flex-wrap gap-1.5 items-center text-[9px] font-bold text-slate-400 font-mono uppercase font-sans">
                  {isRecentItem(activeItem.createdAt) && (
                    <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm animate-pulse select-none tracking-wider">
                      <span className="w-1 h-1 rounded-full bg-white opacity-90 inline-block animate-ping" />
                      <span>NEW</span>
                    </span>
                  )}
                  <span className={`px-1.5 py-0.5 rounded border ${getSentimentStyle(activeItem.sentiment)}`}>
                    {activeItem.sentiment}
                  </span>
                  <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                    {activeItem.categoryName}
                  </span>
                  <span>📅 {formatDateDDMMYYYY(activeItem.publishDate)} {activeItem.publishTime || '12:00'}</span>
                  <button
                    onClick={() => {
                      setSelectedProvince(activeItem.location || 'DKI Jakarta');
                      setTab('dashboard');
                      setActiveItem(null);
                      showToast(`Menampilkan lokasi ${activeItem.location || 'DKI Jakarta'} di Peta OpenStreetMap`, 'info');
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer font-bold"
                    title="Klik untuk membuka sebaran isu di Peta Analitik"
                  >
                    📍 {activeItem.location || 'DKI Jakarta'}
                  </button>
                </div>
                <h3 className="text-sm md:text-base font-bold font-display text-slate-900 dark:text-white leading-tight">
                  {activeItem.title}
                </h3>
                <p className="text-[11px] text-slate-500">Sumber: <span className="font-semibold text-slate-800 dark:text-slate-200">{activeItem.mediaName}</span></p>
              </div>

              <button 
                onClick={() => setActiveItem(null)}
                className="p-1 px-2 hover:bg-slate-150 dark:hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white text-[11px] font-bold tracking-tight transition"
              >
                Tutup
              </button>
            </div>

            {/* Modal Body scrollable area */}
            <div className="p-4 md:p-5 space-y-4 max-h-[55vh] overflow-y-auto">
              {/* Optional Core Clip visual */}
              {activeItem.imageUrl && (
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950">
                  <img src={activeItem.imageUrl} alt={activeItem.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}

              {/* Highlights content */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-455 tracking-wider uppercase font-sans">Summary Analisis</h4>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60 rounded-xl">
                  <p className="text-xs font-normal text-slate-900 dark:text-slate-100 leading-relaxed font-sans whitespace-pre-line">
                    {formatSummaryText(activeItem.summary)}
                  </p>
                </div>
              </div>

              {/* Tag clusters */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-wider uppercase font-sans">Kata Kunci / Klasifikasi Isu</h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeItem.tags && activeItem.tags.length > 0 ? (
                    activeItem.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[10px]">
                        #{tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-400 font-light">Tidak ada tag.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Share Tools */}
            <div className="p-4 md:p-5 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-50 dark:border-slate-850 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              
              <div className="flex flex-wrap gap-2 text-[11px] font-medium text-slate-605 dark:text-slate-400 items-center">
                <span>Bagikan Isu:</span>
                <button
                  onClick={() => handleShare(activeItem, 'wa')}
                  className="px-2 py-1 bg-white dark:bg-slate-900 hover:bg-emerald-55 dark:hover:bg-emerald-950 border border-slate-200 dark:border-slate-800 hover:border-emerald-350 rounded-lg text-emerald-600 dark:text-emerald-400 transition cursor-pointer flex items-center gap-1 shadow-sm hover:shadow"
                >
                  <MessageSquare className="w-3.5 h-3.5" id="share-wa-icon" />
                  <span>WhatsApp</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => generatePDFReport(activeItem)}
                  disabled={isDownloadingPdf}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition active:scale-95 cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Unduh Laporan PDF Detil Isu"
                >
                  {isDownloadingPdf ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Mengunduh...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5" id="download-issue-pdf-icon" />
                      <span>Unduh PDF</span>
                    </>
                  )}
                </button>

                <a 
                  href={activeItem.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg transition active:scale-95"
                >
                  <ExternalLink className="w-3 h-3" id="url-external-icon"/>
                  <span>Sumber</span>
                </a>
              </div>
              
            </div>
          </div>
        </div>
      )}

      {/* EDIT NEWS MODAL FOR ADMIN */}
      {editingNewsItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
            <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />
            
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                  <span>✏️ Edit Isu Pemberitaan (Admin)</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Perbarui detail, kluster topik, sentimen, atau lokasi pemberitaan.</p>
              </div>
              <button
                onClick={() => setEditingNewsItem(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto">
              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Judul Pemberitaan</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Masukkan judul berita..."
                />
              </div>

              {/* Summary / Analisis Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Ringkasan / Analisis Mitigasi</label>
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                  placeholder="Masukkan ringkasan atau detail analisis isu..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Kluster Topik / Kategori</label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="" disabled>Pilih Kategori</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Media Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sumber Media</label>
                  <select
                    value={editMediaId}
                    onChange={(e) => setEditMediaId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="" disabled>Pilih Media</option>
                    {medias.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.type})</option>
                    ))}
                  </select>
                </div>

                {/* Location / Province Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Lokasi / Provinsi</label>
                  <select
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {PROVINCES.map(prov => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                </div>

                {/* Sentiment Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sentimen</label>
                  <select
                    value={editSentiment}
                    onChange={(e) => setEditSentiment(e.target.value as Sentiment)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Positif">POSITIF</option>
                    <option value="Netral">NETRAL</option>
                    <option value="Negatif">NEGATIF</option>
                  </select>
                </div>

                {/* Publish Date */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tanggal Publikasi (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    value={editPublishDate}
                    onChange={(e) => setEditPublishDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Publish Time */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Jam Publikasi (HH:MM)</label>
                  <input
                    type="text"
                    value={editPublishTime}
                    onChange={(e) => setEditPublishTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="12:00"
                  />
                </div>
              </div>

              {/* Link Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">URL Link Sumber</label>
                <input
                  type="text"
                  value={editLink}
                  onChange={(e) => setEditLink(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="https://example.com/..."
                />
              </div>

              {/* Cover Image URL */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">URL Gambar Cover</label>
                <input
                  type="text"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'Draft' | 'Published')}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="Published">Published (Tampil di Portal)</option>
                  <option value="Draft">Draft (Hanya di Dashboard Admin)</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 md:p-5 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingNewsItem(null)}
                className="px-4 py-2 text-xs font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-5 py-2 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition cursor-pointer shadow-lg shadow-blue-500/10 flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSavingEdit ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Perubahan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF CONFIRMATION & FILTER TIP DIALOG */}
      <AnimatePresence>
        {showPdfConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/40"
              onClick={() => setShowPdfConfirm(false)}
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-[420px] bg-white dark:bg-[#121118] rounded-3xl border border-slate-105 dark:border-white/5 shadow-2xl overflow-hidden z-10"
            >
              <div className="h-1.5 bg-gradient-to-r from-rose-500 to-rose-600" />
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 pb-3 border-b border-slate-100 dark:border-white/5">
                  <div className="p-1.5 bg-rose-50 dark:bg-rose-950/30 rounded-lg text-rose-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white">Unduh Laporan Berita PDF</h3>
                </div>
                
                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-150/40 dark:border-blue-900/30 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-black text-xs uppercase tracking-wider">
                    <span>💡 Tips: Ubah Filter Dahulu</span>
                  </div>
                  <p className="text-[11px] md:text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans font-medium">
                    Sebaiknya Anda mengubah filter dahulu sebelum mengunduh PDF agar hasil analisis lebih fokus, spesifik, dan relevan dengan topik yang dipantau.
                  </p>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    onClick={() => {
                      setShowPdfConfirm(false);
                      setShowMobileFilters(true);
                      setTimeout(() => {
                        const inputEl = document.getElementById('portal-search-icon');
                        if (inputEl) {
                          inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }, 150);
                      showToast('Silakan ubah filter saringan di atas.', 'info');
                    }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#181622] dark:hover:bg-slate-800/80 text-slate-650 dark:text-slate-350 rounded-xl text-xs font-bold transition cursor-pointer text-center"
                  >
                    Ubah Filter Dahulu
                  </button>
                  <button
                    onClick={() => {
                      setShowPdfConfirm(false);
                      generatePDFReport();
                    }}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-rose-600/20 dark:shadow-none transition cursor-pointer text-center"
                  >
                    Lanjutkan Unduh
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Off-screen Map Container to facilitate Leaflet loading and HTML2Canvas high-fidelity PDF Snapshot exporting */}
      <div 
        id="portal-offscreen-map-container"
        style={{ 
          position: 'fixed', 
          left: '-3000px', 
          top: '0px', 
          width: '1024px', 
          height: '626px',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          zIndex: -9999,
          pointerEvents: 'none'
        }}
      >
        <div style={{ width: '1024px', height: '626px' }}>
          <OSMMap 
            selectedProvince={selectedProvinceMap}
            setSelectedProvince={setSelectedProvinceMap}
            provinceStats={provinceStatsForMap}
            filteredNews={sortedNews}
            isDetailOpen={false}
          />
        </div>
      </div>
    </div>
  );
};
