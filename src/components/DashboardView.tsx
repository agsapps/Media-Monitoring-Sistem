import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppState } from '../AppContext';
import { generatePDFReport } from '../utils/pdfReportGenerator';
import { OSMMap, normalizeProvinceName } from './OSMMap';
import { safeHtml2Canvas } from '../utils/safeHtml2Canvas';
import { DateRangeSlider } from './DateRangeSlider';
import { HeatmapWidget } from './HeatmapWidget';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  RefreshCw, FileSpreadsheet, MapPin, ChevronLeft, ChevronRight,
  Search, SlidersHorizontal, X, Filter,
  TrendingUp, TrendingDown, Info, Activity, CheckCircle2, AlertTriangle,
  Sparkles, ChevronDown, ChevronUp, Zap, Copy, Calendar, Newspaper,
  Smile, Frown, Meh, ArrowUp, ArrowDown, Download, FileText, Twitter, MessageSquare
} from 'lucide-react';

// Global timezone-independent date parser cache to eliminate millions of redundant Date instantiations
const parsedUTCDateCache: Record<string, Date> = {};

export const DashboardView: React.FC = () => {
  const { user, authFetch, loadStats, showToast, news: rawNews, loadNews, selectedProvince, setSelectedProvince, settings, highlights, isCrawlSyncing, triggerAutoSync, setTab, socialNews, loadSocialNews, setPortalLocationFilter, setSocialLocationFilter } = useAppState();

  const mappedSocialNews = React.useMemo(() => {
    if (!socialNews || socialNews.length === 0) return [];
    return socialNews.map(item => {
      // extract date timezone-safely
      let pDate = '2026-06-25';
      let pTime = '12:00';
      const dateSource = item.waktuPosting || item.tanggalInput;
      if (dateSource) {
        if (typeof dateSource === 'string' && dateSource.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(dateSource)) {
          pDate = dateSource.substring(0, 10);
          if (dateSource.length >= 16) {
            const timePart = dateSource.substring(11, 16);
            if (/^\d{2}:\d{2}/.test(timePart)) {
              pTime = timePart;
            }
          }
        } else {
          try {
            const d = new Date(dateSource);
            if (!isNaN(d.getTime())) {
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              pDate = `${yyyy}-${mm}-${dd}`;
              
              const hh = String(d.getHours()).padStart(2, '0');
              const min = String(d.getMinutes()).padStart(2, '0');
              pTime = `${hh}:${min}`;
            }
          } catch (e) {
            // ignore error
          }
        }
      }
      
      return {
        id: `social-${item.id}`,
        title: item.caption ? (item.caption.length > 100 ? item.caption.substring(0, 100) + '...' : item.caption) : (item.ringkasan || 'Postingan Media Sosial'),
        subheader: `@${item.username || 'user'} via ${item.jenisSosmed || 'Sosmed'}`,
        content: item.caption || '',
        publishDate: pDate,
        publishTime: pTime,
        mediaName: item.jenisSosmed || 'Sosial Media',
        sentiment: item.sentimen || 'Netral',
        categoryName: item.kategori || 'Sektor Lain',
        location: item.lokasi || 'Nasional',
        status: 'Published',
        link: item.link || '',
        referenceSource: item.jenisSosmed || 'Sosmed',
        isSocialMedia: true
      };
    });
  }, [socialNews]);

  const [analitikType, setAnalitikType] = useState<'berita' | 'sosmed'>('berita');

  const news = React.useMemo(() => {
    return analitikType === 'berita' ? rawNews : mappedSocialNews;
  }, [analitikType, rawNews, mappedSocialNews]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('dashboard_auto_refresh_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const saved = localStorage.getItem('dashboard_refresh_interval');
    return saved !== null ? parseInt(saved, 10) : 5;
  });
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const savedInt = localStorage.getItem('dashboard_refresh_interval');
    const interval = savedInt !== null ? parseInt(savedInt, 10) : 5;
    return interval * 60;
  });



  const [activeTabDuration, setActiveTabDuration] = useState<'All' | 'Days' | 'Weeks' | 'Months' | 'Years'>('Days');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  const [selectedCalendarDates, setSelectedCalendarDates] = useState<string[]>([]);
  const [comparisonMode, setComparisonMode] = useState<'none' | 'mom' | 'yoy'>('none');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollCalendar = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 180;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const selectAllCalendarDates = () => {
    const allDays = dynamicCalendarDays.map(d => d.fullDate);
    setSelectedCalendarDates(allDays);
    if (allDays.length > 0) {
      setStartDateFilter(allDays[0]);
      setEndDateFilter(allDays[allDays.length - 1]);
      setSelectedDateFilter('Semua');
    }
    showToast('Seluruh tanggal kalender dipilih.', 'success');
  };

  const clearAllCalendarDates = () => {
    setSelectedCalendarDates([]);
    setIsMultiSelectMode(false);
    setStartDateFilter('');
    setEndDateFilter('');
    setSelectedDateFilter('Semua');
    showToast('Pilihan tanggal dikosongkan.', 'info');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    showToast('Memulai pencarian berita & analisis AI terbaru...', 'info');
    // Runs the background live search & crawls automatically
    await triggerAutoSync();
    setIsRefreshing(false);
    setSecondsLeft(refreshInterval * 60);
  };

  React.useEffect(() => {
    loadNews();
    loadStats();
    loadSocialNews();
  }, []);

  React.useEffect(() => {
    localStorage.setItem('dashboard_auto_refresh_enabled', String(autoRefreshEnabled));
    setSecondsLeft(refreshInterval * 60);
  }, [autoRefreshEnabled, refreshInterval]);

  React.useEffect(() => {
    localStorage.setItem('dashboard_refresh_interval', String(refreshInterval));
  }, [refreshInterval]);

  React.useEffect(() => {
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
  }, [autoRefreshEnabled]);

  React.useEffect(() => {
    if (secondsLeft === 0 && autoRefreshEnabled) {
      loadNews();
      loadStats();
      loadSocialNews();
      showToast('Data otomatis diperbarui.', 'info');
      setSecondsLeft(refreshInterval * 60);
    }
  }, [secondsLeft, autoRefreshEnabled, refreshInterval, loadNews, loadStats, loadSocialNews, showToast]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const [selectedSentimentFilter, setSelectedSentimentFilter] = useState<string>('Semua');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Semua');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('Semua');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [hasSetDefaultDate, setHasSetDefaultDate] = useState<boolean>(false);
  const [searchFilterQuery, setSearchFilterQuery] = useState<string>('');
  const [startHour, setStartHour] = useState<number>(0);
  const [endHour, setEndHour] = useState<number>(23);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeMobileDetailTab, setActiveMobileDetailTab] = useState<'sentiment' | 'provinces' | 'topics' | 'media'>('sentiment');
  const [isMapDetailPanelOpen, setIsMapDetailPanelOpen] = useState(true);
  const isDetailCompact = true;
  const [isLayoutOrderSwapped, setIsLayoutOrderSwapped] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Widget drag-and-drop state & helpers for stats widgets in "Rincian Statistik" panel
  const [widgetOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('dashboard_widget_order');
    let order = saved ? JSON.parse(saved) : ['sentiment', 'provinces', 'topics', 'media'];
    return order.filter((x: string) => x !== 'social_media');
  });

  // MAIN DASHBOARD SECTIONS DRAG-AND-DROP WORKFLOW
  const [dashboardSections, setDashboardSections] = useState<string[]>(() => {
    const saved = localStorage.getItem('dashboard_sections_order');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          let filtered = parsed.filter(item => item !== 'analytics' && item !== 'topicmap');
          if (!filtered.includes('heatmap')) {
            filtered.push('heatmap');
          }
          if (!filtered.includes('social')) {
            const chartsIdx = filtered.indexOf('charts');
            if (chartsIdx !== -1) {
              filtered.splice(chartsIdx + 1, 0, 'social');
            } else {
              filtered.push('social');
            }
          }
          return filtered;
        }
      } catch (e) {}
    }
    return ['metrics', 'charts', 'social', 'map', 'heatmap'];
  });
  const moveSection = (id: string, direction: 'up' | 'down') => {
    const idx = dashboardSections.indexOf(id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= dashboardSections.length) return;
    const newSections = [...dashboardSections];
    const [removed] = newSections.splice(idx, 1);
    newSections.splice(targetIdx, 0, removed);
    setDashboardSections(newSections);
    localStorage.setItem('dashboard_sections_order', JSON.stringify(newSections));
    
    let sectionName = 'Ringkasan Nilai';
    if (id === 'charts') sectionName = 'Tren & Frekuensi';
    if (id === 'map') sectionName = 'Peta Geospasial';
    if (id === 'analytics') sectionName = 'Word-Cloud & Media';
    if (id === 'heatmap') sectionName = 'Heatmap Isu';
    
    showToast(`Tata letak "${sectionName}" digeser ke ${direction === 'up' ? 'atas ▲' : 'bawah ▼'}`, 'success');
  };

  // INDIVIDUAL SENTIMENT METRIC CARDS ORDERING
  const [metricCardsOrder, setMetricCardsOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('dashboard_metrics_order2');
    return saved ? JSON.parse(saved) : ['total', 'positif', 'netral', 'negatif'];
  });

  const moveMetricCard = (id: string, direction: 'left' | 'right') => {
    const idx = metricCardsOrder.indexOf(id);
    if (idx === -1) return;
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= metricCardsOrder.length) return;
    const newOrder = [...metricCardsOrder];
    const [removed] = newOrder.splice(idx, 1);
    newOrder.splice(targetIdx, 0, removed);
    setMetricCardsOrder(newOrder);
    localStorage.setItem('dashboard_metrics_order2', JSON.stringify(newOrder));
    showToast(`Kartu sentimen digeser ke ${direction === 'left' ? 'kiri ◀' : 'kanan ▶'}`, 'success');
  };

  React.useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // AI Analyst state variables and report fetch handlers
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false);
  const [reportData, setReportData] = useState<string | null>(null);
  const [reportSource, setReportSource] = useState<string | null>(null);
  const [showAiReport, setShowAiReport] = useState<boolean>(false);

  const handleGenerateAiReport = async () => {
    setIsLoadingReport(true);
    setReportData(null);
    setReportSource(null);
    setShowAiReport(true);
    showToast('Memulai analisis...', 'info');

    try {
      const filterStatusHeadline = `Sentimen: ${selectedSentimentFilter}, Topik: ${selectedCategoryFilter}, Wilayah: ${selectedRegionFilter}, Waktu: ${startHour}:00 - ${endHour}:59, Pencarian: ${searchFilterQuery || 'None'}`;
      
      const response = await authFetch('/api/gemini/agent-report', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           filteredNews: filteredNews,
           filterStatusHeadline: filterStatusHeadline
         })
       });
 
       if (response.ok) {
         const data = await response.json();
         if (data.success) {
           setReportData(data.report);
           setReportSource(data.source || null);
           showToast('Analisis selesai!', 'success');
         } else {
           showToast('Gagal menyusun analisis.', 'error');
         }
       } else {
         showToast('Gagal menganalisis.', 'error');
       }
     } catch (e) {
       showToast('Koneksi terputus saat menghubungi AI.', 'error');
     } finally {
       setIsLoadingReport(false);
     }
   };



  const renderProcessedReport = (text: string) => {
    if (!text) return null;

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentTable: { headers: string[]; rows: string[][] } | null = null;
    let currentList: React.ReactNode[] = [];

    const flushList = (key: string) => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${key}`} className="space-y-2 my-2 pl-3 list-none">
            {currentList}
          </ul>
        );
        currentList = [];
      }
    };

    const flushTable = (key: string) => {
      if (currentTable) {
        const { headers, rows } = currentTable;
        elements.push(
          <div key={`table-${key}`} className="overflow-x-auto my-4 border border-slate-200/60 dark:border-white/5 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/60 dark:border-white/5">
                  {headers.map((h, i) => (
                    <th key={i} className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-slate-100 tracking-wider text-[11px] uppercase">
                      {parseInlineStyles(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/40 dark:hover:bg-white/[0.01] transition-colors">
                    {row.map((cell, i) => {
                      const cellText = cell.trim();
                      let bgClasses = 'px-3.5 py-2.5 text-slate-800 dark:text-slate-100 font-semibold';
                      if (['Positif', 'Rendah', 'Sesuai', 'Stabil', 'NORMAL', 'STABLE'].includes(cellText)) {
                        return (
                          <td key={i} className={`${bgClasses}`}>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                              {cellText}
                            </span>
                          </td>
                        );
                      } else if (['Negatif', 'Tinggi', 'Kritis', 'HIGH ATTENTION', 'CRITICAL ISSUE'].includes(cellText)) {
                        return (
                          <td key={i} className={`${bgClasses}`}>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/10">
                              {cellText}
                            </span>
                          </td>
                        );
                      } else if (['Netral', 'Sedang', 'Moderat'].includes(cellText)) {
                        return (
                          <td key={i} className={`${bgClasses}`}>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-800 dark:text-slate-200 border border-slate-500/10">
                              {cellText}
                            </span>
                          </td>
                        );
                      }

                      const isNum = !isNaN(Number(cellText.replace(/[^0-9.-]+/g, ''))) && cellText !== '';
                      return (
                        <td key={i} className={`${bgClasses} ${isNum ? 'font-mono font-bold text-slate-900 dark:text-white' : ''}`}>
                          {parseInlineStyles(cell)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        currentTable = null;
      }
    };

    const parseInlineStyles = (txt: string) => {
      const parts = txt.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index} className="font-bold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();

      if (trimmed === '---') {
        flushList(String(lineIdx));
        flushTable(String(lineIdx));
        elements.push(<hr key={lineIdx} className="my-5 border-slate-200/50 dark:border-white/5" />);
        return;
      }

      if (trimmed.startsWith('|')) {
        flushList(String(lineIdx));
        const cells = trimmed.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        const isSeparator = cells.every(c => c.startsWith('-'));
        if (isSeparator) {
          return;
        }

        if (!currentTable) {
          currentTable = { headers: cells, rows: [] };
        } else {
          currentTable.rows.push(cells);
        }
        return;
      } else {
        flushTable(String(lineIdx));
      }

      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const listContent = trimmed.substring(2);
        currentList.push(
          <li key={currentList.length} className="flex items-start gap-2 text-xs text-slate-800 dark:text-slate-100 leading-relaxed mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-700 mt-1.5 shrink-0" />
            <span>{parseInlineStyles(listContent)}</span>
          </li>
        );
        return;
      } else {
        flushList(String(lineIdx));
      }

      if (trimmed.startsWith('# ')) {
        const headerText = trimmed.substring(2);
        elements.push(
          <h2 key={lineIdx} className="text-sm font-bold uppercase text-blue-800 dark:text-blue-400 tracking-wider mb-2.5 mt-5 flex items-center gap-2 border-b border-blue-100 dark:border-white/5 pb-1">
            <span className="inline-block w-1 h-3.5 bg-blue-800 dark:bg-blue-700 rounded-sm" />
            {headerText}
          </h2>
        );
        return;
      }
      if (trimmed.startsWith('## ')) {
        const headerText = trimmed.substring(3);
        elements.push(
          <h3 key={lineIdx} className="text-xs font-bold uppercase text-slate-800 dark:text-white tracking-widest mb-2 mt-4">
            {headerText}
          </h3>
        );
        return;
      }
      if (trimmed.startsWith('### ')) {
        const headerText = trimmed.substring(4);
        elements.push(
          <h4 key={lineIdx} className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-2 mt-3 tracking-tight">
            {headerText}
          </h4>
        );
        return;
      }

      if (trimmed !== '') {
        elements.push(
          <p key={lineIdx} className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed mb-2 font-medium">
            {parseInlineStyles(trimmed)}
          </p>
        );
      }
    });

    flushList('final');
    flushTable('final');

    return elements;
  };


  // Dynamically compile categories and regions that exist in registered published News Items to populate the filters
  const uniqueCategories = React.useMemo(() => {
    const list = news.filter(n => n.status === 'Published').map(n => n.categoryName).filter(Boolean);
    return Array.from(new Set(list)).sort() as string[];
  }, [news]);

  const uniqueRegions = React.useMemo(() => {
    const list = news.filter(n => n.status === 'Published').map(n => n.location).filter(Boolean);
    return Array.from(new Set(list)).sort() as string[];
  }, [news]);

  const sortedTimelineDates = React.useMemo(() => {
    const list = news.filter(n => n.status === 'Published').map(n => n.publishDate).filter(Boolean);
    return Array.from(new Set(list)).sort() as string[];
  }, [news]);

  React.useEffect(() => {
    if (!hasSetDefaultDate) {
      const todayStr = new Date().toISOString().split('T')[0];
      setSelectedDateFilter(todayStr);
      setSelectedCalendarDate(todayStr);
      setSelectedCalendarDates([todayStr]);
      setHasSetDefaultDate(true);
    }
  }, [hasSetDefaultDate]);

  const formatIndonesianDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const day = parseInt(parts[2], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    return `${day} ${months[monthIndex]} ${year}`;
  };

  // Helper for timezone-independent date string comparisons
  const parseUTCDate = React.useCallback((dateStr: string) => {
    if (!dateStr) return new Date(NaN);
    const cached = parsedUTCDateCache[dateStr];
    if (cached) return cached;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date(NaN);
    const dateObj = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
    parsedUTCDateCache[dateStr] = dateObj;
    return dateObj;
  }, []);

  const formatUTCDate = (date: Date) => {
    if (isNaN(date.getTime())) return '';
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getDifferenceInDays = (d1Str: string, d2Str: string) => {
    const d1 = parseUTCDate(d1Str);
    const d2 = parseUTCDate(d2Str);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return NaN;
    const diffTime = d1.getTime() - d2.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredNews = React.useMemo(() => {
    return news.filter(n => {
      // Must be published news
      if (n.status !== 'Published') return false;

      // Filter by Sentiment
      if (selectedSentimentFilter !== 'Semua' && n.sentiment !== selectedSentimentFilter) {
        return false;
      }

      // Filter by Category Sektor
      if (selectedCategoryFilter !== 'Semua' && n.categoryName !== selectedCategoryFilter) {
        return false;
      }

      // Filter by Region
      if (selectedRegionFilter !== 'Semua' && n.location !== selectedRegionFilter) {
        return false;
      }

      // Filter by Date
      if (selectedDateFilter !== 'Semua' && n.publishDate !== selectedDateFilter) {
        return false;
      }

      // Filter by Start Date Range
      if (startDateFilter && n.publishDate < startDateFilter) {
        return false;
      }

      // Filter by End Date Range
      if (endDateFilter && n.publishDate > endDateFilter) {
        return false;
      }

      // Filter by Hour range (dari jam berapa ke jam berapa)
      const hour = n.publishTime ? parseInt(n.publishTime.split(':')[0], 10) : 12;
      if (!isNaN(hour)) {
        if (hour < startHour || hour > endHour) {
          return false;
        }
      }

      // Filter by Text Search
      if (searchFilterQuery.trim() !== '') {
        const query = searchFilterQuery.toLowerCase();
        const tMatch = (n.title || '').toLowerCase().includes(query);
        const sMatch = (n.subheader || '').toLowerCase().includes(query);
        const cMatch = (n.content || '').toLowerCase().includes(query);
        const rMatch = (n.referenceSource || '').toLowerCase().includes(query);
        if (!tMatch && !sMatch && !cMatch && !rMatch) {
          return false;
        }
      }

      return true;
    });
  }, [news, selectedSentimentFilter, selectedCategoryFilter, selectedRegionFilter, selectedDateFilter, startDateFilter, endDateFilter, searchFilterQuery, startHour, endHour]);

  const baseFilteredNewsWithoutDateFilters = React.useMemo(() => {
    return news.filter(n => {
      if (n.status !== 'Published') return false;

      if (selectedSentimentFilter !== 'Semua' && n.sentiment !== selectedSentimentFilter) {
        return false;
      }

      if (selectedCategoryFilter !== 'Semua' && n.categoryName !== selectedCategoryFilter) {
        return false;
      }

      if (selectedRegionFilter !== 'Semua' && n.location !== selectedRegionFilter) {
        return false;
      }

      const hour = n.publishTime ? parseInt(n.publishTime.split(':')[0], 10) : 12;
      if (!isNaN(hour)) {
        if (hour < startHour || hour > endHour) {
          return false;
        }
      }

      if (searchFilterQuery.trim() !== '') {
        const query = searchFilterQuery.toLowerCase();
        const tMatch = (n.title || '').toLowerCase().includes(query);
        const sMatch = (n.subheader || '').toLowerCase().includes(query);
        const cMatch = (n.content || '').toLowerCase().includes(query);
        const rMatch = (n.referenceSource || '').toLowerCase().includes(query);
        if (!tMatch && !sMatch && !cMatch && !rMatch) {
          return false;
        }
      }

      return true;
    });
  }, [news, selectedSentimentFilter, selectedCategoryFilter, selectedRegionFilter, searchFilterQuery, startHour, endHour]);

  const newsFilteredExceptRegion = React.useMemo(() => {
    return news.filter(n => {
      // Must be published news
      if (n.status !== 'Published') return false;

      // Filter by Sentiment
      if (selectedSentimentFilter !== 'Semua' && n.sentiment !== selectedSentimentFilter) {
        return false;
      }

      // Filter by Category Sektor
      if (selectedCategoryFilter !== 'Semua' && n.categoryName !== selectedCategoryFilter) {
        return false;
      }

      // Filter by Date
      if (selectedDateFilter !== 'Semua' && n.publishDate !== selectedDateFilter) {
        return false;
      }

      // Filter by Start Date Range
      if (startDateFilter && n.publishDate < startDateFilter) {
        return false;
      }

      // Filter by End Date Range
      if (endDateFilter && n.publishDate > endDateFilter) {
        return false;
      }

      // Filter by Hour range (dari jam berapa ke jam berapa)
      const hour = n.publishTime ? parseInt(n.publishTime.split(':')[0], 10) : 12;
      if (!isNaN(hour)) {
        if (hour < startHour || hour > endHour) {
          return false;
        }
      }

      // Filter by Text Search
      if (searchFilterQuery.trim() !== '') {
        const query = searchFilterQuery.toLowerCase();
        const tMatch = (n.title || '').toLowerCase().includes(query);
        const sMatch = (n.subheader || '').toLowerCase().includes(query);
        const cMatch = (n.content || '').toLowerCase().includes(query);
        const rMatch = (n.referenceSource || '').toLowerCase().includes(query);
        if (!tMatch && !sMatch && !cMatch && !rMatch) {
          return false;
        }
      }

      return true;
    });
  }, [news, selectedSentimentFilter, selectedCategoryFilter, selectedDateFilter, startDateFilter, endDateFilter, searchFilterQuery, startHour, endHour]);

  // Dynamic calendar date list generated based on today's date
  const dynamicCalendarDays = React.useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const maxDate = parseUTCDate(todayStr);
    
    // Generate 31 days back to accommodate full monthly range selection
    const daysArr = [];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    for (let i = 30; i >= 0; i--) {
      const d = new Date(maxDate);
      d.setUTCDate(maxDate.getUTCDate() - i);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      daysArr.push({
        num: dd,
        day: dayNames[d.getUTCDay()],
        month: monthNames[d.getUTCMonth()],
        fullDate: dateStr,
        rawDate: d
      });
    }
    return daysArr;
  }, [news]);

  React.useEffect(() => {
    if (scrollContainerRef.current && dynamicCalendarDays.length > 0) {
      const scrollContainer = scrollContainerRef.current;
      const handleScrollRight = () => {
        scrollContainer.scrollLeft = scrollContainer.scrollWidth;
      };
      handleScrollRight();
      const timeoutId = setTimeout(handleScrollRight, 150);
      const doubleTimeoutId = setTimeout(handleScrollRight, 450);
      return () => {
        clearTimeout(timeoutId);
        clearTimeout(doubleTimeoutId);
      };
    }
  }, [dynamicCalendarDays]);

  const activeCalendarDate = React.useMemo(() => {
    if (selectedCalendarDate) return selectedCalendarDate;
    if (dynamicCalendarDays.length > 0) {
      return dynamicCalendarDays[dynamicCalendarDays.length - 1].fullDate;
    }
    return '2026-05-31';
  }, [selectedCalendarDate, dynamicCalendarDays]);

  // Synchronize Global Filters (Slider / Inputs) -> Calendar Carousel selection
  React.useEffect(() => {
    if (activeTabDuration === 'All') return;

    if (startDateFilter && endDateFilter) {
      if (startDateFilter === endDateFilter) {
        if (isMultiSelectMode) {
          setIsMultiSelectMode(false);
        }
        if (selectedCalendarDate !== startDateFilter) {
          setSelectedCalendarDate(startDateFilter);
          setSelectedDateFilter(startDateFilter);
        }
        const needsUpdate = selectedCalendarDates.length !== 1 || selectedCalendarDates[0] !== startDateFilter;
        if (needsUpdate) {
          setSelectedCalendarDates([startDateFilter]);
        }
      } else {
        // Range selection
        if (!isMultiSelectMode) {
          setIsMultiSelectMode(true);
        }
        
        // Match only dynamic calendar days that fit the selected filter range
        const matchingDays = dynamicCalendarDays
          .filter(day => day.fullDate >= startDateFilter && day.fullDate <= endDateFilter)
          .map(day => day.fullDate);
          
        const currentSorted = [...selectedCalendarDates].sort();
        const expectedSorted = [...matchingDays].sort();
        const isSame = currentSorted.length === expectedSorted.length && currentSorted.every((v, i) => v === expectedSorted[i]);
        if (!isSame && matchingDays.length > 0) {
          setSelectedCalendarDates(matchingDays);
        }
      }
    }
  }, [startDateFilter, endDateFilter, dynamicCalendarDays, activeTabDuration]);

  // Filter news depending on selected activeTabDuration relative to selected calendar date
  const periodFilteredNews = React.useMemo(() => {
    if (activeTabDuration === 'All') {
      return filteredNews;
    }

    if (isMultiSelectMode) {
      if (selectedCalendarDates.length === 0) return [];
      
      if (activeTabDuration === 'Days') {
        const datesSet = new Set(selectedCalendarDates);
        return filteredNews.filter(n => n.publishDate && datesSet.has(n.publishDate));
      }

      const validPublishDates = new Set<string>();
      selectedCalendarDates.forEach(dateStr => {
        const anchor = parseUTCDate(dateStr);
        if (isNaN(anchor.getTime())) return;

        let numDays = 1;
        if (activeTabDuration === 'Weeks') numDays = 7;
        else if (activeTabDuration === 'Months') numDays = 30;
        else if (activeTabDuration === 'Years') numDays = 365;
        else return;

        for (let i = 0; i < numDays; i++) {
          const d = new Date(anchor);
          d.setUTCDate(anchor.getUTCDate() - i);
          const yyyy = d.getUTCFullYear();
          const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(d.getUTCDate()).padStart(2, '0');
          validPublishDates.add(`${yyyy}-${mm}-${dd}`);
        }
      });

      return filteredNews.filter(n => n.publishDate && validPublishDates.has(n.publishDate));
    }

    if (!activeCalendarDate) return filteredNews;

    return filteredNews.filter(n => {
      if (!n.publishDate) return false;
      const diffDays = getDifferenceInDays(activeCalendarDate, n.publishDate);
      if (isNaN(diffDays)) return false;

      if (activeTabDuration === 'Days') {
        return diffDays === 0;
      }
      if (activeTabDuration === 'Weeks') {
        return diffDays >= 0 && diffDays < 7;
      }
      if (activeTabDuration === 'Months') {
        return diffDays >= 0 && diffDays < 30; // 30-day window
      }
      if (activeTabDuration === 'Years') {
        return diffDays >= 0 && diffDays < 365; // 365-day window
      }
      return true;
    });
  }, [filteredNews, activeTabDuration, activeCalendarDate, isMultiSelectMode, selectedCalendarDates, parseUTCDate]);

  // Filter news for map depending on selected activeTabDuration relative to selected calendar date
  const periodFilteredNewsExceptRegion = React.useMemo(() => {
    if (activeTabDuration === 'All') {
      return newsFilteredExceptRegion;
    }

    if (isMultiSelectMode) {
      if (selectedCalendarDates.length === 0) return [];

      if (activeTabDuration === 'Days') {
        const datesSet = new Set(selectedCalendarDates);
        return newsFilteredExceptRegion.filter(n => n.publishDate && datesSet.has(n.publishDate));
      }

      const validPublishDates = new Set<string>();
      selectedCalendarDates.forEach(dateStr => {
        const anchor = parseUTCDate(dateStr);
        if (isNaN(anchor.getTime())) return;

        let numDays = 1;
        if (activeTabDuration === 'Weeks') numDays = 7;
        else if (activeTabDuration === 'Months') numDays = 30;
        else if (activeTabDuration === 'Years') numDays = 365;
        else return;

        for (let i = 0; i < numDays; i++) {
          const d = new Date(anchor);
          d.setUTCDate(anchor.getUTCDate() - i);
          const yyyy = d.getUTCFullYear();
          const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(d.getUTCDate()).padStart(2, '0');
          validPublishDates.add(`${yyyy}-${mm}-${dd}`);
        }
      });

      return newsFilteredExceptRegion.filter(n => n.publishDate && validPublishDates.has(n.publishDate));
    }

    if (!activeCalendarDate) return newsFilteredExceptRegion;

    return newsFilteredExceptRegion.filter(n => {
      if (!n.publishDate) return false;
      const diffDays = getDifferenceInDays(activeCalendarDate, n.publishDate);
      if (isNaN(diffDays)) return false;

      if (activeTabDuration === 'Days') {
        return diffDays === 0;
      }
      if (activeTabDuration === 'Weeks') {
        return diffDays >= 0 && diffDays < 7;
      }
      if (activeTabDuration === 'Months') {
        return diffDays >= 0 && diffDays < 30; // 30-day window
      }
      if (activeTabDuration === 'Years') {
        return diffDays >= 0 && diffDays < 365; // 365-day window
      }
      return true;
    });
  }, [newsFilteredExceptRegion, activeTabDuration, activeCalendarDate, isMultiSelectMode, selectedCalendarDates, parseUTCDate]);

  // Compile Dynamic Province Stats from registered News Items in the selected calendar period
  const provinceStats = React.useMemo(() => {
    const map: Record<string, { newsCount: number; mediaCount: number; positif: number; negatif: number; netral: number; criticalIssues: string[] }> = {};
    
    const seedProvinces = ['Nasional', 'DKI Jakarta', 'Jawa Barat', 'Jawa Timur', 'Sumatera Utara', 'Kalimantan Timur', 'Sulawesi Selatan', 'Papua'];
    seedProvinces.forEach(p => {
      map[p] = { newsCount: 0, mediaCount: 0, positif: 0, negatif: 0, netral: 0, criticalIssues: [] };
    });

    periodFilteredNewsExceptRegion.forEach(item => {
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
  }, [periodFilteredNewsExceptRegion]);

  // Compute period metrics
  const periodMetrics = React.useMemo(() => {
    let positive = 0;
    let negative = 0;
    let neutral = 0;
    const provinceCounts: Record<string, number> = {};
    const topicCounts: Record<string, number> = {};
    const mediaCounts: Record<string, number> = {};
    const socialMediaCounts: Record<string, number> = {};

    periodFilteredNews.forEach(item => {
      if (item.sentiment === 'Positif') positive++;
      else if (item.sentiment === 'Negatif') negative++;
      else if (item.sentiment === 'Netral') neutral++;

      const prov = item.location || 'Nasional';
      provinceCounts[prov] = (provinceCounts[prov] || 0) + 1;

      const cat = item.categoryName || 'Sektor Lain';
      topicCounts[cat] = (topicCounts[cat] || 0) + 1;

      const med = item.mediaName || 'Google News';
      const isSocial = !!item.isSocialMedia || 
                       med.toLowerCase().includes('twitter') || 
                       med.toLowerCase().includes('x.com') || 
                       med.toLowerCase().includes('facebook') ||
                       med.toLowerCase().includes('instagram') ||
                       med.toLowerCase().includes('tiktok') ||
                       med.toLowerCase().includes('youtube') ||
                       med.startsWith('X/') ||
                       (item.link && (item.link.toLowerCase().includes('x.com') || 
                                       item.link.toLowerCase().includes('twitter.com') || 
                                       item.link.toLowerCase().includes('facebook.com') || 
                                       item.link.toLowerCase().includes('instagram.com') || 
                                       item.link.toLowerCase().includes('tiktok.com') || 
                                       item.link.toLowerCase().includes('youtube.com')));

      if (isSocial) {
        socialMediaCounts[med] = (socialMediaCounts[med] || 0) + 1;
      } else {
        mediaCounts[med] = (mediaCounts[med] || 0) + 1;
      }
    });

    const total = periodFilteredNews.length;
    const getPct = (val: number) => total > 0 ? Math.round((val / total) * 100) : 0;

    const topProvincesList = Object.entries(provinceCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const topTopicsList = Object.entries(topicCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const topMediaList = Object.entries(mediaCounts)
      .map(([name, count]) => ({ 
        name, 
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
      }))
      .sort((a, b) => b.count - a.count);

    const topSocialMediaList = Object.entries(socialMediaCounts)
      .map(([name, count]) => ({ 
        name, 
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
      }))
      .sort((a, b) => b.count - a.count);

    return {
      total,
      positive,
      negative,
      neutral,
      positivePct: getPct(positive),
      negativePct: getPct(negative),
      neutralPct: getPct(neutral),
      topProvinces: topProvincesList,
      topTopics: topTopicsList,
      topMedia: topMediaList,
      topSocialMedia: topSocialMediaList
    };
  }, [periodFilteredNews]);

  // 100% Real Live Metrics fully synchronized across filters
  const displayedMetrics = periodMetrics;

  const socialMediaNewsItems = React.useMemo(() => {
    if (analitikType === 'sosmed') {
      return periodFilteredNews;
    }
    return periodFilteredNews.filter(item => {
      const med = (item.mediaName || '').toLowerCase();
      const link = (item.link || '').toLowerCase();
      return med.includes('twitter') || 
             med.includes('x.com') || 
             med.startsWith('x/') ||
             med.includes('sosial media') ||
             med.includes('sosmed') ||
             link.includes('x.com') || 
             link.includes('twitter.com');
    });
  }, [periodFilteredNews, analitikType]);

  // Dynamic graph timeline data based on actual store items and activeTabDuration
  const dynamicTimelineData = React.useMemo(() => {
    if (activeTabDuration === 'All') {
      const days = dynamicCalendarDays.map(day => {
        let prevDateStr = '';
        if (comparisonMode === 'mom') {
          const d = parseUTCDate(day.fullDate);
          if (!isNaN(d.getTime())) {
            d.setUTCMonth(d.getUTCMonth() - 1);
            prevDateStr = formatUTCDate(d);
          }
        } else if (comparisonMode === 'yoy') {
          const d = parseUTCDate(day.fullDate);
          if (!isNaN(d.getTime())) {
            d.setUTCFullYear(d.getUTCFullYear() - 1);
            prevDateStr = formatUTCDate(d);
          }
        }

        return {
          dateStr: day.fullDate,
          prevDateStr,
          label: `${day.num} ${day.month}`,
          volume: 0,
          positif: 0,
          negatif: 0,
          netral: 0,
          prevVolume: 0,
          prevPositif: 0,
          prevNegatif: 0,
          prevNetral: 0,
        };
      });

      const daysMap: Record<string, typeof days[0]> = {};
      days.forEach(d => {
        daysMap[d.dateStr] = d;
      });

      filteredNews.forEach(n => {
        if (n.publishDate) {
          const found = daysMap[n.publishDate];
          if (found) {
            found.volume += 1;
            if (n.sentiment === 'Positif') found.positif += 1;
            else if (n.sentiment === 'Negatif') found.negatif += 1;
            else found.netral += 1;
          }
        }
      });

      if (comparisonMode !== 'none') {
        const prevDaysMap: Record<string, typeof days[0]> = {};
        days.forEach(d => {
          if (d.prevDateStr) {
            prevDaysMap[d.prevDateStr] = d;
          }
        });

        baseFilteredNewsWithoutDateFilters.forEach(n => {
          if (n.publishDate) {
            const found = prevDaysMap[n.publishDate];
            if (found) {
              found.prevVolume += 1;
              if (n.sentiment === 'Positif') found.prevPositif += 1;
              else if (n.sentiment === 'Negatif') found.prevNegatif += 1;
              else found.prevNetral += 1;
            }
          }
        });
      }

      return days;
    }

    if (isMultiSelectMode && selectedCalendarDates.length > 1) {
      const sortedSelectedDates = [...selectedCalendarDates].sort((a, b) => a.localeCompare(b));
      const days = sortedSelectedDates.map(dateStr => {
        const parts = dateStr.split('-');
        let label = dateStr;
        if (parts.length === 3) {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
          const dayNum = parseInt(parts[2], 10);
          const monthIndex = parseInt(parts[1], 10) - 1;
          label = `${dayNum} ${months[monthIndex]}`;
        }

        let prevDateStr = '';
        if (comparisonMode === 'mom') {
          const d = parseUTCDate(dateStr);
          if (!isNaN(d.getTime())) {
            d.setUTCMonth(d.getUTCMonth() - 1);
            prevDateStr = formatUTCDate(d);
          }
        } else if (comparisonMode === 'yoy') {
          const d = parseUTCDate(dateStr);
          if (!isNaN(d.getTime())) {
            d.setUTCFullYear(d.getUTCFullYear() - 1);
            prevDateStr = formatUTCDate(d);
          }
        }

        return {
          dateStr,
          prevDateStr,
          label,
          volume: 0,
          positif: 0,
          negatif: 0,
          netral: 0,
          prevVolume: 0,
          prevPositif: 0,
          prevNegatif: 0,
          prevNetral: 0,
        };
      });

      const daysMap: Record<string, typeof days[0]> = {};
      days.forEach(d => {
        daysMap[d.dateStr] = d;
      });

      filteredNews.forEach(n => {
        if (n.publishDate) {
          const found = daysMap[n.publishDate];
          if (found) {
            found.volume += 1;
            if (n.sentiment === 'Positif') found.positif += 1;
            else if (n.sentiment === 'Negatif') found.negatif += 1;
            else found.netral += 1;
          }
        }
      });

      if (comparisonMode !== 'none') {
        const prevDaysMap: Record<string, typeof days[0]> = {};
        days.forEach(d => {
          if (d.prevDateStr) {
            prevDaysMap[d.prevDateStr] = d;
          }
        });

        baseFilteredNewsWithoutDateFilters.forEach(n => {
          if (n.publishDate) {
            const found = prevDaysMap[n.publishDate];
            if (found) {
              found.prevVolume += 1;
              if (n.sentiment === 'Positif') found.prevPositif += 1;
              else if (n.sentiment === 'Negatif') found.prevNegatif += 1;
              else found.prevNetral += 1;
            }
          }
        });
      }

      return days;
    }

    if (activeTabDuration === 'Days') {
      const hourBlocks = Array.from({ length: 24 }, (_, i) => ({
        label: `${String(i).padStart(2, '0')}:00`,
        start: i,
        end: i + 1,
        volume: 0,
        positif: 0,
        negatif: 0,
        netral: 0,
        prevVolume: 0,
        prevPositif: 0,
        prevNegatif: 0,
        prevNetral: 0,
      }));

      // Filter news for selected calendar date
      const daysNews = filteredNews.filter(n => n.publishDate === activeCalendarDate);

      daysNews.forEach(n => {
        let hour = 12; // default fallback
        if (n.publishTime) {
          const parts = n.publishTime.split(':');
          const parsedHour = parseInt(parts[0], 10);
          if (!isNaN(parsedHour)) hour = parsedHour;
        }
        
        if (hour >= 0 && hour < 24) {
          const targetBlock = hourBlocks[hour];
          targetBlock.volume += 1;
          if (n.sentiment === 'Positif') targetBlock.positif += 1;
          else if (n.sentiment === 'Negatif') targetBlock.negatif += 1;
          else targetBlock.netral += 1;
        }
      });

      // Comparative news
      if (comparisonMode !== 'none') {
        let prevDateStr = '';
        const d = parseUTCDate(activeCalendarDate);
        if (!isNaN(d.getTime())) {
          if (comparisonMode === 'mom') {
            d.setUTCMonth(d.getUTCMonth() - 1);
          } else {
            d.setUTCFullYear(d.getUTCFullYear() - 1);
          }
          prevDateStr = formatUTCDate(d);
        }

        if (prevDateStr) {
          const prevDaysNews = baseFilteredNewsWithoutDateFilters.filter(n => n.publishDate === prevDateStr);
          prevDaysNews.forEach(n => {
            let hour = 12; // default fallback
            if (n.publishTime) {
              const parts = n.publishTime.split(':');
              const parsedHour = parseInt(parts[0], 10);
              if (!isNaN(parsedHour)) hour = parsedHour;
            }
            
            if (hour >= 0 && hour < 24) {
              const targetBlock = hourBlocks[hour];
              targetBlock.prevVolume += 1;
              if (n.sentiment === 'Positif') targetBlock.prevPositif += 1;
              else if (n.sentiment === 'Negatif') targetBlock.prevNegatif += 1;
              else targetBlock.prevNetral += 1;
            }
          });
        }
      }

      return hourBlocks.map(b => ({
        label: b.label,
        volume: b.volume,
        positif: b.positif,
        negatif: b.negatif,
        netral: b.netral,
        prevVolume: b.prevVolume,
        prevPositif: b.prevPositif,
        prevNegatif: b.prevNegatif,
        prevNetral: b.prevNetral,
      }));
    }

    if (activeTabDuration === 'Weeks') {
      const anchor = parseUTCDate(activeCalendarDate);
      const days = [];
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date(anchor);
        d.setUTCDate(anchor.getUTCDate() - i);
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        let prevDateStr = '';
        if (comparisonMode === 'mom') {
          const pd = new Date(d);
          pd.setUTCMonth(d.getUTCMonth() - 1);
          prevDateStr = formatUTCDate(pd);
        } else if (comparisonMode === 'yoy') {
          const pd = new Date(d);
          pd.setUTCFullYear(d.getUTCFullYear() - 1);
          prevDateStr = formatUTCDate(pd);
        }

        days.push({
          dateStr,
          prevDateStr,
          label: `${dayNames[d.getUTCDay()]} (${dd})`,
          volume: 0,
          positif: 0,
          negatif: 0,
          netral: 0,
          prevVolume: 0,
          prevPositif: 0,
          prevNegatif: 0,
          prevNetral: 0,
        });
      }

      const daysMap: Record<string, typeof days[0]> = {};
      days.forEach(d => {
        daysMap[d.dateStr] = d;
      });

      filteredNews.forEach(n => {
        if (n.publishDate) {
          const found = daysMap[n.publishDate];
          if (found) {
            found.volume += 1;
            if (n.sentiment === 'Positif') found.positif += 1;
            else if (n.sentiment === 'Negatif') found.negatif += 1;
            else found.netral += 1;
          }
        }
      });

      if (comparisonMode !== 'none') {
        const prevDaysMap: Record<string, typeof days[0]> = {};
        days.forEach(d => {
          if (d.prevDateStr) {
            prevDaysMap[d.prevDateStr] = d;
          }
        });

        baseFilteredNewsWithoutDateFilters.forEach(n => {
          if (n.publishDate) {
            const found = prevDaysMap[n.publishDate];
            if (found) {
              found.prevVolume += 1;
              if (n.sentiment === 'Positif') found.prevPositif += 1;
              else if (n.sentiment === 'Negatif') found.prevNegatif += 1;
              else found.prevNetral += 1;
            }
          }
        });
      }

      return days.map(d => ({
        label: d.label,
        volume: d.volume,
        positif: d.positif,
        negatif: d.negatif,
        netral: d.netral,
        prevVolume: d.prevVolume,
        prevPositif: d.prevPositif,
        prevNegatif: d.prevNegatif,
        prevNetral: d.prevNetral,
      }));
    }

    if (activeTabDuration === 'Months') {
      const anchor = parseUTCDate(activeCalendarDate);
      const year = anchor.getUTCFullYear();
      const month = anchor.getUTCMonth();

      const weeks = [
        { label: 'W1 (1-7)', start: 1, end: 7, volume: 0, positif: 0, negatif: 0, netral: 0, prevVolume: 0, prevPositif: 0, prevNegatif: 0, prevNetral: 0 },
        { label: 'W2 (8-14)', start: 8, end: 14, volume: 0, positif: 0, negatif: 0, netral: 0, prevVolume: 0, prevPositif: 0, prevNegatif: 0, prevNetral: 0 },
        { label: 'W3 (15-21)', start: 15, end: 21, volume: 0, positif: 0, negatif: 0, netral: 0, prevVolume: 0, prevPositif: 0, prevNegatif: 0, prevNetral: 0 },
        { label: 'W4 (22+)', start: 22, end: 31, volume: 0, positif: 0, negatif: 0, netral: 0, prevVolume: 0, prevPositif: 0, prevNegatif: 0, prevNetral: 0 },
      ];

      filteredNews.forEach(n => {
        const pubDate = parseUTCDate(n.publishDate);
        if (!isNaN(pubDate.getTime()) && pubDate.getUTCFullYear() === year && pubDate.getUTCMonth() === month) {
          const dateNum = pubDate.getUTCDate();
          const wk = weeks.find(w => dateNum >= w.start && dateNum <= w.end);
          if (wk) {
            wk.volume += 1;
            if (n.sentiment === 'Positif') wk.positif += 1;
            else if (n.sentiment === 'Negatif') wk.negatif += 1;
            else wk.netral += 1;
          }
        }
      });

      if (comparisonMode !== 'none') {
        let prevYear = year;
        let prevMonth = month;
        if (comparisonMode === 'mom') {
          prevMonth--;
          if (prevMonth < 0) {
            prevMonth = 11;
            prevYear--;
          }
        } else {
          prevYear--;
        }

        baseFilteredNewsWithoutDateFilters.forEach(n => {
          const pubDate = parseUTCDate(n.publishDate);
          if (!isNaN(pubDate.getTime()) && pubDate.getUTCFullYear() === prevYear && pubDate.getUTCMonth() === prevMonth) {
            const dateNum = pubDate.getUTCDate();
            const wk = weeks.find(w => dateNum >= w.start && dateNum <= w.end);
            if (wk) {
              wk.prevVolume += 1;
              if (n.sentiment === 'Positif') wk.prevPositif += 1;
              else if (n.sentiment === 'Negatif') wk.prevNegatif += 1;
              else wk.prevNetral += 1;
            }
          }
        });
      }

      return weeks.map(w => ({
        label: w.label,
        volume: w.volume,
        positif: w.positif,
        negatif: w.negatif,
        netral: w.netral,
        prevVolume: w.prevVolume,
        prevPositif: w.prevPositif,
        prevNegatif: w.prevNegatif,
        prevNetral: w.prevNetral,
      }));
    }

    // Years duration: group by actual months of the active calendar year
    const anchor = parseUTCDate(activeCalendarDate);
    const year = anchor.getUTCFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const monthList = months.map((m, idx) => ({
      monthIdx: idx,
      label: m,
      volume: 0,
      positif: 0,
      negatif: 0,
      netral: 0,
      prevVolume: 0,
      prevPositif: 0,
      prevNegatif: 0,
      prevNetral: 0,
    }));

    filteredNews.forEach(n => {
      const pubDate = parseUTCDate(n.publishDate);
      if (!isNaN(pubDate.getTime()) && pubDate.getUTCFullYear() === year) {
        const monthIdx = pubDate.getUTCMonth();
        const ml = monthList[monthIdx];
        if (ml) {
          ml.volume += 1;
          if (n.sentiment === 'Positif') ml.positif += 1;
          else if (n.sentiment === 'Negatif') ml.negatif += 1;
          else ml.netral += 1;
        }
      }
    });

    if (comparisonMode !== 'none') {
      let prevYear = year;
      if (comparisonMode === 'mom') {
        const newsByYearMonth: Record<number, typeof filteredNews> = {};
        baseFilteredNewsWithoutDateFilters.forEach(n => {
          const pubDate = parseUTCDate(n.publishDate);
          if (!isNaN(pubDate.getTime())) {
            const key = pubDate.getUTCFullYear() * 100 + pubDate.getUTCMonth();
            if (!newsByYearMonth[key]) newsByYearMonth[key] = [];
            newsByYearMonth[key].push(n);
          }
        });

        monthList.forEach(ml => {
          const mIdx = ml.monthIdx;
          const targetMonth = mIdx === 0 ? 11 : mIdx - 1;
          const targetYear = mIdx === 0 ? year - 1 : year;
          const key = targetYear * 100 + targetMonth;
          
          const matchingNews = newsByYearMonth[key];
          if (matchingNews) {
            matchingNews.forEach(n => {
              ml.prevVolume += 1;
              if (n.sentiment === 'Positif') ml.prevPositif += 1;
              else if (n.sentiment === 'Negatif') ml.prevNegatif += 1;
              else ml.prevNetral += 1;
            });
          }
        });
      } else {
        prevYear = year - 1;
        baseFilteredNewsWithoutDateFilters.forEach(n => {
          const pubDate = parseUTCDate(n.publishDate);
          if (!isNaN(pubDate.getTime()) && pubDate.getUTCFullYear() === prevYear) {
            const monthIdx = pubDate.getUTCMonth();
            const ml = monthList[monthIdx];
            if (ml) {
              ml.prevVolume += 1;
              if (n.sentiment === 'Positif') ml.prevPositif += 1;
              else if (n.sentiment === 'Negatif') ml.prevNegatif += 1;
              else ml.prevNetral += 1;
            }
          }
        });
      }
    }

    return monthList.map(m => ({
      label: m.label,
      volume: m.volume,
      positif: m.positif,
      negatif: m.negatif,
      netral: m.netral,
      prevVolume: m.prevVolume,
      prevPositif: m.prevPositif,
      prevNegatif: m.prevNegatif,
      prevNetral: m.prevNetral,
    }));
  }, [activeCalendarDate, activeTabDuration, filteredNews, isMultiSelectMode, selectedCalendarDates, comparisonMode, baseFilteredNewsWithoutDateFilters]);

  const exportToCSV = () => {
    if (user?.role === 'Viewer') {
      showToast('Role Anda (Viewer) tidak diizinkan untuk mengekspor data.', 'error');
      return;
    }
    try {
      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += 'STATISTIK PERIODE,PERSENTASE,JUMLAH\n';
      csvContent += `Positif,${displayedMetrics.positivePct}%,${displayedMetrics.positive}\n`;
      csvContent += `Negatif,${displayedMetrics.negativePct}%,${displayedMetrics.negative}\n`;
      csvContent += `Netral,${displayedMetrics.neutralPct}%,${displayedMetrics.neutral}\n\n`;

      csvContent += 'PROVINSI,JUMLAH\n';
      displayedMetrics.topProvinces.forEach(p => {
        csvContent += `"${p.name}",${p.count}\n`;
      });
      csvContent += '\n';

      csvContent += 'TOPIK,JUMLAH SINYAL\n';
      displayedMetrics.topTopics.forEach(t => {
        csvContent += `"${t.name}",${t.count}\n`;
      });
      csvContent += '\n';

      csvContent += 'SUMBER MEDIA UTAMA,PERSENTASE,JUMLAH\n';
      if (displayedMetrics.topMedia) {
        displayedMetrics.topMedia.forEach(m => {
          csvContent += `"${m.name}",${m.percentage}%,${m.count}\n`;
        });
      }
      csvContent += '\n';

      csvContent += 'SUMBER MEDIA SOSIAL,PERSENTASE,JUMLAH\n';
      if ((displayedMetrics as any).topSocialMedia) {
        (displayedMetrics as any).topSocialMedia.forEach((m: any) => {
          csvContent += `"${m.name}",${m.percentage}%,${m.count}\n`;
        });
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Media_Intel_Report_${activeTabDuration}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Laporan statistik diekspor ke CSV.', 'success');
    } catch (e) {
      showToast('Gagal memproses ekspor data.', 'error');
    }
  };

  const handleExportCSV = () => {
    try {
      let csvContent = '\uFEFF'; // UTF-8 BOM untuk MS Excel compatibility
      csvContent += 'RINGKASAN MONITORING MEDIA\n';
      csvContent += `Tanggal Cetak,${new Date().toLocaleString('id-ID')}\n`;
      csvContent += `Rentang Waktu,${activeTabDuration}\n`;
      csvContent += `Total Berita,${displayedMetrics.total}\n`;
      csvContent += `Positif,${displayedMetrics.positive} (${displayedMetrics.positivePct}%)\n`;
      csvContent += `Netral,${displayedMetrics.neutral} (${displayedMetrics.neutralPct}%)\n`;
      csvContent += `Negatif,${displayedMetrics.negative} (${displayedMetrics.negativePct}%)\n\n`;

      csvContent += 'DAFTAR BERITA MONITORING\n';
      csvContent += 'ID,Judul,Ringkasan,Media,Kategori,Sentimen,Lokasi,Tautan,Tanggal Rilis\n';
      
      periodFilteredNews.forEach((item) => {
        const cleanTitle = (item.title || '').replace(/"/g, '""');
        const cleanSummary = (item.summary || '').replace(/"/g, '""');
        const cleanMedia = (item.mediaName || '').replace(/"/g, '""');
        const cleanCategory = (item.categoryName || '').replace(/"/g, '""');
        const cleanLocation = (item.location || 'Nasional').replace(/"/g, '""');
        const cleanLink = (item.link || '').replace(/"/g, '""');
        
        csvContent += `"${item.id}","${cleanTitle}","${cleanSummary}","${cleanMedia}","${cleanCategory}","${item.sentiment}","${cleanLocation}","${cleanLink}","${item.publishDate}"\n`;
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Laporan_Monitoring_Media_${activeTabDuration}_${formatUTCDate(new Date())}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Laporan monitoring berhasil diunduh dalam format CSV', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal mengunduh laporan CSV.', 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      showToast('Sedang mempersiapkan Laporan PDF...', 'info');

      // 1. Generate stats payload
      const total = displayedMetrics.total;
      const positive = displayedMetrics.positive;
      const neutral = displayedMetrics.neutral;
      const negative = displayedMetrics.negative;

      let riskLevel = 'RENDAH';
      if (negative > total * 0.4) {
        riskLevel = 'TINGGI (AWAS)';
      } else if (negative > total * 0.15) {
        riskLevel = 'SEDANG (WASPADA)';
      }

      const statsPayload = {
        total,
        positif: positive,
        netral: neutral,
        negatif: negative,
        topTopic: displayedMetrics.topTopics[0]?.name || 'Umum',
        topRegion: displayedMetrics.topProvinces[0]?.name || 'Nasional',
        riskLevel
      };

      // 2. Compile province statistics for page appendix map breakdown
      const provinceStats: Record<string, { newsCount: number; positif: number; netral: number; negatif: number }> = {};
      periodFilteredNews.forEach((item) => {
        const prov = item.location || 'Nasional';
        if (!provinceStats[prov]) {
          provinceStats[prov] = { newsCount: 0, positif: 0, netral: 0, negatif: 0 };
        }
        provinceStats[prov].newsCount += 1;
        if (item.sentiment === 'Positif') provinceStats[prov].positif += 1;
        else if (item.sentiment === 'Netral') provinceStats[prov].netral += 1;
        else if (item.sentiment === 'Negatif') provinceStats[prov].negatif += 1;
      });

      // 3. Date range string
      let dateRangeLabel = 'Semua Periode';
      if (startDateFilter && endDateFilter) {
        dateRangeLabel = `${startDateFilter} s/d ${endDateFilter}`;
      } else if (selectedCalendarDates.length > 0) {
        dateRangeLabel = selectedCalendarDates.join(', ');
      }

      // 4. Custom narrative
      const customNarrative = `Berdasarkan pantauan intelijen media pada periode ${dateRangeLabel}, fluktuasi sentimen opini publik menunjukkan stabilitas relatif tinggi. Potensi kerawanan sosial berhasil dinetralisir melalui intervensi kehumasan kolaboratif dengan total ${total} sebaran isu terpantau.`;

      // 5. Capture map snapshot if container is present on screen
      const mapElement = document.getElementById('osm-map-container');
      let mapSnapshotBase64: string | undefined = undefined;
      
      if (mapElement) {
        try {
          const canvas = await safeHtml2Canvas(mapElement, {
            useCORS: true,
            allowTaint: true,
            logging: false,
            scale: 1.5
          });
          mapSnapshotBase64 = canvas.toDataURL('image/jpeg', 0.85);
        } catch (mapErr) {
          console.error('[PDF Snapshot Capture Warn]:', mapErr);
        }
      }

      // 6. Fire trigger to PDF utility
      generatePDFReport(
        'LAPORAN PEMANTAUAN MEDIA SEKETIKA',
        'Custom',
        dateRangeLabel,
        customNarrative,
        statsPayload,
        mapSnapshotBase64,
        provinceStats,
        highlights, // standard highlights
        periodFilteredNews
      );

      showToast('Berkas PDF Berhasil Diunduh!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal merakit file PDF.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* BRAND HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/50 dark:border-white/5 pb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight font-display text-slate-900 dark:text-white flex items-center gap-1.5 uppercase">
            <span className="text-blue-700 dark:text-blue-400">●</span>
            <span>Analitik Intelijen Media</span>
          </h2>
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
            Sistem Pemantauan isu, sentimen publik, topik, dan sebaran wilayah nasional.
          </p>


        </div>
        
        {/* Core Quick Controls: Refresh & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Auto-Refresh Toggle Controller */}
          <div className="flex items-center gap-2 bg-slate-105 hover:bg-slate-200/60 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/40 dark:border-white/5 rounded-xl px-2.5 py-1.5 transition">
            <button
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className="flex items-center gap-1.5 text-[11px] font-extrabold cursor-pointer select-none text-slate-700 dark:text-slate-200"
              title={autoRefreshEnabled ? "Matikan Auto-Refresh" : "Aktifkan Auto-Refresh"}
            >
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${autoRefreshEnabled ? 'bg-emerald-500 animate-pulse ring-2 ring-emerald-500/30' : 'bg-slate-400'}`} />
              <span className="font-sans font-bold">{autoRefreshEnabled ? `Auto refresh (${formatCountdown(secondsLeft)})` : 'Auto refresh Off'}</span>
            </button>
            <span className="text-slate-300 dark:text-white/10 text-[9px] select-none">|</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-transparent border-none text-[11px] font-black text-violet-605 dark:text-blue-400 focus:ring-0 p-0 pr-4 cursor-pointer outline-none font-sans"
              title="Set Interval Penyegaran"
            >
              <option value={1} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">1 mnt</option>
              <option value={5} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">5 mnt</option>
              <option value={15} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">15 mnt</option>
              <option value={30} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">30 mnt</option>
            </select>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isCrawlSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-105 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl text-[11px] font-bold transition disabled:opacity-50 cursor-pointer border border-slate-200/40 dark:border-white/5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isCrawlSyncing ? 'animate-spin' : ''}`} />
            <span>{isCrawlSyncing ? 'Menyinkronkan...' : 'Perbarui Data'}</span>
          </button>
          
          {user?.role !== 'Viewer' ? (
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-[11px] font-bold shadow-lg shadow-blue-700/10 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Ekspor Statistik</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/15 border border-rose-100 dark:border-rose-900/10 px-2.5 py-1.5 rounded-xl">
              Cetak Statistik Terbatas (Viewer)
            </div>
          )}
        </div>
      </div>

      {/* TABS FOR DEDICATED NEWS & SOSMED ANALYTICS */}
      <div className="flex bg-slate-100 dark:bg-[#1a1824] p-1.5 rounded-2xl border border-slate-200/40 dark:border-white/5 w-full max-w-lg">
        <button
          id="tab-analitik-berita"
          onClick={() => setAnalitikType('berita')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
            analitikType === 'berita'
              ? 'bg-white dark:bg-[#252236] text-blue-800 dark:text-blue-400 shadow-md shadow-slate-900/5'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Newspaper className="w-4 h-4" />
          <span>Analitik Khusus Berita</span>
        </button>
        <button
          id="tab-analitik-sosmed"
          onClick={() => setAnalitikType('sosmed')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
            analitikType === 'sosmed'
              ? 'bg-white dark:bg-[#252236] text-blue-800 dark:text-blue-400 shadow-md shadow-slate-900/5'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Analitik Khusus Sosmed</span>
        </button>
      </div>



      {/* PROFESSIONAL ANALYTICS FILTER PANEL */}
      {(() => {
        const activeFiltersCount = 
          (selectedSentimentFilter !== 'Semua' ? 1 : 0) +
          (selectedCategoryFilter !== 'Semua' ? 1 : 0) +
          (selectedRegionFilter !== 'Semua' ? 1 : 0) +
          (selectedDateFilter !== 'Semua' ? 1 : 0) +
          (searchFilterQuery.trim() !== '' ? 1 : 0) +
          ((startHour !== 0 || endHour !== 23) ? 1 : 0);

        return (
          <div className="bg-white dark:bg-[#121118] border border-slate-200/50 dark:border-white/5 rounded-[20px] p-4 md:p-5 shadow-xl space-y-4 animate-in fade-in duration-305">
            
            {/* Main Search and Toggler Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="h-9 w-9 rounded-xl bg-blue-700/10 dark:bg-blue-700/20 flex items-center justify-center text-blue-800 dark:text-blue-400">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Filter Analitik</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium font-sans">Sektor, Sentimen, Wilayah & Rentang Waktu</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col sm:flex-row gap-3">
                {/* Main Keywords Input */}
                <div className="flex-1 relative flex items-center">
                  <div className="absolute left-3 text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari isu / kata kunci..."
                    value={searchFilterQuery}
                    onChange={(e) => setSearchFilterQuery(e.target.value)}
                    className="w-full text-xs pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-[#1c1a24] border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-[#1e3a8a] transition"
                  />
                  {searchFilterQuery && (
                    <button
                      onClick={() => setSearchFilterQuery('')}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 h-5 w-5 flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Advanced Filters Button Toggler */}
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                    showAdvancedFilters || activeFiltersCount > 0
                      ? 'bg-blue-700/10 border-blue-700/40 text-blue-800 dark:text-blue-400'
                      : 'bg-white dark:bg-[#1c1a24] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/5'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span>Filter Lanjutan</span>
                  {activeFiltersCount > 0 ? (
                    <span className="flex items-center justify-center w-5 h-5 bg-blue-800 text-white font-bold rounded-full text-[10px] ml-1">
                      {activeFiltersCount}
                    </span>
                  ) : (
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ml-1 ${showAdvancedFilters ? 'rotate-90' : 'rotate-0'}`} />
                  )}
                </button>
              </div>
            </div>

            {/* Collapsible Panel via AnimatePresence */}
            <AnimatePresence initial={false}>
              {showAdvancedFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3.5 p-4 bg-slate-50/50 dark:bg-[#1c1a24]/30 rounded-2xl border border-slate-100/75 dark:border-white/5">
                    {/* 1. Sentiment Selector */}
                    <div>
                      <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Sentimen Berita</label>
                      <select
                        value={selectedSentimentFilter}
                        onChange={(e) => {
                          setSelectedSentimentFilter(e.target.value);
                          showToast(`Filter sentimen diset ke: ${e.target.value}`, 'success');
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-[#1c1a24] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700/20 transition cursor-pointer shadow-xs"
                      >
                        <option value="Semua">Semua Sentimen</option>
                        <option value="Positif">Positif</option>
                        <option value="Negatif">Negatif</option>
                        <option value="Netral">Netral</option>
                      </select>
                    </div>

                    {/* 2. Category Selector */}
                    <div>
                      <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Kategori</label>
                      <select
                        value={selectedCategoryFilter}
                        onChange={(e) => {
                          setSelectedCategoryFilter(e.target.value);
                          showToast(`Filter Topik diset ke: ${e.target.value}`, 'success');
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-[#1c1a24] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700/20 transition cursor-pointer shadow-xs"
                      >
                        <option value="Semua">Semua Topik</option>
                        {uniqueCategories.map((cat, idx) => (
                          <option key={idx} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Region Selector */}
                    <div>
                      <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Provinsi</label>
                      <select
                        value={selectedRegionFilter}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedRegionFilter(val);
                          if (val !== 'Semua') {
                            setSelectedProvince(val);
                          } else {
                            setSelectedProvince('Nasional');
                          }
                          showToast(`Filter wilayah diset ke: ${val}`, 'success');
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-[#1c1a24] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700/20 transition cursor-pointer shadow-xs"
                      >
                        <option value="Semua">Semua Wilayah Prov</option>
                        {uniqueRegions.map((reg, idx) => (
                          <option key={idx} value={reg}>{reg}</option>
                        ))}
                      </select>
                    </div>

                    {/* 4a. Dari Tanggal */}
                    <div>
                      <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Dari Tanggal</label>
                      <div className="relative group/date">
                        <input
                          type="date"
                          value={startDateFilter}
                          onChange={(e) => {
                            setStartDateFilter(e.target.value);
                            setSelectedDateFilter('Semua');
                          }}
                          onClick={(e) => {
                            try {
                              (e.currentTarget as any).showPicker();
                            } catch (err) {}
                          }}
                          className="w-full pl-3 pr-8 py-2 text-xs bg-white dark:bg-[#1c1a24] border border-slate-200 dark:border-white/5 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700/20 cursor-pointer shadow-xs font-semibold hover:border-slate-300 transition duration-150"
                        />
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none group-hover/date:text-blue-700 transition-colors" />
                      </div>
                    </div>

                    {/* 4b. Sampai Tanggal */}
                    <div>
                      <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Sampai Tanggal</label>
                      <div className="relative group/date">
                        <input
                          type="date"
                          value={endDateFilter}
                          onChange={(e) => {
                            setEndDateFilter(e.target.value);
                            setSelectedDateFilter('Semua');
                          }}
                          onClick={(e) => {
                            try {
                              (e.currentTarget as any).showPicker();
                            } catch (err) {}
                          }}
                          className="w-full pl-3 pr-8 py-2 text-xs bg-white dark:bg-[#1c1a24] border border-slate-200 dark:border-white/5 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-700/20 cursor-pointer shadow-xs font-semibold hover:border-slate-300 transition duration-150"
                        />
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none group-hover/date:text-blue-700 transition-colors" />
                      </div>
                    </div>

                    {/* 4. Rentang Jam */}
                    <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2">
                      <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Rentang Jam</label>
                      <div className="flex items-center gap-2 bg-white dark:bg-[#1c1a24] border border-slate-200 dark:border-white/5 rounded-xl px-3 py-1.5 text-xs h-[38px] justify-between shadow-xs transition hover:border-blue-700/30">
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
                          className="bg-transparent text-slate-700 dark:text-slate-300 cursor-pointer font-semibold focus:outline-none text-[11.5px] hover:text-blue-700 transition"
                        >
                          {Array.from({ length: 24 }).map((_, i) => (
                            <option key={i} value={i} className="bg-white dark:bg-[#1c1a24] text-slate-800 dark:text-slate-200">{String(i).padStart(2, '0')}:00</option>
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
                          className="bg-transparent text-slate-700 dark:text-slate-300 cursor-pointer font-semibold focus:outline-none text-[11.5px] hover:text-blue-700 transition"
                        >
                          {Array.from({ length: 24 }).map((_, i) => (
                            <option key={i} value={i} className="bg-white dark:bg-[#1c1a24] text-slate-800 dark:text-slate-200">{String(i).padStart(2, '0')}:59</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 5. Reset Button */}
                    <div className="w-full">
                      <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">&nbsp;</label>
                      <button
                        onClick={() => {
                          setSelectedSentimentFilter('Semua');
                          setSelectedCategoryFilter('Semua');
                          setSelectedRegionFilter('Semua');
                          setSelectedProvince('Nasional');
                          setSelectedDateFilter('Semua');
                          setStartDateFilter('');
                          setEndDateFilter('');
                          setSelectedCalendarDate('');
                          setSearchFilterQuery('');
                          setStartHour(0);
                          setEndHour(23);
                          showToast('Filter dikosongkan.', 'info');
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/40 dark:border-slate-700/65 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm h-[38px]"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    </div>

                    {/* 6. Dual-Handle Date Range Slider */}
                    {sortedTimelineDates.length > 0 && (
                      <div className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-7 mt-3.5 pt-4 border-t border-slate-200/50 dark:border-white/5">
                        <DateRangeSlider
                          dates={sortedTimelineDates}
                          startDate={startDateFilter || sortedTimelineDates[0]}
                          endDate={endDateFilter || sortedTimelineDates[sortedTimelineDates.length - 1]}
                          onChange={(start, end) => {
                            setStartDateFilter(start);
                            setEndDateFilter(end);
                            setSelectedDateFilter('Semua');
                          }}
                          formatDate={formatIndonesianDate}
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        );
      })()}

      {/* AI STRATEGIC COMMUNICATION ANALYST CARD */}
      <div id="ai-specialist-analyst-panel" className="bg-slate-900 text-white border border-blue-700/25 rounded-[24px] p-5 shadow-2xl relative overflow-hidden my-6">
        {/* Glow decoration */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-blue-700/10 rounded-full blur-[40px] pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none" />

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="bg-gradient-to-tr from-blue-800 to-indigo-600 p-3 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-700/20 shrink-0">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black tracking-tight text-white font-sans">Analisis</h3>
              </div>
              <p className="text-slate-200 text-[11px] leading-relaxed mt-0.5 max-w-2xl">
                Mengubah kumpulan berita menjadi insight yang terstruktur melalui analisis sentimen, pemetaan isu, identifikasi risiko, dan rekomendasi
              </p>
              <div className="flex items-center gap-2 mt-2 bg-blue-800/20 border border-blue-700/30 px-3 py-1.5 rounded-xl w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" />
                <span className="text-[10px] font-bold text-blue-200">Tips: Silakan tentukan filter di atas terlebih dahulu agar hasil analisis lebih terfokus.</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end xl:self-auto shrink-0 flex-wrap">
            <button
              onClick={handleGenerateAiReport}
              disabled={isLoadingReport || filteredNews.length === 0}
              className={`px-5 py-2.5 bg-gradient-to-r from-blue-800 to-indigo-600 hover:from-blue-700 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 text-white rounded-xl text-xs font-extrabold transition-all duration-205 shadow-md shadow-blue-700/10 flex items-center gap-2 active:scale-95 cursor-pointer disabled:cursor-not-allowed`}
            >
              {isLoadingReport ? (
                <>
                  <svg className="animate-spin -ml-1 mr-1 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Menyusun Laporan...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Jalankan Analisis</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* AI report generated view */}
        {showAiReport && (
          <div className="mt-5 border-t border-white/10 pt-5 animate-in slide-in-from-bottom-3 duration-300">
            {isLoadingReport ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3.5 bg-black/25 rounded-2xl border border-white/5">
                <div className="relative flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-4 border-blue-700/20 border-t-blue-700 animate-spin" />
                  <div className="absolute w-6 h-6 rounded-full bg-blue-700/10 animate-ping" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-extrabold text-slate-200 tracking-wider">Memproses Analisis</span>
                  <div className="flex items-center gap-1.5 justify-center mt-1 text-[10px] text-slate-200 font-mono">
                    <span className="inline-block animate-pulse text-blue-400">●</span>
                    <span>Mengevaluasi {filteredNews.length} berita terfilter...</span>
                  </div>
                </div>
              </div>
            ) : reportData ? (
              <div className="bg-white dark:bg-[#1a1924] text-slate-800 dark:text-slate-100 p-6 rounded-2xl border border-slate-200 dark:border-white/[0.04] shadow-inner font-sans relative">
                
                {/* Header detail element of the report */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4.5 mb-6 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-800 dark:bg-blue-700 animate-pulse" />
                    <div>
                      <h4 className="text-[13px] font-black uppercase text-slate-900 dark:text-white tracking-tight">LAPORAN ANALISIS MEDIA MONITORING</h4>
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold tracking-wide">Diterbitkan oleh Security Head Office</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(reportData);
                        showToast('Laporan berhasil disalin ke clipboard!', 'success');
                      }}
                      className="px-3 py-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5 rounded-lg text-[11px] font-semibold transition active:scale-95 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Laporan</span>
                    </button>

                    <button
                      onClick={() => setShowAiReport(false)}
                      className="px-3 py-1.5 hover:bg-rose-500/10 text-rose-600 hover:text-rose-500 border border-rose-500/20 hover:border-rose-500/30 rounded-lg text-[11px] font-semibold transition active:scale-95 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Tutup</span>
                    </button>
                  </div>
                </div>

                {reportSource && (reportSource.includes('Simulation') || reportSource.includes('Backup')) && (
                  <div className="mb-6 bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 p-4 rounded-xl text-xs flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5 animate-pulse" />
                    <div className="space-y-1">
                      <p className="font-extrabold uppercase tracking-widest text-[10px]">Sistem Berjalan dalam Mode Simulasi Cadangan</p>
                      <p className="leading-relaxed opacity-90">
                        Sistem mendeteksi bahwa data error (RESOURCE_EXHAUSTED). Seluruh dasbor, pemetaan, grafik, dan infografis tetap dapat diproses dalam ketepatan penuh menggunakan mesin analisis lokal.
                      </p>
                    </div>
                  </div>
                )}

                {/* Render report content */}
                <div className="space-y-4">
                  {renderProcessedReport(reportData)}
                </div>

                {/* Footnote of the report */}
                <div className="mt-8 pt-4 border-t border-slate-100 dark:border-white/5 text-[9px] text-slate-600 dark:text-slate-300 font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span>ANALISIS BERDASARKAN FILTER: {filteredNews.length} DATA</span>
                  <span>CONFIDENTIAL</span>
                </div>
                
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 gap-2 bg-rose-500/5 border border-rose-500/25 rounded-2xl text-rose-400">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
                <span className="text-xs font-bold font-sans">Gagal memuat analisis. Silakan coba kembali.</span>
              </div>
            )}
          </div>
        )}

      </div>

      {/* CORE INTEGRATED BENTO VIEW */}
      <div className="flex flex-col space-y-6">

        {/* QUICK METRICS CARDS ROW: Fully responsive and linked to dynamic filtering */}
        <div 
          style={{ order: dashboardSections.indexOf('metrics') }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-300 relative group/section"
        >
          {/* Floating Section Reordering Utilities */}
          <div className="absolute -top-3.5 right-4 z-30 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 py-1 px-2.5 rounded-lg text-[10px] font-black text-slate-500 dark:text-slate-400 opacity-0 group-hover/section:opacity-100 focus-within:opacity-100 hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm select-none">
            <span className="text-blue-800 dark:text-blue-400 mr-2 uppercase tracking-wider font-extrabold font-mono text-[8px]">Grup Metrik</span>
            <button
              onClick={(e) => { e.stopPropagation(); moveSection('metrics', 'up'); }}
              disabled={dashboardSections.indexOf('metrics') === 0}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 p-0.5 cursor-pointer"
              title="Urutkan ke Atas"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); moveSection('metrics', 'down'); }}
              disabled={dashboardSections.indexOf('metrics') === dashboardSections.length - 1}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 p-0.5 cursor-pointer"
              title="Urutkan ke Bawah"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

                {/* Render individual cards inside the order state */}
          {metricCardsOrder.map((cardId, index) => {
            if (cardId === 'total') {
              return (
                <motion.div 
                  key="total"
                  layout
                  initial={{ opacity: 0, y: 15, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  whileHover={{ y: -3, scale: 1.015, transition: { duration: 0.2, ease: "easeOut" } }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 110,
                    damping: 14,
                    delay: index * 0.05
                  }}
                  onClick={() => {
                    setSelectedSentimentFilter('Semua');
                    showToast('Menampilkan seluruh berita tanpa filter sentimen', 'info');
                  }}
                  className={`group relative p-4 rounded-2xl border bg-white dark:bg-[#121118] border-slate-200/50 dark:border-white/5 transition-all duration-300 cursor-pointer overflow-hidden shadow-sm dark:shadow-none select-none ${
                    selectedSentimentFilter === 'Semua'
                      ? 'bg-gradient-to-br from-blue-700/10 to-indigo-500/10 border-blue-700/30 dark:border-blue-700/40 shadow-lg ring-1 ring-blue-700/20'
                      : 'hover:border-slate-300 dark:hover:border-white/10 hover:bg-slate-100/40 dark:hover:bg-white/[0.02] hover:shadow-md'
                  }`}
                >
                  {/* Small card level controls on hover */}
                  <div className="absolute top-1 left-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-900/90 py-0.5 px-1.5 rounded-md border border-slate-200/50 dark:border-white/5 shadow-xs z-20">
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveMetricCard('total', 'left'); }}
                      disabled={metricCardsOrder.indexOf('total') === 0}
                      className="text-slate-400 hover:text-indigo-500 disabled:opacity-20 disabled:pointer-events-none p-0.5 cursor-pointer"
                      title="Geser ke kiri"
                    >
                      <ChevronLeft className="w-2.5 h-2.5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveMetricCard('total', 'right'); }}
                      disabled={metricCardsOrder.indexOf('total') === metricCardsOrder.length - 1}
                      className="text-slate-400 hover:text-indigo-500 disabled:opacity-20 disabled:pointer-events-none p-0.5 cursor-pointer"
                      title="Geser ke kanan"
                    >
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <div className="absolute top-0 right-0 w-20 h-20 bg-blue-700/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      selectedSentimentFilter === 'Semua'
                        ? 'bg-blue-800 text-white shadow-md'
                        : 'bg-blue-700/10 text-blue-800 dark:text-blue-400 group-hover:bg-blue-800 group-hover:text-white group-hover:shadow-md'
                    } transition-all duration-300`}>
                      <Newspaper className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Jumlah Berita</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white leading-none">
                          {periodMetrics.total}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-bold">Isu</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[9px] font-bold text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-white/[0.03] pt-2">
                    <span>Seluruh cakupan data</span>
                    {selectedSentimentFilter === 'Semua' && (
                      <span className="text-[8px] tracking-widest text-blue-800 dark:text-blue-400 bg-blue-700/10 px-1.5 py-0.5 rounded uppercase font-black">Aktif</span>
                    )}
                  </div>
                </motion.div>
              );
            }

            if (cardId === 'positif') {
              return (
                <motion.div 
                  key="positif"
                  layout
                  initial={{ opacity: 0, y: 15, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  whileHover={{ y: -3, scale: 1.015, transition: { duration: 0.2, ease: "easeOut" } }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 110,
                    damping: 14,
                    delay: index * 0.05
                  }}
                  onClick={() => {
                    setSelectedSentimentFilter('Positif');
                    showToast('Memfilter peta & data ke sentimen Positif', 'success');
                  }}
                  className={`group relative p-4 rounded-2xl border bg-white dark:bg-[#121118] border-slate-200/50 dark:border-white/5 transition-all duration-300 cursor-pointer overflow-hidden shadow-sm dark:shadow-none select-none ${
                    selectedSentimentFilter === 'Positif'
                      ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30 dark:border-emerald-500/40 shadow-lg ring-1 ring-emerald-500/20'
                      : 'hover:border-emerald-500/30 dark:hover:border-emerald-500/20 hover:bg-slate-100/40 dark:hover:bg-white/[0.02] hover:shadow-md'
                  }`}
                >
                  <div className="absolute top-1 left-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-900/90 py-0.5 px-1.5 rounded-md border border-slate-200/50 dark:border-white/5 shadow-xs z-20">
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveMetricCard('positif', 'left'); }}
                      disabled={metricCardsOrder.indexOf('positif') === 0}
                      className="text-slate-400 hover:text-indigo-500 disabled:opacity-20 disabled:pointer-events-none p-0.5 cursor-pointer"
                      title="Geser ke kiri"
                    >
                      <ChevronLeft className="w-2.5 h-2.5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveMetricCard('positif', 'right'); }}
                      disabled={metricCardsOrder.indexOf('positif') === metricCardsOrder.length - 1}
                      className="text-slate-400 hover:text-indigo-500 disabled:opacity-20 disabled:pointer-events-none p-0.5 cursor-pointer"
                      title="Geser ke kanan"
                    >
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      selectedSentimentFilter === 'Positif'
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-md'
                    } transition-all duration-300`}>
                      <Smile className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Sentimen Positif</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xl sm:text-2xl font-black font-display text-emerald-600 dark:text-emerald-400 leading-none">
                          {periodMetrics.positive}
                        </span>
                        <span className="text-[9.5px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded leading-none">
                          {periodMetrics.positivePct}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[9px] font-bold text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-white/[0.03] pt-2">
                    <span>Tren apresiatif & optimis</span>
                    {selectedSentimentFilter === 'Positif' && (
                      <span className="text-[8px] tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase font-black">Aktif</span>
                    )}
                  </div>
                </motion.div>
              );
            }

            if (cardId === 'netral') {
              return (
                <motion.div 
                  key="netral"
                  layout
                  initial={{ opacity: 0, y: 15, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  whileHover={{ y: -3, scale: 1.015, transition: { duration: 0.2, ease: "easeOut" } }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 110,
                    damping: 14,
                    delay: index * 0.05
                  }}
                  onClick={() => {
                    setSelectedSentimentFilter('Netral');
                    showToast('Memfilter peta & data ke sentimen Netral', 'info');
                  }}
                  className={`group relative p-4 rounded-2xl border bg-white dark:bg-[#121118] border-slate-200/50 dark:border-white/5 transition-all duration-300 cursor-pointer overflow-hidden shadow-sm dark:shadow-none select-none ${
                    selectedSentimentFilter === 'Netral'
                      ? 'bg-gradient-to-br from-blue-500/10 to-sky-500/10 border-blue-500/30 dark:border-blue-500/40 shadow-lg ring-1 ring-blue-500/20'
                      : 'hover:border-blue-500/30 dark:hover:border-blue-500/20 hover:bg-slate-100/40 dark:hover:bg-white/[0.02] hover:shadow-md'
                  }`}
                >
                  <div className="absolute top-1 left-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-900/90 py-0.5 px-1.5 rounded-md border border-slate-200/50 dark:border-white/5 shadow-xs z-20">
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveMetricCard('netral', 'left'); }}
                      disabled={metricCardsOrder.indexOf('netral') === 0}
                      className="text-slate-400 hover:text-indigo-500 disabled:opacity-20 disabled:pointer-events-none p-0.5 cursor-pointer"
                      title="Geser ke kiri"
                    >
                      <ChevronLeft className="w-2.5 h-2.5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveMetricCard('netral', 'right'); }}
                      disabled={metricCardsOrder.indexOf('netral') === metricCardsOrder.length - 1}
                      className="text-slate-400 hover:text-indigo-500 disabled:opacity-20 disabled:pointer-events-none p-0.5 cursor-pointer"
                      title="Geser ke kanan"
                    >
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      selectedSentimentFilter === 'Neutral' || selectedSentimentFilter === 'Netral'
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white group-hover:shadow-md'
                    } transition-all duration-300`}>
                      <Meh className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Sentimen Netral</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xl sm:text-2xl font-black font-display text-blue-600 dark:text-blue-400 leading-none">
                          {periodMetrics.neutral}
                        </span>
                        <span className="text-[9.5px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/20 px-1.5 py-0.5 rounded leading-none">
                          {periodMetrics.neutralPct}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[9px] font-bold text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-white/[0.03] pt-2">
                    <span>Pemberitaan informatif</span>
                    {(selectedSentimentFilter === 'Netral' || selectedSentimentFilter === 'Neutral') && (
                      <span className="text-[8px] tracking-widest text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded uppercase font-black">Aktif</span>
                    )}
                  </div>
                </motion.div>
              );
            }

            if (cardId === 'negatif') {
              return (
                <motion.div 
                  key="negatif"
                  layout
                  initial={{ opacity: 0, y: 15, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  whileHover={{ y: -3, scale: 1.015, transition: { duration: 0.2, ease: "easeOut" } }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 110,
                    damping: 14,
                    delay: index * 0.05
                  }}
                  onClick={() => {
                    setSelectedSentimentFilter('Negatif');
                    showToast('Memfilter peta & data ke sentimen Negatif', 'warning');
                  }}
                  className={`group relative p-4 rounded-2xl border bg-white dark:bg-[#121118] border-slate-200/50 dark:border-white/5 transition-all duration-300 cursor-pointer overflow-hidden shadow-sm dark:shadow-none select-none ${
                    selectedSentimentFilter === 'Negatif'
                      ? 'bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-500/30 dark:border-red-500/40 shadow-lg ring-1 ring-red-500/20'
                      : 'hover:border-red-500/30 dark:hover:border-red-500/20 hover:bg-slate-100/40 dark:hover:bg-white/[0.02] hover:shadow-md'
                  }`}
                >
                  <div className="absolute top-1 left-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-900/90 py-0.5 px-1.5 rounded-md border border-slate-200/50 dark:border-white/5 shadow-xs z-20">
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveMetricCard('negatif', 'left'); }}
                      disabled={metricCardsOrder.indexOf('negatif') === 0}
                      className="text-slate-400 hover:text-indigo-500 disabled:opacity-20 disabled:pointer-events-none p-0.5 cursor-pointer"
                      title="Geser ke kiri"
                    >
                      <ChevronLeft className="w-2.5 h-2.5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveMetricCard('negatif', 'right'); }}
                      disabled={metricCardsOrder.indexOf('negatif') === metricCardsOrder.length - 1}
                      className="text-slate-400 hover:text-indigo-500 disabled:opacity-20 disabled:pointer-events-none p-0.5 cursor-pointer"
                      title="Geser ke kanan"
                    >
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      selectedSentimentFilter === 'Negatif'
                        ? 'bg-red-500 text-white shadow-md'
                        : 'bg-red-500/10 text-red-500 dark:text-red-400 group-hover:bg-red-500 group-hover:text-white group-hover:shadow-md'
                    } transition-all duration-300`}>
                      <Frown className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Sentimen Negatif</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xl sm:text-2xl font-black font-display text-red-500 dark:text-red-400 leading-none">
                          {periodMetrics.negative}
                        </span>
                        <span className="text-[9.5px] font-mono font-bold text-red-500 dark:text-red-400 bg-red-500/10 dark:bg-red-500/20 px-1.5 py-0.5 rounded leading-none">
                          {periodMetrics.negativePct}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[9px] font-bold text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-white/[0.03] pt-2">
                    <span>Protes, kritik & ancaman isu</span>
                    {selectedSentimentFilter === 'Negatif' && (
                      <span className="text-[8px] tracking-widest text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded uppercase font-black">Aktif</span>
                    )}
                  </div>
                </motion.div>
              );
            }
            return null;
          })}

        </div>
        
        {/* TOP ROW: STATISTICS & PERIOD DETAILED ANALYTICS (Full width container with inner 2-column grid layout) */}
        <div 
          style={{ order: dashboardSections.indexOf('charts') }}
          className="bg-white dark:bg-[#121118] border border-slate-200/50 dark:border-white/5 rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 md:p-6 shadow-xl dark:shadow-black/40 relative overflow-hidden transition-all duration-300 group/section"
        >
          {/* Floating Section Reordering Utilities */}
          <div className="absolute top-2 right-4 z-30 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 py-1 px-2.5 rounded-lg text-[10px] font-black text-slate-500 dark:text-slate-400 opacity-0 group-hover/section:opacity-100 focus-within:opacity-100 hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm select-none">
            <span className="text-blue-800 dark:text-blue-400 mr-2 uppercase tracking-wider font-extrabold font-mono text-[8px]">Grafik Isu & Rincian</span>
            <button
              onClick={(e) => { e.stopPropagation(); moveSection('charts', 'up'); }}
              disabled={dashboardSections.indexOf('charts') === 0}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 p-0.5 cursor-pointer"
              title="Urutkan ke Atas"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); moveSection('charts', 'down'); }}
              disabled={dashboardSections.indexOf('charts') === dashboardSections.length - 1}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 p-0.5 cursor-pointer"
              title="Urutkan ke Bawah"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 landscape:grid-cols-5 lg:grid-cols-5 gap-6 pt-6 sm: pt-0">
            
            {/* Left part: Trends, Duration Switcher, Calendar Carousel, Line Chart (lg:col-span-3) */}
            <div className={`landscape:col-span-3 lg:col-span-3 space-y-6 transition-all duration-500 ease-in-out ${isLayoutOrderSwapped ? 'landscape:order-2 lg:order-2 border-t landscape:border-t-0 lg:border-t-0 landscape:border-l lg:border-l border-slate-200/40 dark:border-white/[0.04] pt-6 landscape:pt-0 lg:pt-0 landscape:pl-6 lg:pl-6' : 'landscape:order-1 lg:order-1'}`}>
              
              {/* Statistics Top Row with Duration Switcher and Multi-Select Control */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                <div className="flex items-start gap-4">
                  {/* Highlighted Total Volume in the top left info row */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.92, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="bg-blue-700/10 dark:bg-blue-700/20 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl flex flex-col justify-center border border-blue-700/20 min-w-[90px] sm:min-w-[110px]"
                  >
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-blue-800 dark:text-blue-400">Total Volume</span>
                    <span className="text-lg sm:text-xl font-black font-mono text-slate-800 dark:text-white leading-tight">
                      {displayedMetrics.total} <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Isu</span>
                    </span>
                  </motion.div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold font-display text-slate-900 dark:text-white tracking-tight">Tren & Frekuensi</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 tracking-wider">Volume & Frekuensi Isu</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Duration switcher (All, Days, Weeks, Months, Years) */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1a1924] p-1 rounded-full border border-slate-200/40 dark:border-white/5 self-start sm:self-auto overflow-x-auto no-scrollbar max-w-full">
                    {(['All', 'Days', 'Weeks', 'Months', 'Years'] as const).map((dur) => (
                      <button
                        key={dur}
                        onClick={() => {
                          setActiveTabDuration(dur);
                          if (dynamicCalendarDays.length === 0) return;

                          const lastDateStr = dynamicCalendarDays[dynamicCalendarDays.length - 1].fullDate;

                          if (dur === 'All') {
                            setIsMultiSelectMode(true);
                            const allDays = dynamicCalendarDays.map(d => d.fullDate);
                            setSelectedCalendarDates(allDays);
                            setStartDateFilter('');
                            setEndDateFilter('');
                            setSelectedDateFilter('Semua');
                            showToast(`Menampilkan seluruh statistik dari database`, 'info');
                          } else if (dur === 'Days') {
                            setIsMultiSelectMode(false);
                            setSelectedCalendarDate(lastDateStr);
                            setSelectedDateFilter(lastDateStr);
                            setSelectedCalendarDates([lastDateStr]);
                            setStartDateFilter(lastDateStr);
                            setEndDateFilter(lastDateStr);
                            showToast(`Menampilkan grafik Harian`, 'info');
                          } else if (dur === 'Weeks') {
                            setIsMultiSelectMode(true);
                            const last7 = dynamicCalendarDays.slice(-7).map(d => d.fullDate);
                            setSelectedCalendarDates(last7);
                            setSelectedCalendarDate(lastDateStr);
                            if (last7.length > 0) {
                              setStartDateFilter(last7[0]);
                              setEndDateFilter(last7[last7.length - 1]);
                            }
                            setSelectedDateFilter('Semua');
                            showToast(`Menampilkan grafik 7 hari kebelakang`, 'info');
                          } else if (dur === 'Months') {
                            setIsMultiSelectMode(true);
                            const last30 = dynamicCalendarDays.slice(-30).map(d => d.fullDate);
                            setSelectedCalendarDates(last30);
                            setSelectedCalendarDate(lastDateStr);
                            if (last30.length > 0) {
                              setStartDateFilter(last30[0]);
                              setEndDateFilter(last30[last30.length - 1]);
                            }
                            setSelectedDateFilter('Semua');
                            showToast(`Menampilkan grafik 30 hari kebelakang`, 'info');
                          } else if (dur === 'Years') {
                            setIsMultiSelectMode(true);
                            const allDays = dynamicCalendarDays.map(d => d.fullDate);
                            setSelectedCalendarDates(allDays);
                            setSelectedCalendarDate(lastDateStr);
                            
                            const maxD = parseUTCDate(lastDateStr);
                            const minD = new Date(maxD);
                            minD.setUTCDate(maxD.getUTCDate() - 365);
                            const startOfYear = formatUTCDate(minD);

                            setStartDateFilter(startOfYear);
                            setEndDateFilter(lastDateStr);
                            setSelectedDateFilter('Semua');
                            showToast(`Menampilkan grafik 365 hari kebelakang`, 'info');
                          }
                        }}
                        className={`px-2.5 py-1 rounded-full text-[10px] sm:text-[10.5px] font-extrabold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                          activeTabDuration === dur
                            ? 'bg-blue-800 text-white shadow-md'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                        }`}
                      >
                        {dur === 'All' ? 'Semua' : dur === 'Days' ? 'Hari' : dur === 'Weeks' ? 'Minggu' : dur === 'Months' ? 'Bulan' : 'Tahun'}
                      </button>
                    ))}
                  </div>

                  {/* Ekspor Laporan Button with Dropdown (CSV / PDF) */}
                  <div className="relative" id="export-report-dropdown-container">
                    <button
                      type="button"
                      onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-800 hover:bg-blue-900 text-white rounded-full text-[10px] sm:text-[10.5px] font-extrabold shadow-sm hover:shadow transition-all duration-300 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Ekspor Laporan</span>
                      <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${exportDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <AnimatePresence>
                      {exportDropdownOpen && (
                        <>
                          {/* Overlay to close on click outside */}
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setExportDropdownOpen(false)} 
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -8 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-[#121118] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl py-1.5 z-50 overflow-hidden"
                          >
                            <div className="px-2.5 py-1 text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 mb-1 text-left">
                              Pilih Format Laporan
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => {
                                setExportDropdownOpen(false);
                                handleExportCSV();
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[10.5px] font-extrabold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.03] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-left"
                            >
                              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                              <div className="flex flex-col">
                                <span>Unduh CSV</span>
                                <span className="text-[8px] text-slate-400 font-normal">Format spreadsheet standar</span>
                              </div>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => {
                                setExportDropdownOpen(false);
                                handleExportPDF();
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[10.5px] font-extrabold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.03] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-left"
                            >
                              <FileText className="w-4 h-4 text-rose-500" />
                              <div className="flex flex-col">
                                <span>Unduh PDF</span>
                                <span className="text-[8px] text-slate-400 font-normal">Format dokumen formal</span>
                              </div>
                            </button>

                            {user?.role === 'Admin' && (
                              <button
                              type="button"
                              onClick={() => {
                                setExportDropdownOpen(false);
                                const prefillData = {
                                  startDate: startDateFilter,
                                  endDate: endDateFilter,
                                  sentiment: selectedSentimentFilter === 'Semua' ? 'All' : selectedSentimentFilter,
                                  category: selectedCategoryFilter === 'Semua' ? 'All' : selectedCategoryFilter,
                                  province: selectedRegionFilter === 'Semua' ? 'All' : selectedRegionFilter,
                                  search: searchFilterQuery,
                                };
                                try {
                                  localStorage.setItem('pdf_studio_prefill', JSON.stringify(prefillData));
                                } catch (e) {
                                  console.error(e);
                                }
                                setTab('pdf-studio');
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[10.5px] font-extrabold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.03] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-left border-t border-slate-100 dark:border-white/5"
                            >
                              <Sparkles className="w-4 h-4 text-blue-700 animate-pulse" />
                              <div className="flex flex-col">
                                <span className="text-blue-800 dark:text-blue-400">PDF Export Studio</span>
                                <span className="text-[8px] text-slate-400 font-normal">Kustomisasi rentang waktu & isi</span>
                              </div>
                            </button>
                            )}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Multi-Select helper links if active */}
              {isMultiSelectMode && (
                <div className="flex items-center justify-end gap-2.5 -my-1 mb-2 px-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mr-auto">
                    {selectedCalendarDates.length} Tanggal dipilih
                  </span>
                  <button
                    onClick={selectAllCalendarDates}
                    className="text-[10px] font-extrabold text-blue-800 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-slate-300 dark:text-slate-800 text-[10px] font-bold">|</span>
                  <button
                    onClick={clearAllCalendarDates}
                    className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                  >
                    Kosongkan Pilihan
                  </button>
                </div>
              )}

              {/* HORIZONTAL CALENDAR DATE CAROUSEL WITH INTERACTIVE SCROLLING */}
              <div className="relative flex items-center group">
                {/* Scroll Left Button */}
                <button
                  onClick={() => scrollCalendar('left')}
                  className="hidden md:flex absolute left-0 z-10 p-2 rounded-full bg-white/90 dark:bg-[#1e1c2a]/90 hover:bg-blue-800 hover:text-white dark:hover:bg-blue-800 border border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-400 shadow-lg transition-all active:scale-90 items-center justify-center cursor-pointer opacity-80 hover:opacity-100"
                  aria-label="Scroll Left"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {/* Scrollable Container */}
                <div 
                  ref={scrollContainerRef}
                   className="overflow-x-auto select-none no-scrollbar py-1 flex-1 scroll-smooth px-1 md:px-8 touch-pan-x"
                >
                  <div className="flex gap-2 min-w-max">
                    {dynamicCalendarDays.map((day, idx) => {
                      const isSelected = isMultiSelectMode 
                        ? selectedCalendarDates.includes(day.fullDate)
                        : activeCalendarDate === day.fullDate;
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            const targetDate = day.fullDate;
                            const targetIdx = dynamicCalendarDays.findIndex(d => d.fullDate === targetDate);
                            if (targetIdx === -1) return;

                            if (activeTabDuration === 'All') {
                              setActiveTabDuration('Days');
                              setIsMultiSelectMode(false);
                              setSelectedCalendarDate(targetDate);
                              setSelectedDateFilter(targetDate);
                              setSelectedCalendarDates([targetDate]);
                              setStartDateFilter(targetDate);
                              setEndDateFilter(targetDate);
                              showToast(`Melihat data tanggal ${day.num} ${day.month}`, 'success');
                              return;
                            }

                            if (isMultiSelectMode) {
                              if (selectedCalendarDates.length === 1) {
                                // If 1 date is already selected, second selection constructs range
                                const existingDate = selectedCalendarDates[0];
                                const existingIdx = dynamicCalendarDays.findIndex(d => d.fullDate === existingDate);
                                if (existingIdx !== -1) {
                                  const startIdx = Math.min(existingIdx, targetIdx);
                                  const endIdx = Math.max(existingIdx, targetIdx);
                                  const rangeDates = dynamicCalendarDays.slice(startIdx, endIdx + 1).map(d => d.fullDate);
                                  setSelectedCalendarDates(rangeDates);
                                  setStartDateFilter(dynamicCalendarDays[startIdx].fullDate);
                                  setEndDateFilter(dynamicCalendarDays[endIdx].fullDate);
                                  setSelectedDateFilter('Semua');
                                  showToast(`Koneksi berurutan: Memilih rentang dari ${dynamicCalendarDays[startIdx].num} ${dynamicCalendarDays[startIdx].month} s/d ${dynamicCalendarDays[endIdx].num} ${dynamicCalendarDays[endIdx].month}`, 'success');
                                } else {
                                  setSelectedCalendarDates([targetDate]);
                                  setStartDateFilter(targetDate);
                                  setEndDateFilter(targetDate);
                                  setSelectedDateFilter(targetDate);
                                }
                              } else {
                                // Reset to single anchor start
                                setSelectedCalendarDates([targetDate]);
                                setStartDateFilter(targetDate);
                                setEndDateFilter(targetDate);
                                setSelectedDateFilter(targetDate);
                                showToast(`Rentang baru: Memulai dari ${day.num} ${day.month}. Pilih tanggal lain untuk menggabungkan.`, 'info');
                              }
                            } else {
                              // If currently single selection, check if clicking a DIFFERENT date can automatically make a sequence range
                              const currentActive = activeCalendarDate;
                              const currentIdx = dynamicCalendarDays.findIndex(d => d.fullDate === currentActive);

                              if (currentActive && currentActive !== targetDate && currentIdx !== -1) {
                                setIsMultiSelectMode(true);
                                const startIdx = Math.min(currentIdx, targetIdx);
                                const endIdx = Math.max(currentIdx, targetIdx);
                                const rangeDates = dynamicCalendarDays.slice(startIdx, endIdx + 1).map(d => d.fullDate);
                                setSelectedCalendarDates(rangeDates);
                                setStartDateFilter(dynamicCalendarDays[startIdx].fullDate);
                                setEndDateFilter(dynamicCalendarDays[endIdx].fullDate);
                                setSelectedDateFilter('Semua');
                                showToast(`Multi-select diaktifkan secara otomatis. Rentang terpilih: ${dynamicCalendarDays[startIdx].num} ${dynamicCalendarDays[startIdx].month} s/d ${dynamicCalendarDays[endIdx].num} ${dynamicCalendarDays[endIdx].month}`, 'success');
                              } else {
                                setSelectedCalendarDate(targetDate);
                                setSelectedDateFilter(targetDate);
                                setSelectedCalendarDates([targetDate]);
                                setStartDateFilter(targetDate);
                                setEndDateFilter(targetDate);
                                showToast(`Melihat data tanggal ${day.num} ${day.month}`, 'success');
                              }
                            }
                          }}
                          className={`flex flex-col items-center justify-center rounded-2xl w-[58px] h-[72px] py-2 px-1 border transition-all duration-300 cursor-pointer relative ${
                            isSelected
                              ? 'bg-blue-800 text-white border-blue-700 shadow-md transform -translate-y-0.5'
                              : 'bg-slate-50 hover:bg-slate-100 dark:bg-[#1a1924]/60 border-slate-200/55 dark:border-white/5 dark:hover:bg-[#1e1c2a] text-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {/* Mini check mark for select state in multi-select mode */}
                          {isMultiSelectMode && isSelected && (
                            <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-slate-900 flex items-center justify-center">
                              <span className="text-[7px] text-white leading-none font-bold">✓</span>
                            </div>
                          )}
                          <span className={`text-[8.5px] font-bold uppercase tracking-wide leading-none ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>{day.day}</span>
                          <span className="text-base font-black tracking-tight leading-tight my-0.5">{day.num}</span>
                          <span className={`text-[9px] font-extrabold uppercase tracking-wider leading-none ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>{day.month}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Scroll Right Button */}
                <button
                  onClick={() => scrollCalendar('right')}
                  className="hidden md:flex absolute right-0 z-10 p-2 rounded-full bg-white/90 dark:bg-[#1e1c2a]/90 hover:bg-blue-800 hover:text-white dark:hover:bg-blue-800 border border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-400 shadow-lg transition-all active:scale-90 items-center justify-center cursor-pointer opacity-80 hover:opacity-100"
                  aria-label="Scroll Right"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
 
              {/* DATA COMPARISON OPTION BLOCK */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100/55 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 p-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Perbandingan Data:</span>
                  <div className="flex items-center gap-1 bg-slate-200/40 dark:bg-black/20 p-0.5 rounded-xl border border-slate-300/10">
                    <button
                      type="button"
                      onClick={() => {
                        setComparisonMode('none');
                        showToast('Perbandingan dinonaktifkan', 'info');
                      }}
                      className={`px-3 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                        comparisonMode === 'none'
                          ? 'bg-white dark:bg-[#1a1924] text-blue-800 dark:text-blue-400 shadow-xs border border-slate-200/45 dark:border-white/5'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      Satu Periode
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setComparisonMode('mom');
                        showToast('Rentang Pembanding: Month-over-Month (MoM)', 'success');
                      }}
                      className={`px-3 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                        comparisonMode === 'mom'
                          ? 'bg-blue-800 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                      title="Month-over-Month (Bulan-ke-Bulan)"
                    >
                      MoM
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setComparisonMode('yoy');
                        showToast('Rentang Pembanding: Year-over-Year (YoY)', 'success');
                      }}
                      className={`px-3 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                        comparisonMode === 'yoy'
                          ? 'bg-blue-800 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                      title="Year-over-Year (Tahun-ke-Tahun)"
                    >
                      YoY
                    </button>
                  </div>
                </div>

                {comparisonMode !== 'none' && (
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                    <span className="font-sans font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-[9px]">Analisis Pertumbuhan:</span>
                    {(() => {
                      const currentTotal = dynamicTimelineData.reduce((acc, item) => acc + (item.volume || 0), 0);
                      const prevTotal = dynamicTimelineData.reduce((acc, item) => acc + (item.prevVolume || 0), 0);
                      
                      if (prevTotal === 0) {
                        return (
                          <span className="text-amber-500 dark:text-amber-400 font-extrabold flex items-center gap-1 text-[10px]">
                            <Info className="w-3.5 h-3.5" /> Data pembanding 0 (Tidak ada isu)
                          </span>
                        );
                      }
                      
                      const pctDiff = ((currentTotal - prevTotal) / prevTotal) * 100;
                      const sign = pctDiff > 0 ? '+' : '';
                      const colorClass = pctDiff > 0 ? 'text-rose-500 dark:text-rose-400 font-black' : pctDiff < 0 ? 'text-emerald-500 dark:text-emerald-400 font-black' : 'text-slate-400 dark:text-slate-500 font-black';
                      const Icon = pctDiff > 0 ? TrendingUp : pctDiff < 0 ? TrendingDown : Info;
                      
                      return (
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-xl border border-slate-200/50 dark:border-white/5">
                          <Icon className={`w-3.5 h-3.5 ${pctDiff > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'}`} />
                          <span className={colorClass}>
                            {sign}{pctDiff.toFixed(1)}%
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                            ({currentTotal} vs {prevTotal} isu periode lalu)
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
 
              {/* LINE CHART GRAPH */}
              <div className="h-44 sm:h-56 relative pt-2 rounded-2xl bg-slate-500/[0.01] dark:bg-white/[0.01] border border-transparent dark:border-white/[0.01] px-1 md:px-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dynamicTimelineData} margin={{ top: 10, right: 10, left: isMobile ? -32 : -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="purpleGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="emeraldGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="redGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="blueGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    
                    <CartesianGrid 
                      strokeDasharray="4 4" 
                      vertical={false} 
                      stroke="rgba(255,255,255,0.02)" 
                      className="dark:stroke-white/5 opacity-50"
                    />
                    
                    <XAxis 
                      dataKey="label" 
                      stroke="rgba(148, 163, 184, 0.4)" 
                      fontSize={isMobile ? 8.5 : 9.5} 
                      tickLine={false} 
                      axisLine={false}
                      dy={10}
                      interval={activeTabDuration === 'Days' ? (isMobile ? 3 : 1) : activeTabDuration === 'Months' ? (isMobile ? 5 : 2) : activeTabDuration === 'Years' ? (isMobile ? 60 : 15) : 'preserveStartEnd'}
                    />
                    <YAxis 
                      stroke="rgba(148, 163, 184, 0.4)" 
                      fontSize={isMobile ? 8.5 : 9.5} 
                      tickLine={false} 
                      axisLine={false}
                      dx={isMobile ? -6 : -10}
                      width={isMobile ? 24 : 35}
                    />
                    
                    <Tooltip 
                      contentStyle={{ 
                      background: 'rgba(18, 17, 24, 0.95)', 
                        border: '1px solid rgba(255,255,255,0.06)', 
                        borderRadius: '12px', 
                        color: '#fff',
                        fontSize: '11px'
                      }} 
                    />
                    
                    <Area 
                      type="monotone" 
                      dataKey="positif" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#emeraldGlow)" 
                      name="Sentiment Positif"
                      isAnimationActive={!isMobile}
                    />
 
                    <Area 
                      type="monotone" 
                      dataKey="negatif" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#redGlow)" 
                      name="Sentiment Negatif"
                      isAnimationActive={!isMobile}
                    />
 
                    <Area 
                      type="monotone" 
                      dataKey="netral" 
                      stroke="#3b82f6" 
                      strokeWidth={1.5}
                      fillOpacity={1} 
                      fill="url(#blueGlow)" 
                      name="Sentiment Netral"
                      isAnimationActive={!isMobile}
                    />

                    {comparisonMode !== 'none' && (
                      <Area
                        type="monotone"
                        dataKey="prevVolume"
                        stroke="#a855f7"
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        fill="url(#purpleGlow)"
                        fillOpacity={0.06}
                        name={comparisonMode === 'mom' ? "Volume Pembanding (MoM)" : "Volume Pembanding (YoY)"}
                        isAnimationActive={!isMobile}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

            </div>

            {/* Right part: Detailed Period Analytics (lg:col-span-2) */}
            <div className={`landscape:col-span-2 lg:col-span-2 flex flex-col justify-between space-y-6 transition-all duration-500 ease-in-out ${isLayoutOrderSwapped ? 'landscape:order-1 lg:order-1 landscape:pr-6 lg:pr-6' : 'landscape:order-2 lg:order-2 border-t landscape:border-t-0 lg:border-t-0 landscape:border-l lg:border-l border-slate-200/40 dark:border-white/[0.04] pt-6 landscape:pt-0 lg:pt-0 landscape:pl-6 lg:pl-6'}`}>
                       <div>
                <div className="flex items-start justify-between gap-3 mb-6">
                  <div>
                    <h3 className="text-base font-bold font-display text-slate-900 dark:text-white uppercase tracking-wider mb-1 font-sans">Rincian Statistik</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      Distribusi Sentimen, Wilayah, Topik, dan Sumber Media
                    </p>
                  </div>
                  
                  {/* Dynamic Switcher button to swap layout column order */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLayoutOrderSwapped(!isLayoutOrderSwapped);
                      showToast(`Tata letak ditukar: ${!isLayoutOrderSwapped ? 'Rincian di Kiri' : 'Tren di Kiri'}`, 'success');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-700/10 hover:bg-blue-700/20 text-blue-800 dark:text-blue-400 text-[10px] font-extrabold flex items-center gap-1 border border-blue-700/15 transition cursor-pointer select-none whitespace-nowrap active:scale-95"
                    title="Tukar urutan kolom: Tren Volume vs Rincian Periode"
                  >
                    <span>⇄ Hubungkan Tata Letak</span>
                  </button>
                </div>
                
                {/* Mobile Segmented Sub-Tabs Indicator */}
                <div className="flex landscape:hidden sm:hidden items-center p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/5 mb-5 select-none">
                  <button 
                    onClick={() => {
                      setActiveMobileDetailTab('sentiment');
                      showToast('Melihat rincian sentimen', 'info');
                    }}
                    className={`flex-1 py-1.5 text-[9px] font-extrabold rounded-lg transition-all ${activeMobileDetailTab === 'sentiment' ? 'bg-white dark:bg-[#1a1924] text-blue-800 dark:text-blue-400 shadow-xs border border-slate-200/40 dark:border-white/5' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    Sentimen
                  </button>
                  <button 
                    onClick={() => {
                      setActiveMobileDetailTab('provinces');
                      showToast('Melihat rincian provinsi', 'info');
                    }}
                    className={`flex-1 py-1.5 text-[9px] font-extrabold rounded-lg transition-all ${activeMobileDetailTab === 'provinces' ? 'bg-white dark:bg-[#1a1924] text-blue-800 dark:text-blue-400 shadow-xs border border-slate-200/40 dark:border-white/5' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    Wilayah
                  </button>
                  <button 
                    onClick={() => {
                      setActiveMobileDetailTab('topics');
                      showToast('Melihat rincian isu', 'info');
                    }}
                    className={`flex-1 py-1.5 text-[9px] font-extrabold rounded-lg transition-all ${activeMobileDetailTab === 'topics' ? 'bg-white dark:bg-[#1a1924] text-blue-800 dark:text-blue-400 shadow-xs border border-slate-200/40 dark:border-white/5' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    Topik
                  </button>
                  <button 
                    onClick={() => {
                      setActiveMobileDetailTab('media');
                      showToast('Melihat rincian sumber media utama', 'info');
                    }}
                    className={`flex-1 py-1.5 text-[9px] font-extrabold rounded-lg transition-all ${activeMobileDetailTab === 'media' ? 'bg-white dark:bg-[#1a1924] text-blue-800 dark:text-blue-400 shadow-xs border border-slate-200/40 dark:border-white/5' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    📰 Media Utama
                  </button>
                </div>
 
                {/* Desktop layout scrollable container to match left chart height and prevent layout stretching */}
                <div className="lg:max-h-[350px] lg:overflow-y-auto lg:pr-1.5 lg:scrollbar-thin space-y-2 lg:pb-1">
                  <div className="grid grid-cols-1 gap-4">
                    {widgetOrder.map((widgetId) => {
                      if (widgetId === 'sentiment') {
                        return (
                          <div 
                            key="sentiment"
                            className={`space-y-2 p-2.5 rounded-2xl border border-transparent hover:bg-slate-50/45 dark:hover:bg-white/[0.01] transition-all duration-200 relative group/widget ${activeMobileDetailTab === 'sentiment' ? 'block' : 'hidden landscape:block sm:block'}`}
                          >
                            <div className="flex items-center justify-between pb-1">
                              <span className="block text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Sentimen</span>
                            </div>
                            <div className="space-y-2 pb-1">
                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px] font-bold">
                                  <span className="text-emerald-600 dark:text-emerald-400">Positif ({displayedMetrics.positive})</span>
                                  <span className="text-slate-500 dark:text-slate-400 font-mono">{displayedMetrics.positivePct}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${displayedMetrics.positivePct}%` }}
                                    transition={{ duration: 0.8, ease: "circOut", delay: 0.15 }}
                                    className="h-full bg-emerald-500 rounded-full" 
                                  />
                                </div>
                              </div>
                              
                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px] font-bold">
                                  <span className="text-red-500 dark:text-red-400">Negatif ({displayedMetrics.negative})</span>
                                  <span className="text-slate-500 dark:text-slate-400 font-mono">{displayedMetrics.negativePct}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${displayedMetrics.negativePct}%` }}
                                    transition={{ duration: 0.8, ease: "circOut", delay: 0.2 }}
                                    className="h-full bg-red-500 rounded-full" 
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px] font-bold">
                                  <span className="text-blue-500 dark:text-blue-400">Netral ({displayedMetrics.neutral})</span>
                                  <span className="text-blue-400 dark:text-blue-500 font-mono">{displayedMetrics.neutralPct}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${displayedMetrics.neutralPct}%` }}
                                    transition={{ duration: 0.8, ease: "circOut", delay: 0.25 }}
                                    className="h-full bg-blue-500 rounded-full" 
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (widgetId === 'provinces') {
                        return (
                          <div 
                            key="provinces"
                            className={`space-y-2 p-2.5 rounded-2xl border border-transparent hover:bg-slate-50/45 dark:hover:bg-white/[0.01] transition-all duration-200 relative group/widget ${activeMobileDetailTab === 'provinces' ? 'block' : 'hidden landscape:block sm:block'}`}
                          >
                            <div className="flex items-center justify-between pb-1">
                              <span className="block text-[10px] font-extrabold uppercase text-slate-455 dark:text-slate-500 tracking-wider">Provinsi</span>
                            </div>
                            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                              {displayedMetrics.topProvinces.length > 0 ? (
                                displayedMetrics.topProvinces.map((prov, i) => (
                                  <div 
                                    key={i} 
                                    onClick={() => {
                                      setSelectedProvince(prov.name);
                                      setSelectedRegionFilter(prov.name);
                                      showToast(`Fokus ke wilayah ${prov.name}`, 'info');
                                    }}
                                    className="flex items-center justify-between p-2 bg-slate-50 dark:bg-[#1a1924]/60 hover:bg-slate-100 dark:hover:bg-[#1e1c2a] rounded-xl border border-slate-105 dark:border-white/[0.02] cursor-pointer transition-colors"
                                  >
                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{prov.name}</span>
                                    <span className="text-[10px] font-mono font-extrabold text-blue-700 bg-blue-700/10 dark:bg-blue-700/20 px-2 py-0.5 rounded-full">{prov.count} Berita</span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 py-2">Tidak ada laporan wilayah.</div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      if (widgetId === 'topics') {
                        return (
                          <div 
                            key="topics"
                            className={`space-y-2 p-2.5 rounded-2xl border border-transparent hover:bg-slate-50/45 dark:hover:bg-white/[0.01] transition-all duration-200 relative group/widget ${activeMobileDetailTab === 'topics' ? 'block' : 'hidden landscape:block sm:block'}`}
                          >
                            <div className="flex items-center justify-between pb-1">
                              <span className="block text-[10px] font-extrabold uppercase text-slate-455 dark:text-slate-500 tracking-wider">Topik</span>
                            </div>
                            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                              {displayedMetrics.topTopics.length > 0 ? (
                                displayedMetrics.topTopics.map((topic, i) => (
                                  <div key={i} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-[#1a1924]/60 rounded-xl border border-slate-105 dark:border-white/[0.02]">
                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{topic.name}</span>
                                    <span className="text-[10px] font-mono font-extrabold text-[#f59e0b] bg-amber-500/10 dark:bg-amber-500/25 px-2 py-0.5 rounded-full">{topic.count} Topik</span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 py-2">Tidak ada isu.</div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      if (widgetId === 'media') {
                        const mediaList = analitikType === 'sosmed' ? displayedMetrics.topSocialMedia : displayedMetrics.topMedia;
                        const labelText = analitikType === 'sosmed' ? "Sumber Sosial Media Utama" : "Sumber Media Utama";
                        const emptyText = analitikType === 'sosmed' ? "Tidak ada sumber media sosial utama." : "Tidak ada sumber media utama.";
                        const itemLabel = analitikType === 'sosmed' ? "Post" : "Isu";

                        return (
                          <div 
                            key="media"
                            className={`space-y-2 p-2.5 rounded-2xl border border-transparent hover:bg-slate-50/45 dark:hover:bg-white/[0.01] transition-all duration-200 relative group/widget ${activeMobileDetailTab === 'media' ? 'block' : 'hidden landscape:block sm:block'}`}
                          >
                            <div className="flex items-center justify-between pb-1">
                              <span className="block text-[10px] font-extrabold uppercase text-slate-455 dark:text-slate-500 tracking-wider">{labelText}</span>
                            </div>
                            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                              {mediaList && mediaList.length > 0 ? (
                                mediaList.map((media, i) => (
                                  <div 
                                    key={i} 
                                    onClick={() => {
                                      setSearchFilterQuery(media.name);
                                      showToast(`Fokus filter monitoring ke media: "${media.name}"`, 'success');
                                    }}
                                    className="flex items-center justify-between p-2 bg-slate-50 dark:bg-[#1a1924]/60 hover:bg-slate-100 dark:hover:bg-[#1e1c2a] rounded-xl border border-slate-105 dark:border-white/[0.02] cursor-pointer transition-colors"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      <span className="text-[10px] font-mono text-slate-400 font-bold">#{i+1}</span>
                                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate" title={media.name}>{media.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="text-[9px] font-mono font-bold text-blue-800 dark:text-blue-400 bg-blue-700/10 dark:bg-blue-700/20 px-1.5 py-0.5 rounded" title="Kontribusi Persentase">{media.percentage}%</span>
                                      <span className="text-[10px] font-mono font-extrabold text-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20 px-2 py-0.5 rounded-full">{media.count} {itemLabel}</span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 py-2">{emptyText}</div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>     </div>

            </div>

          </div>
        </div>

        {/* DEDICATED SOCIAL MEDIA CRAWLING & ANALYSIS CARD */}
        {false && (
          <div 
            style={{ order: dashboardSections.indexOf('social') }}
            className="bg-white dark:bg-[#121118] border border-slate-200/50 dark:border-white/5 rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 md:p-6 shadow-xl dark:shadow-black/40 space-y-5 flex flex-col relative group/section transition-all duration-300"
          >
          {/* Floating Section Reordering Utilities */}
          <div className="absolute top-2 right-4 z-30 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 py-1 px-2.5 rounded-lg text-[10px] font-black text-slate-500 dark:text-slate-400 opacity-0 group-hover/section:opacity-100 focus-within:opacity-100 hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm select-none">
            <span className="text-blue-800 dark:text-blue-400 mr-2 uppercase tracking-wider font-extrabold font-mono text-[8px]">Media Sosial</span>
            <button
              onClick={(e) => { e.stopPropagation(); moveSection('social', 'up'); }}
              disabled={dashboardSections.indexOf('social') === 0}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 p-0.5 cursor-pointer"
              title="Urutkan ke Atas"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); moveSection('social', 'down'); }}
              disabled={dashboardSections.indexOf('social') === dashboardSections.length - 1}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 p-0.5 cursor-pointer"
              title="Urutkan ke Bawah"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Header Row: Title, Subtitle and Action controllers */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/[0.03]">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
                <Twitter className="w-4 h-4 text-sky-500" />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Klasemen kontributor dan arus pos real-time via TwitterAPI.io</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 select-none">
              <button
                type="button"
                disabled={isCrawlSyncing}
                onClick={async () => {
                  showToast('Memulai sinkronisasi & crawling data Twitter/X...', 'info');
                  await triggerAutoSync();
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs border ${
                  isCrawlSyncing 
                    ? 'bg-slate-100 dark:bg-white/5 text-slate-400 border-slate-200/40 cursor-not-allowed'
                    : 'bg-sky-500 hover:bg-sky-600 text-white border-sky-600 hover:shadow-md active:scale-95 cursor-pointer'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCrawlSyncing ? 'animate-spin' : ''}`} />
                <span>{isCrawlSyncing ? 'Sedang Crawling...' : 'Crawl X/Twitter Sekarang'}</span>
              </button>

              <div className="text-[9.5px] uppercase font-mono font-extrabold text-sky-600 dark:text-sky-450 bg-sky-500/10 px-3 py-1.5 rounded-xl border border-sky-500/20 flex items-center gap-1.5">
                <span>{settings.twitterApiIoKey ? 'TwitterAPI.io Aktif' : 'Simulasi Aktif'}</span>
              </div>
            </div>
          </div>

          {/* Main Card Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Leaderboard / Klasemen Media Sosial (Col span 5) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="p-1 rounded-lg bg-sky-500/10 text-sky-500">
                    <Activity className="w-3.5 h-3.5" />
                  </span>
                  <h4 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wider">Leaderboard Akun & Sumber Teraktif</h4>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium font-mono">
                  {displayedMetrics.topSocialMedia ? displayedMetrics.topSocialMedia.length : 0} sumber
                </span>
              </div>

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
                {displayedMetrics.topSocialMedia && displayedMetrics.topSocialMedia.length > 0 ? (
                  displayedMetrics.topSocialMedia.map((media: any, i: number) => {
                    const name = media.name;
                    const handle = name.toLowerCase().replace(/[^a-z0-9_]/g, '');
                    const isSelected = searchFilterQuery === name;
                    
                    return (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => {
                          if (isSelected) {
                            setSearchFilterQuery('');
                            showToast(`Membersihkan filter monitoring`, 'info');
                          } else {
                            setSearchFilterQuery(name);
                            showToast(`Fokus filter monitoring ke media sosial: "${name}"`, 'success');
                          }
                        }}
                        className={`group flex flex-col p-3 bg-slate-55 dark:bg-[#1a1924]/60 hover:bg-slate-100 dark:hover:bg-[#1e1c2a] rounded-xl border cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-sky-500 ring-2 ring-sky-500/10 shadow-md bg-sky-500/[0.02] dark:bg-sky-500/[0.04]' 
                            : 'border-slate-100 dark:border-white/[0.02] hover:border-slate-300 dark:hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {i < 3 ? (
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                i === 0 ? 'bg-amber-500 text-amber-950 shadow-sm' :
                                i === 1 ? 'bg-slate-300 text-slate-900 shadow-sm' :
                                'bg-amber-700 text-amber-50 shadow-sm'
                              }`}>
                                {i + 1}
                              </span>
                            ) : (
                              <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-[10px] font-mono font-bold text-slate-400 shrink-0">
                                #{i + 1}
                              </span>
                            )}
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate block" title={name}>{name}</span>
                              <span className="text-[9px] font-mono text-slate-400 truncate block">@{handle}</span>
                            </div>
                          </div>
                          
                          <div className="text-right shrink-0">
                            <span className="text-[11px] font-mono font-extrabold text-sky-500 bg-sky-500/10 dark:bg-sky-500/20 px-2 py-0.5 rounded-full">
                              {media.count} Pos
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full mt-1.5">
                          <div className="flex justify-between items-center text-[9px] text-slate-400 mb-1 font-mono">
                            <span>Kerapatan Kontribusi</span>
                            <span className="font-bold text-sky-500">{media.percentage}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${media.percentage}%` }}
                              transition={{ duration: 0.8, ease: "circOut" }}
                              className="h-full bg-sky-500 rounded-full" 
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500 text-xs bg-slate-50 dark:bg-[#1a1924]/20 rounded-2xl border border-dashed border-slate-200/40">
                    <Twitter className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2 stroke-[1.5]" />
                    <span>Tidak ada data klasemen media sosial untuk periode ini.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Pos Terkini Feed (Col span 7) */}
            <div className="lg:col-span-7 space-y-4 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-white/[0.03] pt-6 lg:pt-0 lg:pl-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="p-1 rounded-lg bg-sky-500/10 text-sky-500">
                      <Newspaper className="w-3.5 h-3.5" />
                    </span>
                    <h4 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wider">Alur Pos Real-Time X/Twitter</h4>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-bold bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                    {socialMediaNewsItems.length} pos terdeteksi
                  </span>
                </div>

                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1.5 scrollbar-thin">
                  {socialMediaNewsItems.length > 0 ? (
                    socialMediaNewsItems.map((item, index) => {
                      const sentiment = item.sentiment || 'Netral';
                      const isPositive = sentiment === 'Positif';
                      const isNegative = sentiment === 'Negatif';
                      
                      const sentimentColor = isPositive 
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' 
                        : isNegative 
                        ? 'text-red-500 dark:text-red-400 bg-red-500/10' 
                        : 'text-slate-500 dark:text-slate-400 bg-slate-500/10';
                        
                      const SentimentIcon = isPositive ? Smile : isNegative ? Frown : Meh;
                      const authorName = item.mediaName || 'X User';
                      const initial = authorName.replace(/^@/, '').substring(0, 1).toUpperCase();
                      
                      const colors = [
                        'from-pink-500 to-rose-500',
                        'from-blue-700 to-indigo-500',
                        'from-blue-500 to-sky-500',
                        'from-teal-500 to-emerald-500',
                        'from-amber-500 to-orange-500'
                      ];
                      const colorIndex = Math.abs(authorName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
                      const avatarGradient = colors[colorIndex];

                      return (
                        <motion.div 
                          key={item.id || index}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(index * 0.05, 0.4) }}
                          className="p-4 bg-slate-50/45 dark:bg-[#15141e]/50 hover:bg-slate-50/80 dark:hover:bg-[#171622]/85 rounded-2xl border border-slate-100/60 dark:border-white/[0.02] transition-colors flex gap-3 relative group/tweet"
                        >
                          <div className={`w-9 h-9 rounded-full shrink-0 bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-extrabold text-xs shadow-sm`}>
                            {initial}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{authorName}</span>
                                <span className="text-[9px] font-mono text-slate-400">@{authorName.toLowerCase().replace(/[^a-z0-9_]/g, '')}</span>
                              </div>
                              <span className="text-[9px] font-mono text-slate-400 shrink-0">{item.publishDate} {item.publishTime || ''}</span>
                            </div>

                            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 break-words font-medium">
                              {item.title}
                            </p>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100/50 dark:border-white/[0.01]">
                              <div className="flex items-center gap-3">
                                <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${sentimentColor}`}>
                                  <SentimentIcon className="w-3 h-3" />
                                  <span>{sentiment}</span>
                                </span>
                                
                                {item.location && (
                                  <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                                    <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                    <span>{item.location}</span>
                                  </span>
                                )}
                              </div>

                              {item.link && (
                                <a 
                                  href={item.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[9.5px] font-bold text-sky-500 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300 flex items-center gap-0.5 opacity-0 group-hover/tweet:opacity-100 focus-within:opacity-100 transition-opacity"
                                >
                                  <span>Buka Pos</span>
                                  <Twitter className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 text-xs bg-slate-50 dark:bg-[#1a1924]/20 rounded-2xl border border-dashed border-slate-200/40">
                      <Newspaper className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2 stroke-[1.5]" />
                      <span>Belum ada pos media sosial (X/Twitter) untuk periode filter ini.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Informative Alert box inside columns */}
              <div className="mt-3 flex items-start gap-2 p-2.5 bg-sky-500/5 rounded-xl border border-sky-500/10 text-[9.5px] text-slate-400 dark:text-slate-500">
                <Info className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                <p>Klik salah satu baris klasemen akun di sebelah kiri untuk menyaring seluruh bagan dan peta khusus untuk data dari kontributor tersebut.</p>
              </div>
            </div>

          </div>
        </div>
        )}

        {/* BOTTOM ROW: GEOLOCATION SENTIMENT MAP WIDGET (Fully Integrated Split Dashboard: Map & Collapsible Detail Side-by-Side) */}
        <div 
          style={{ order: dashboardSections.indexOf('map') }}
          className="bg-white dark:bg-[#121118] border border-slate-200/50 dark:border-white/5 rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 md:p-6 shadow-xl dark:shadow-black/40 space-y-5 flex flex-col relative group/section transition-all duration-300"
        >
          {/* Floating Section Reordering Utilities */}
          <div className="absolute top-2 right-4 z-30 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 py-1 px-2.5 rounded-lg text-[10px] font-black text-slate-500 dark:text-slate-400 opacity-0 group-hover/section:opacity-100 focus-within:opacity-100 hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm select-none">
            <span className="text-blue-800 dark:text-blue-400 mr-2 uppercase tracking-wider font-extrabold font-mono text-[8px]">Peta Geolokasi</span>
            <button
              onClick={(e) => { e.stopPropagation(); moveSection('map', 'up'); }}
              disabled={dashboardSections.indexOf('map') === 0}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 p-0.5 cursor-pointer"
              title="Urutkan ke Atas"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); moveSection('map', 'down'); }}
              disabled={dashboardSections.indexOf('map') === dashboardSections.length - 1}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 p-0.5 cursor-pointer"
              title="Urutkan ke Bawah"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
          
          {/* Header Row: Flex layout with Title and Toggle Controllers */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/[0.03]">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a8a] animate-pulse" />
                <h3 className="text-base font-bold font-display text-slate-900 dark:text-white uppercase tracking-wider">Geolokasi Sentimen Nasional</h3>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Peta Sebaran Provinsi</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-start md:self-auto select-none">
              <button
                type="button"
                onClick={() => setIsMapDetailPanelOpen(!isMapDetailPanelOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-700/10 dark:hover:bg-blue-700/20 text-[10.5px] font-extrabold text-[#1e3a8a] dark:text-blue-400 border border-blue-700/15 transition-all cursor-pointer shadow-xs"
                title="Sembunyikan atau tampilkan panel detail analisis wilayah"
              >
                <span>{isMapDetailPanelOpen ? "Tutup Detail Daerah" : "Buka Detail Daerah"}</span>
                {isMapDetailPanelOpen ? <ChevronUp className="w-3.5 h-3.5 animate-pulse" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <div className="text-[9.5px] uppercase font-mono font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>Interaktif</span>
              </div>
            </div>
            </div>

          {/* SAJIAN UTAMA: INTEGRATED MAP & DETAIL SPLIT GRID */}
          <div className="grid grid-cols-1 landscape:grid-cols-12 lg:grid-cols-12 gap-5 items-stretch w-full min-h-[300px]">
            
            {/* LEFT PANE: Dynamic-width OSM Map container */}
            <div className={`transition-all duration-500 ease-in-out flex flex-col justify-between ${
              isMapDetailPanelOpen ? "landscape:col-span-8 lg:col-span-8 w-full" : "landscape:col-span-12 lg:col-span-12 w-full"
            }`}>
              <div className="w-full h-[300px] sm:h-[390px] lg:h-[450px] rounded-[20px] sm:rounded-[24px] overflow-hidden border border-slate-200/35 dark:border-white/5 relative z-0 shadow-inner group">
                <OSMMap 
                  selectedProvince={selectedProvince}
                  setSelectedProvince={(prov) => {
                    setSelectedProvince(prov);
                    setSelectedRegionFilter(prov === 'Nasional' ? 'Semua' : prov);
                  }}
                  provinceStats={provinceStats}
                  filteredNews={periodFilteredNews}
                  isDetailOpen={isMapDetailPanelOpen}
                  onViewAll={(provName) => {
                    if (analitikType === 'sosmed') {
                      setSocialLocationFilter(provName === 'Nasional' ? 'Semua' : provName);
                      setTab('social-news');
                    } else {
                      setPortalLocationFilter(provName);
                      setTab('portal');
                    }
                  }}
                />
              </div>
            </div>

            {/* RIGHT PANE: Collapsible Sidebar Detail Analisis Wilayah */}
            <AnimatePresence initial={false}>
              {isMapDetailPanelOpen && (
                <motion.div
                  key="map-detail-collapse-panel"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="landscape:col-span-4 lg:col-span-4 w-full flex flex-col h-full"
                >
                  {(() => {
                    const statsKey = Object.keys(provinceStats).find(
                      k => normalizeProvinceName(k) === normalizeProvinceName(selectedProvince)
                    );
                    const pData = (statsKey ? provinceStats[statsKey] : null) || { newsCount: 0, positif: 0, negatif: 0, netral: 0, criticalIssues: [] };
                    const total = pData.newsCount || 1;
                    const posPct = Math.round((pData.positif / total) * 100);
                    const negPct = Math.round((pData.negatif / total) * 100);
                    const netPct = 100 - posPct - negPct;

                    let warningText = "SITUASI KONDUSIF";
                    let warningColorClass = "text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20";
                    let WarningIcon = CheckCircle2;

                    if (pData.newsCount === 0) {
                      warningText = "BELUM ADA ISU AKTIF";
                      warningColorClass = "text-slate-500 dark:text-slate-400 bg-slate-500/5 dark:bg-slate-500/10 border-slate-500/10";
                      WarningIcon = Info;
                    } else if (pData.negatif > pData.positif + pData.netral) {
                      warningText = "MASALAH NEGATIF DOMINAN";
                      warningColorClass = "text-red-600 dark:text-red-400 bg-red-500/5 dark:bg-red-500/10 border-red-500/20";
                      WarningIcon = AlertTriangle;
                    } else if (pData.negatif > pData.positif) {
                      warningText = "PERINGATAN: RISIKO ISU MENINGKAT";
                      warningColorClass = "text-amber-600 dark:text-amber-400 bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/25";
                      WarningIcon = AlertTriangle;
                    } else if (pData.positif > pData.negatif) {
                      warningText = "DOMINAN POSITIF";
                      warningColorClass = "text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/10";
                      WarningIcon = CheckCircle2;
                    } else {
                      warningText = "TREN PUBLIK NETRAL";
                      warningColorClass = "text-blue-600 dark:text-blue-400 bg-[#1e3a8a]/5 dark:bg-[#1e3a8a]/10 border-[#1e3a8a]/15";
                      WarningIcon = Activity;
                    }

                    return (
                      <div className={`border border-slate-200/50 dark:border-slate-800 bg-slate-50/50 dark:bg-black/15 rounded-2xl flex flex-col justify-between h-full transition-all duration-300 ${isDetailCompact ? 'p-2.5 space-y-2' : 'p-4 space-y-3.5'}`}>
                        
                        {/* Header Box */}
                        <div className={`border-b border-slate-200/50 dark:border-white/5 ${isDetailCompact ? 'pb-2' : 'pb-3'}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[9.5px] uppercase font-black tracking-widest text-[#1e3a8a] dark:text-blue-400 font-mono">DETAIL ANALISIS WILAYAH</span>
                            <div className="flex items-center gap-2">
                              <span 
                                onClick={() => {
                                  setSelectedProvince('Nasional');
                                  setSelectedRegionFilter('Semua');
                                  showToast('Fokus regional direset ke Nasional.', 'info');
                                }}
                                className="text-[9.5px] font-extrabold text-[#1e3a8a] dark:text-blue-400 hover:underline cursor-pointer uppercase tracking-wider"
                              >
                                Reset
                              </span>
                            </div>
                          </div>
                          
                          <h4 className={`font-black text-slate-900 dark:text-white flex items-center gap-1.5 font-display tracking-tight ${isDetailCompact ? 'text-sm mt-1' : 'text-base mt-1.5'}`}>
                            <span className="text-blue-700">📍</span>
                            <span>{selectedProvince}</span>
                          </h4>
                        </div>

                        {/* Scrollable Container Body */}
                        <div className={`flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 ${isDetailCompact ? 'max-h-[300px] lg:max-h-[340px] space-y-2' : 'max-h-[370px] lg:max-h-[400px] space-y-3.5'}`} id="detail-analysis-scrollable-body">

                          {/* Total Isu Block */}
                          <motion.div 
                            initial={{ opacity: 0, y: 12, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.45, ease: "easeOut" }}
                            className={`bg-white dark:bg-[#1a1924]/60 border border-slate-200/40 dark:border-white/5 rounded-xl flex items-center justify-between shadow-xs transition-all ${isDetailCompact ? 'p-2' : 'p-3'}`}
                          >
                            <div>
                              <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">Total Isu Wilayah</span>
                              <div className={`font-black font-display font-mono text-violet-605 dark:text-blue-400 mt-0.5 ${isDetailCompact ? 'text-base' : 'text-lg'}`}>
                                {pData.newsCount} <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Laporan</span>
                              </div>
                            </div>
                            <div className={`bg-blue-700/10 dark:bg-blue-700/20 rounded-lg text-blue-700 ${isDetailCompact ? 'p-1.5' : 'p-2'}`}>
                              <Activity className="w-4 h-4" />
                            </div>
                          </motion.div>

                          {/* Section 1: Sebaran & Statistik Sentimen */}
                          <div className="border border-slate-200/20 dark:border-white/5 rounded-xl bg-slate-100/10 dark:bg-slate-900/10 overflow-hidden">
                            <div className={`w-full flex items-center justify-between text-[8px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400 font-mono select-none ${isDetailCompact ? 'px-2 py-1.5' : 'px-3 py-2'}`}>
                              <span className="flex items-center gap-1">RASIO SENTIMEN</span>
                            </div>

                            <div className={`border-t border-slate-200/10 dark:border-white/5 transition-all ${isDetailCompact ? 'p-1.5 space-y-1.5' : 'p-3 space-y-3'}`}>
                                {/* Grid: 3 Sentiment values cards */}
                                <div className="grid grid-cols-3 gap-1.5">
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.93, y: 8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
                                    className="bg-white dark:bg-[#1a1924]/60 border border-slate-200/40 dark:border-white/5 p-1.5 rounded-xl flex flex-col hover:border-emerald-500/20 transition-all duration-300 shadow-xs"
                                  >
                                    <span className="text-[8px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Positif</span>
                                    <div className="flex items-baseline gap-0.5 mt-0.5">
                                      <span className="text-xs font-black font-mono text-emerald-500">{pData.positif}</span>
                                      {pData.newsCount > 0 && <span className="text-[7.5px] font-bold text-emerald-500">({posPct}%)</span>}
                                    </div>
                                  </motion.div>

                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.93, y: 8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                                    className="bg-white dark:bg-[#1a1924]/60 border border-slate-200/40 dark:border-white/5 p-1.5 rounded-xl flex flex-col hover:border-red-500/20 transition-all duration-300 shadow-xs"
                                  >
                                    <span className="text-[8px] uppercase font-bold text-red-500 dark:text-red-400 tracking-wider">Negatif</span>
                                    <div className="flex items-baseline gap-0.5 mt-0.5">
                                      <span className="text-xs font-black font-mono text-red-500">{pData.negatif}</span>
                                      {pData.newsCount > 0 && <span className="text-[7.5px] font-bold text-red-500">({negPct}%)</span>}
                                    </div>
                                  </motion.div>

                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.93, y: 8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
                                    className="bg-white dark:bg-[#1a1924]/60 border border-slate-200/40 dark:border-white/5 p-1.5 rounded-xl flex flex-col hover:border-blue-500/20 transition-all duration-300 shadow-xs"
                                  >
                                    <span className="text-[8px] uppercase font-bold text-blue-500 dark:text-blue-400 tracking-wider">Netral</span>
                                    <div className="flex items-baseline gap-0.5 mt-0.5">
                                      <span className="text-xs font-black font-mono text-blue-600 dark:text-blue-400">{pData.netral}</span>
                                      {pData.newsCount > 0 && <span className="text-[7.5px] font-bold text-blue-500/80">({netPct}%)</span>}
                                    </div>
                                  </motion.div>
                                </div>

                                {/* Ratio Progress Bar */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-[7.5px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                                    <span>Distribusi Rasio</span>
                                    <span>{posPct}% / {negPct}% / {netPct}%</span>
                                  </div>
                                  {pData.newsCount > 0 ? (
                                    <div className="h-2 w-full flex rounded-full overflow-hidden bg-slate-205 dark:bg-slate-800 shadow-inner">
                                      {pData.positif > 0 && <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${posPct}%` }} title={`Positif: ${posPct}%`} />}
                                      {pData.negatif > 0 && <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${negPct}%` }} title={`Negatif: ${negPct}%`} />}
                                      {pData.netral > 0 && <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${netPct}%` }} title={`Netral: ${netPct}%`} />}
                                    </div>
                                  ) : (
                                    <div className="text-[9px] text-slate-400 dark:text-slate-500 italic text-center py-0.5">Belum ada aktivitas</div>
                                  )}
                                </div>
                              </div>
                          </div>

                          {/* Section 2: Diagnosis & Pilihan Isu */}
                          <div className="border border-slate-200/20 dark:border-white/5 rounded-xl bg-slate-100/10 dark:bg-slate-900/10 overflow-hidden">
                            <div className={`w-full flex items-center justify-between text-[8px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400 font-mono select-none ${isDetailCompact ? 'px-2 py-1.5' : 'px-3 py-2'}`}>
                              <span className="flex items-center gap-1">INTERAKSI TOPIK</span>
                            </div>

                            <div className={`border-t border-slate-200/10 dark:border-white/5 space-y-3.5 transition-all ${isDetailCompact ? 'p-1.5' : 'p-3'}`}>
                                {/* Status Diagnosis Sentimen */}
                                <div>
                                  <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest block mb-1">Status Sentimen</span>
                                  <div className={`rounded-xl border flex items-center gap-2 text-xs font-semibold leading-relaxed ${warningColorClass} ${isDetailCompact ? 'p-2' : 'p-3'}`}>
                                    <WarningIcon className="w-4 h-4 shrink-0 animate-pulse" />
                                    <span className="text-[9px] uppercase font-extrabold tracking-wide">{warningText}</span>
                                  </div>
                                </div>

                                {/* Interaktif Topik & Tags Diagnosis */}
                                {(() => {
                                  const provNews = periodFilteredNewsExceptRegion.filter(item => (item.location || 'Nasional') === selectedProvince);
                                  
                                  const provCategoriesMap: Record<string, number> = {};
                                  const provTagsMap: Record<string, number> = {};
                                  
                                  provNews.forEach(item => {
                                    if (item.categoryName) {
                                      provCategoriesMap[item.categoryName] = (provCategoriesMap[item.categoryName] || 0) + 1;
                                    }
                                    if (Array.isArray(item.tags)) {
                                      item.tags.forEach(t => {
                                        if (t) {
                                          const cleanT = t.trim();
                                          if (cleanT) {
                                            provTagsMap[cleanT] = (provTagsMap[cleanT] || 0) + 1;
                                          }
                                        }
                                      });
                                    }
                                  });

                                  const sortedCategories = Object.entries(provCategoriesMap)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([name, count]) => ({ name, count }));

                                  const sortedTags = Object.entries(provTagsMap)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([name, count]) => ({ name, count }));

                                  if (provNews.length === 0) {
                                    return (
                                      <div className="text-center py-3 text-[9.5px] text-slate-400 dark:text-slate-500 font-medium italic">
                                        Tidak ada topik atau kata kunci aktif di provinsi ini.
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="space-y-3 pt-2.5 border-t border-slate-200/10 dark:border-white/5">
                                      {/* Topik Terdeteksi */}
                                      {sortedCategories.length > 0 && (
                                        <div className="space-y-1">
                                          <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest block">
                                            Topik Terdeteksi ({sortedCategories.length})
                                          </span>
                                          <div className="flex flex-wrap gap-1">
                                            {sortedCategories.map(({ name, count }) => {
                                              const isSelected = selectedCategoryFilter === name;
                                              return (
                                                <button
                                                  type="button"
                                                  key={name}
                                                  onClick={() => {
                                                    if (isSelected) {
                                                      setSelectedCategoryFilter('Semua');
                                                      showToast('Filter topik dibersihkan.', 'info');
                                                    } else {
                                                      setSelectedCategoryFilter(name);
                                                      showToast(`Dasbor difilter ke topik: ${name}`, 'success');
                                                    }
                                                  }}
                                                  className={`px-2 py-0.5 rounded-lg text-[9px] font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer border ${
                                                    isSelected
                                                      ? "bg-blue-800 border-blue-900 text-white shadow-xs"
                                                      : "bg-[#1e3a8a]/5 hover:bg-[#1e3a8a]/10 dark:bg-blue-700/5 dark:hover:bg-blue-700/10 text-[#1e3a8a] dark:text-blue-400 border-blue-700/15"
                                                  }`}
                                                >
                                                  <span>{name}</span>
                                                  <span className={`px-1 py-0.2 rounded text-[7.5px] font-bold ${
                                                    isSelected ? "bg-blue-950 text-white" : "bg-blue-100 dark:bg-blue-950 text-[#1e3a8a] dark:text-blue-300"
                                                  }`}>
                                                    {count}
                                                  </span>
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      {/* Kata Kunci / Tags Terdeteksi */}
                                      {sortedTags.length > 0 && (
                                        <div className="space-y-1">
                                          <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest block">
                                            Kata Kunci Isu ({Math.min(8, sortedTags.length)})
                                          </span>
                                          <div className="flex flex-wrap gap-1">
                                            {sortedTags.slice(0, 8).map(({ name, count }) => {
                                              const isSelected = searchFilterQuery.toLowerCase() === name.toLowerCase();
                                              return (
                                                <button
                                                  type="button"
                                                  key={name}
                                                  onClick={() => {
                                                    if (isSelected) {
                                                      setSearchFilterQuery('');
                                                      showToast('Pencarian kata kunci dibersihkan.', 'info');
                                                    } else {
                                                      setSearchFilterQuery(name);
                                                      showToast(`Mencari kata kunci: ${name}`, 'success');
                                                    }
                                                  }}
                                                  className={`px-1.5 py-0.5 rounded-lg text-[8.5px] font-medium transition-all duration-150 flex items-center gap-0.5 cursor-pointer border ${
                                                    isSelected
                                                      ? "bg-[#0ea5e9] border-[#0284c7] text-white shadow-xs"
                                                      : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                                                  }`}
                                                >
                                                  <span>#{name}</span>
                                                  <span className={`text-[7px] font-bold px-0.5 rounded ${isSelected ? "text-sky-100" : "text-slate-400"}`}>
                                                    ({count})
                                                  </span>
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                          </div>

                        </div>

                        {/* Bottom Hint */}
                        <div className={`border-t border-slate-200/50 dark:border-white/5 text-center ${isDetailCompact ? 'pt-1 mt-0.5' : 'pt-2'}`}>
                          <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 leading-tight">
                            Klik wilayah provinsi pada Pin.
                          </span>
                        </div>

                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Informative Help Alert Banner (Compact on bottom) */}
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-white/[0.01] rounded-xl border border-slate-200/30 dark:border-white/[0.02] text-[10px] text-slate-400 dark:text-slate-500">
            <Info className="w-3.5 h-3.5 text-blue-700 shrink-0" />
            <p>Klik salah satu pin wilayah di peta di atas untuk Detail.</p>
          </div>

        </div>

        {/* INTERAKTIF HEATMAP INTENSITAS KATA KUNCI */}
        <div 
          style={{ order: dashboardSections.indexOf('heatmap') }}
          className="relative group/section transition-all duration-300"
        >
          {/* Floating Section Reordering Utilities */}
          <div className="absolute top-2 right-4 z-30 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 py-1 px-2.5 rounded-lg text-[10px] font-black text-slate-500 dark:text-slate-400 opacity-0 group-hover/section:opacity-100 focus-within:opacity-100 hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm select-none">
            <span className="text-blue-800 dark:text-blue-400 mr-2 uppercase tracking-wider font-extrabold font-mono text-[8px]">Heatmap Isu</span>
            <button
              onClick={(e) => { e.stopPropagation(); moveSection('heatmap', 'up'); }}
              disabled={dashboardSections.indexOf('heatmap') === 0}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 p-0.5 cursor-pointer"
              title="Urutkan ke Atas"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); moveSection('heatmap', 'down'); }}
              disabled={dashboardSections.indexOf('heatmap') === dashboardSections.length - 1}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 p-0.5 cursor-pointer"
              title="Urutkan ke Bawah"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <HeatmapWidget 
            periodFilteredNews={periodFilteredNews}
            searchFilterQuery={searchFilterQuery}
            setSearchFilterQuery={setSearchFilterQuery}
            showToast={showToast}
            selectedProvince={selectedProvince}
            setSelectedProvince={setSelectedProvince}
          />
        </div>
      </div>

    </div>

  );
};
