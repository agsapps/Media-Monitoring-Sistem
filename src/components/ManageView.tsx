import React, { useState, useMemo } from 'react';
import { useAppState } from '../AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileEdit, Trash2, CheckCircle2, AlertCircle, Sparkles, Plus, Search, 
  Eye, Save, X, ExternalLink, RefreshCw, HelpCircle, FileText, Calendar, Clock,
  FileSpreadsheet, Globe, Star, UploadCloud, Pin, ArrowUp, ArrowDown, Pencil, MapPin,
  SlidersHorizontal, ChevronDown, Filter, RotateCcw, Check, Terminal, Bug, Activity
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { NewsItem, Sentiment, NewsStatus, PROVINCES, formatDateDDMMYYYY, cleanTitleText } from '../types';
import { 
  initGoogleAuth, googleSignIn, googleSignOut, getCachedAccessToken, setCachedAccessToken
} from '../googleAuth';
import { 
  createSpreadsheet, appendIssueToSheet, bulkExportIssuesToSheet, getSpreadsheetSheets,
  readIssuesFromSheet, bulkExportSocialToSheet
} from '../sheetsService';
import { ImportIssuesModal } from './ImportIssuesModal';

const splitSummaryParts = (text: string) => {
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

const findBestCategoryMatch = (recName: string, categoriesList: { id: string; name: string }[]): { id: string; name: string } => {
  if (!recName || !categoriesList || categoriesList.length === 0) {
    return categoriesList[0] || { id: 'cat-1', name: 'Subsidi & Distribusi' };
  }

  const cleanRec = recName.trim().toLowerCase();

  // 1. Exact match (case insensitive)
  const exact = categoriesList.find(c => c.name.toLowerCase() === cleanRec);
  if (exact) return exact;

  // 2. Map known variations or synonyms to help resolve the correct category
  const synonymMap: Record<string, string[]> = {
    'cat-1': ['subsidi', 'distribusi', 'penyaluran', 'pasokan', 'kuota', 'supply', 'disalurkan', 'stok bbm', 'subsidi & distribusi', 'distribusi bbm'],
    'cat-2': ['penyalahgunaan bbm', 'penyelewengan bbm', 'penyelundupan bbm', 'penyalahgunaan solar', 'penyelewengan solar', 'penyelundupan solar', 'penyalahgunaan pertalite', 'sindikat bbm', 'solar bersubsidi', 'penyalahgunaan bbm bersubsidi', 'penyelewengan bbm bersubsidi', 'penyalahgunaan bbm', 'penyelundup bbm', 'penyeleweng solar', 'penyelundupan bbm bersubsidi'],
    'cat-3': ['antrean bbm', 'antrean spbu', 'antre bbm', 'antrean panjang', 'antre solar', 'kemacetan spbu', 'mengantre', 'antrean kendaraan', 'antrean', 'antri', 'antri spbu'],
    'cat-4': ['spbu meledak', 'kebakaran spbu', 'spbu terbakar', 'ledakan spbu', 'kebakaran pertashop', 'meledak', 'ledakan', 'spbu kebakaran'],
    'cat-5': ['penimbunan bbm', 'timbun solar', 'timbun pertalite', 'gudang solar', 'gudang bbm ilegal', 'penimbunan solar', 'penimbunan pertalite', 'timbun bbm', 'penimbunan', 'penimbun solar'],
    'cat-6': ['penimbunan lpg', 'timbun lpg', 'penimbunan elpiji', 'timbun elpiji', 'penimbunan lpg 3kg', 'penimbun gas lpg'],
    'cat-7': ['kenaikan harga bbm', 'harga bbm naik', 'penyesuaian harga bbm', 'tarif bbm naik', 'harga bbm', 'kenaikan bbm'],
    'cat-8': ['kenaikan harga lpg', 'harga lpg naik', 'penyesuaian harga lpg', 'tarif lpg naik', 'harga lpg', 'kenaikan lpg'],
    'cat-9': ['penyalahgunaan lpg', 'oplos lpg', 'oplosan gas', 'lpg ilegal', 'penyalahgunaan elpiji', 'penyelewengan lpg', 'oplos elpiji', 'oplos lpg 3kg', 'gas oplosan', 'oplos gas elpiji'],
    'cat-10': ['lingkungan', 'esg', 'pencemaran', 'limbah', 'emisi', 'karbon', 'go green', 'keberlanjutan', 'lingkungan & esg'],
    'cat-11': ['hsse', 'safety', 'kecelakaan kerja', 'pipa bocor', 'ledakan kilang', 'hse', 'kebocoran pipa', 'insiden kerja', 'insiden hsse'],
    'cat-12': ['kebijakan pemerintah', 'kebijakan', 'pemerintah', 'esdm', 'bph migas', 'kementerian', 'regulator'],
    'cat-13': ['regulasi', 'aturan', 'uu', 'perpres', 'peraturan', 'hukum migas'],
    'cat-14': ['korupsi', 'suap', 'gratifikasi', 'hukum', 'penyelidikan', 'kejaksaan', 'kejagung', 'polres', 'ditangkap', 'tersangka', 'pidana', 'kasus hukum', 'sidang', 'penipuan', 'mafia', 'polisi', 'korupsi & hukum'],
    'cat-15': ['infrastruktur', 'pembangunan terminal', 'depot bbm', 'kilang', 'tangki timbun', 'pipa transmisi'],
    'cat-16': ['transportasi', 'truk tangki', 'armada', 'kapal tanker'],
    'cat-17': ['investasi', 'pendanaan', 'saham', 'ekspansi', 'permodalan'],
    'cat-18': ['csr', 'tjsl', 'tanggung jawab sosial', 'bantuan pertamina', 'pemberdayaan masyarakat', 'csr & tjsl'],
    'cat-19': ['politik', 'pemilu', 'pilkada', 'kampanye', 'dpr'],
    'cat-20': ['sosial', 'masyarakat', 'demo', 'protes', 'unjuk rasa', 'warga mengeluh', 'sosial kemasyarakatan'],
    'cat-21': ['ekonomi', 'keuangan', 'inflasi', 'fiskal', 'pajak', 'keuntungan', 'pendapatan', 'ekonomi & keuangan'],
  };

  let bestScore = 0;
  let bestCategory = null;

  for (const cat of categoriesList) {
    const synonyms = synonymMap[cat.id] || [];
    for (const syn of synonyms) {
      if (cleanRec === syn) {
        return cat;
      }
      if (cleanRec.includes(syn) || syn.includes(cleanRec)) {
        const score = syn.length;
        if (score > bestScore) {
          bestScore = score;
          bestCategory = cat;
        }
      }
    }
  }

  if (bestCategory) return bestCategory;

  const partialMatch = categoriesList.find(c => 
    cleanRec.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(cleanRec)
  );
  if (partialMatch) return partialMatch;

  return categoriesList[0] || { id: 'cat-1', name: 'Subsidi & Distribusi' };
};


const getCategoryEmoji = (name: string): string => {
  const norm = name.toLowerCase();
  if (norm.includes('subsidi') || norm.includes('distribusi')) return '📦';
  if (norm.includes('korupsi') || norm.includes('fraud') || norm.includes('mafia')) return '🔍';
  if (norm.includes('hsse') || norm.includes('operasional')) return '⚡';
  if (norm.includes('demo') || norm.includes('demonstrasi') || norm.includes('sosial')) return '🗣️';
  if (norm.includes('hukum') || norm.includes('keamanan') || norm.includes('aset')) return '⚖️';
  if (norm.includes('harga') || norm.includes('tarif') || norm.includes('kebijakan')) return '💰';
  if (norm.includes('pasokan') || norm.includes('langka') || norm.includes('kelangkaan')) return '🚨';
  if (norm.includes('investasi') || norm.includes('korporasi') || norm.includes('bumn')) return '📈';
  return '📁';
};

export const ManageView: React.FC = () => {
  const { 
    news, categories, medias, saveNewsItem, removeNewsItem, batchDeleteNews, batchImportNews, batchUpdateCategory, batchUpdatePublishDate, batchUpdatePublishTime, batchUpdateSentiment, batchUpdateLocation,
    analyzeWithGemini, crawlGoogleNews, showToast, user, settings, saveSettings, setSelectedProvince, setTab,
    highlights, saveHighlight, removeHighlight, keywords, saveKeyword, removeKeyword, reorderHighlights, socialNews,
    authFetch
  } = useAppState();

  const [manageSubTab, setManageSubTab] = useState<'database' | 'highlights' | 'crawler-logs'>('database');

  // Crawler/Playwright Logs States
  const [crawlerLogs, setCrawlerLogs] = useState<any[]>([]);
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'warning' | 'error'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Test URL States
  const [testUrlInput, setTestUrlInput] = useState('');
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleTestUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testUrlInput.trim()) {
      showToast('Harap masukkan URL untuk diuji!', 'error');
      return;
    }

    setIsTestingUrl(true);
    setTestResult(null);
    showToast('Memulai pengujian perayap Playwright (berkisar 5-15 detik)...', 'info');

    try {
      const response = await authFetch('/api/crawler-logs/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: testUrlInput.trim() })
      });

      const data = await response.json();
      setTestResult(data);

      if (data.success) {
        showToast(`Pengujian Berhasil! Status HTTP: ${data.statusCode}. URL teresolusi dengan baik.`, 'success');
        fetchCrawlerLogs();
      } else {
        showToast(`Pengujian Gagal! ${data.errorMessage || 'Kesalahan tidak dikenal'}`, 'error');
        fetchCrawlerLogs();
      }
    } catch (err: any) {
      console.error('Error testing URL:', err);
      showToast(`Kesalahan jaringan/server: ${err.message || err}`, 'error');
    } finally {
      setIsTestingUrl(false);
    }
  };

  const fetchCrawlerLogs = async () => {
    setIsFetchingLogs(true);
    try {
      const response = await authFetch('/api/crawler-logs');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setCrawlerLogs(data);
        } else {
          console.warn('[Crawler Logs] Received non-JSON response from /api/crawler-logs:', response.status);
        }
      }
    } catch (err: any) {
      const isNetworkError = err instanceof TypeError || (err.message && err.message.toLowerCase().includes('fetch'));
      if (isNetworkError) {
        console.warn('Network issue fetching crawler logs in ManageView:', err.message);
      } else {
        console.error('Error fetching crawler logs:', err);
      }
    } finally {
      setIsFetchingLogs(false);
    }
  };

  const clearCrawlerLogs = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus semua riwayat log crawler?')) return;
    try {
      const response = await authFetch('/api/crawler-logs/clear', {
        method: 'POST'
      });
      if (response.ok) {
        setCrawlerLogs([]);
        showToast('Log crawler berhasil dikosongkan', 'success');
      } else {
        showToast('Gagal mengosongkan log crawler', 'error');
      }
    } catch (err) {
      console.error('Error clearing crawler logs:', err);
    }
  };

  React.useEffect(() => {
    if (manageSubTab === 'crawler-logs') {
      fetchCrawlerLogs();
      const interval = setInterval(fetchCrawlerLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [manageSubTab]);

  // Highlight Form States
  const [isHighlightFormOpen, setIsHighlightFormOpen] = useState(false);
  const [isEditingHighlight, setIsEditingHighlight] = useState(false);
  const [editingHighlightId, setEditingHighlightId] = useState<string | null>(null);

  const [hlFormTitle, setHlFormTitle] = useState('');
  const [hlFormSummary, setHlFormSummary] = useState('');
  const [hlFormCategory, setHlFormCategory] = useState('');
  const [hlFormLocation, setHlFormLocation] = useState('Nasional');
  const [hlFormMedia, setHlFormMedia] = useState('');
  const [hlFormLink, setHlFormLink] = useState('');
  const [hlFormImageUrl, setHlFormImageUrl] = useState('');
  const [hlFormSentiment, setHlFormSentiment] = useState('Netral');
  const [hlFormDate, setHlFormDate] = useState('');
  const [hlFormTime, setHlFormTime] = useState('12:00');
  const [hlFormPinned, setHlFormPinned] = useState(false);

  const [isSavingHighlight, setIsSavingHighlight] = useState(false);

  const handleOpenCreateHighlight = () => {
    setIsEditingHighlight(false);
    setEditingHighlightId(null);
    setHlFormTitle('');
    setHlFormSummary('');
    setHlFormCategory(categories[0]?.name || '');
    setHlFormLocation('Nasional');
    setHlFormMedia('');
    setHlFormLink('');
    setHlFormImageUrl('');
    setHlFormSentiment('Netral');
    setHlFormDate(new Date().toISOString().split('T')[0]);
    setHlFormTime(new Date().toTimeString().split(' ')[0].substring(0, 5));
    setHlFormPinned(false);
    setIsHighlightFormOpen(true);
  };

  const handleOpenEditHighlight = (hl: any) => {
    setIsEditingHighlight(true);
    setEditingHighlightId(hl.id);
    setHlFormTitle(hl.title || '');
    setHlFormSummary(hl.summary || '');
    setHlFormCategory(hl.categoryName || categories[0]?.name || '');
    setHlFormLocation(hl.location || 'Nasional');
    setHlFormMedia(hl.mediaName || '');
    setHlFormLink(hl.link || '');
    setHlFormImageUrl(hl.imageUrl || '');
    setHlFormSentiment(hl.sentiment || 'Netral');
    setHlFormDate(hl.publishDate || new Date().toISOString().split('T')[0]);
    setHlFormTime(hl.publishTime || '12:00');
    setHlFormPinned(!!hl.isPinned);
    setIsHighlightFormOpen(true);
  };

  const handleSaveHighlightForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hlFormTitle.trim() || !hlFormSummary.trim() || !hlFormCategory.trim() || !hlFormLocation.trim() || !hlFormMedia.trim()) {
      showToast('Harap lengkapi semua field wajib (Judul, Ringkasan, Kategori, Wilayah, Nama Media)!', 'error');
      return;
    }

    setIsSavingHighlight(true);
    try {
      const payload = {
        title: hlFormTitle.trim(),
        summary: hlFormSummary.trim(),
        categoryName: hlFormCategory,
        location: hlFormLocation,
        mediaName: hlFormMedia.trim(),
        link: hlFormLink.trim(),
        imageUrl: hlFormImageUrl.trim(),
        sentiment: hlFormSentiment,
        publishDate: hlFormDate,
        publishTime: hlFormTime,
        isPinned: hlFormPinned
      };

      const result = await saveHighlight(payload, isEditingHighlight, editingHighlightId || undefined);
      if (result) {
        setIsHighlightFormOpen(false);
      }
    } catch (err) {
      showToast('Gagal memproses simpan highlight', 'error');
    } finally {
      setIsSavingHighlight(false);
    }
  };

  const handleMoveHighlight = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= highlights.length) return;

    const newHlList = [...highlights];
    const temp = newHlList[index];
    newHlList[index] = newHlList[targetIndex];
    newHlList[targetIndex] = temp;

    const ids = newHlList.map(h => h.id);
    await reorderHighlights(ids);
  };

  const [searchVal, setSearchVal] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('Semua');
  const [filterSentiment, setFilterSentiment] = useState('Semua');
  const [filterLocation, setFilterLocation] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterMedia, setFilterMedia] = useState('Semua');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const uniqueLocations = useMemo(() => {
    const list = news.map(n => n.location).filter(Boolean);
    return Array.from(new Set(list)).sort() as string[];
  }, [news]);

  const uniqueMedias = useMemo(() => {
    const list = news.map(n => n.mediaName).filter(Boolean);
    return Array.from(new Set(list)).sort() as string[];
  }, [news]);

  const filteredCrawlerLogs = useMemo(() => {
    return crawlerLogs.filter(log => {
      if (logFilter !== 'all' && log.status !== logFilter) return false;
      if (logSearch.trim()) {
        const term = logSearch.toLowerCase();
        const matchesOriginal = log.originalUrl?.toLowerCase().includes(term);
        const matchesResolved = log.resolvedUrl?.toLowerCase().includes(term);
        const matchesError = log.errorMessage?.toLowerCase().includes(term);
        const matchesMethod = log.method?.toLowerCase().includes(term);
        return matchesOriginal || matchesResolved || matchesError || matchesMethod;
      }
      return true;
    });
  }, [crawlerLogs, logFilter, logSearch]);

  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchVal, filterCategory, filterSentiment, filterLocation, filterStatus, filterMedia, filterStartDate, filterEndDate]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // --- MULTI DELETE SELECTIONS ---
  const [selectedNewsIds, setSelectedNewsIds] = useState<string[]>([]);
  const [tempBatchDate, setTempBatchDate] = useState('');
  const [tempBatchTime, setTempBatchTime] = useState('');
  
  // --- GOOGLE NEWS CRAWL STATES ---
  const [isCrawlModalOpen, setIsCrawlModalOpen] = useState(false);
  const [crawlKeyword, setCrawlKeyword] = useState('');
  const [crawlTimeLimit, setCrawlTimeLimit] = useState('1h');
  const [crawledItems, setCrawledItems] = useState<any[]>([]);
  const [isCrawling, setIsCrawling] = useState(false);
  const [aiSavingUrls, setAiSavingUrls] = useState<Record<string, boolean>>({});
  const [selectedCrawlUrls, setSelectedCrawlUrls] = useState<string[]>([]);
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [batchSaveProgress, setBatchSaveProgress] = useState({ total: 0, current: 0 });

  // Custom states for Multi-Keyword crawling & Auto-publishing
  const [formMode, setFormMode] = useState<'single' | 'multi-crawl'>('single');
  const [multiKeywordsInput, setMultiKeywordsInput] = useState('');
  const [multiCrawlTimeLimit, setMultiCrawlTimeLimit] = useState('1h');
  const [itemsPerKeyword, setItemsPerKeyword] = useState<number>(2);
  const [selectedCrawlCategory, setSelectedCrawlCategory] = useState<string>('');
  const [multiCrawlMethod, setMultiCrawlMethod] = useState('auto');
  const [isMultiCrawling, setIsMultiCrawling] = useState(false);

  const [multiCrawlLogs, setMultiCrawlLogs] = useState<any[]>([]);

  React.useEffect(() => {
    setSelectedCrawlUrls([]);
  }, [crawledItems]);
  
  // --- GOOGLE SHEETS STATES ---
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState(settings.googleSpreadsheetId || '');
  const [sheetNameInput, setSheetNameInput] = useState(settings.googleSheetName || 'Daftar Isu');
  const [sheetSosmedNameInput, setSheetSosmedNameInput] = useState(settings.googleSheetSosmedName || 'Pantauan Sosmed');
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isSyncingAllSocial, setIsSyncingAllSocial] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState('');

  React.useEffect(() => {
    if (settings.googleSpreadsheetId) setSpreadsheetIdInput(settings.googleSpreadsheetId);
    if (settings.googleSheetName) setSheetNameInput(settings.googleSheetName);
    if (settings.googleSheetSosmedName) setSheetSosmedNameInput(settings.googleSheetSosmedName);
  }, [settings.googleSpreadsheetId, settings.googleSheetName, settings.googleSheetSosmedName]);

  // Initialize auth listener
  React.useEffect(() => {
    const unsub = initGoogleAuth(
      (usr, tok) => {
        setGoogleUser(usr);
        setGoogleToken(tok);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsub();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      showToast('Menghubungkan Akun Google...', 'info');
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        showToast(`Berhasil terhubung Google: ${result.user.displayName || result.user.email}!`, 'success');
      }
    } catch (err: any) {
      console.error('Detailed Google Sign-In error:', err);
      let errMsg = 'Gagal menghubungkan Google Auth!';
      
      if (err && err.code) {
        if (err.code === 'auth/unauthorized-domain') {
          errMsg = `Domain "${window.location.hostname}" belum didaftarkan di Authorized Domains di Firebase Console. Gunakan Mode Token Manual di bawah sebagai alternatif instan.`;
        } else if (err.code === 'auth/popup-blocked') {
          errMsg = 'Popup Google Sign-In diblokir oleh browser. Harap izinkan popup di browser Anda.';
        } else if (err.code === 'auth/popup-closed-by-user') {
          errMsg = 'Popup autentikasi ditutup sebelum selesai.';
        } else {
          errMsg = `Gagal Google Auth (${err.code}): ${err.message || 'Error tidak dikenal'}`;
        }
      } else if (err && err.message) {
        errMsg = `Gagal Google Auth: ${err.message}`;
      }
      
      showToast(errMsg, 'error');
      setShowTroubleshooting(true);
    }
  };

  const handleApplyManualToken = () => {
    if (!manualTokenInput.trim()) {
      showToast('Masukkan Access Token terlebih dahulu!', 'error');
      return;
    }
    const cleanToken = manualTokenInput.trim();
    setCachedAccessToken(cleanToken);
    setGoogleToken(cleanToken);
    setGoogleUser({
      email: 'manual-token@applet.internal',
      displayName: 'Token Manual (User)'
    });
    showToast('Token manual berhasil diterapkan! Anda siap melakukan sinkronisasi.', 'success');
  };

  const handleGoogleLogout = async () => {
    try {
      await googleSignOut();
      setGoogleUser(null);
      setGoogleToken(null);
      setManualTokenInput('');
      showToast('Koneksi Google diputuskan.', 'info');
    } catch (err) {
      showToast('Gagal memutuskan koneksi.', 'error');
    }
  };

  const handleConnectSpreadsheet = async () => {
    if (!spreadsheetIdInput) {
      showToast('Masukkan ID Google Spreadsheet terlebih dahulu!', 'error');
      return;
    }

    const token = getCachedAccessToken();
    if (!token) {
      // Allow saving settings without active token!
      showToast('Menyimpan pengaturan Spreadsheet...', 'info');
      const ok = await saveSettings({
        googleSpreadsheetId: spreadsheetIdInput,
        googleSheetName: sheetNameInput,
        googleSheetSosmedName: sheetSosmedNameInput,
        googleSpreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetIdInput}/edit`
      });
      if (ok) {
        showToast('Pengaturan Google Sheets berhasil disimpan tanpa menghubungkan ulang!', 'success');
      } else {
        showToast('Gagal menyimpan pengaturan Google Sheets!', 'error');
      }
      return;
    }

    try {
      showToast('Memverifikasi Spreadsheet ID...', 'info');
      const sheetsList = await getSpreadsheetSheets(token, spreadsheetIdInput);
      let selectedTab = sheetNameInput;
      if (sheetsList && sheetsList.length > 0 && !sheetsList.includes(selectedTab)) {
        selectedTab = sheetsList[0];
        setSheetNameInput(selectedTab);
      }

      const ok = await saveSettings({
        googleSpreadsheetId: spreadsheetIdInput,
        googleSheetName: selectedTab,
        googleSheetSosmedName: sheetSosmedNameInput,
        googleSpreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetIdInput}/edit`
      });

      if (ok) {
        showToast('Koneksi database Google Sheets berhasil ditetapkan!', 'success');
      }
    } catch (err: any) {
      showToast('Spreadsheet tidak ditemukan atau token tidak valid!', 'error');
    }
  };

  const handleCreateNewSheets = async () => {
    const token = getCachedAccessToken();
    if (!token) {
      showToast('Silahkan hubungkan akun Google Anda terlebih dahulu!', 'error');
      return;
    }

    setIsCreatingSheet(true);
    showToast('Tengah menginisialisasi berkas Spreadsheet baru...', 'info');

    try {
      const res = await createSpreadsheet(token, settings.companyName || 'Security Head Office');
      if (res && res.id) {
        const ok = await saveSettings({
          googleSpreadsheetId: res.id,
          googleSheetName: res.sheetName,
          googleSpreadsheetUrl: res.url
        });
        
        setSpreadsheetIdInput(res.id);
        setSheetNameInput(res.sheetName);

        if (ok) {
          showToast('Google Sheets Baru berhasil diinisialisasi!', 'success');
        }
      }
    } catch (err) {
      showToast('Gagal membuat Spreadsheet google harian.', 'error');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleExportAll = async () => {
    const token = getCachedAccessToken();
    if (!token || !settings.googleSpreadsheetId) {
      showToast('Persiapkan koneksi Google Sheets terlebih dahulu!', 'error');
      return;
    }

    if (!window.confirm('Ekspor Semua Isu akan mengganti isi dari seluruh tab di Google Sheets dengan entri isu terbaru di database saat ini. Lanjutkan?')) {
      return;
    }

    setIsSyncingAll(true);
    showToast('Memulai sinkronisasi massal seluruh isu media harian...', 'info');

    try {
      const sheetInputs = news.map(n => {
        const catObj = categories.find(c => c.id === n.categoryId);
        const medObj = medias.find(m => m.id === n.mediaId);
        return {
          id: n.id,
          publishDate: n.publishDate,
          publishTime: n.publishTime || '12:00',
          title: n.title,
          summary: n.summary,
          mediaName: n.mediaName || (medObj ? medObj.name : 'Unknown Media'),
          categoryName: n.categoryName || (catObj ? catObj.name : 'Unknown Category'),
          sentiment: n.sentiment,
          location: n.location || 'DKI Jakarta',
          link: n.link,
          tags: n.tags,
          status: n.status
        };
      });

      await bulkExportIssuesToSheet(
        token,
        settings.googleSpreadsheetId,
        settings.googleSheetName || 'Daftar Isu',
        sheetInputs
      );

      showToast(`Berhasil mengunggah dan menyelaraskan ${sheetInputs.length} isu ke Google Sheets!`, 'success');
    } catch (err) {
      showToast('Gagal melakukan sinkronisasi massal!', 'error');
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleExportAllSocial = async () => {
    const token = getCachedAccessToken();
    if (!token || !settings.googleSpreadsheetId) {
      showToast('Persiapkan koneksi Google Sheets terlebih dahulu!', 'error');
      return;
    }

    if (!window.confirm('Ekspor Semua Pantauan Sosmed akan menimpa isi tab Pantauan Sosmed di Google Sheets dengan entri terbaru di database saat ini. Lanjutkan?')) {
      return;
    }

    setIsSyncingAllSocial(true);
    showToast('Memulai sinkronisasi massal seluruh pantauan media sosial...', 'info');

    try {
      const sheetSocialInputs = socialNews.map(item => ({
        id: item.id,
        tanggalInput: item.tanggalInput || item.createdAt || new Date().toISOString(),
        jenisSosmed: item.jenisSosmed || 'Twitter/X',
        username: item.username || 'anonim',
        caption: item.caption || '',
        link: item.link || '',
        waktuPosting: item.waktuPosting || new Date().toISOString(),
        sentimen: item.sentimen || 'Netral',
        kategori: item.kategori || 'Sosial Kemasyarakatan',
        lokasi: item.lokasi || 'Nasional',
        urgensi: item.urgensi || 'Rendah',
        ringkasan: item.ringkasan || '',
        analisis: item.analisis || ''
      }));

      await bulkExportSocialToSheet(
        token,
        settings.googleSpreadsheetId,
        settings.googleSheetSosmedName || 'Pantauan Sosmed',
        sheetSocialInputs
      );

      showToast(`Berhasil mengunggah dan menyelaraskan ${sheetSocialInputs.length} pantauan sosmed ke Google Sheets!`, 'success');
    } catch (err: any) {
      console.error('[Bulk Export Social Error]:', err);
      showToast('Gagal melakukan sinkronisasi massal sosmed!', 'error');
    } finally {
      setIsSyncingAllSocial(false);
    }
  };

  const [isImporting, setIsImporting] = useState(false);

  const handleImportFromSheet = async () => {
    const token = getCachedAccessToken();
    if (!token || !settings.googleSpreadsheetId) {
      showToast('Persiapkan koneksi Google Sheets terlebih dahulu!', 'error');
      return;
    }

    setIsImporting(true);
    showToast('Mengunduh data isu dari Google Sheets...', 'info');

    try {
      const importedRows = await readIssuesFromSheet(
        token,
        settings.googleSpreadsheetId,
        settings.googleSheetName || 'Daftar Isu'
      );

      if (!importedRows || importedRows.length === 0) {
        showToast('Tidak ada entri berita isu valid yang dapat dibaca di Google Sheets.', 'info');
        setIsImporting(false);
        return;
      }

      showToast(`Mengambil ${importedRows.length} baris isu...`, 'info');
      const importResult = await batchImportNews(importedRows);
      if (importResult && importResult.success) {
        showToast(`Berhasil mengimpor ${importResult.count} data isu baru dari Google Sheets ke Dokumentasi Isu!`, 'success');
      }
    } catch (err: any) {
      console.error('Error importing from sheet:', err);
      showToast(`Gagal membaca Google Sheets: ${err.message || 'Periksa koneksi/akses'}`, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleAutoSyncToSheets = async (createdItem: any) => {
    const token = getCachedAccessToken();
    if (!token || !settings.googleSpreadsheetId) return;

    try {
      const catObj = categories.find(c => c.id === createdItem.categoryId);
      const medObj = medias.find(m => m.id === createdItem.mediaId);

      const sheetInput = {
        id: createdItem.id,
        publishDate: createdItem.publishDate,
        publishTime: createdItem.publishTime || '12:00',
        title: createdItem.title,
        summary: createdItem.summary,
        mediaName: createdItem.mediaName || (medObj ? medObj.name : 'Unknown Media'),
        categoryName: createdItem.categoryName || (catObj ? catObj.name : 'Unknown Category'),
        sentiment: createdItem.sentiment,
        location: createdItem.location || 'DKI Jakarta',
        link: createdItem.link,
        tags: createdItem.tags,
        status: createdItem.status
      };

      await appendIssueToSheet(
        token,
        settings.googleSpreadsheetId,
        settings.googleSheetName || 'Daftar Isu',
        sheetInput
      );
      showToast('Berita tersinkronisasi otomatis ke Google Sheets!', 'success');
    } catch (err) {
      console.error('Auto-sync to sheets failed:', err);
    }
  };
  
  // Form view management
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Gemini loading state
  const [isAiLoading, setIsAiLoading] = useState(false);

  // --- FORM INPUTS FIELD STATES ---
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [link, setLink] = useState('');
  const [mediaId, setMediaId] = useState('');
  const [mediaSearch, setMediaSearch] = useState('');
  const [publishDate, setPublishDate] = useState(new Date().toISOString().slice(0, 10));
  
  const getInitialTime = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm} WIB`;
  };
  const [publishTime, setPublishTime] = useState(getInitialTime());
  const [location, setLocation] = useState('Nasional');

  const [categoryId, setCategoryId] = useState('');
  const [sentiment, setSentiment] = useState<Sentiment>('Netral');
  const [tagsInput, setTagsInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<NewsStatus>('Published');
  const [isFeatured, setIsFeatured] = useState(false);

  // Auto analysis field from AI
  const [strategicAnalysis, setStrategicAnalysis] = useState('');
  const [statusWaktu, setStatusWaktu] = useState('');

  // --- MULTI-LINK BULK IMPORT STATES ---
  const [isMultiLinkMode, setIsMultiLinkMode] = useState(false);
  const [multiLinks, setMultiLinks] = useState<{ url: string; isValid: boolean }[]>([]);
  const [multiLinkInput, setMultiLinkInput] = useState('');
  const [linkRows, setLinkRows] = useState<string[]>(['']);
  const [isDraggingExcelLink, setIsDraggingExcelLink] = useState(false);
  const [excelLinkError, setExcelLinkError] = useState('');
  const [isValidationPopupOpen, setIsValidationPopupOpen] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ total: 0, current: 0, currentUrl: '' });

  // Post-scraping review states
  interface ReviewItem {
    title: string;
    summary: string;
    strategicAnalysis: string;
    link: string;
    mediaId: string;
    mediaName: string;
    publishDate: string;
    publishTime: string;
    statusWaktu: string;
    location: string;
    categoryId: string;
    sentiment: Sentiment;
    tags: string[];
    imageUrl: string;
    status: string;
    isFeatured: boolean;
  }
  const [scrapedResultsForReview, setScrapedResultsForReview] = useState<ReviewItem[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedReviewIdx, setSelectedReviewIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isReviewBatchSaving, setIsReviewBatchSaving] = useState(false);

  const extractAndAddLinks = (text: string) => {
    if (!text || !text.trim()) return;
    const parts = text.split(/[\s,;\n\r]+/);
    const added: { url: string; isValid: boolean }[] = [];
    
    parts.forEach(part => {
      const trimmed = part.trim();
      if (!trimmed) return;
      
      let finalUrl = trimmed;
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        if (trimmed.includes('.') && trimmed.length > 4) {
          finalUrl = 'https://' + trimmed;
        }
      }
      
      let valid = false;
      try {
        const parsed = new URL(finalUrl);
        valid = (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.includes('.');
      } catch (_) {
        valid = false;
      }
      
      added.push({ url: finalUrl, isValid: valid });
    });

    if (added.length > 0) {
      setMultiLinks(prev => {
        const existing = prev.map(p => p.url.toLowerCase());
        const uniqAdded = added.filter(a => !existing.includes(a.url.toLowerCase()));
        return [...prev, ...uniqAdded];
      });
      setMultiLinkInput('');
      showToast(`Berhasil mendeteksi & menambahkan ${added.length} tautan baru!`, 'success');
    }
  };

  const handleExcelLinkUpload = (file: File) => {
    setExcelLinkError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error('Gagal membaca file.');
        }
        
        const workbook = XLSX.read(data, { type: 'array' });
        if (workbook.SheetNames.length === 0) {
          throw new Error('File Excel kosong atau tidak valid.');
        }
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Read with range: 1 to set row 2 (index 1) as the header row
        const rows = XLSX.utils.sheet_to_json<any>(worksheet, { range: 1 });
        
        if (rows.length === 0) {
          throw new Error('Tidak ada baris data setelah baris kedua.');
        }
        
        const validUrls: string[] = [];
        rows.forEach((row: any) => {
          const keys = Object.keys(row);
          // Look for "URL" header (case-insensitive)
          const urlKey = keys.find(k => /^(urls?|links?|tautan)$/i.test(k.trim()));
          if (urlKey !== undefined && row[urlKey] !== undefined && row[urlKey] !== null) {
            const val = String(row[urlKey]).trim();
            if (val && val.toLowerCase() !== 'null' && val.toLowerCase() !== 'undefined') {
              validUrls.push(val);
            }
          }
        });
        
        if (validUrls.length === 0) {
          throw new Error('Tidak ada kolom header "URL" atau "Link" yang ditemukan di baris 2, atau kolom tersebut kosong.');
        }
        
        // Add to multiLinks
        const added: { url: string; isValid: boolean }[] = [];
        validUrls.forEach(url => {
          let finalUrl = url;
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            if (url.includes('.') && url.length > 4) {
              finalUrl = 'https://' + url;
            }
          }
          
          let valid = false;
          try {
            const parsedUrl = new URL(finalUrl);
            valid = (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') && parsedUrl.hostname.includes('.');
          } catch (_) {
            valid = false;
          }
          
          added.push({ url: finalUrl, isValid: valid });
        });
        
        if (added.length > 0) {
          setMultiLinks(prev => {
            const existing = prev.map(p => p.url.toLowerCase());
            const uniqAdded = added.filter(a => !existing.includes(a.url.toLowerCase()));
            return [...prev, ...uniqAdded];
          });
          showToast(`Berhasil mengimpor ${added.length} URL dari file Excel!`, 'success');
        }
      } catch (err: any) {
        setExcelLinkError(err.message || 'Gagal mengimpor URL dari file Excel.');
      }
    };
    reader.onerror = () => {
      setExcelLinkError('Gagal membaca file Excel.');
    };
    reader.readAsArrayBuffer(file);
  };

  const updateMultiLinkValue = (index: number, newUrl: string) => {
    setMultiLinks(prev => {
      const copy = [...prev];
      let valid = false;
      const trimmed = newUrl.trim();
      try {
        const parsed = new URL(trimmed);
        valid = (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.includes('.');
      } catch (_) {
        valid = false;
      }
      copy[index] = { url: newUrl, isValid: valid };
      return copy;
    });
  };

  const updateReviewItemValue = (index: number, field: keyof ReviewItem, value: any) => {
    setScrapedResultsForReview(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], [field]: value };
      }
      return copy;
    });
  };

  const handleReviewMediaNameChange = (index: number, val: string) => {
    const matched = medias.find(m => m.name.toLowerCase() === val.trim().toLowerCase());
    setScrapedResultsForReview(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = {
          ...copy[index],
          mediaName: val,
          mediaId: matched ? matched.id : ''
        };
      }
      return copy;
    });
  };

  const discardSingleReview = (index: number) => {
    setScrapedResultsForReview(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (selectedReviewIdx >= next.length && next.length > 0) {
        setSelectedReviewIdx(next.length - 1);
      }
      if (next.length === 0) {
        setIsReviewModalOpen(false);
        showToast('Semua item di antrean review telah dibuang.', 'info');
      } else {
        showToast('Kliping isu dibuang dari antrean.', 'info');
      }
      return next;
    });
  };

  const handleConfirmSingleReview = async (index: number) => {
    const item = scrapedResultsForReview[index];
    if (!item) return;
    if (!item.title.trim()) {
      showToast('Judul kliping isu tidak boleh kosong!', 'error');
      return;
    }
    
    setIsSaving(true);
    const finalSummary = item.strategicAnalysis.trim()
      ? `${item.summary.trim()}\n\n[Analisis]\n${item.strategicAnalysis.trim()}`
      : item.summary.trim();

    const payload = {
      title: item.title.trim(),
      summary: finalSummary,
      link: item.link,
      mediaId: item.mediaId || '',
      mediaName: item.mediaName || 'Google News',
      publishDate: item.publishDate,
      publishTime: item.publishTime,
      statusWaktu: item.statusWaktu || '',
      location: item.location || 'DKI Jakarta',
      categoryId: item.categoryId,
      sentiment: item.sentiment,
      tags: item.tags,
      imageUrl: item.imageUrl,
      status: item.status || 'Published',
      isFeatured: false
    };

    const res = await saveNewsItem(payload, false);
    setIsSaving(false);
    if (res) {
      showToast(`Isu "${item.title.substring(0, 30)}..." sukses disimpan & dirilis!`, 'success');
      if (settings.googleSpreadsheetId) {
        try {
          await handleAutoSyncToSheets(res);
        } catch (eSheets) {
          console.warn('Sheets sync error:', eSheets);
        }
      }
      
      // Remove from review queue
      setScrapedResultsForReview(prev => {
        const next = prev.filter((_, i) => i !== index);
        if (selectedReviewIdx >= next.length && next.length > 0) {
          setSelectedReviewIdx(next.length - 1);
        }
        if (next.length === 0) {
          setIsReviewModalOpen(false);
        }
        return next;
      });
    } else {
      showToast('Gagal menyimpan kliping isu ini.', 'error');
    }
  };

  const handleConfirmAndPublishAllReviews = async () => {
    if (scrapedResultsForReview.length === 0) return;
    
    setIsReviewBatchSaving(true);
    showToast(`Memproses rilis massal ${scrapedResultsForReview.length} kliping berita ke dashboard...`, 'info');
    
    let okCount = 0;
    
    for (let i = 0; i < scrapedResultsForReview.length; i++) {
      const item = scrapedResultsForReview[i];
      const finalSummary = item.strategicAnalysis.trim()
        ? `${item.summary.trim()}\n\n[Analisis]\n${item.strategicAnalysis.trim()}`
        : item.summary.trim();

      const payload = {
        title: item.title.trim(),
        summary: finalSummary,
        link: item.link,
        mediaId: item.mediaId || '',
        mediaName: item.mediaName || 'Google News',
        publishDate: item.publishDate,
        publishTime: item.publishTime,
        statusWaktu: item.statusWaktu || '',
        location: item.location || 'DKI Jakarta',
        categoryId: item.categoryId,
        sentiment: item.sentiment,
        tags: item.tags,
        imageUrl: item.imageUrl,
        status: item.status || 'Published',
        isFeatured: false
      };

      const res = await saveNewsItem(payload, false);
      if (res) {
        okCount++;
        if (settings.googleSpreadsheetId) {
          try {
            await handleAutoSyncToSheets(res);
          } catch (eSheets) {
            console.warn('Sheets sync error:', eSheets);
          }
        }
      }
    }
    
    setIsReviewBatchSaving(false);
    showToast(`Berhasil meregistrasikan & merilis ${okCount} berita ke dashboard!`, 'success');
    setScrapedResultsForReview([]);
    setIsReviewModalOpen(false);
  };

  // Clear Form Helper
  const resetForm = () => {
    setTitle('');
    setSummary('');
    setLink('');
    setMediaId('');
    setMediaSearch('');
    setPublishDate(new Date().toISOString().slice(0, 10));
    setPublishTime(getInitialTime());
    setLocation('Nasional');
    setCategoryId('');
    setSentiment('Netral');
    setTagsInput('');
    setImageUrl('');
    setStatus('Published');
    setIsFeatured(false);
    setStrategicAnalysis('');
    setStatusWaktu('');
    setIsEditing(false);
    setEditingId(null);
    setIsMultiLinkMode(false);
    setMultiLinks([]);
    setMultiLinkInput('');
    setIsValidationPopupOpen(false);
    setIsBulkProcessing(false);
    setBulkProgress({ total: 0, current: 0, currentUrl: '' });
    setFormMode('single');
    setMultiKeywordsInput('');
    setMultiCrawlLogs([]);
    setIsMultiCrawling(false);
  };

  const handleOpenCreateForm = () => {
    resetForm();
    // Default select first available options
    if (categories.length > 0) setCategoryId(categories[0].id);
    if (medias.length > 0) {
      setMediaId(medias[0].id);
      setMediaSearch(medias[0].name);
    }
    setIsMultiLinkMode(false);
    setMultiLinks([]);
    setMultiLinkInput('');
    setFormMode('single');
    setMultiKeywordsInput('');
    setMultiCrawlLogs([]);
    setIsMultiCrawling(false);
    setIsFormOpen(true);
  };

  const handleEditClick = (item: NewsItem) => {
    setIsEditing(true);
    setEditingId(item.id);
    setTitle(item.title);
    const { mainText, analysisText } = splitSummaryParts(item.summary);
    setSummary(mainText);
    setStrategicAnalysis(analysisText);
    setLink(item.link);
    setMediaId(item.mediaId);
    setMediaSearch(item.mediaName);
    setPublishDate(item.publishDate);
    setPublishTime(item.publishTime || '12:00');
    setStatusWaktu(item.statusWaktu || item.status_waktu || '');
    setLocation(item.location || 'DKI Jakarta');
    setCategoryId(item.categoryId);
    setSentiment(item.sentiment);
    setTagsInput(item.tags.map(t => t.replace(/\s+/g, '')).join(','));
    setImageUrl(item.imageUrl || '');
    setStatus(item.status);
    setIsFeatured(!!item.isFeatured);
    setIsMultiLinkMode(false);
    setMultiLinks([]);
    setMultiLinkInput('');
    setFormMode('single');
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus arsip berita ini dari sistem?')) {
      const ok = await removeNewsItem(id);
      if (ok) {
        showToast('Arsip berita berhasil dihapus.', 'success');
      }
    }
  };

  const handleSaveSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isMultiLinkMode) {
      const validLinks = multiLinks.filter(l => l.isValid);
      if (validLinks.length === 0) {
        showToast('Tidak ada tautan valid yang ditambahkan untuk diimpor!', 'error');
        return;
      }
      
      const hasInvalid = multiLinks.some(l => !l.isValid);
      if (hasInvalid) {
        showToast('Terdapat beberapa tautan dengan format salah. Mohon validasi atau hapus terlebih dahulu!', 'warning');
        setIsValidationPopupOpen(true);
        return;
      }

      setIsBulkProcessing(true);
      setBulkProgress({ total: validLinks.length, current: 0, currentUrl: '' });
      showToast(`Memulai scraping massal ${validLinks.length} berita dari multi-link...`, 'info');

      const tempReviewList: ReviewItem[] = [];

      for (let i = 0; i < validLinks.length; i++) {
        const targetLink = validLinks[i].url;
        setBulkProgress(prev => ({ ...prev, current: i + 1, currentUrl: targetLink }));

        try {
          const aiResponse = await analyzeWithGemini({ url: targetLink });
          
          let finalTitleForImport = `Highlight Berita: ${new URL(targetLink).hostname}`;
          let finalSummaryForImport = `Ulasan isu berita portal: ${targetLink}`;
          let finalSentimentForImport: Sentiment = 'Netral';
          let finalCategoryForImport = categoryId || (categories[0]?.id || '');
          let finalLocationForImport = location || 'DKI Jakarta';
          let finalMediaNameForImport = mediaSearch || 'Google News';
          let finalMediaIdForImport = mediaId || '';
          let finalTagsForImport: string[] = ['BUMN'];
          let finalImageUrlForImport = 'https://img2.beritasatu.com/cache/beritasatu/960x620-3/2024/05/1715143507-1600x1066.webp';
          let finalPublishDateForImport = publishDate || new Date().toISOString().slice(0, 10);
          let finalPublishTimeForImport = publishTime || '12:00';
          let finalStatusWaktuForImport = '';
          let finalStrategicAnalysis = '';

          if (aiResponse) {
            finalTitleForImport = aiResponse.articleTitle || aiResponse.judul || finalTitleForImport;
            finalSummaryForImport = aiResponse.summary || 'Kliping Isu Terbitan';
            finalStrategicAnalysis = aiResponse.strategicAnalysis || '';
            finalSentimentForImport = aiResponse.sentiment || finalSentimentForImport;
            
            if (aiResponse.categoryRecommendationId) {
              finalCategoryForImport = aiResponse.categoryRecommendationId;
            } else if (aiResponse.categoryRecommendation) {
              finalCategoryForImport = findBestCategoryMatch(aiResponse.categoryRecommendation, categories).id;
            }

            if (aiResponse.location) {
              finalLocationForImport = aiResponse.location;
            }

            if (aiResponse.mediaName) {
              finalMediaNameForImport = aiResponse.mediaName;
              const matchedMedia = medias.find(m => m.name.toLowerCase() === finalMediaNameForImport.toLowerCase());
              if (matchedMedia) {
                finalMediaIdForImport = matchedMedia.id;
                if (matchedMedia.provinsi && !aiResponse.location) {
                  finalLocationForImport = matchedMedia.provinsi;
                }
              }
            }

            if (Array.isArray(aiResponse.tags)) {
              finalTagsForImport = aiResponse.tags.map(t => String(t).replace(/\s+/g, '')).filter(Boolean);
            } else if (typeof aiResponse.tags === 'string' && aiResponse.tags) {
              finalTagsForImport = aiResponse.tags.split(',').map(t => t.replace(/\s+/g, '')).filter(Boolean);
            }

            if (aiResponse.imageUrl) {
              finalImageUrlForImport = aiResponse.imageUrl;
            }

            if (aiResponse.publishDate) {
              const dateParts = String(aiResponse.publishDate).split('/');
              if (dateParts.length === 3) {
                const day = dateParts[0].trim().padStart(2, '0');
                const month = dateParts[1].trim().padStart(2, '0');
                const year = dateParts[2].trim();
                if (year.length === 4 && !isNaN(parseInt(year))) {
                  finalPublishDateForImport = `${year}-${month}-${day}`;
                }
              } else if (String(aiResponse.publishDate).match(/^\d{4}-\d{2}-\d{2}$/)) {
                finalPublishDateForImport = aiResponse.publishDate;
              }
            }

            if (aiResponse.jam_publikasi || aiResponse.publishTime) {
              let t = String(aiResponse.jam_publikasi || aiResponse.publishTime).trim();
              if (t && !t.toUpperCase().includes('WIB') && !t.toUpperCase().includes('WITA') && !t.toUpperCase().includes('WIT')) {
                t = `${t} WIB`;
              }
              finalPublishTimeForImport = t || finalPublishTimeForImport;
            }

            if (aiResponse.statusWaktu || aiResponse.status_waktu) {
              finalStatusWaktuForImport = aiResponse.statusWaktu || aiResponse.status_waktu || '';
            }
          }

          const reviewItem: ReviewItem = {
            title: finalTitleForImport,
            summary: finalSummaryForImport,
            strategicAnalysis: finalStrategicAnalysis,
            link: aiResponse?.url || aiResponse?.resolvedUrl || targetLink,
            mediaId: finalMediaIdForImport,
            mediaName: finalMediaNameForImport,
            publishDate: finalPublishDateForImport,
            publishTime: finalPublishTimeForImport,
            statusWaktu: finalStatusWaktuForImport,
            location: finalLocationForImport,
            categoryId: finalCategoryForImport,
            sentiment: finalSentimentForImport,
            tags: finalTagsForImport,
            imageUrl: finalImageUrlForImport,
            status: status || 'Published',
            isFeatured: false
          };

          tempReviewList.push(reviewItem);
        } catch (eLoop) {
          console.error(`Gagal memproses link ${targetLink}:`, eLoop);
        }
      }

      setIsBulkProcessing(false);
      
      if (tempReviewList.length > 0) {
        showToast(`Ekstraksi AI tuntas untuk ${tempReviewList.length} tautan! Membuka antarmuka verifikasi & review...`, 'success');
        setScrapedResultsForReview(tempReviewList);
        setSelectedReviewIdx(0);
        setIsReviewModalOpen(true);
        setIsFormOpen(false);
        resetForm();
      } else {
        showToast('Kolektif scrape gagal dilakukan atau seluruh tautan gagal dianalisis.', 'error');
      }
      return;
    }

    // Auto resolve mediaId on client if exact case-insensitive match is typed
    let resolvedMediaId = mediaId;
    const searchTrimmed = mediaSearch.trim();
    if (!resolvedMediaId && searchTrimmed) {
      const matched = medias.find(m => m.name.toLowerCase() === searchTrimmed.toLowerCase());
      if (matched) {
        resolvedMediaId = matched.id;
      }
    }

    const hasMedia = resolvedMediaId || searchTrimmed;
    if (!title || !summary || !hasMedia || !categoryId) {
      showToast('Mohon lengkapi seluruh field wajib! (Judul, Ringkasan, Media, dan Kluster Topik)', 'error');
      return;
    }

    // URL validation
    if (link && !link.startsWith('http://') && !link.startsWith('https://')) {
      showToast('Wajib memasukkan tautan (http:// atau https://)', 'error');
      return;
    }

    const tagsArray = tagsInput.split(',')
      .map(t => t.replace(/\s+/g, ''))
      .filter(t => t.length > 0);

    const payload = {
      title,
      summary: strategicAnalysis 
        ? `${summary}\n\n[Analisis]\n${strategicAnalysis}`
        : summary,
      link,
      mediaId: resolvedMediaId,
      mediaName: searchTrimmed, // Send so backend can auto-resolve or auto-create the media if needed!
      publishDate,
      publishTime,
      statusWaktu,
      location,
      categoryId,
      sentiment,
      tags: tagsArray,
      imageUrl,
      status,
      isFeatured
    };

    const result = await saveNewsItem(payload, isEditing, editingId || undefined);
    if (result) {
      // Sync to Google Sheets if configured
      if (settings.googleSpreadsheetId) {
        await handleAutoSyncToSheets(result);
      }
      setIsFormOpen(false);
      resetForm();
    }
  };

  // ===================================
  // TRULY MAGICAL ENTERPRISE GEMINI AI
  // ===================================
  const handleGeminiAnalyze = async () => {
    if (!title && !link) {
      showToast('Mohon masukkan sekurangnya Judul atau Tautan URL berita untuk diproses oleh AI!', 'error');
      return;
    }

    setIsAiLoading(true);
    showToast('Menghubungkan Media Analyst AI Engine...', 'info');

    try {
      const response = await analyzeWithGemini({
        title,
        url: link,
        text: summary // Optional input if present
      });

      if (response) {
        // Ensure response.tags is always a clean array of strings
        let resolvedTags: string[] = [];
        if (Array.isArray(response.tags)) {
          resolvedTags = response.tags.map(t => String(t).trim()).filter(Boolean);
        } else if (typeof response.tags === 'string') {
          resolvedTags = response.tags.split(',').map(t => t.trim()).filter(Boolean);
        }
        if (resolvedTags.length === 0) {
          resolvedTags = ['AIAnalysis'];
        }

        // Auto-populate based on analysis of content
        if (response.url) {
          setLink(response.url);
        }
        if (response.articleTitle) {
          setTitle(response.articleTitle);
        } else {
          setTitle(title || `Highlight Otomatis: ${resolvedTags[0] || 'Isu Baru'}`);
        }
        setSummary(response.summary || summary);
        setSentiment(response.sentiment || 'Netral');
        setTagsInput(resolvedTags.map(t => t.replace(/\s+/g, '')).join(','));
        setStrategicAnalysis(response.strategicAnalysis || '');

        // Handle publishing timestamp from AI metadata extraction
        if (response.publishDate) {
          setPublishDate(response.publishDate);
        } else if (response.publishDate === '') {
          setPublishDate('');
        }
        if (response.publishTime) {
          if (response.publishTime === 'Waktu Sekarang') {
            const d = new Date();
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            setPublishTime(`${hh}:${mm} WIB`);
          } else {
            setPublishTime(response.publishTime);
          }
        } else if (response.publishTime === '') {
          setPublishTime('');
        }

        if (response.statusWaktu) {
          setStatusWaktu(response.statusWaktu);
        } else {
          setStatusWaktu('');
        }
        
        // Match territory/location
        if (response.location) {
          setLocation(response.location);
        }

        // Match publisher/media
        const finalMediaName = response.mediaName || 'Google News';
        setMediaSearch(finalMediaName);
        const matchedMedia = medias.find(m => m.name.toLowerCase() === finalMediaName.toLowerCase());
        if (matchedMedia) {
          setMediaId(matchedMedia.id);
          if (matchedMedia.provinsi && !response.location) {
            setLocation(matchedMedia.provinsi);
          }
        } else {
          setMediaId('');
        }

        // Find closest matching category slug representation
        if (response.categoryRecommendationId) {
          setCategoryId(response.categoryRecommendationId);
        } else if (response.categoryRecommendation) {
          setCategoryId(findBestCategoryMatch(response.categoryRecommendation, categories).id);
        }

        // Set custom photo link or default vector
        if (response.imageUrl) {
          setImageUrl(response.imageUrl);
        } else if (!imageUrl) {
          setImageUrl('https://img2.beritasatu.com/cache/beritasatu/960x620-3/2024/05/1715143507-1600x1066.webp');
        }

        showToast('Analisis AI berhasil melengkapi ringkasan eksekutif, rekomendasi mitigasi strategis, kluster topik, lokasi map, media, dan link cover berita!', 'success');
      }
    } catch (e) {
      showToast('Gagal memproses analisis isu oleh AI Engine.', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  // ===================================
  // CRAWL GOOGLE NEWS SYSTEM EVENT HANDLERS
  // ===================================
  const handleBatchAiSave = async () => {
    if (selectedCrawlUrls.length === 0) {
      showToast('Harap pilih setidaknya satu berita untuk disimpan massal.', 'warning');
      return;
    }

    const itemsToSave = crawledItems.filter(item => selectedCrawlUrls.includes(item.link));
    setIsBatchSaving(true);
    setBatchSaveProgress({ total: itemsToSave.length, current: 0 });
    showToast(`Memulai proses analisis & penyimpanan massal AI untuk ${itemsToSave.length} berita...`, 'info');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < itemsToSave.length; i++) {
      const item = itemsToSave[i];
      setBatchSaveProgress(prev => ({ ...prev, current: i + 1 }));
      
      // Set single loading state for visual response on that item
      setAiSavingUrls(prev => ({ ...prev, [item.link]: true }));

      try {
        const response = await analyzeWithGemini({
          title: item.title,
          url: item.link,
          mediaName: item.mediaName,
          publishDate: item.publishDate,
          publishTime: item.publishTime
        });

        if (!response) {
          failCount++;
          continue;
        }

        const finalMediaName = response.mediaName || item.mediaName || 'Google News';
        let resolvedMediaId = '';
        const matchedMedia = medias.find(m => m.name.toLowerCase() === finalMediaName.toLowerCase());
        if (matchedMedia) {
          resolvedMediaId = matchedMedia.id;
        }

        let finalCategoryId = categories[0]?.id || '';
        if (response.categoryRecommendationId) {
          finalCategoryId = response.categoryRecommendationId;
        } else if (response.categoryRecommendation) {
          finalCategoryId = findBestCategoryMatch(response.categoryRecommendation, categories).id;
        }

        const finalSummary = response.strategicAnalysis 
          ? `${response.summary || 'Kliping Isu Terbitan.'}\n\n[Analisis]\n${response.strategicAnalysis}`
          : (response.summary || 'Kliping Isu Terbitan.');

        const finalImage = response.imageUrl || 'https://img2.beritasatu.com/cache/beritasatu/960x620-3/2024/05/1715143507-1600x1066.webp';

        // Ensure response.tags is always a clean array of strings
        let resolvedTags: string[] = [];
        if (Array.isArray(response.tags)) {
          resolvedTags = response.tags.map(t => String(t).replace(/\s+/g, '')).filter(Boolean);
        } else if (typeof response.tags === 'string') {
          resolvedTags = response.tags.split(',').map(t => t.replace(/\s+/g, '')).filter(Boolean);
        }
        if (resolvedTags.length === 0) {
          resolvedTags = ['GoogleNews'];
        }

        const finalTitle = response.judul || item.title;
        const prefixedTitle = cleanTitleText(finalTitle);

        const payload = {
          title: prefixedTitle,
          summary: finalSummary,
          link: response.url || response.resolvedUrl || item.link,
          mediaId: resolvedMediaId,
          mediaName: finalMediaName,
          publishDate: item.publishDate,
          publishTime: item.publishTime || '12:00',
          location: response.location || 'DKI Jakarta',
          categoryId: finalCategoryId,
          sentiment: response.sentiment || 'Netral',
          tags: resolvedTags,
          imageUrl: finalImage,
          status: 'Published',
          isFeatured: false
        };

        const result = await saveNewsItem(payload, false);
        if (result) {
          if (settings.googleSpreadsheetId) {
            try {
              await handleAutoSyncToSheets(result);
            } catch (err) {
              console.warn('Sheets sync error', err);
            }
          }
          successCount++;
          // Remove from local list as we go so the screen updates dynamically
          setCrawledItems(prev => prev.filter(c => c.link !== item.link));
        } else {
          failCount++;
        }
      } catch (err) {
        console.error('Error batch saving', err);
        failCount++;
      } finally {
        setAiSavingUrls(prev => ({ ...prev, [item.link]: false }));
      }
    }

    setIsBatchSaving(false);
    setSelectedCrawlUrls([]);
    showToast(`Selesai menyimpan massal! Berhasil: ${successCount}, Gagal: ${failCount}.`, 'success');
  };

  const handleCrawlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = crawlKeyword.trim();
    if (!query) {
      showToast('Kata kunci pencarian tidak boleh kosong!', 'error');
      return;
    }
    
    setIsCrawling(true);
    setCrawledItems([]);
    try {
      showToast(`Melakukan crawling Google News dengan kata kunci "${query}"...`, 'info');
      const items = await crawlGoogleNews(query, crawlTimeLimit, settings?.autoCrawlMethod || 'auto');
      setCrawledItems(items || []);
    } catch (err: any) {
      showToast('Gagal melakukan crawling portal berita!', 'error');
    } finally {
      setIsCrawling(false);
    }
  };

  const addCrawlLog = (text: string, type: 'info' | 'warning' | 'error' | 'success' | 'ai' | 'crawler' | 'db' | 'processing' | 'finish') => {
    setMultiCrawlLogs(prev => [
      ...prev,
      {
        text,
        type,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  const handleMultiCrawlAndRelease = async () => {
    const kInput = multiKeywordsInput.trim();
    if (!kInput) {
      showToast('Harap masukkan setidaknya satu kata kunci!', 'error');
      return;
    }

    const kwList = kInput
      .split(/[\n,;]+/)
      .map(k => k.trim())
      .filter(Boolean);

    if (kwList.length === 0) {
      showToast('Harap masukkan setidaknya satu kata kunci yang valid!', 'error');
      return;
    }

    setIsMultiCrawling(true);
    setMultiCrawlLogs([
      {
        text: `Memulai operasi Auto-Crawl AI Agen untuk ${kwList.length} kata kunci...`,
        type: 'info',
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
    
    let totalCrawledCount = 0;
    let totalSuccessCount = 0;
    let totalFailCount = 0;

    try {
      for (let i = 0; i < kwList.length; i++) {
        const kw = kwList[i];
        addCrawlLog(`[Kata Kunci: "${kw}"] Memulai crawling menggunakan mesin [${multiCrawlMethod.toUpperCase()}]...`, 'crawler');
        
        const rawHtmlItems = await crawlGoogleNews(kw, multiCrawlTimeLimit, multiCrawlMethod);
        if (!rawHtmlItems || rawHtmlItems.length === 0) {
          addCrawlLog(`[Kata Kunci: "${kw}"] Tidak ada berita yang ditemukan.`, 'warning');
          continue;
        }

        const countToProcess = Math.min(itemsPerKeyword, rawHtmlItems.length);
        addCrawlLog(`[Kata Kunci: "${kw}"] Menemukan ${rawHtmlItems.length} berita. Memilih ${countToProcess} berita teratas untuk diproses...`, 'info');
        
        const targetItems = rawHtmlItems.slice(0, countToProcess);
        totalCrawledCount += targetItems.length;

        for (let j = 0; j < targetItems.length; j++) {
          const item = targetItems[j];
          addCrawlLog(`• Memproses [${j+1}/${targetItems.length}]: "${item.title.substring(0, 45)}..."`, 'processing');
          
          try {
            addCrawlLog(`  → Menganalisis konten via Gemini AI Agent...`, 'ai');
            const response = await analyzeWithGemini({
              title: item.title,
              url: item.link,
              mediaName: item.mediaName,
              publishDate: item.publishDate,
              publishTime: item.publishTime
            });

            if (!response) {
              addCrawlLog(`  ❌ AI gagal menganalisis artikel ini.`, 'error');
              totalFailCount++;
              continue;
            }

            // Match or assign mediaName
            const finalMediaName = response.mediaName || item.mediaName || 'Google News';
            let resolvedMediaId = '';
            const matchedMedia = medias.find(m => m.name.toLowerCase() === finalMediaName.toLowerCase());
            if (matchedMedia) {
              resolvedMediaId = matchedMedia.id;
            }

            // Match Category
            let finalCategoryId = selectedCrawlCategory || categories[0]?.id || '';
            if (!selectedCrawlCategory) {
              if (response.categoryRecommendationId) {
                finalCategoryId = response.categoryRecommendationId;
              } else if (response.categoryRecommendation) {
                finalCategoryId = findBestCategoryMatch(response.categoryRecommendation, categories).id;
              }
            }

            const finalSummary = response.strategicAnalysis 
              ? `${response.summary || 'Kliping Isu Terbitan.'}\n\n[Analisis]\n${response.strategicAnalysis}`
              : (response.summary || 'Kliping Isu Terbitan.');

            const finalImage = response.imageUrl || 'https://img2.beritasatu.com/cache/beritasatu/960x620-3/2024/05/1715143507-1600x1066.webp';

            // Clean tags
            let resolvedTags: string[] = [];
            if (Array.isArray(response.tags)) {
              resolvedTags = response.tags.map(t => String(t).replace(/\s+/g, '')).filter(Boolean);
            } else if (typeof response.tags === 'string') {
              resolvedTags = response.tags.split(',').map(t => t.replace(/\s+/g, '')).filter(Boolean);
            }
            if (resolvedTags.length === 0) {
              resolvedTags = [kw.replace(/\s+/g, ''), 'GoogleNews'];
            }

            const finalTitle = response.judul || item.title;
            const prefixedTitle = cleanTitleText(finalTitle);

            const payload = {
              title: prefixedTitle,
              summary: finalSummary,
              link: item.link,
              mediaId: resolvedMediaId,
              mediaName: finalMediaName,
              publishDate: item.publishDate,
              publishTime: item.publishTime || '12:00',
              location: response.location || 'DKI Jakarta',
              categoryId: finalCategoryId,
              sentiment: response.sentiment || 'Netral',
              tags: resolvedTags,
              imageUrl: finalImage,
              status: 'Published', // Auto-publish/release!
              isFeatured: false
            };

            addCrawlLog(`  → Menyimpan & merilis otomatis ke database...`, 'db');
            const result = await saveNewsItem(payload, false);
            if (result) {
              if (settings.googleSpreadsheetId) {
                try {
                  await handleAutoSyncToSheets(result);
                } catch (e) {
                  // ignore
                }
              }
              addCrawlLog(`  ✅ Berhasil dirilis! [Sentimen: ${payload.sentiment}]`, 'success');
              totalSuccessCount++;
            } else {
              addCrawlLog(`  ❌ Gagal meregistrasi isu.`, 'error');
              totalFailCount++;
            }
          } catch (itemErr: any) {
            console.error('Error auto-processing single item', itemErr);
            addCrawlLog(`  ❌ Gagal diproses: ${itemErr.message || 'Error'}`, 'error');
            totalFailCount++;
          }
        }
      }

      addCrawlLog(`🎉 Operasi rilis otomatis selesai! Berhasil rilis: ${totalSuccessCount}, Gagal: ${totalFailCount}.`, 'finish');
      showToast(`Selesai! Berhasil merilis otomatis ${totalSuccessCount} berita isu ke dashboard!`, 'success');
    } catch (err: any) {
      console.error('Core auto crawl loop failed:', err);
      addCrawlLog(`🚨 Kesalahan kritis pada sistem rilis otomatis: ${err.message}`, 'error');
      showToast('Operasi Auto-Crawl AI terganggu.', 'warning');
    } finally {
      setIsMultiCrawling(false);
    }
  };

  const handleUseCrawledItem = (item: any) => {
    // Fill creation fields
    setTitle(item.title);
    setLink(item.link);
    setSummary(''); 
    setStrategicAnalysis('');
    
    // Resolve media match
    const searchTrimmed = item.mediaName.trim();
    const matched = medias.find(m => m.name.toLowerCase() === searchTrimmed.toLowerCase());
    if (matched) {
      setMediaId(matched.id);
      setMediaSearch(matched.name);
    } else {
      setMediaId('');
      setMediaSearch(searchTrimmed);
    }

    setPublishDate(item.publishDate);
    setPublishTime(item.publishTime || '12:00');

    // Reset fallback category and default state parameters
    if (categories.length > 0) {
      setCategoryId(categories[0].id);
    }
    setSentiment('Netral');
    setTagsInput('GoogleNews');
    setImageUrl('');
    setStatus('Published');
    setIsFeatured(false);

    // Toggle forms
    setIsCrawlModalOpen(false);
    setIsFormOpen(true);
    showToast('Berita berhasil dimuat! Anda dapat menganalisis atau mengarsipkannya sekarang.', 'success');
  };

  const handleAiAutoSaveItem = async (item: any) => {
    if (aiSavingUrls[item.link]) return; // Prevent double trigger
    
    setAiSavingUrls(prev => ({ ...prev, [item.link]: true }));
    showToast(`AI sedang mengulas dan mendaftarkan: "${item.title.slice(0, 30)}..."`, 'info');
    
    try {
      const response = await analyzeWithGemini({
        title: item.title,
        url: item.link,
        mediaName: item.mediaName,
        publishDate: item.publishDate,
        publishTime: item.publishTime
      });

      if (!response) {
        showToast('AI gagal melengkapi otomatis artikel ini. Pilih opsi Gunakan Form.', 'error');
        setAiSavingUrls(prev => ({ ...prev, [item.link]: false }));
        return;
      }

      // Try matching mediaName
      const finalMediaName = response.mediaName || item.mediaName || 'Google News';
      let resolvedMediaId = '';
      const matchedMedia = medias.find(m => m.name.toLowerCase() === finalMediaName.toLowerCase());
      if (matchedMedia) {
        resolvedMediaId = matchedMedia.id;
      }

      // Find closest matching category slug representation
      let finalCategoryId = categories[0]?.id || '';
      if (response.categoryRecommendationId) {
        finalCategoryId = response.categoryRecommendationId;
      } else if (response.categoryRecommendation) {
        finalCategoryId = findBestCategoryMatch(response.categoryRecommendation, categories).id;
      }

      const finalSummary = response.strategicAnalysis 
        ? `${response.summary || 'Kliping Isu Terbitan.'}\n\n[Analisis]\n${response.strategicAnalysis}`
        : (response.summary || 'Kliping Isu Terbitan.');

      // Default high quality stock image / custom returned imageUrl
      const finalImage = response.imageUrl || 'https://img2.beritasatu.com/cache/beritasatu/960x620-3/2024/05/1715143507-1600x1066.webp';

      // Ensure response.tags is always a clean array of strings
      let resolvedTags: string[] = [];
      if (Array.isArray(response.tags)) {
        resolvedTags = response.tags.map(t => String(t).replace(/\s+/g, '')).filter(Boolean);
      } else if (typeof response.tags === 'string') {
        resolvedTags = response.tags.split(',').map(t => t.replace(/\s+/g, '')).filter(Boolean);
      }
      if (resolvedTags.length === 0) {
        resolvedTags = ['GoogleNews'];
      }

      const finalTitle = response.judul || item.title;
      const prefixedTitle = cleanTitleText(finalTitle);

      const payload = {
        title: prefixedTitle,
        summary: finalSummary,
        link: item.link,
        mediaId: resolvedMediaId,
        mediaName: finalMediaName,
        publishDate: item.publishDate,
        publishTime: item.publishTime || '12:00',
        location: response.location || 'DKI Jakarta',
        categoryId: finalCategoryId,
        sentiment: response.sentiment || 'Netral',
        tags: resolvedTags,
        imageUrl: finalImage,
        status: 'Published',
        isFeatured: false
      };

      const result = await saveNewsItem(payload, false);
      if (result) {
        if (settings.googleSpreadsheetId) {
          await handleAutoSyncToSheets(result);
        }
        showToast('Berhasil mengarsipkan berita rilis ke pusat data!', 'success');
        // Filter out item so they don't click it again
        setCrawledItems(prev => prev.filter(c => c.link !== item.link));
      }
    } catch (e) {
      showToast('Koneksi bermasalah saat mendaftarkan isu.', 'error');
    } finally {
      setAiSavingUrls(prev => ({ ...prev, [item.link]: false }));
    }
  };

  // Filter local listings for management dashboard list, sorted by newest to oldest by publish date and time
  const filteredList = useMemo(() => {
    return news
      .filter(n => {
        // 1. Text search filter
        const q = searchVal.toLowerCase();
        if (q) {
          const matchesText = 
            n.title.toLowerCase().includes(q) ||
            n.mediaName.toLowerCase().includes(q) ||
            n.categoryName.toLowerCase().includes(q) ||
            (n.summary || '').toLowerCase().includes(q);
          if (!matchesText) return false;
        }

        // 2. Filter Category Sektor
        if (filterCategory !== 'Semua' && n.categoryName !== filterCategory) {
          return false;
        }

        // 3. Filter Sentiment
        if (filterSentiment !== 'Semua' && n.sentiment !== filterSentiment) {
          return false;
        }

        // 4. Filter Location/Wilayah
        if (filterLocation !== 'Semua' && n.location !== filterLocation) {
          return false;
        }

        // 5. Filter Status (Draft vs Published)
        if (filterStatus !== 'Semua' && n.status !== filterStatus) {
          return false;
        }

        // 6. Filter Media Name
        if (filterMedia !== 'Semua' && n.mediaName !== filterMedia) {
          return false;
        }

        // 7. Filter Start Date Range
        if (filterStartDate && n.publishDate < filterStartDate) {
          return false;
        }

        // 8. Filter End Date Range
        if (filterEndDate && n.publishDate > filterEndDate) {
          return false;
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
        return d2 - d1; // newest to oldest
      });
  }, [news, searchVal, filterCategory, filterSentiment, filterLocation, filterStatus, filterMedia, filterStartDate, filterEndDate]);

  const activeFiltersCount = 
    (filterCategory !== 'Semua' ? 1 : 0) +
    (filterSentiment !== 'Semua' ? 1 : 0) +
    (filterLocation !== 'Semua' ? 1 : 0) +
    (filterStatus !== 'Semua' ? 1 : 0) +
    (filterMedia !== 'Semua' ? 1 : 0) +
    (filterStartDate ? 1 : 0) +
    (filterEndDate ? 1 : 0);

  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedList = filteredList.slice(startIndex, startIndex + itemsPerPage);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNewsIds(filteredList.map(item => item.id));
    } else {
      setSelectedNewsIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedNewsIds(prev => [...prev, id]);
    } else {
      setSelectedNewsIds(prev => prev.filter(itemId => itemId !== id));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedNewsIds.length === 0) return;
    if (window.confirm(`Apakah Anda yakin ingin menghapus ${selectedNewsIds.length} arsip berita terpilih secara bersamaan?`)) {
      const ok = await batchDeleteNews(selectedNewsIds);
      if (ok) {
        setSelectedNewsIds([]);
      }
    }
  };

  const handleBatchUpdateCategory = async (targetCategoryId: string) => {
    if (selectedNewsIds.length === 0) return;
    if (!targetCategoryId) return;

    const targetCat = categories.find(c => c.id === targetCategoryId);
    if (!targetCat) return;

    if (window.confirm(`Apakah Anda yakin ingin mengubah kategori ${selectedNewsIds.length} berita terpilih menjadi "${targetCat.name}" secara massal?`)) {
      const ok = await batchUpdateCategory(selectedNewsIds, targetCategoryId);
      if (ok) {
        setSelectedNewsIds([]);
      }
    }
  };

  const handleBatchUpdatePublishDate = async (targetPublishDate: string) => {
    if (selectedNewsIds.length === 0) return;
    if (!targetPublishDate) return;

    if (window.confirm(`Apakah Anda yakin ingin mengubah tanggal publikasi ${selectedNewsIds.length} berita terpilih menjadi "${targetPublishDate}" secara massal?`)) {
      const ok = await batchUpdatePublishDate(selectedNewsIds, targetPublishDate);
      if (ok) {
        setSelectedNewsIds([]);
        setTempBatchDate('');
      }
    }
  };

  const handleBatchUpdatePublishTime = async (targetPublishTime: string) => {
    if (selectedNewsIds.length === 0) return;
    if (!targetPublishTime) return;

    if (window.confirm(`Apakah Anda yakin ingin mengubah jam publikasi ${selectedNewsIds.length} berita terpilih menjadi "${targetPublishTime}" secara massal?`)) {
      const ok = await batchUpdatePublishTime(selectedNewsIds, targetPublishTime);
      if (ok) {
        setSelectedNewsIds([]);
        setTempBatchTime('');
      }
    }
  };

  const handleBatchUpdateSentiment = async (targetSentiment: Sentiment) => {
    if (selectedNewsIds.length === 0) return;
    if (!targetSentiment) return;

    if (window.confirm(`Apakah Anda yakin ingin mengubah sentimen ${selectedNewsIds.length} berita terpilih menjadi "${targetSentiment}" secara massal?`)) {
      const ok = await batchUpdateSentiment(selectedNewsIds, targetSentiment);
      if (ok) {
        setSelectedNewsIds([]);
      }
    }
  };

  const handleBatchUpdateLocation = async (targetLocation: string) => {
    if (selectedNewsIds.length === 0) return;
    if (!targetLocation) return;

    if (window.confirm(`Apakah Anda yakin ingin mengubah wilayah ${selectedNewsIds.length} berita terpilih menjadi "${targetLocation}" secara massal?`)) {
      const ok = await batchUpdateLocation(selectedNewsIds, targetLocation);
      if (ok) {
        setSelectedNewsIds([]);
      }
    }
  };

  const handleExportExcel = (itemsToExport: NewsItem[]) => {
    if (itemsToExport.length === 0) {
      showToast('Tidak ada data untuk diekspor!', 'error');
      return;
    }
    
    try {
      const data = itemsToExport.map((item, idx) => ({
        'No': idx + 1,
        'Judul Berita': item.title,
        'Kategori / Sektor': item.categoryName,
        'Nama Media': item.mediaName,
        'Sentimen': item.sentiment,
        'Wilayah': item.location || 'Nasional',
        'Tanggal Rilis': item.publishDate,
        'Waktu': item.publishTime || '',
        'Ringkasan Isu': item.summary,
        'Tautan Sumber': item.link,
        'Tagar / Label': item.tags ? item.tags.join(', ') : '',
        'Status Dokumentasi': item.status,
        'Tanggal Diinput': item.createdAt ? new Date(item.createdAt).toLocaleString('id-ID') : ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Isu Media');
      
      const max_widths = [
        { wch: 6 },   // No
        { wch: 45 },  // Judul Berita
        { wch: 22 },  // Kategori
        { wch: 20 },  // Nama Media
        { wch: 12 },  // Sentimen
        { wch: 15 },  // Wilayah
        { wch: 15 },  // Tanggal Rilis
        { wch: 10 },  // Waktu
        { wch: 50 },  // Ringkasan
        { wch: 30 },  // Tautan
        { wch: 20 },  // Tagar
        { wch: 15 },  // Status
        { wch: 20 }   // Tanggal Diinput
      ];
      worksheet['!cols'] = max_widths;

      XLSX.writeFile(workbook, `Kliping_Media_Monitoring_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast(`Berhasil mengekspor ${itemsToExport.length} data ke Excel.`, 'success');
    } catch (error) {
      console.error('Export Excel Error:', error);
      showToast('Gagal mengekspor data ke Excel.', 'error');
    }
  };

  const handleExportCSV = (itemsToExport: NewsItem[]) => {
    if (itemsToExport.length === 0) {
      showToast('Tidak ada data untuk diekspor!', 'error');
      return;
    }

    try {
      const headers = [
        'No', 'Judul Berita', 'Kategori / Sektor', 'Nama Media', 'Sentimen', 'Wilayah', 
        'Tanggal Rilis', 'Waktu', 'Ringkasan Isu', 'Tautan Sumber', 'Tagar / Label', 'Status Dokumentasi', 'Tanggal Diinput'
      ];

      const csvRows = [
        headers.join(',')
      ];

      itemsToExport.forEach((item, idx) => {
        const values = [
          String(idx + 1),
          item.title,
          item.categoryName,
          item.mediaName,
          item.sentiment,
          item.location || 'Nasional',
          item.publishDate,
          item.publishTime || '',
          item.summary,
          item.link,
          item.tags ? item.tags.join('; ') : '',
          item.status,
          item.createdAt ? new Date(item.createdAt).toLocaleString('id-ID') : ''
        ].map(val => {
          const cleanVal = String(val || '').replace(/"/g, '""');
          return `"${cleanVal}"`;
        });
        csvRows.push(values.join(','));
      });

      const csvContent = '\uFEFF' + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Kliping_Media_Monitoring_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast(`Berhasil mengekspor ${itemsToExport.length} data ke CSV.`, 'success');
    } catch (error) {
      console.error('Export CSV Error:', error);
      showToast('Gagal mengekspor data ke CSV.', 'error');
    }
  };

  const getItemsForExport = () => {
    if (selectedNewsIds.length > 0) {
      return news.filter(item => selectedNewsIds.includes(item.id));
    }
    return filteredList;
  };

  const exportCount = selectedNewsIds.length > 0 ? selectedNewsIds.length : filteredList.length;

  return (
    <div className="space-y-6">
      {/* Header and Call to create */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-display text-slate-900 dark:text-white flex items-center gap-2">
            <FileEdit className="w-6 h-6 text-indigo-600" id="manage-file-edit-icon" />
            Dokumentasi & Pengelolaan Isu
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Input rilis berita analitis, editor, dan asisten AI.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExportExcel(getItemsForExport())}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 dark:bg-indigo-950/25 dark:hover:bg-indigo-950/45 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            title={selectedNewsIds.length > 0 ? `Ekspor ${selectedNewsIds.length} berita terpilih ke Excel` : `Ekspor semua ${filteredList.length} berita terfilter saat ini ke Excel`}
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Ekspor Excel ({exportCount})</span>
          </button>

          <button
            onClick={() => handleExportCSV(getItemsForExport())}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-900/25 dark:hover:bg-slate-800/45 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            title={selectedNewsIds.length > 0 ? `Ekspor ${selectedNewsIds.length} berita terpilih ke CSV` : `Ekspor semua ${filteredList.length} berita terfilter saat ini ke CSV`}
          >
            <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>Ekspor CSV ({exportCount})</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/45 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Impor Isu</span>
          </button>

          <button
            onClick={handleOpenCreateForm}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" id="manage-plus-icon"/>
            <span>Input Isu Baru</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB SWITCHER */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setManageSubTab('database')}
          className={`pb-3 text-sm font-bold border-b-2 px-1 transition-all flex items-center gap-2 cursor-pointer ${
            manageSubTab === 'database'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>📋 Log Editor & Database Isu</span>
        </button>
        <button
          onClick={() => setManageSubTab('highlights')}
          className={`pb-3 text-sm font-bold border-b-2 px-1 transition-all flex items-center gap-2 cursor-pointer ${
            manageSubTab === 'highlights'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Star className={`w-4 h-4 text-amber-500 ${highlights && highlights.length > 0 ? 'fill-amber-500' : ''}`} />
          <span>🌟 Highlight Hari Ini ({highlights?.length || 0}/10)</span>
        </button>
        <button
          onClick={() => setManageSubTab('crawler-logs')}
          className={`pb-3 text-sm font-bold border-b-2 px-1 transition-all flex items-center gap-2 cursor-pointer ${
            manageSubTab === 'crawler-logs'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Terminal className="w-4 h-4 text-rose-500" />
          <span>🔍 Diagnostik Crawler & Playwright</span>
        </button>
      </div>

      {manageSubTab === 'database' && (
        <>
          {/* GOOGLE SHEETS INTEGRATION PANEL */}
      <div className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/60 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 opacity-5 text-emerald-600 dark:text-emerald-400 pointer-events-none">
          <FileSpreadsheet className="w-40 h-40" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <h3 className="text-base font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-500 animate-pulse" />
              Integrasi Google Sheets Isu
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-light">
              Hubungkan dan sinkronisasikan dokumentasi isu harian secara real-time ke dalam formulir spreadsheet Google Sheets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!googleUser ? (
              <button
                onClick={handleGoogleLogin}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 px-3.5 py-1.8 rounded-xl text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.245-3.12C18.28 1.845 15.545 1 12.24 1 5.918 1 1 5.918 1 12s4.918 11 11.24 11c6.6 0 11-4.64 11-11.2 0-.756-.08-1.334-.18-1.715H12.24z"/>
                </svg>
                Hubungkan Google Sheets
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.8 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 px-3 py-1 font-bold rounded-xl text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Terhubung: {googleUser.displayName || googleUser.email}
                </span>
                <button
                  onClick={handleGoogleLogout}
                  className="text-xs text-rose-500 hover:text-rose-600 underline font-semibold transition active:scale-95 cursor-pointer"
                >
                  Putuskan
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">ID Spreadsheet Google</label>
              <input
                type="text"
                value={spreadsheetIdInput}
                onChange={e => setSpreadsheetIdInput(e.target.value)}
                placeholder="Contoh: 1K6U_Y9Rszb6t767..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Nama Tab Isu</label>
              <input
                type="text"
                value={sheetNameInput}
                onChange={e => setSheetNameInput(e.target.value)}
                placeholder="Contoh: Daftar Isu"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Nama Tab Pantauan Sosmed</label>
              <input
                type="text"
                value={sheetSosmedNameInput}
                onChange={e => setSheetSosmedNameInput(e.target.value)}
                placeholder="Contoh: Pantauan Sosmed"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleConnectSpreadsheet}
                className="flex-1 py-2 px-3 bg-slate-900 border border-transparent hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
              >
                Simpan ID & Tab
              </button>
              {googleUser && (
                <button
                  onClick={handleCreateNewSheets}
                  disabled={isCreatingSheet}
                  className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-150 border border-emerald-200 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-xs rounded-xl shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingSheet ? 'Memproses...' : 'Buat Baru ✨'}
                </button>
              )}
            </div>
          </div>

          {settings.googleSpreadsheetId && (
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      Spreadsheet Aktif: <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">{settings.googleSpreadsheetId.slice(0, 15)}...</span>
                    </p>
                    {!googleUser && (
                      <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-md border border-amber-200/50">
                        ⚠️ Sesi Belum Aktif (Perlu Hubungkan Sesi)
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 font-light mt-0.5">
                    Menggunakan tab <strong className="font-semibold text-slate-700 dark:text-slate-300">🔗 {settings.googleSheetName || 'Daftar Isu'}</strong> dan tab <strong className="font-semibold text-slate-700 dark:text-slate-300">🔗 {settings.googleSheetSosmedName || 'Pantauan Sosmed'}</strong>.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={settings.googleSpreadsheetUrl || `https://docs.google.com/spreadsheets/d/${settings.googleSpreadsheetId}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.8 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 shadow-xs transition cursor-pointer"
                >
                  Buka Google Sheet ↗
                </a>
                
                {googleUser && (
                  <>
                    <button
                      onClick={handleImportFromSheet}
                      disabled={isImporting}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.8 bg-white dark:bg-slate-900 border border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold shadow-xs transition disabled:opacity-50 active:scale-95 cursor-pointer"
                    >
                      <FileSpreadsheet className={`w-3.5 h-3.5 ${isImporting ? 'animate-pulse' : ''}`} />
                      <span>{isImporting ? 'Mengimpor...' : 'Impor Isu dari Sheets'}</span>
                    </button>

                    <button
                      onClick={handleExportAll}
                      disabled={isSyncingAll}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition disabled:opacity-50 active:scale-95 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                      <span>{isSyncingAll ? 'Mengekspor Isu...' : 'Ekspor Semua Isu'}</span>
                    </button>

                    <button
                      onClick={handleExportAllSocial}
                      disabled={isSyncingAllSocial}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md transition disabled:opacity-50 active:scale-95 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAllSocial ? 'animate-spin' : ''}`} />
                      <span>{isSyncingAllSocial ? 'Mengekspor Sosmed...' : 'Ekspor Semua Sosmed'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FILTER SEARCH FIELD */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <Search className="w-4 h-4 text-slate-400" id="manage-search-icon"/>
            </div>
            <input
              type="text"
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              placeholder="Cari berita berdasarkan judul, ringkasan, nama media, atau kategori..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm placeholder:text-slate-400 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Clear/Reset button if filters are active */}
            {((activeFiltersCount > 0) || searchVal) && (
              <button
                onClick={() => {
                  setSearchVal('');
                  setFilterCategory('Semua');
                  setFilterSentiment('Semua');
                  setFilterLocation('Semua');
                  setFilterStatus('Semua');
                  setFilterMedia('Semua');
                  setFilterStartDate('');
                  setFilterEndDate('');
                  showToast('Berhasil membersihkan semua kriteria filter', 'info');
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer border border-slate-200/30"
                title="Bersihkan Semua Filter"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            {/* Toggle advanced filter button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition active:scale-95 cursor-pointer border ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/30 dark:border-indigo-900/60 dark:text-indigo-400'
                  : 'bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter Portal</span>
              {activeFiltersCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 text-[10px] font-black text-white bg-indigo-600 dark:bg-indigo-500 rounded-full animate-bounce">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showFilters ? 'rotate-180' : 'rotate-0'}`} />
            </button>
          </div>
        </div>

        {/* Collapsible Panel via AnimatePresence */}
        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 p-5 bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl border border-slate-150/80 dark:border-slate-800/60">
                {/* 1. Category Selector */}
                <div className="space-y-1">
                  <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Kategori</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => {
                      setFilterCategory(e.target.value);
                      showToast(`Filter kategori diset ke: ${e.target.value}`, 'success');
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-550/20 transition cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                  >
                    <option value="Semua">Semua Topik</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Sentiment Selector */}
                <div className="space-y-1">
                  <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sentimen</label>
                  <select
                    value={filterSentiment}
                    onChange={(e) => {
                      setFilterSentiment(e.target.value);
                      showToast(`Filter sentimen diset ke: ${e.target.value}`, 'success');
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-550/20 transition cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                  >
                    <option value="Semua">Semua Sentimen</option>
                    <option value="Positif">Positif 🟢</option>
                    <option value="Netral">Netral 🔵</option>
                    <option value="Negatif">Negatif 🔴</option>
                  </select>
                </div>

                {/* 3. Region Selector */}
                <div className="space-y-1">
                  <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Wilayah</label>
                  <select
                    value={filterLocation}
                    onChange={(e) => {
                      setFilterLocation(e.target.value);
                      showToast(`Filter wilayah diset ke: ${e.target.value}`, 'success');
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-550/20 transition cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                  >
                    <option value="Semua">Semua Wilayah</option>
                    <option value="Nasional">Nasional</option>
                    {uniqueLocations.filter(loc => loc !== 'Nasional').map((loc, idx) => (
                      <option key={idx} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                {/* 4. Media Selector */}
                <div className="space-y-1">
                  <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sumber Media</label>
                  <select
                    value={filterMedia}
                    onChange={(e) => {
                      setFilterMedia(e.target.value);
                      showToast(`Filter media diset ke: ${e.target.value}`, 'success');
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-550/20 transition cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                  >
                    <option value="Semua">Semua Media</option>
                    {uniqueMedias.map((med, idx) => (
                      <option key={idx} value={med}>{med}</option>
                    ))}
                  </select>
                </div>

                {/* 5. Status Selector */}
                <div className="space-y-1">
                  <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status Isu</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      showToast(`Filter status diset ke: ${e.target.value}`, 'success');
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-550/20 transition cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                  >
                    <option value="Semua">Semua Status</option>
                    <option value="Published">Published 🌐</option>
                    <option value="Draft">Draft 📝</option>
                  </select>
                </div>

                {/* 6. Start Date Selector */}
                <div className="space-y-1">
                  <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Dari Tanggal</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => {
                      setFilterStartDate(e.target.value);
                      showToast(`Filter rentang tanggal diset`, 'success');
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-550/20 transition [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>

                {/* 7. End Date Selector */}
                <div className="space-y-1">
                  <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => {
                      setFilterEndDate(e.target.value);
                      showToast(`Filter rentang tanggal diset`, 'success');
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-550/20 transition [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* LIST TABLE CLIPS FOR MANAGEMENT */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 tracking-wider">INDEX DATABASE BERITA ({filteredList.length} Entri)</span>
            {selectedNewsIds.length > 0 && (
              <span className="text-[10.5px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1 rounded-full animate-pulse">
                Terpilih: {selectedNewsIds.length} item
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {selectedNewsIds.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pl-2.5 pr-1 py-1 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Topik Massal:</span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const catId = e.target.value;
                    if (catId) {
                      handleBatchUpdateCategory(catId);
                      e.target.value = "";
                    }
                  }}
                  className="bg-transparent text-slate-800 dark:text-slate-100 font-bold text-[10px] py-0.5 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="" disabled className="text-slate-400 font-normal">-- Ubah Kategori --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id} className="text-xs font-semibold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {selectedNewsIds.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pl-2.5 pr-1 py-1 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Sentimen Massal:</span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const sentimentVal = e.target.value as Sentiment;
                    if (sentimentVal) {
                      handleBatchUpdateSentiment(sentimentVal);
                      e.target.value = "";
                    }
                  }}
                  className="bg-transparent text-slate-800 dark:text-slate-100 font-bold text-[10px] py-0.5 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="" disabled className="text-slate-400 font-normal">-- Ubah Sentimen --</option>
                  <option value="Positif" className="text-xs font-semibold bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400">Positif 🟢</option>
                  <option value="Netral" className="text-xs font-semibold bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400">Netral 🔵</option>
                  <option value="Negatif" className="text-xs font-semibold bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400">Negatif 🔴</option>
                </select>
              </div>
            )}
            {selectedNewsIds.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pl-2.5 pr-1 py-1 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Wilayah Massal:</span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const locVal = e.target.value;
                    if (locVal) {
                      handleBatchUpdateLocation(locVal);
                      e.target.value = "";
                    }
                  }}
                  className="bg-transparent text-slate-800 dark:text-slate-100 font-bold text-[10px] py-0.5 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="" disabled className="text-slate-400 font-normal">-- Ubah Wilayah --</option>
                  <option value="Nasional" className="text-xs font-semibold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Nasional</option>
                  {PROVINCES.map((prov) => (
                    <option key={prov} value={prov} className="text-xs font-semibold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                      {prov}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {selectedNewsIds.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-indigo-500" />
                  Tanggal Massal:
                </span>
                <input
                  type="date"
                  value={tempBatchDate}
                  onChange={(e) => setTempBatchDate(e.target.value)}
                  onClick={(e) => {
                    try {
                      (e.currentTarget as any).showPicker();
                    } catch (err) {}
                  }}
                  className="bg-transparent text-slate-800 dark:text-slate-100 font-bold text-[10px] py-0.5 focus:outline-none cursor-pointer border-0 [color-scheme:light] dark:[color-scheme:dark]"
                />
                {tempBatchDate && (
                  <button
                    onClick={() => {
                      handleBatchUpdatePublishDate(tempBatchDate);
                    }}
                    title="Simpan Tanggal Massal"
                    className="ml-1 p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md transition active:scale-90 flex items-center justify-center cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            {selectedNewsIds.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-500" />
                  Jam Massal:
                </span>
                <input
                  type="time"
                  value={tempBatchTime}
                  onChange={(e) => setTempBatchTime(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-slate-100 font-bold text-[10px] py-0.5 focus:outline-none cursor-pointer border-0 [color-scheme:light] dark:[color-scheme:dark]"
                />
                {tempBatchTime && (
                  <button
                    onClick={() => {
                      handleBatchUpdatePublishTime(tempBatchTime);
                    }}
                    title="Simpan Jam Massal"
                    className="ml-1 p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md transition active:scale-90 flex items-center justify-center cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            {selectedNewsIds.length > 0 && (
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Terpilih ({selectedNewsIds.length})</span>
              </button>
            )}
            <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1.5 rounded-md">LOG AKTIF</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-950/20 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredList.length > 0 && selectedNewsIds.length === filteredList.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Judul</th>
                <th className="py-3 px-4">Sumber Media</th>
                <th className="py-3 px-4">Topik Kategori</th>
                <th className="py-3 px-4">Sentimen</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Operasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
              {paginatedList.length > 0 ? (
                paginatedList.map((item) => (
                  <tr key={item.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition ${selectedNewsIds.includes(item.id) ? 'bg-indigo-50/10 dark:bg-indigo-950/5' : ''}`}>
                    <td className="py-3.5 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedNewsIds.includes(item.id)}
                        onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="font-semibold truncate text-slate-950 dark:text-white mb-0.5" title={item.title}>
                        {item.title}
                      </div>
                      <div className="text-[10px] text-slate-400/80 dark:text-slate-500 font-medium flex items-wrap items-center gap-1.5 font-mono">
                        <span>📅 {formatDateDDMMYYYY(item.publishDate)} {item.publishTime || '12:00'}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-850">
                          <span className="text-slate-400">📍</span>
                          <select
                            value={item.location || 'Nasional'}
                            onChange={async (e) => {
                              const nextLoc = e.target.value;
                              const updatedPayload = {
                                ...item,
                                location: nextLoc
                              };
                              const res = await saveNewsItem(updatedPayload, true, item.id);
                              if (res) {
                                showToast(`Wilayah berhasil diubah menjadi "${nextLoc}"`, 'success');
                              }
                            }}
                            className="bg-transparent text-indigo-650 dark:text-indigo-400 font-bold focus:outline-none cursor-pointer hover:underline text-[10px]"
                            title="Klik untuk mengubah Wilayah"
                          >
                            <option value="Nasional" className="text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Nasional</option>
                            {PROVINCES.map((prov) => (
                              <option key={prov} value={prov} className="text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                                {prov}
                              </option>
                            ))}
                          </select>
                        </div>
                        <span>•</span>
                        <button
                          onClick={() => {
                            setSelectedProvince(item.location || 'Nasional');
                            setTab('dashboard');
                            showToast(`Membuka lokasi ${item.location || 'Nasional'} pada Peta Analitik`, 'info');
                          }}
                          className="text-slate-500 hover:text-indigo-650 dark:hover:text-indigo-400 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                          title="Klik untuk melihat sebaran isu di Peta Analitik"
                        >
                          Peta 🗺️
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-500">
                      {item.mediaName}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="relative inline-block">
                        <select
                          value={item.categoryId || ''}
                          onChange={async (e) => {
                            const nextCatId = e.target.value;
                            const nextCat = categories.find(c => c.id === nextCatId);
                            if (nextCat) {
                              const updatedPayload = {
                                ...item,
                                categoryId: nextCatId,
                                categoryName: nextCat.name
                              };
                              const res = await saveNewsItem(updatedPayload, true, item.id);
                              if (res) {
                                showToast(`Kategori berhasil diubah menjadi "${nextCat.name}"`, 'success');
                              }
                            }
                          }}
                          className="appearance-none bg-slate-100/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 font-bold text-[10px] pl-2 py-1 pr-6 rounded-md border border-slate-200 dark:border-slate-700/60 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 hover:bg-slate-200/90 hover:dark:bg-slate-750 transition-all cursor-pointer min-w-[125px] select-none"
                          title="Klik untuk mengubah Kategori"
                        >
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold text-xs">
                              {cat.name}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center pr-0.5 text-slate-400 dark:text-slate-500">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                        item.sentiment === 'Positif' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' :
                        item.sentiment === 'Negatif' ? 'text-red-500 bg-red-50 dark:bg-red-900/10' :
                        'text-blue-500 bg-blue-50 dark:bg-blue-950/20'
                      }`}>
                        {item.sentiment}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-1.5 py-0.5 rounded font-bold text-[9px] uppercase tracking-wide border ${
                        item.status === 'Published' 
                          ? 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/25 dark:border-blue-900/40' 
                          : 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/25 dark:border-amber-900/40'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {(() => {
                          const isFeatured = (highlights || []).some(h => h.title.trim().toLowerCase() === item.title.trim().toLowerCase());
                          return (
                            <button
                              onClick={async () => {
                                const existing = (highlights || []).find(h => h.title.trim().toLowerCase() === item.title.trim().toLowerCase());
                                if (existing) {
                                  if (window.confirm(`Hapus "${item.title}" dari Highlight Hari Ini?`)) {
                                    await removeHighlight(existing.id);
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
                                }
                              }}
                              className={`p-1 rounded transition cursor-pointer ${
                                isFeatured
                                  ? 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-955/35'
                                  : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10'
                              }`}
                              title={isFeatured ? "Hapus dari Highlight" : "Jadikan Highlight Hari Ini"}
                            >
                              <Star className={`w-4 h-4 ${isFeatured ? 'fill-current' : ''}`} />
                            </button>
                          );
                        })()}
                        <button
                          onClick={() => handleEditClick(item)}
                          className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition cursor-pointer"
                          title="Edit berita"
                        >
                          <FileEdit className="w-4 h-4" id={`clip-tbl-edit-${item.id}`}/>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(item.id)}
                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition cursor-pointer"
                          title="Hapus berita"
                        >
                          <Trash2 className="w-4 h-4" id={`clip-tbl-del-${item.id}`}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ada arsip berita yang sesuai dengan kriteria pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs text-slate-500 select-none">
            <div className="flex items-center gap-2">
              <span>Tampilkan</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded px-1.5 py-1 text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 hover:bg-slate-250 transition-all cursor-pointer min-w-[65px]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>entri dari total <strong>{filteredList.length}</strong> entri</span>
            </div>
            
            <div className="flex items-center gap-1 font-sans">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent font-semibold transition cursor-pointer"
              >
                Sebelumnya
              </button>
              
              <div className="flex items-center gap-1 font-mono px-2">
                <span>Halaman</span>
                <span className="font-bold text-slate-800 dark:text-white">{currentPage}</span>
                <span>dari</span>
                <span className="font-bold">{totalPages}</span>
              </div>
              
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent font-semibold transition cursor-pointer"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>
        </>
      )}

      {manageSubTab === 'highlights' && (
        <div className="space-y-6">
          {/* STATS BREAKDOWN GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CARD 1: TOTAL ACTIVE HIGHLIGHTS */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 opacity-5 text-amber-500 pointer-events-none">
                <Star className="w-28 h-28 fill-amber-500" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Arsip Highlight</span>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-1.5 font-display">
                  <span>{highlights?.length || 0}</span>
                  <span className="text-xs text-slate-400 font-bold">/ 10 kuota</span>
                </h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                {highlights && highlights.length >= 10 
                  ? '⚠️ Kuota penuh. Menambahkan highlight baru akan menghapus entri terlama (FIFO).' 
                  : `Tersisa ${10 - (highlights?.length || 0)} slot kuota highlight.`}
              </p>
            </div>

            {/* CARD 2: PINNED HIGHLIGHTS */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 opacity-5 text-indigo-500 pointer-events-none">
                <Pin className="w-28 h-28" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Highlight Tersemat</span>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white font-display">
                  {highlights?.filter(h => h.isPinned).length || 0}
                </h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                Item tersemat akan selalu muncul di posisi paling depan pada tayangan dashboard.
              </p>
            </div>

            {/* CARD 3: SENTIMENT SPREAD */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Sebaran Sentimen</span>
                <div className="flex items-center gap-4 mt-1">
                  <div className="text-center">
                    <span className="block text-xs font-bold text-emerald-500">Positif</span>
                    <span className="text-lg font-black text-slate-800 dark:text-slate-250 font-display">
                      {highlights?.filter(h => (h.sentiment || '').toLowerCase().includes('pos')).length || 0}
                    </span>
                  </div>
                  <div className="text-center border-x border-slate-100 dark:border-slate-800 px-4">
                    <span className="block text-xs font-bold text-slate-400">Netral</span>
                    <span className="text-lg font-black text-slate-800 dark:text-slate-250 font-display">
                      {highlights?.filter(h => (h.sentiment || '').toLowerCase().includes('net') || !(h.sentiment)).length || 0}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="block text-xs font-bold text-rose-500">Negatif</span>
                    <span className="text-lg font-black text-slate-800 dark:text-slate-250 font-display">
                      {highlights?.filter(h => (h.sentiment || '').toLowerCase().includes('neg')).length || 0}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                Rasio sentimen yang direpresentasikan pada slide sorotan utama.
              </p>
            </div>
          </div>

          {/* MAIN MANAGEMENT BOX */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/10">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                  Daftar Highlight Berita Aktif
                </h3>
                <p className="text-xs text-slate-400">Atur urutan, edit detail, sematkan, atau hapus rilis sorotan.</p>
              </div>

              <button
                onClick={handleOpenCreateHighlight}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/25 transition active:scale-95 cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Highlight Kustom</span>
              </button>
            </div>

            {/* LIST OF HIGHLIGHTS */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
              {!highlights || highlights.length === 0 ? (
                <div className="py-16 text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-500">
                    <Star className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h5 className="text-sm font-bold text-slate-800 dark:text-white">Belum Ada Highlight</h5>
                    <p className="text-xs text-slate-400 font-light">
                      Anda belum menambahkan highlight apa pun ke dalam sistem. Cari berita penting di tab <strong>📋 Log Editor & Database Isu</strong> lalu tekan ikon bintang atau klik tombol di atas untuk menambah highlight kustom.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-3">
                  {highlights.map((hl, index) => {
                    const sentimentNorm = (hl.sentiment || 'Netral').toLowerCase();
                    const sentimentStyle = sentimentNorm.includes('pos') 
                      ? 'text-emerald-500 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30' 
                      : sentimentNorm.includes('neg') 
                        ? 'text-rose-500 bg-rose-50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30' 
                        : 'text-blue-500 bg-blue-50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-950/30';
                    
                    return (
                      <div 
                        key={hl.id} 
                        className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 bg-slate-50/45 dark:bg-slate-900/40 border border-slate-150/70 dark:border-slate-800 rounded-xl hover:border-slate-200 dark:hover:border-slate-700/80 transition-all group"
                      >
                        {/* 1. ORDER CONTROLS */}
                        <div className="flex flex-row md:flex-col items-center gap-1.5 self-center shrink-0">
                          <button
                            disabled={index === 0}
                            onClick={() => handleMoveHighlight(index, 'up')}
                            className="p-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400 transition cursor-pointer"
                            title="Pindahkan ke Atas"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[11px] font-black text-slate-400 w-5 text-center font-mono">
                            {index + 1}
                          </span>
                          <button
                            disabled={index === highlights.length - 1}
                            onClick={() => handleMoveHighlight(index, 'down')}
                            className="p-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400 transition cursor-pointer"
                            title="Pindahkan ke Bawah"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* 2. IMAGE (IF ANY) */}
                        {hl.imageUrl ? (
                          <div className="w-14 h-14 rounded-xl border border-slate-150 dark:border-slate-800 overflow-hidden shrink-0 hidden sm:block relative bg-slate-100">
                            <img 
                              src={hl.imageUrl} 
                              alt="Highlight" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.currentTarget as any).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100%25' height='100%25' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%23cbd5e1'%3EHari Ini%3C/text%3E%3C/svg%3E";
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 flex items-center justify-center shrink-0 hidden sm:flex text-slate-300 dark:text-slate-700">
                            <Star className="w-5 h-5 fill-current" />
                          </div>
                        )}

                        {/* 3. MAIN CONTENT */}
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            {/* Pinned status badge */}
                            {hl.isPinned && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wide bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15 animate-pulse">
                                <Pin className="w-2.5 h-2.5 fill-amber-500" />
                                Tersemat
                              </span>
                            )}
                            
                            <span className="px-1.5 py-0.5 rounded font-extrabold bg-indigo-50/60 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                              {hl.categoryName || 'Sektor'}
                            </span>
                            
                            <span className={`px-1.5 py-0.5 rounded font-extrabold border ${sentimentStyle} uppercase tracking-wider`}>
                              {hl.sentiment || 'Netral'}
                            </span>

                            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-0.5 font-semibold">
                              <MapPin className="w-3 h-3" />
                              {hl.location || 'Nasional'}
                            </span>

                            <span className="text-slate-400 dark:text-slate-500 font-medium">
                              • {hl.mediaName}
                            </span>

                            <span className="text-slate-400 dark:text-slate-500 font-medium">
                              • {formatDateDDMMYYYY(hl.publishDate)} {hl.publishTime || '12:00'}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                            {hl.link ? (
                              <a href={hl.link} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                                {hl.title}
                                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              </a>
                            ) : (
                              hl.title
                            )}
                          </h4>

                          <p className="text-xs text-slate-500 dark:text-slate-400 font-light line-clamp-2">
                            {hl.summary}
                          </p>
                        </div>

                        {/* 4. ACTION BUTTONS */}
                        <div className="flex items-center gap-1.5 self-center shrink-0">
                          {/* Toggle Pin Button */}
                          <button
                            onClick={async () => {
                              await saveHighlight({ ...hl, isPinned: !hl.isPinned }, true, hl.id);
                            }}
                            className={`p-1.8 rounded-lg border transition cursor-pointer ${
                              hl.isPinned 
                                ? 'bg-amber-50 dark:bg-amber-950/25 border-amber-200 dark:border-amber-900/60 text-amber-500 hover:bg-amber-100' 
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-500 hover:border-amber-200'
                            }`}
                            title={hl.isPinned ? "Lepaskan Pin" : "Sematkan di Depan"}
                          >
                            <Pin className={`w-4 h-4 ${hl.isPinned ? 'fill-current' : ''}`} />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEditHighlight(hl)}
                            className="p-1.8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-blue-500 hover:border-blue-200 dark:hover:border-blue-800/50 transition cursor-pointer"
                            title="Edit Highlight"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={async () => {
                              if (window.confirm(`Hapus highlight "${hl.title}" dari sorotan utama hari ini?`)) {
                                await removeHighlight(hl.id);
                              }
                            }}
                            className="p-1.8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:border-rose-200 dark:hover:border-rose-900/50 transition cursor-pointer"
                            title="Hapus Highlight"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {manageSubTab === 'crawler-logs' && (
        <div className="space-y-6">
          {/* STATS OVERVIEW CARD */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase font-sans">Total Resolusi URL</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-display">
                  {crawlerLogs.length}
                </span>
                <span className="text-xs text-slate-400 font-sans">up to 200 riwayat</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase font-sans">Tingkat Keberhasilan</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-500 font-display">
                  {crawlerLogs.length > 0 
                    ? `${Math.round((crawlerLogs.filter(l => l.status === 'success').length / crawlerLogs.length) * 100)}%`
                    : '0%'
                  }
                </span>
                <span className="text-xs text-slate-400 font-sans">
                  {crawlerLogs.filter(l => l.status === 'success').length} sukses
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase font-sans">Metode Fast-Path (Instan)</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-display">
                  {crawlerLogs.filter(l => l.method === 'fast-path').length}
                </span>
                <span className="text-xs text-slate-400 font-sans">
                  {crawlerLogs.length > 0
                    ? `${Math.round((crawlerLogs.filter(l => l.method === 'fast-path').length / crawlerLogs.length) * 100)}%`
                    : '0%'
                  } dari total
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase font-sans">Rata-rata Waktu Resolusi</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-display">
                  {(() => {
                    const validTimes = crawlerLogs.filter(l => typeof l.durationMs === 'number' && l.durationMs > 0);
                    if (validTimes.length === 0) return '0ms';
                    const avg = validTimes.reduce((acc, curr) => acc + curr.durationMs, 0) / validTimes.length;
                    return avg < 1000 ? `${Math.round(avg)}ms` : `${(avg / 1000).toFixed(2)}s`;
                  })()}
                </span>
                <span className="text-xs text-slate-400 font-sans">dari resolusi aktif</span>
              </div>
            </div>
          </div>

          {/* TEST URL DIAGNOSTIC TOOL */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-500" />
                Uji Coba Perayapan URL (Playwright Crawler Test)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-light font-sans">
                Masukkan URL apa pun (Google News atau tautan langsung) untuk menguji kemampuan resolusi redirect dan perolehan status HTTP perayap secara instan.
              </p>
            </div>

            <form onSubmit={handleTestUrl} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  value={testUrlInput}
                  onChange={(e) => setTestUrlInput(e.target.value)}
                  placeholder="https://news.google.com/... atau https://kompas.com/..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-300 dark:hover:border-slate-700 transition font-sans"
                  disabled={isTestingUrl}
                />
              </div>
              <button
                type="submit"
                disabled={isTestingUrl}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer font-sans"
              >
                {isTestingUrl ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menguji...</span>
                  </>
                ) : (
                  <>
                    <Bug className="w-3.5 h-3.5" />
                    <span>Uji URL</span>
                  </>
                )}
              </button>
            </form>

            {/* TEST RESULT DISPLAY */}
            <AnimatePresence>
              {testResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 rounded-xl border text-xs font-sans space-y-3 ${
                    testResult.success
                      ? 'bg-emerald-50/40 dark:bg-emerald-955/5 border-emerald-100 dark:border-emerald-900/30 text-slate-800 dark:text-slate-200'
                      : 'bg-rose-50/40 dark:bg-rose-955/5 border-rose-100 dark:border-rose-900/30 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      {testResult.success ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-emerald-700 dark:text-emerald-400">Hasil Pengujian: SUKSES</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-rose-500" />
                          <span className="text-rose-700 dark:text-rose-400">Hasil Pengujian: GAGAL</span>
                        </>
                      )}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400">
                      Waktu Proses: {testResult.durationMs < 1000 ? `${testResult.durationMs}ms` : `${(testResult.durationMs / 1000).toFixed(2)}s`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">URL Awal</span>
                      <p className="font-mono break-all text-[11px] bg-slate-100/50 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-200/40 dark:border-slate-800/40">
                        {testResult.originalUrl}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">URL Hasil Akhir (Resolved)</span>
                      <div className="font-mono break-all text-[11px] bg-slate-100/50 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-200/40 dark:border-slate-800/40 flex items-start gap-1 justify-between">
                        <span className="flex-1">{testResult.resolvedUrl || '-'}</span>
                        {testResult.resolvedUrl && testResult.resolvedUrl.startsWith('http') && (
                          <a
                            href={testResult.resolvedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-500 p-0.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Status HTTP</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mt-1 ${
                        testResult.statusCode >= 200 && testResult.statusCode < 300
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : testResult.statusCode >= 300 && testResult.statusCode < 400
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                          : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                      }`}>
                        {testResult.statusCode || 'N/A'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Metode Resolusi</span>
                      <span className="inline-block px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100/30 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-full mt-1">
                        {testResult.method}
                      </span>
                    </div>

                    {testResult.title && (
                      <div className="col-span-2 md:col-span-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Judul Halaman</span>
                        <span className="inline-block text-slate-700 dark:text-slate-300 font-medium line-clamp-1 mt-1">
                          {testResult.title}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ERROR MESSAGE IF ANY */}
                  {testResult.errorMessage && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-955/10 border border-rose-100 dark:border-rose-900/30 rounded-xl text-rose-700 dark:text-rose-400 font-medium">
                      <p className="font-semibold text-[11px] uppercase tracking-wider text-rose-500 mb-1">Detail Kesalahan:</p>
                      <p className="font-mono text-xs">{testResult.errorMessage}</p>
                    </div>
                  )}

                  {/* REDIRECT CHAIN VISUAL */}
                  {testResult.redirectChain && testResult.redirectChain.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Rantai Redirect ({testResult.redirectChain.length} langkah)</span>
                      <div className="space-y-1 bg-slate-100/50 dark:bg-slate-950/30 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800/40">
                        {testResult.redirectChain.map((u: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5 font-mono text-[10px] break-all">
                            <span className="text-slate-400 font-bold">{idx + 1}.</span>
                            <span className={idx === testResult.redirectChain.length - 1 ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-600 dark:text-slate-400'}>{u}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* MAIN DIAGNOSTIC PANEL CONTROL BAR */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                  <Bug className="w-5 h-5 text-rose-500 animate-pulse" />
                  Panel Log Diagnostik Crawler & Playwright
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-light flex items-center gap-1.5 font-sans font-sans">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Pemantauan real-time status resolusi URL berita asli dan proses headless Playwright.
                </p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchCrawlerLogs}
                  disabled={isFetchingLogs}
                  className="flex items-center gap-1.5 px-3 py-1.8 border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer font-sans"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isFetchingLogs ? 'animate-spin' : ''}`} />
                  <span>Segarkan</span>
                </button>
                <button
                  onClick={clearCrawlerLogs}
                  className="flex items-center gap-1.5 px-3 py-1.8 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/20 dark:hover:bg-rose-955/45 border border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer font-sans"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kosongkan Log</span>
                </button>
              </div>
            </div>

            {/* FILTERS BAR */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* SEARCH BOX */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Cari berdasarkan URL, pesan kesalahan, atau metode..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-300 dark:hover:border-slate-700 transition font-sans"
                />
              </div>

              {/* TABS FILTER */}
              <div className="flex flex-wrap items-center gap-1 bg-slate-100/75 dark:bg-slate-950/60 p-1 rounded-xl">
                {(['all', 'success', 'warning', 'error'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setLogFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide uppercase transition cursor-pointer font-sans ${
                      logFilter === f
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {f === 'all' && 'Semua Log'}
                    {f === 'success' && 'Berhasil'}
                    {f === 'warning' && 'Peringatan'}
                    {f === 'error' && 'Gagal'}
                  </button>
                ))}
              </div>
            </div>

            {/* LOGS CONTAINER */}
            <div className="border border-slate-200/60 dark:border-slate-800/80 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/20 max-h-[600px] overflow-y-auto">
              {filteredCrawlerLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 space-y-2">
                  <Activity className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto animate-pulse" />
                  <p className="text-xs font-bold uppercase tracking-wider font-sans">Tidak Ada Log</p>
                  <p className="text-xs font-light max-w-sm mx-auto font-sans font-sans">
                    {crawlerLogs.length === 0 
                      ? 'Belum ada proses crawling atau resolusi URL yang dijalankan sejak server aktif.'
                      : 'Tidak ada log yang sesuai dengan kriteria pencarian atau penyaringan.'
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-150 dark:divide-slate-800">
                  {filteredCrawlerLogs.map((log: any) => {
                    const isExpanded = expandedLogId === log.id;
                    
                    // Style by status
                    const statusConfig = {
                      success: {
                        bg: 'bg-emerald-50 dark:bg-emerald-950/15 border-emerald-100 dark:border-emerald-950/30 text-emerald-700 dark:text-emerald-400',
                        badge: 'SUCCESS',
                        pulse: 'bg-emerald-500'
                      },
                      warning: {
                        bg: 'bg-amber-50 dark:bg-amber-950/15 border-amber-100 dark:border-amber-950/30 text-amber-700 dark:text-amber-400',
                        badge: 'WARNING',
                        pulse: 'bg-amber-500'
                      },
                      error: {
                        bg: 'bg-rose-50 dark:bg-rose-950/15 border-rose-100 dark:border-rose-955/30 text-rose-700 dark:text-rose-400',
                        badge: 'ERROR',
                        pulse: 'bg-rose-500'
                      }
                    }[log.status as 'success' | 'warning' | 'error'] || {
                      bg: 'bg-slate-50 dark:bg-slate-900 border-slate-150 text-slate-600',
                      badge: 'UNKNOWN',
                      pulse: 'bg-slate-500'
                    };

                    // Style by method
                    const methodLabels: Record<string, string> = {
                      'fast-path': '⚡ Fast Decoding',
                      'playwright-batch': '🎭 Playwright Batch',
                      'playwright-single': '🎭 Playwright Single',
                      'fetch': '🌐 Direct Fetch',
                      'fallback': '🛠️ DOM Fallback',
                      'unknown': '❓ Unknown/None'
                    };

                    return (
                      <div 
                        key={log.id} 
                        className={`transition duration-155 hover:bg-slate-100/50 dark:hover:bg-slate-900/40`}
                      >
                        {/* Header click bar */}
                        <div 
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="p-4 flex items-start gap-3 cursor-pointer select-none"
                        >
                          {/* Dot / Indicator */}
                          <div className="mt-1.5 shrink-0 flex items-center justify-center">
                            <span className={`block w-2.5 h-2.5 rounded-full ${statusConfig.pulse}`} />
                          </div>

                          {/* Content Row */}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2 text-[10px]">
                              {/* Timestamp */}
                              <span className="font-mono text-slate-400 dark:text-slate-500 font-medium">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>

                              {/* Status Badge */}
                              <span className={`px-1.5 py-0.5 rounded font-black text-[9px] tracking-wide ${statusConfig.bg}`}>
                                {statusConfig.badge} {log.statusCode ? `(${log.statusCode})` : ''}
                              </span>

                              {/* Method Badge */}
                              <span className="px-1.5 py-0.5 rounded font-extrabold bg-blue-50 dark:bg-blue-955/30 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30 font-sans font-sans">
                                {methodLabels[log.method] || log.method}
                              </span>

                              {/* Duration Badge */}
                              {typeof log.durationMs === 'number' && (
                                <span className="font-mono text-slate-400 dark:text-slate-500 font-bold">
                                  ⏱️ {log.durationMs}ms
                                </span>
                              )}
                            </div>

                            {/* Original URL Display */}
                            <div className="font-mono text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 truncate font-medium">
                              Original: {log.originalUrl}
                            </div>

                            {/* Resolved URL Display */}
                            {log.resolvedUrl && (
                              <div className="font-mono text-[11px] leading-relaxed text-indigo-600 dark:text-indigo-400 truncate font-semibold">
                                Resolved: {log.resolvedUrl}
                              </div>
                            )}

                            {/* Error message inline snippet */}
                            {!isExpanded && log.errorMessage && (
                              <p className="text-[10px] text-rose-500 dark:text-rose-400 truncate italic font-light font-sans font-sans">
                                ❌ {log.errorMessage}
                              </p>
                            )}
                          </div>

                          {/* Chevron icon */}
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} />
                        </div>

                        {/* Collapsed Detailed panel */}
                        {isExpanded && (
                          <div className="px-10 pb-4 pt-1 border-t border-slate-100 dark:border-slate-900/40 bg-slate-100/20 dark:bg-slate-950/40 text-xs text-slate-700 dark:text-slate-300 space-y-3 font-sans leading-relaxed">
                            {/* URL Breakdowns */}
                            <div className="space-y-1.5 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/80 shadow-xs">
                              <div>
                                <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">URL Masukan Asli</span>
                                <a 
                                  href={log.originalUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="font-mono text-[10.5px] text-blue-600 dark:text-blue-400 hover:underline break-all font-medium flex items-center gap-1"
                                >
                                  {log.originalUrl}
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                              </div>

                              {log.decodedUrl && log.decodedUrl !== log.originalUrl && (
                                <div className="pt-1.5 border-t border-slate-50 dark:border-slate-850">
                                  <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">URL Hasil Dekode (Fast-path)</span>
                                  <div className="font-mono text-[10.5px] break-all font-medium text-emerald-600 dark:text-emerald-500">
                                    {log.decodedUrl}
                                  </div>
                                </div>
                              )}

                              {log.resolvedUrl && log.resolvedUrl !== log.originalUrl && (
                                <div className="pt-1.5 border-t border-slate-50 dark:border-slate-850">
                                  <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">URL Akhir yang Diselesaikan</span>
                                  <a 
                                    href={log.resolvedUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="font-mono text-[10.5px] text-indigo-600 dark:text-indigo-400 hover:underline break-all font-semibold flex items-center gap-1"
                                  >
                                    {log.resolvedUrl}
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Redirect Chain / Playwright Path */}
                            <div className="space-y-1.5">
                              <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">Rantai Pengalihan (Redirect Chain)</span>
                              {log.redirectChain && log.redirectChain.length > 0 ? (
                                <ol className="list-decimal list-inside font-mono text-[10px] bg-slate-100 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/40 dark:border-slate-850 space-y-1 divide-y divide-slate-150/40 dark:divide-slate-850/30">
                                  {log.redirectChain.map((url: string, index: number) => (
                                    <li key={index} className="pt-1 first:pt-0 text-slate-500 dark:text-slate-400 truncate" title={url}>
                                      <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1 py-0.2 rounded mr-1 font-sans">Hop {index + 1}</span>
                                      {url}
                                    </li>
                                  ))}
                                </ol>
                              ) : (
                                <p className="text-[10.5px] italic text-slate-400 font-light pl-1 font-sans">
                                  Tidak ada rekaman rantai pengalihan URL (Fast-path decode atau fetch langsung).
                                </p>
                              )}
                            </div>

                            {/* Error Details if any */}
                            {log.errorMessage && (
                              <div className="p-3 rounded-xl bg-rose-50/75 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-400">
                                <span className="block text-[9.5px] font-bold text-rose-500 uppercase tracking-wider mb-1">Rincian Kegagalan / Pesan Kesalahan</span>
                                <pre className="font-mono text-[10.5px] whitespace-pre-wrap leading-relaxed font-semibold">
                                  {log.errorMessage}
                                </pre>
                              </div>
                            )}

                            {/* Debugger Tips */}
                            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-955/20 border border-blue-100 dark:border-blue-900/40 text-blue-700 dark:text-blue-400 flex items-start gap-2">
                              <HelpCircle className="w-4 h-4 mt-0.5 shrink-0" />
                              <div className="space-y-0.5">
                                <span className="block text-[9.5px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Tips Pemecahan Masalah</span>
                                <p className="text-[10.5px] font-light leading-relaxed font-sans">
                                  {log.method === 'fast-path' && 'Dekode instan berhasil menggunakan ekstraksi substring berbasis Regex. Tidak ada browser headless yang dijalankan, menjadikannya sangat cepat.'}
                                  {log.method === 'playwright-batch' && 'Resolusi menggunakan browser chromium headless terotomatisasi secara paralel. Jika terjadi timeout, verifikasi stabilitas jaringan server atau tingkatkan timeout resolusi.'}
                                  {log.method === 'fallback' && 'Situs target gagal merujuk langsung, sehingga crawler mengevaluasi DOM halaman untuk mengekstrak jangkar non-google secara cerdas.'}
                                  {log.method === 'fetch' && 'Resolusi berbasis HTTP Request follow-redirects. Lebih cepat dari Playwright namun tidak mendukung situs dengan perlindungan login/cookies.'}
                                  {log.errorMessage?.includes('context was destroyed') && 'Halaman mengalihkan diri (navigation) tepat sebelum crawler selesai memproses. Skrip penanganan redirect tangguh kami telah dipasang untuk mengantisipasi kejadian ini.'}
                                  {!log.errorMessage && 'Pengalihan berhasil dan crawler berhasil mengabaikan hambatan login/persetujuan cookies.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* IMMERSIVE INPUT / EDIT SLIDE FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl transition-all my-8 overflow-hidden">
            {/* Colored top bar */}
            <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />

            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5.5 h-5.5 text-indigo-600" id="form-filetext-icon"/>
                  {isEditing ? 'Perbaharui Isu Kliping' : 'Input Monitoring Isu Baru'}
                </h3>
                <p className="text-xs text-slate-400">Formulir analisis media terintegrasi dengan AI.</p>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" id="form-close-icon"/>
              </button>
            </div>

            {/* Tab Selection (Only when not editing) */}
            {!isEditing && (
              <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <button
                  type="button"
                  onClick={() => setFormMode('single')}
                  className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-2 ${
                    formMode === 'single'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/15 dark:text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-white dark:hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Input Manual (Tunggal / Impor)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormMode('multi-crawl')}
                  className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-2 ${
                    formMode === 'multi-crawl'
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/15 dark:text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-white dark:hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                  <span>Auto-Crawl & Auto-Rilis Multi-Keyword</span>
                </button>
              </div>
            )}

            {/* Form body */}
            {formMode === 'single' ? (
              <form onSubmit={handleSaveSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Gemini Trigger Banner */}
              {settings.enableAiAssistant && (
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-950 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex items-start gap-3.5 shadow-sm">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl flex-shrink-0">
                    <Sparkles className="w-4 h-4 animate-pulse" id="form-magic-pulse"/>
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase block">INTELLIGENCE COGNITIVE</span>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-200">(AI Agent)</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                      Ketikkan Judul atau URL berita di bawah, kemudian klik tombol AI untuk otomatis melengkapi Sentimen, Ringkasan, Kategori, Kata Kunci, Analisis Mitigasi, serta Identifikasi Gambar / Cover Link.
                    </p>
                    <button
                      type="button"
                      onClick={handleGeminiAnalyze}
                      disabled={isAiLoading}
                      className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg shadow-md transition disabled:opacity-50 cursor-pointer"
                    >
                      {isAiLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" id="form-refresh-spin"/>
                          <span>AI Sedang Menganalisis...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" id="form-sparkle-trigger"/>
                          <span>Highlight Isu dengan AI</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Draf Isu yang Menunggu Verifikasi */}
              {!isEditing && (
                (() => {
                  const draftItems = news.filter(item => item.status === 'Draft');
                  if (draftItems.length === 0) return null;

                  return (
                    <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 space-y-3 transition-all shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/65 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              Draf Isu Menunggu Verifikasi ({draftItems.length})
                              <span className="px-1.5 py-0.5 text-[8.5px] bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-extrabold rounded-md uppercase tracking-wider font-mono">
                                DRAFT REVIEW
                              </span>
                            </h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-light">
                              Daftar draft artikel yang disimpan untuk ditinjau, dilengkapi, dan dipublikasikan.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                          {draftItems.map((item, idx) => {
                            const isSelected = editingId === item.id;
                            return (
                              <div 
                                key={item.id || idx} 
                                className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                                  isSelected 
                                    ? 'bg-indigo-50/30 dark:bg-indigo-950/10 border-l-4 border-indigo-600' 
                                    : 'hover:bg-slate-50/40 dark:hover:bg-slate-900/20'
                                }`}
                              >
                                <div className="space-y-1 flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-300 text-[9.5px] font-black rounded-md font-mono">
                                      {item.mediaName || 'Media'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                      📅 {item.publishDate} {item.publishTime || ''}
                                    </span>
                                    {item.sentiment && (
                                      <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold ${
                                        item.sentiment === 'Positif' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' :
                                        item.sentiment === 'Negatif' ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' :
                                        'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                                      }`}>
                                        {item.sentiment}
                                      </span>
                                    )}
                                  </div>
                                  <h5 className="text-xs font-bold text-slate-850 dark:text-slate-200 line-clamp-1.5 leading-snug">
                                    {item.title}
                                  </h5>
                                  <p className="text-[9.5px] text-slate-450 dark:text-slate-500 truncate select-all font-mono">
                                    🔗 {item.link}
                                  </p>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleEditClick(item);
                                    showToast('Draf crawler dimuat! Silakan review detail isu lalu simpan untuk merilisnya. ✨', 'success');
                                  }}
                                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/40 border border-indigo-200/20 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap self-end sm:self-center"
                                >
                                  <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                                  <span>Review & Terbitkan 📝</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Title & URL inputs row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    JUDUL BERITA *
                  </label>
                  <input
                    type="text"
                    id="news-title-input"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Contoh: BI Terapkan Suku Bunga Stabil..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                  <div className="mt-1 text-[9.5px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                    <span>Input URL di samping lalu klik <strong>Lengkapi dengan AI ✨</strong> untuk otomatis menarik judul & konten berita!</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {isMultiLinkMode ? 'PILIHAN MULTI-LINK (MODUL IMPOR MASAL)' : 'URL / TAUTAN BERITA'}
                    </label>
                    
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMultiLinkMode(!isMultiLinkMode);
                          if (!isMultiLinkMode && link) {
                            // Seed multiLinks with whatever is in 'link' if any
                            extractAndAddLinks(link);
                          }
                        }}
                        className="text-[9.5px] px-2 py-0.5 rounded-md font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200/50 dark:border-indigo-800 transition flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isMultiLinkMode ? '🔀 Mode Tunggal' : '🔗 Impor Multi-Link'}</span>
                      </button>
                    )}
                  </div>

                  {!isMultiLinkMode ? (
                    <div className="space-y-1.5">
                      <input
                        type="url"
                        value={link}
                        onChange={e => {
                          const val = e.target.value;
                          setLink(val);
                          // Auto detect multiple links pasted with space or newlines
                          if (val && !isEditing) {
                            const trimmedStr = val.trim();
                            const parts = trimmedStr.split(/[\s,;\n\r]+/);
                            if (parts.length > 1) {
                              setIsMultiLinkMode(true);
                              extractAndAddLinks(trimmedStr);
                            }
                          }
                        }}
                        placeholder="https://www.kompas.com/..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-slate-400 dark:text-slate-500">Ketikkan sebuah link untuk satu monitoring isu.</span>
                        {settings.enableAiAssistant && link && (
                          <button
                            type="button"
                            onClick={handleGeminiAnalyze}
                            disabled={isAiLoading}
                            className="text-[10px] text-indigo-650 hover:text-indigo-850 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold flex items-center gap-0.5 transition cursor-pointer disabled:opacity-55"
                          >
                            <Sparkles className="w-2.5 h-2.5 text-amber-500 animate-pulse" />
                            {isAiLoading ? 'Menganalisis...' : 'Lengkapi dengan AI ✨'}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Multi-Link workspace
                    <div className="space-y-3 bg-slate-50/50 dark:bg-slate-950/25 border border-dashed border-slate-200 dark:border-slate-800 p-3 rounded-xl">
                      
                      {/* Dynamic Input Rows */}
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {linkRows.map((rowVal, rowIdx) => (
                          <div key={rowIdx} className="flex items-center gap-1.5 group">
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-550 w-4">{rowIdx + 1}.</span>
                            <input
                              type="url"
                              value={rowVal}
                              onChange={e => {
                                const val = e.target.value;
                                setLinkRows(prev => {
                                  const next = [...prev];
                                  next[rowIdx] = val;
                                  return next;
                                });
                              }}
                              placeholder="Masukkan tautan pemberitaan di sini..."
                              className="flex-1 px-2.5 py-1.5 text-[11px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/55 leading-normal font-sans"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setLinkRows(prev => {
                                  const filtered = prev.filter((_, idx) => idx !== rowIdx);
                                  return filtered.length > 0 ? filtered : [''];
                                });
                                showToast('Baris masukan dihapus!', 'info');
                              }}
                              className="px-2 py-1.5 text-xs text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/20 rounded-lg transition-all border border-rose-200/40 dark:border-rose-900/50 cursor-pointer flex items-center justify-center font-bold font-sans"
                              title="Hapus baris ini"
                            >
                              Hapus
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setLinkRows(prev => [...prev, '']);
                          }}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-200/30 dark:border-indigo-800/40 transition active:scale-95 flex items-center gap-1 cursor-pointer"
                        >
                          <span>+ Tambah Link</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              // Extract rows
                              const validAdded: string[] = [];
                              linkRows.forEach(row => {
                                const trimmed = row.trim();
                                if (trimmed) {
                                  const parts = trimmed.split(/[\s,;\n\r]+/);
                                  parts.map(p => p.trim()).filter(Boolean).forEach(p => {
                                    validAdded.push(p);
                                  });
                                }
                              });

                              if (validAdded.length === 0) {
                                showToast('Tidak ada tautan terisi pada baris masukan!', 'warning');
                                return;
                              }

                              validAdded.forEach(url => {
                                extractAndAddLinks(url);
                              });

                              setLinkRows(['']);
                            }}
                            disabled={linkRows.every(r => !r.trim())}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-bold rounded-lg transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                          >
                            <span>Validasikan & Impor Baris</span>
                          </button>

                          {multiLinks.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setIsValidationPopupOpen(true)}
                              className="text-[10px] text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline font-bold transition flex items-center gap-0.5 cursor-pointer bg-amber-50 dark:bg-amber-950/20 px-2 py-1.5 rounded-lg border border-amber-200/30"
                            >
                              <span>📋 Periksa ({multiLinks.length})</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Excel File Dropzone/Picker */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingExcelLink(true);
                        }}
                        onDragLeave={() => setIsDraggingExcelLink(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingExcelLink(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleExcelLinkUpload(e.dataTransfer.files[0]);
                          }
                        }}
                        className={`border border-dashed rounded-lg p-3 text-center cursor-pointer transition-all duration-300 relative ${
                          isDraggingExcelLink 
                            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]' 
                            : 'border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-900/10'
                        }`}
                      >
                        <input
                          type="file"
                          id="excel-link-file-upload"
                          accept=".xlsx, .xls"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleExcelLinkUpload(e.target.files[0]);
                            }
                          }}
                        />
                        <label htmlFor="excel-link-file-upload" className="cursor-pointer space-y-1 block">
                          <div className="mx-auto w-8 h-8 bg-indigo-50 dark:bg-indigo-950/50 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <UploadCloud className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                              Unggah Excel (.xlsx, .xls) - Baca Baris 2
                            </p>
                            <p className="text-[9px] text-slate-400">
                              Seret & taruh file di sini atau klik untuk memilih file
                            </p>
                            <p className="text-[8.5px] text-indigo-600 dark:text-indigo-400 font-mono">
                              Membaca header <span className="font-bold">"URL" / "Link" / "Tautan"</span> di baris ke-2
                            </p>
                          </div>
                        </label>
                      </div>

                      {excelLinkError && (
                        <div className="flex items-center gap-1.5 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[9.5px] text-rose-600 dark:text-rose-400 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{excelLinkError}</span>
                        </div>
                      )}

                      <details className="text-[10px] text-slate-500 bg-slate-100/45 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-200/40 dark:border-slate-800/40">
                        <summary className="cursor-pointer select-none font-bold text-slate-505 dark:text-slate-400">Atau Tempel Banyak Link Sekaligus (Bulk Paste)</summary>
                        <div className="mt-2 space-y-2">
                          <textarea
                            rows={2}
                            value={multiLinkInput}
                            onChange={e => setMultiLinkInput(e.target.value)}
                            placeholder="Paste link-link di sini dipisahkan spasi, koma, atau baris baru..."
                            className="w-full px-2 py-1.5 text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/55 resize-none font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              extractAndAddLinks(multiLinkInput);
                            }}
                            disabled={!multiLinkInput.trim()}
                            className="w-full py-1 bg-slate-800 hover:bg-slate-900 text-white text-[9.5px] font-bold rounded-md transition shadow-xs cursor-pointer"
                          >
                            Impor Massal dari Kotak Tempel
                          </button>
                        </div>
                      </details>

                      {/* Pill display representing current list */}
                      {multiLinks.length > 0 ? (
                        <div className="space-y-1.5">
                          <span className="block text-[9.5px] font-bold text-slate-400 tracking-wider uppercase font-sans">Daftar Link ({multiLinks.length}):</span>
                          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-850">
                            {multiLinks.map((item, idx) => {
                              let domain = 'Link';
                              try {
                                domain = new URL(item.url).hostname.replace('www.', '');
                              } catch (_) {}
                              return (
                                <div 
                                  key={idx} 
                                  className={`inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-md text-[10px] font-bold border transition ${
                                    item.isValid 
                                      ? 'text-emerald-700 bg-emerald-50/60 dark:text-emerald-400 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-950'
                                      : 'text-rose-700 bg-rose-50/60 dark:text-rose-400 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-950'
                                  }`}
                                  title={item.url}
                                >
                                  <span className="break-all truncate max-w-[120px] font-mono">{domain}</span>
                                  {item.isValid ? (
                                    <span className="text-[8px] text-emerald-500 font-extrabold" title="Link format valid">✓</span>
                                  ) : (
                                    <span className="text-[8px] text-rose-500 font-extrabold" title="Format URL salah">⚠</span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMultiLinks(prev => prev.filter((_, i) => i !== idx));
                                      showToast('Tautan dibuang!', 'info');
                                    }}
                                    className="text-[11px] text-slate-500 hover:text-red-500 bg-slate-100 hover:bg-red-50 dark:bg-slate-850 dark:hover:bg-red-955/20 px-1 rounded transition ml-1 font-mono cursor-pointer"
                                    title="Buang link ini"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1 mb-2">
                            <span>* Seluruh link yang valid akan diarsip kolektif via AI.</span>
                            <button
                              type="button"
                              onClick={() => {
                                setMultiLinks([]);
                                showToast('Semua link dikosongkan.', 'info');
                              }}
                              className="text-red-500 hover:underline transition cursor-pointer font-bold"
                            >
                              Buang Semua ({multiLinks.length})
                            </button>
                          </div>

                          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => handleSaveSubmit()}
                              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-blue-800 via-indigo-600 to-indigo-700 hover:from-blue-900 hover:to-indigo-850 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 active:scale-[0.98] transition-all duration-200 cursor-pointer border border-indigo-400/20 tracking-wider"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                              <span>PROSES SCRAPE KOLEKTIF AI ({multiLinks.filter(l => l.isValid).length} TAUTAN VALID)</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 text-center py-2 italic font-sans animate-fade-in">Belum ada tautan yang dikumpulkan.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Source Media & Date / Time */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">SUMBER MEDIA *</label>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="Cari & pilih media source harian..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={mediaSearch}
                      onChange={e => {
                        setMediaSearch(e.target.value);
                      }}
                    />
                    
                    {/* Selected Indicator Pill */}
                    {mediaId && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-200/40 w-max">
                        <span>Pilihan: {medias.find(m => m.id === mediaId)?.name || 'Terpilih'}</span>
                        <button 
                          type="button" 
                          onClick={() => {
                            setMediaId('');
                            setMediaSearch('');
                          }} 
                          className="hover:text-red-500 text-xs font-bold font-mono ml-1"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    {/* Horizontal/grid pill list */}
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/25">
                      {medias
                        .filter(m => !mediaSearch || m.name.toLowerCase().includes(mediaSearch.toLowerCase()))
                        .map(m => (
                          <button
                            type="button"
                            key={m.id}
                            onClick={() => {
                              setMediaId(m.id);
                              setMediaSearch(m.name);
                              // Auto populate location from chosen media province if not overridden
                              if (m.provinsi) {
                                setLocation(m.provinsi);
                              }
                            }}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg font-sans transition cursor-pointer ${
                              mediaId === m.id
                                ? 'bg-indigo-600 text-white shadow'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {m.name} <span className="text-[8px] opacity-70">({m.type})</span>
                          </button>
                        ))}
                      {medias.filter(m => !mediaSearch || m.name.toLowerCase().includes(mediaSearch.toLowerCase())).length === 0 && (
                        <span className="text-[9px] text-slate-400 py-1 px-1">Tidak ada media cocok.</span>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">TANGGAL PUBLIKASI *</label>
                  <div className="relative group">
                    <input
                      type="date"
                      value={publishDate}
                      onChange={e => setPublishDate(e.target.value)}
                      onClick={e => {
                        try {
                          (e.currentTarget as any).showPicker();
                        } catch (err) {}
                      }}
                      className="w-full pl-3 pr-10 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition duration-150"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-400 transition-colors">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  
                  {/* Quick-choice helper buttons for maximum speed & proper experience */}
                  <div className="flex items-center gap-2 mt-1.5 pl-0.5">
                    <button
                      type="button"
                      onClick={() => setPublishDate(new Date().toISOString().slice(0, 10))}
                      className="text-[10px] font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                    >
                      Hari Ini
                    </button>
                    <span className="text-[9px] text-slate-300 dark:text-slate-700 select-none">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        setPublishDate(yesterday.toISOString().slice(0, 10));
                      }}
                      className="text-[10px] font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                    >
                      Kemarin
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">JAM PUBLIKASI *</label>
                  <input
                    type="text"
                    value={publishTime}
                    onChange={e => setPublishTime(e.target.value)}
                    placeholder="Contoh: 15:51 WIB"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 dark:hover:border-slate-700 transition duration-150"
                    required
                  />
                  <div className="flex items-center justify-between mt-1.5 pl-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        const hh = String(d.getHours()).padStart(2, '0');
                        const mm = String(d.getMinutes()).padStart(2, '0');
                        setPublishTime(`${hh}:${mm} WIB`);
                      }}
                      className="text-[10px] font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                    >
                      Sekarang
                    </button>
                    {statusWaktu === 'UPDATED' && (
                      <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-955/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/50 animate-pulse">
                        🔔 UPDATED TIME
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Category, Sentiment, Location & Status */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">KLUSTER TOPIK *</label>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 hover:border-indigo-400 dark:hover:border-indigo-600 focus:outline-none focus:border-indigo-500/80 focus:ring-4 focus:ring-indigo-500/15 font-semibold transition-all duration-150 cursor-pointer shadow-sm"
                    required
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id} className="font-sans py-1">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">LOKASI PEMETAAN MAP *</label>
                  <select
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-indigo-600 dark:text-indigo-400"
                    required
                  >
                    {PROVINCES.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov} {prov === 'DKI Jakarta' ? '(Pusat)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">KLASIFIKASI SENTIMEN *</label>
                  <select
                    value={sentiment}
                    onChange={e => setSentiment(e.target.value as Sentiment)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                    required
                  >
                    <option value="Positif">SENTIMEN POSITIF</option>
                    <option value="Netral">SENTIMEN NETRAL</option>
                    <option value="Negatif">SENTIMEN NEGATIF</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">STATUS PUBLIKASI *</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as NewsStatus)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                    required
                  >
                    <option value="Published">PUBLISHED (UMUM)</option>
                    <option value="Draft">DRAFT / INTERNAL OLEH ANALIS</option>
                  </select>
                </div>
              </div>

              {/* Tags & Thumbnail image links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">TAGS / KATA KUNCI (PISAH DENGAN KOMA)</label>
                  <input
                    id="form-tags-input"
                    type="text"
                    value={tagsInput}
                    onChange={e => setTagsInput(e.target.value.replace(/\s+/g, ''))}
                    placeholder="BUMN,Pajak,Direksi,Minerba (Otomatis terisi oleh AI)"
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/35 shadow-sm transition"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5 h-4">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">URUTAN GAMBAR / COVER LINK (OPTIONAL)</label>
                    <div className="flex items-center gap-2">
                      {imageUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(imageUrl);
                              showToast('Alamat gambar disalin ke clipboard!', 'success');
                            } else {
                              showToast('Copy gagal, silakan salin manual.', 'error');
                            }
                          }}
                          className="text-[10px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-extrabold transition flex items-center gap-0.5 cursor-pointer hover:underline"
                        >
                          Salin Alamat Gambar
                        </button>
                      )}
                      {imageUrl && link && <span className="text-[10px] text-slate-300 dark:text-slate-700">•</span>}
                      {link && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!link) return;
                            try {
                              setIsAiLoading(true);
                              const response = await analyzeWithGemini({ url: link });
                              if (response && response.imageUrl) {
                                setImageUrl(response.imageUrl);
                                showToast('Alamat gambar berhasil diambil dari link sumber!', 'success');
                              } else {
                                showToast('Tidak dapat mendeteksi alamat gambar asli dari link tersebut.', 'info');
                              }
                            } catch (error) {
                              showToast('Gagal menarik data dari link sumber.', 'error');
                            } finally {
                              setIsAiLoading(false);
                            }
                          }}
                          disabled={isAiLoading}
                          className="text-[10px] text-indigo-650 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-extrabold transition flex items-center gap-0.5 cursor-pointer disabled:opacity-50 hover:underline"
                        >
                          {isAiLoading ? 'Menarik...' : 'Ambil dari Tautan'}
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    id="form-cover-input"
                    type="text"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="https://img2.beritasatu.com/cache/beritasatu/960x620-3/2024/05/1715143507-1600x1066.webp (Default jika kosong)"
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/35 shadow-sm transition"
                  />
                </div>
              </div>

              {/* Summary Highlights Area */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">RINGKASAN EKSEKUTIF UTAMA / HIGHLIGHT NEWS *</label>
                <textarea
                  rows={4}
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  placeholder="Ketikkan pokok ulasan/ringkasan analisis media berita..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-y"
                  required
                />
              </div>

              {/* Strategic mitigacy analysis */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">ANALISIS MITIGASI STRATEGIS DENGAN AI (BISA DIEDIT)</label>
                <textarea
                  rows={3}
                  value={strategicAnalysis}
                  onChange={e => setStrategicAnalysis(e.target.value)}
                  placeholder="Opsional: Klik tombol 'Highlight Isu dengan AI' di atas atau ketik langkah mitigasi strategis secara manual..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-y"
                />
              </div>

              {/* Featured switch toggle */}
              <div className="flex items-center gap-3 py-1">
                <input
                  type="checkbox"
                  id="featured-flag"
                  checked={isFeatured}
                  onChange={e => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="featured-flag" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  SEMATKAN ISU UTAMA / FEATURED BANNER DI VIEWER
                </label>
              </div>

              {/* Save Controls row */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-250 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition"
                >
                  Urungkan
                </button>
                <button
                  type="submit"
                  className={`flex items-center justify-center gap-2 px-5 py-2 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer ${
                    isMultiLinkMode 
                      ? 'bg-gradient-to-r from-blue-800 to-indigo-600 hover:from-blue-900 hover:to-indigo-750 shadow-indigo-500/10'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/10'
                  }`}
                >
                  {isMultiLinkMode ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      <span>Proses Scrape Kolektif AI</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" id="form-save-icon"/>
                      <span>Simpan Arsip</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Premium Banner */}
              <div className="p-4 bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-indigo-100/10 dark:from-slate-950 dark:to-blue-950/20 border border-indigo-100/60 dark:border-indigo-900/40 rounded-xl flex items-start gap-3.5 shadow-xs">
                <div className="p-2 bg-indigo-600 text-white rounded-xl flex-shrink-0">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase block">AI SCRAPER ENGINE</span>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-slate-200">Auto-Crawl & Auto-Rilis Isu Massal</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    Masukkan beberapa kata kunci di bawah, AI Agent akan secara mandiri melakukan pencarian (crawling) di Google News, menguraikan berita secara mendalam, mengekstrak metrik sentimen, ringkasan, dan memublikasikan/merilis arsip secara langsung ke pusat data.
                  </p>
                </div>
              </div>

              {/* Keywords Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                    KATA KUNCI PEMANTAUAN (GARIS BARU / KOMA) *
                  </label>
                  <textarea
                    rows={3}
                    value={multiKeywordsInput}
                    onChange={e => setMultiKeywordsInput(e.target.value)}
                    placeholder="Masukkan beberapa kata kunci, contoh:&#10;Kenaikan BBM Subsidi&#10;Kebijakan Suku Bunga Bank Indonesia&#10;Investasi IKN Nusantara"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-y font-mono font-medium"
                    disabled={isMultiCrawling}
                  />

                  {/* Quick Preset Buttons */}
                  <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500 mr-1.5">Preset Cepat:</span>
                    {[
                      { label: '🔥 Subsidi Energi', list: 'BBM Subsidi, Subsidi Listrik PLN, Krisis Energi' },
                      { label: '🏦 Kebijakan Rupiah', list: 'Kurs Rupiah Stabil, Suku Bunga BI, Kinerja Ekspor' },
                      { label: '🏛️ Pembangunan IKN', list: 'Progres IKN Nusantara, Istana Garuda IKN, Investasi IKN' },
                      { label: '📈 Ketahanan Pangan', list: 'Stok Beras Bulog, Swasembada Pangan, Impor Beras' }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (isMultiCrawling) return;
                          setMultiKeywordsInput(
                            multiKeywordsInput 
                              ? `${multiKeywordsInput.trim()}\n${preset.list}`
                              : preset.list
                          );
                          showToast(`Preset "${preset.label}" ditambahkan!`, 'info');
                        }}
                        className="px-2 py-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 border border-indigo-200/20 rounded-lg transition-all cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Settings Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                      RENTANG WAKTU (GOOGLE NEWS)
                    </label>
                    <select
                      value={multiCrawlTimeLimit}
                      onChange={e => setMultiCrawlTimeLimit(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                      disabled={isMultiCrawling}
                    >
                      <option value="1h">1 Jam Terakhir</option>
                      <option value="4h">4 Jam Terakhir</option>
                      <option value="24h">24 Jam Terakhir</option>
                      <option value="48h">48 Jam Terakhir</option>
                      <option value="7d">7 Hari Terakhir</option>
                      <option value="30d">30 Hari Terakhir</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                      METODE CRAWLER MEDIA
                    </label>
                    <select
                      value={multiCrawlMethod}
                      onChange={e => setMultiCrawlMethod(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-semibold cursor-pointer"
                      disabled={isMultiCrawling}
                    >
                      <option value="auto">Auto Pipeline (Rekomendasi)</option>
                      <option value="rss">Google News RSS (Bebas Kuota)</option>
                      <option value="twitterapi">X / Twitter (TwitterAPI.io)</option>
                      <option value="beautifulsoup">BeautifulSoup HTML (Scraper Tangguh)</option>
                      <option value="serpapi">SerpApi Search Engine</option>
                      <option value="openserp">OpenSerp Search Engine (Bebas Hosting)</option>
                      <option value="gemini">Gemini Grounding (AI Agent)</option>
                      <option value="simulation">Aparatur Simulasi Lokal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                      BERITA MAKS PER KATA KUNCI
                    </label>
                    <select
                      value={itemsPerKeyword}
                      onChange={e => setItemsPerKeyword(parseInt(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                      disabled={isMultiCrawling}
                    >
                      <option value={1}>1 Berita Teratas</option>
                      <option value={2}>2 Berita Teratas (Default)</option>
                      <option value={3}>3 Berita Teratas</option>
                      <option value={5}>5 Berita Teratas (Sangat Mendalam)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                      KLUSTER TOPIK UTAMA
                    </label>
                    <select
                      value={selectedCrawlCategory}
                      onChange={e => setSelectedCrawlCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                      disabled={isMultiCrawling}
                    >
                      <option value="">Rekomendasi Otomatis (AI Agent)</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Real-Time Agent Activity Terminal Logs */}
              {multiCrawlLogs.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                    <span>Aktivitas Live AI Agent Scraper & Publisher</span>
                    {isMultiCrawling && (
                      <span className="flex items-center gap-1 text-indigo-500 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                        <span>Sedang Memproses...</span>
                      </span>
                    )}
                  </div>
                  <div className="w-full h-48 bg-slate-950 text-slate-300 font-mono text-[10.5px] p-4 rounded-xl border border-slate-800 overflow-y-auto flex flex-col gap-1.5 leading-relaxed shadow-inner animate-in fade-in transition-all">
                    {multiCrawlLogs.map((log, idx) => {
                      let colorClass = 'text-slate-300';
                      if (log.type === 'error') colorClass = 'text-rose-400 font-bold';
                      else if (log.type === 'warning') colorClass = 'text-amber-400';
                      else if (log.type === 'success') colorClass = 'text-emerald-400 font-bold';
                      else if (log.type === 'ai') colorClass = 'text-indigo-300 font-semibold';
                      else if (log.type === 'crawler') colorClass = 'text-cyan-400';
                      else if (log.type === 'db') colorClass = 'text-blue-400';
                      else if (log.type === 'finish') colorClass = 'text-emerald-300 font-bold tracking-wide animate-pulse';

                      return (
                        <div key={idx} className={`${colorClass} flex items-start gap-1 p-0.5 border-b border-white/[0.02]`}>
                          <span className="text-white/30 text-[9px] select-none">[{log.timestamp}]</span>
                          <span>{log.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Controls Row */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3.5">
                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 leading-normal max-w-sm">
                  * Berita yang berhasil diuraikan dipublikasikan langsung ke dashboard dan disinkronkan ke Google Sheets.
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    disabled={isMultiCrawling}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-250 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={handleMultiCrawlAndRelease}
                    disabled={isMultiCrawling}
                    className="flex items-center justify-center gap-2 px-5 py-2 text-white font-bold text-xs rounded-xl shadow-lg transition bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/10 cursor-pointer disabled:opacity-50"
                  >
                    {isMultiCrawling ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sedang Memproses...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Auto-Crawl, Analisis & Rilis ✨</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* HIGHLIGHT INPUT / EDIT MODAL */}
      {isHighlightFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl transition-all my-8 overflow-hidden">
            {/* Colored top bar */}
            <div className="h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600" />

            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                  <Star className="w-5.5 h-5.5 text-amber-500 fill-amber-500 animate-pulse" />
                  {isEditingHighlight ? 'Perbaharui Highlight Hari Ini' : 'Tambah Highlight Kustom Baru'}
                </h3>
                <p className="text-xs text-slate-400">Atur rilis berita yang masuk ke slide sorotan utama hari ini.</p>
              </div>
              <button 
                onClick={() => setIsHighlightFormOpen(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveHighlightForm} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Row 1: Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Judul Highlight <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={hlFormTitle}
                  onChange={e => setHlFormTitle(e.target.value)}
                  placeholder="Masukkan judul sorotan rilis berita penting..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm placeholder:text-slate-400 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition"
                />
              </div>

              {/* Row 2: Summary */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Ringkasan Sorotan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={hlFormSummary}
                  onChange={e => setHlFormSummary(e.target.value)}
                  placeholder="Tulis ringkasan singkat yang informatif, tajam, dan siap dibaca eksekutif..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm placeholder:text-slate-400 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition resize-none"
                />
              </div>

              {/* Row 3: Grid (Category, Sentiment, Location) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Category */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Kategori Sektor <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={hlFormCategory}
                    onChange={e => setHlFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                    {!categories.some(c => c.name === hlFormCategory) && hlFormCategory && (
                      <option value={hlFormCategory}>{hlFormCategory}</option>
                    )}
                  </select>
                </div>

                {/* Sentiment */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Sentimen <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={hlFormSentiment}
                    onChange={e => setHlFormSentiment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                  >
                    <option value="Positif">Positif 🟢</option>
                    <option value="Netral">Netral 🔵</option>
                    <option value="Negatif">Negatif 🔴</option>
                  </select>
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Wilayah <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={hlFormLocation}
                    onChange={e => setHlFormLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                  >
                    <option value="Nasional">Nasional</option>
                    {PROVINCES.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Grid (Media Name, Publish Date, Publish Time) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Media Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Nama Media <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={hlFormMedia}
                    onChange={e => setHlFormMedia(e.target.value)}
                    placeholder="Contoh: Detik, Kompas..."
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm placeholder:text-slate-400 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>

                {/* Publish Date */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Tanggal Rilis
                  </label>
                  <input
                    type="date"
                    value={hlFormDate}
                    onChange={e => setHlFormDate(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>

                {/* Publish Time */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Waktu Rilis
                  </label>
                  <input
                    type="time"
                    value={hlFormTime}
                    onChange={e => setHlFormTime(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Row 5: Link & Image Url */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Tautan Berita (URL)
                  </label>
                  <input
                    type="url"
                    value={hlFormLink}
                    onChange={e => setHlFormLink(e.target.value)}
                    placeholder="https://contoh.com/berita-ini..."
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm placeholder:text-slate-400 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    URL Gambar Sampul (Opsional)
                  </label>
                  <input
                    type="url"
                    value={hlFormImageUrl}
                    onChange={e => setHlFormImageUrl(e.target.value)}
                    placeholder="https://contoh.com/gambar.jpg"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm placeholder:text-slate-400 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>
              </div>

              {/* Row 6: Pin Option */}
              <div className="pt-2">
                <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hlFormPinned}
                    onChange={e => setHlFormPinned(e.target.checked)}
                    className="w-4.5 h-4.5 accent-amber-500 border-slate-300 rounded focus:ring-amber-500 focus:ring-opacity-25"
                  />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    Sematkan Sorotan Ini Di Posisi Paling Depan (Pinned)
                  </span>
                </label>
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-5 border-t border-slate-50 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50 -mx-6 -mb-6 p-6">
                <button
                  type="button"
                  onClick={() => setIsHighlightFormOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:scale-105 active:scale-95 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingHighlight}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-extrabold text-xs text-center rounded-xl shadow-lg shadow-amber-500/10 cursor-pointer hover:scale-105 active:scale-95 transition flex items-center gap-1.5"
                >
                  {isSavingHighlight ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Simpan Highlight Sorotan 💾</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ImportIssuesModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
      />

      {/* POPUP PROGRESS BULK PROCESSING */}
      {isBulkProcessing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-6 shadow-2xl text-center space-y-4">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-100 dark:border-indigo-950 border-t-indigo-600 animate-spin" />
              <Sparkles className="w-6 h-6 text-amber-500 absolute animate-pulse" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Memproses Impor Multi-Link</h3>
              <p className="text-xs text-slate-400">Asisten AI sedang mengeruk halaman berita & menganalisis sentimen...</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>PROGRESS SCRAPE</span>
                <span>{bulkProgress.current} / {bulkProgress.total} TAUTAN</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-450 truncate max-w-full font-mono mt-1" title={bulkProgress.currentUrl}>
                {bulkProgress.currentUrl || 'Mengekstrak metadata...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* POPUP VALIDASI DAN BUANG MULTI_LINK */}
      {isValidationPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl transition-all my-8 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-amber-500" />
            
            <div className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-md font-bold font-display text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Globe className="w-4.5 h-4.5 text-indigo-600" />
                  Popup Validasi & Verifikasi Tautan ({multiLinks.length})
                </h3>
                <p className="text-[11px] text-slate-400">Verifikasi format protocol serta integritas URL sebelum proses scraping massal harian.</p>
              </div>
              <button 
                onClick={() => setIsValidationPopupOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3 max-h-[50vh]">
              <div className="space-y-2">
                {multiLinks.map((item, index) => {
                  let hostname = 'Tautan Baru';
                  try {
                    hostname = new URL(item.url).hostname;
                  } catch (_) {}

                  return (
                    <div 
                      key={index} 
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition ${
                        item.isValid 
                          ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400' 
                          : 'bg-rose-50/20 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/40 text-rose-800 dark:text-rose-400'
                      }`}
                    >
                      <div className="space-y-1 overflow-hidden flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            item.isValid ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700'
                          }`}>
                            {item.isValid ? 'VALID' : 'RUSAK'}
                          </span>
                          <span className="text-[10px] font-bold truncate text-slate-700 dark:text-slate-200">
                            {hostname || 'Format Belum Terdeteksi'}
                          </span>
                        </div>
                        
                        <input
                          type="text"
                          value={item.url}
                          onChange={(e) => updateMultiLinkValue(index, e.target.value)}
                          placeholder="Contoh: https://www.tribunnews.com/..."
                          className="w-full mt-1.5 px-2.5 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[10.5px] font-mono text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                        />

                        {!item.isValid && (
                          <span className="text-[9px] font-medium text-rose-500 block">
                            * Error validation: Harus diawali http:// atau https:// & berformat domain lengkap.
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMultiLinks(prev => prev.filter((_, i) => i !== index));
                          showToast('Tautan telah dibuang!', 'success');
                        }}
                        className="px-2 py-1 bg-white hover:bg-rose-50 dark:bg-slate-900 dark:hover:bg-rose-955/20 border border-slate-200 dark:border-slate-800 hover:border-rose-300 text-rose-600 dark:text-rose-400 font-bold text-[10px] rounded-lg transition hover:scale-105 cursor-pointer"
                      >
                        Buang
                      </button>
                    </div>
                  );
                })}

                {multiLinks.length === 0 && (
                  <div className="py-12 text-center text-slate-400 text-xs italic">
                    Belum ada tautan yang dikumpulkan di daftar.
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-950/20 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setMultiLinks(prev => prev.filter(l => l.isValid));
                  showToast('Semua tautan format rusak berhasil dibuang!', 'success');
                }}
                disabled={!multiLinks.some(l => !l.isValid)}
                className="px-3 py-1.8 hover:bg-rose-500 border border-rose-200 dark:border-rose-900/55 hover:border-transparent text-rose-600 dark:text-rose-400 hover:text-white rounded-lg text-xs font-bold transition disabled:opacity-40 cursor-pointer"
              >
                Buang yang Rusak 🧹
              </button>
              
              <button
                type="button"
                onClick={() => setIsValidationPopupOpen(false)}
                className="px-4 py-1.8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
              >
                Tutup Validasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP SUNTING & VALIDASI HASIL AI KOLEKTIF */}
      {isReviewModalOpen && scrapedResultsForReview.length > 0 && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden animate-fade-in">
          <div className="relative w-full max-w-6xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] max-h-[850px] animate-scale-up">
            
            {/* SIDEBAR ON THE LEFT */}
            <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-950/30 flex-shrink-0">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/45 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Hasil Ekstraksi AI</h3>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Menunggu Verifikasi ({scrapedResultsForReview.length})</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-[10px] font-bold text-indigo-700 dark:text-indigo-350">
                  Draf
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin">
                {scrapedResultsForReview.map((item, idx) => {
                  const isActive = idx === selectedReviewIdx;
                  let host = 'News Link';
                  try {
                    host = new URL(item.link).hostname.replace('www.', '');
                  } catch (_) {}

                  const sentimentStyles = 
                    item.sentiment === 'Positif' 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                      : item.sentiment === 'Negatif'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400';

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedReviewIdx(idx)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedReviewIdx(idx);
                        }
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 relative group cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10'
                          : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        item.sentiment === 'Positif' ? 'bg-emerald-500' : item.sentiment === 'Negatif' ? 'bg-red-500' : 'bg-blue-500'
                      }`} />
                      
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className={`text-[9px] font-mono font-bold uppercase ${isActive ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'}`}>
                            {host}
                          </span>
                          <span className={`text-[9px] px-1 py-0.2 rounded font-extrabold ${isActive ? 'bg-white/20 text-white font-mono' : sentimentStyles}`}>
                            {item.sentiment}
                          </span>
                        </div>
                        <h4 className={`text-[11px] font-bold mt-1 max-w-full leading-normal line-clamp-2 ${isActive ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                          {item.title || 'Tanpa Judul'}
                        </h4>
                      </div>

                      {/* Small X action on list */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          discardSingleReview(idx);
                        }}
                        className={`text-[12px] opacity-0 group-hover:opacity-100 hover:text-red-500 rounded p-0.5 font-mono ml-1 flex-shrink-0 transition-opacity ${
                          isActive ? 'text-white hover:text-red-300 opacity-80' : 'text-slate-400'
                        }`}
                        title="Buang dari daftar"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/40 space-y-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleConfirmAndPublishAllReviews}
                  disabled={isReviewBatchSaving || isSaving || scrapedResultsForReview.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-blue-800 via-indigo-600 to-indigo-700 hover:from-blue-900 hover:to-indigo-850 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/10 transition cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>Rilis Semua ({scrapedResultsForReview.length} Isu)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Batalkan review dan buang semua hasil ekstraksi kliping AI kali ini?')) {
                      setScrapedResultsForReview([]);
                      setIsReviewModalOpen(false);
                      showToast('Draf review dibersihkan.', 'info');
                    }
                  }}
                  className="w-full text-center py-1.5 text-[10.5px] font-bold text-slate-450 hover:text-red-500 dark:text-slate-400 transition"
                >
                  Batalkan & Buang Semua
                </button>
              </div>
            </div>

            {/* MAIN PORTION ON THE RIGHT */}
            {(() => {
              const item = scrapedResultsForReview[selectedReviewIdx];
              if (!item) return (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 italic text-xs py-12">
                  Tidak ada kliping isu aktif terpilih.
                </div>
              );

              return (
                <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
                  {/* Internal editor header */}
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/10">
                    <div className="overflow-hidden flex-1 mr-4">
                      <div className="flex items-center gap-2 text-[10.5px]">
                        <span className="font-bold text-slate-400 uppercase tracking-widest font-mono">Verifikasi Draft Isu</span>
                        <span className="text-slate-300 dark:text-slate-705">|</span>
                        <a 
                          href={item.link} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-indigo-600 hover:underline flex items-center gap-0.5 font-bold truncate max-w-[320px] font-mono text-[10px]"
                        >
                          {item.link}
                          <ExternalLink className="w-2.5 h-2.5 inline" />
                        </a>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setIsReviewModalOpen(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Scrollable editor fields */}
                  <div className="p-6 overflow-y-auto flex-grow space-y-4 flex-1 scrollbar-thin">
                    
                    {/* Judul */}
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                        Judul Ekstraksi Berita
                      </label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateReviewItemValue(selectedReviewIdx, 'title', e.target.value)}
                        placeholder="Masukkan judul kliping"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 dark:hover:border-slate-700 transition duration-150 font-bold leading-normal"
                      />
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {/* Media */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Nama Media Massa
                        </label>
                        <input
                          type="text"
                          value={item.mediaName}
                          onChange={(e) => handleReviewMediaNameChange(selectedReviewIdx, e.target.value)}
                          placeholder="Contoh: Tribunnews"
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 dark:hover:border-slate-700 transition duration-150"
                        />
                      </div>

                      {/* Tanggal */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Tanggal Publikasi
                        </label>
                        <input
                          type="date"
                          value={item.publishDate}
                          onChange={(e) => updateReviewItemValue(selectedReviewIdx, 'publishDate', e.target.value)}
                          onClick={(e) => {
                            try {
                              (e.currentTarget as any).showPicker();
                            } catch (err) {}
                          }}
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 dark:hover:border-slate-700 transition duration-150 cursor-pointer"
                        />
                      </div>

                      {/* Jam Terbit */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Jam Publikasi
                        </label>
                        <input
                          type="text"
                          value={item.publishTime}
                          onChange={(e) => updateReviewItemValue(selectedReviewIdx, 'publishTime', e.target.value)}
                          placeholder="e.g. 10:30 WIB"
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 dark:hover:border-slate-700 transition duration-150"
                        />
                      </div>

                      {/* Sentiment */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Kualifikasi Sentimen
                        </label>
                        <select
                          value={item.sentiment}
                          onChange={(e) => updateReviewItemValue(selectedReviewIdx, 'sentiment', e.target.value as Sentiment)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 dark:hover:border-slate-700 transition duration-150 font-medium"
                        >
                          <option value="Positif">Sentinel Positif</option>
                          <option value="Netral">Sentinel Netral</option>
                          <option value="Negatif">Sentinel Negatif</option>
                        </select>
                      </div>

                      {/* Kategori */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Rekomendasi Kategori
                        </label>
                        <select
                          value={item.categoryId || ''}
                          onChange={(e) => updateReviewItemValue(selectedReviewIdx, 'categoryId', e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 dark:hover:border-slate-700 transition duration-150 font-medium"
                        >
                          <option value="">-- PILIH KATEGORI ISU --</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Wilayah */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Wilayah Isu / Provinsi
                        </label>
                        <select
                          value={item.location}
                          onChange={(e) => updateReviewItemValue(selectedReviewIdx, 'location', e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 dark:hover:border-slate-700 transition duration-150 font-medium"
                        >
                          {PROVINCES.map(prov => (
                            <option key={prov} value={prov}>📍 {prov}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Ringkasan Isu */}
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 flex items-center justify-between">
                        <span>Highlight / Ringkasan Utama</span>
                        <span className="text-[9px] lowercase font-normal italic text-slate-400">disunting manual oleh analis</span>
                      </label>
                      <textarea
                        rows={3}
                        value={item.summary}
                        onChange={(e) => updateReviewItemValue(selectedReviewIdx, 'summary', e.target.value)}
                        placeholder="Tulis draf detail kliping media harian..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 dark:hover:border-slate-700 transition duration-150 leading-normal"
                      />
                    </div>

                    {/* Analisis Strategis */}
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 flex items-center justify-between">
                        <span>Analisis Risiko & Mitigasi Taktis AI</span>
                        <span className="text-[10px] text-indigo-500 font-extrabold flex items-center gap-0.5 animate-pulse">
                          <Sparkles className="w-2.5 h-2.5 text-amber-500" /> Direkomendasikan AI
                        </span>
                      </label>
                      <textarea
                        rows={4}
                        value={item.strategicAnalysis}
                        onChange={(e) => updateReviewItemValue(selectedReviewIdx, 'strategicAnalysis', e.target.value)}
                        placeholder="Contoh: 1. Melakukan klarifikasi dengan regulator setempat..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 dark:hover:border-slate-700 transition duration-150 leading-relaxed font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Tags */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Tags / Tagar (Pemisah Koma)
                        </label>
                        <input
                          type="text"
                          value={item.tags ? item.tags.join(', ') : ''}
                          onChange={(e) => {
                            const tags = e.target.value.split(',').map(t => t.trim().replace(/\s+/g, '')).filter(Boolean);
                            updateReviewItemValue(selectedReviewIdx, 'tags', tags);
                          }}
                          placeholder="e.g. HSSE, Kebijakan, Pertamina"
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 dark:hover:border-slate-700 transition duration-150 font-mono"
                        />
                      </div>

                      {/* Image URL & Thumbnail preview */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Cover Image Tautan URL
                        </label>
                        <input
                          type="text"
                          value={item.imageUrl}
                          onChange={(e) => updateReviewItemValue(selectedReviewIdx, 'imageUrl', e.target.value)}
                          placeholder="e.g. https://domain.com/image.jpg"
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 dark:hover:border-slate-700 transition duration-150 font-mono"
                        />
                      </div>
                    </div>

                    {item.imageUrl && (
                      <div className="mt-2 text-center bg-slate-50 dark:bg-slate-950/20 p-2 rounded-xl border border-slate-200/50 dark:border-slate-800">
                        <span className="block text-[9.5px] text-slate-400 font-bold mb-1.5 text-left uppercase">PREVIEW GAMBAR COVER:</span>
                        <img 
                          src={item.imageUrl} 
                          alt="Cover Preview" 
                          referrerPolicy="no-referrer"
                          className="mx-auto max-h-36 object-cover rounded-lg shadow-sm border border-slate-200 dark:border-slate-800"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://img2.beritasatu.com/cache/beritasatu/960x620-3/2024/05/1715143507-1600x1066.webp';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Foot bar for editor */}
                  <div className="p-4 border-t border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950/30 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => discardSingleReview(selectedReviewIdx)}
                      className="px-4 py-2 bg-white hover:bg-rose-50 border border-slate-200 dark:bg-slate-900 dark:hover:bg-rose-955/20 dark:border-slate-800 text-rose-600 dark:text-rose-400 hover:text-rose-700 font-bold text-xs rounded-xl hover:scale-105 active:scale-95 transition cursor-pointer"
                    >
                      Buang Kliping Ini 🗑️
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleConfirmSingleReview(selectedReviewIdx)}
                      disabled={isSaving || isReviewBatchSaving}
                      className="px-5 py-2.2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-500/10 cursor-pointer hover:scale-102 active:scale-98 transition flex items-center gap-1.5"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Konfirmasi & Rilis Isu ini 💾</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}
    </div>
  );
};
