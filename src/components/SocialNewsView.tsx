import React, { useState, useMemo, useEffect } from 'react';
import { useAppState } from '../AppContext';
import { 
  Sparkles, Trash2, Search, Filter, ExternalLink, 
  MessageSquare, User, AlertCircle, RefreshCw, Eye, X, MapPin, 
  Tag, Info, Clipboard, ListPlus, ArrowLeft, CheckCircle,
  ChevronRight, UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

const getSosmedColor = (platform: string) => {
  switch (platform) {
    case 'Twitter/X':
      return 'bg-slate-900 text-white dark:bg-white/10 dark:text-white';
    case 'Instagram':
      return 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400';
    case 'Facebook':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400';
    case 'TikTok':
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-400';
    case 'YouTube':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400';
    case 'Threads':
      return 'bg-slate-800 text-slate-100 dark:bg-slate-900 dark:text-slate-200';
    default:
      return 'bg-blue-100 text-blue-950 dark:bg-blue-950/60 dark:text-blue-400';
  }
};

export const SocialNewsView: React.FC = () => {
  const { 
    socialNews, 
    loadSocialNews, 
    createSocialNews, 
    deleteSocialNews, 
    user,
    categories,
    socialLocationFilter,
    setSocialLocationFilter,
    authFetch
  } = useAppState();

  // Mode Selection State
  const [inputMode, setInputMode] = useState<'single' | 'batch' | 'newsapi'>('single');

  // Form states (Single)
  const [jenisSosmed, setJenisSosmed] = useState<'Twitter/X' | 'Instagram' | 'Facebook' | 'TikTok' | 'YouTube' | 'Threads' | 'Lainnya'>('Twitter/X');
  const [caption, setCaption] = useState('');
  const [link, setLink] = useState('');
  const [username, setUsername] = useState('');
  const [waktuPosting, setWaktuPosting] = useState('');

  // Form states (Batch/Massal)
  const [batchInputText, setBatchInputText] = useState('');
  const [parsedBatchItems, setParsedBatchItems] = useState<any[]>([]);
  const [batchStep, setBatchStep] = useState<'input' | 'preview'>('input');
  const [isDraggingExcel, setIsDraggingExcel] = useState(false);
  const [excelError, setExcelError] = useState('');

  // Form states (NewsAPI)
  const [newsQuery, setNewsQuery] = useState('');
  const [newsApiKey, setNewsApiKey] = useState('');
  const [newsLanguage, setNewsLanguage] = useState('id');
  
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    successCount: number;
    failedCount: number;
    statusText: string;
  } | null>(null);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSosmed, setFilterSosmed] = useState<string>('Semua');
  const [filterSentiment, setFilterSentiment] = useState<string>('Semua');
  const [filterCategory, setFilterCategory] = useState<string>('Semua');
  const filterLocation = socialLocationFilter;
  const setFilterLocation = setSocialLocationFilter;
  const [sortBy, setSortBy] = useState<'terbaru' | 'terlama'>('terbaru');
  const [filterStartDate, setFilterStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [filterEndDate, setFilterEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [filterStartHour, setFilterStartHour] = useState<string>('Semua');
  const [filterEndHour, setFilterEndHour] = useState<string>('Semua');
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset page when filter configuration changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSosmed, filterSentiment, filterCategory, filterLocation, sortBy, filterStartDate, filterEndDate, filterStartHour, filterEndHour]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim() !== '') count++;
    if (filterSosmed !== 'Semua') count++;
    if (filterSentiment !== 'Semua') count++;
    if (filterCategory !== 'Semua') count++;
    if (filterLocation !== 'Semua') count++;
    if (filterStartDate !== '') count++;
    if (filterEndDate !== '') count++;
    if (filterStartHour !== 'Semua') count++;
    if (filterEndHour !== 'Semua') count++;
    return count;
  }, [searchQuery, filterSosmed, filterSentiment, filterCategory, filterLocation, filterStartDate, filterEndDate, filterStartHour, filterEndHour]);

  const hoursArray = useMemo(() => Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')), []);

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterSosmed('Semua');
    setFilterSentiment('Semua');
    setFilterCategory('Semua');
    setFilterLocation('Semua');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterStartHour('Semua');
    setFilterEndHour('Semua');
    setSortBy('terbaru');
  };

  // Dynamic filter options based on available data and categories database
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    if (socialNews) {
      socialNews.forEach(item => {
        if (item.kategori) cats.add(item.kategori);
      });
    }
    if (categories) {
      categories.forEach(cat => {
        if (cat.name) cats.add(cat.name);
      });
    }
    return Array.from(cats);
  }, [socialNews, categories]);

  const uniqueLocations = useMemo(() => {
    const locs = new Set<string>();
    if (socialNews) {
      socialNews.forEach(item => {
        if (item.lokasi) locs.add(item.lokasi);
      });
    }
    ['Nasional', 'DKI Jakarta', 'Jawa Barat', 'Jawa Timur', 'Sumatera Utara', 'Kalimantan Timur', 'Sulawesi Selatan', 'Papua'].forEach(p => locs.add(p));
    return Array.from(locs);
  }, [socialNews]);

  // Modal Detail state
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  useEffect(() => {
    loadSocialNews();
  }, [loadSocialNews]);

  // Set default waktuPosting to current time if empty
  useEffect(() => {
    if (!waktuPosting) {
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
      setWaktuPosting(localISOTime);
    }
  }, [waktuPosting]);

  const handleLinkChange = (urlValue: string) => {
    setLink(urlValue);
    
    const lowerUrl = urlValue.toLowerCase().trim();
    if (lowerUrl) {
      if (/twitter\.com|x\.com/i.test(lowerUrl)) {
        setJenisSosmed('Twitter/X');
        const match = urlValue.match(/(?:twitter|x)\.com\/([a-zA-Z0-9_]+)/i);
        if (match && match[1] && !['home', 'intent', 'share', 'hashtag', 'search', 'i'].includes(match[1].toLowerCase())) {
          setUsername(match[1]);
        }
      } else if (/instagram\.com|instagr\.am/i.test(lowerUrl)) {
        setJenisSosmed('Instagram');
        const match = urlValue.match(/instagram\.com\/([a-zA-Z0-9_\.]+)/i);
        if (match && match[1] && !['p', 'reels', 'stories', 'explore'].includes(match[1].toLowerCase())) {
          setUsername(match[1]);
        }
      } else if (/facebook\.com|fb\.com|fb\.watch/i.test(lowerUrl)) {
        setJenisSosmed('Facebook');
        const match = urlValue.match(/facebook\.com\/([a-zA-Z0-9_\.]+)/i);
        if (match && match[1] && !['sharer', 'share', 'pages', 'groups', 'watch', 'p', 'profile.php'].includes(match[1].toLowerCase())) {
          setUsername(match[1]);
        }
      } else if (/tiktok\.com/i.test(lowerUrl)) {
        setJenisSosmed('TikTok');
        const match = urlValue.match(/tiktok\.com\/@([a-zA-Z0-9_\.]+)/i);
        if (match && match[1]) {
          setUsername(match[1]);
        }
      } else if (/youtube\.com|youtu\.be/i.test(lowerUrl)) {
        setJenisSosmed('YouTube');
        const match = urlValue.match(/youtube\.com\/@([a-zA-Z0-9_\.\-]+)/i);
        if (match && match[1]) {
          setUsername(match[1]);
        }
      } else if (/threads\.net|threads\.com/i.test(lowerUrl)) {
        setJenisSosmed('Threads');
        const match = urlValue.match(/threads\.(?:net|com)\/t\/([a-zA-Z0-9_\-]+)/i) || urlValue.match(/threads\.(?:net|com)\/@([a-zA-Z0-9_\.]+)/i);
        if (match && match[1]) {
          setUsername(match[1]);
        } else {
          const generalMatch = urlValue.match(/threads\.(?:net|com)\/([a-zA-Z0-9_\.]+)/i);
          if (generalMatch && generalMatch[1] && !['share', 'p'].includes(generalMatch[1].toLowerCase())) {
            setUsername(generalMatch[1]);
          }
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) return;

    setIsSubmitting(true);
    try {
      const success = await createSocialNews({
        jenisSosmed,
        caption,
        link,
        username,
        waktuPosting
      });
      if (success) {
        // Reset form except social media type
        setCaption('');
        setLink('');
        setUsername('');
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
        setWaktuPosting(localISOTime);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewsApiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsQuery.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await authFetch('/api/social-news/newsapi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: newsQuery,
          customApiKey: newsApiKey,
          language: newsLanguage,
          user
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Gagal melakukan crawling berita.');
      }

      alert(`Sukses! Berhasil melakukan crawling dan menganalisis ${resData.count || 0} artikel berita dari NewsAPI.`);
      setNewsQuery('');
      await loadSocialNews();
      setInputMode('single');
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat melakukan crawling dari NewsAPI.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleParseBatchText = () => {
    if (!batchInputText.trim()) return;

    const lines = batchInputText.split(/\r?\n/).filter(line => line.trim().length > 0);
    const parsed: any[] = [];

    const urlRegex = /(https?:\/\/[^\s]+)/i;
    const dateRegex = /\b\d{4}[-/]\d{2}[-/]\d{2}(?:\s+\d{2}:\d{2}(?::\d{2})?)?\b/;

    let pendingCaptionLines: string[] = [];

    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase();
      // Skip typical header lines
      if (index === 0 && (lowerLine.includes('caption') || lowerLine.includes('username') || lowerLine.includes('sosmed') || lowerLine.includes('platform') || lowerLine.includes('link') || lowerLine.includes('posting'))) {
        return;
      }

      let parts = line.split('\t');
      if (parts.length === 1) {
        parts = line.split('|');
      }

      parts = parts.map(p => p.trim());

      if (parts.length === 0 || parts.every(p => !p)) return;

      const hasUrl = urlRegex.test(line);
      const hasDate = dateRegex.test(line);

      // If a line is a single part with no URL and no date, it is a continuation of a multi-line caption
      if (parts.length === 1 && !hasUrl && !hasDate && lines.length > 1) {
        pendingCaptionLines.push(line);
        return;
      }

      let platformVal = '';
      let userVal = '';
      let linkVal = '';
      let waktuVal = '';
      let captionVal = '';

      if (parts.length === 1) {
        const rawText = parts[0];
        const urlMatch = rawText.match(urlRegex);
        if (urlMatch) {
          linkVal = urlMatch[1];
          captionVal = rawText.replace(linkVal, '').trim();
          captionVal = captionVal.replace(/^[-:| ]+/, '').trim();
        } else {
          captionVal = rawText;
        }
      } else {
        // Multi-column split strictly ordered: Caption - Waktu - Link - username
        captionVal = parts[0] || '';
        waktuVal = parts[1] || '';
        linkVal = parts[2] || '';
        userVal = parts[3] || '';
      }

      // Prepend any accumulated pending caption lines to this record's caption
      if (pendingCaptionLines.length > 0) {
        if (captionVal) {
          captionVal = pendingCaptionLines.join('\n') + '\n' + captionVal;
        } else {
          captionVal = pendingCaptionLines.join('\n');
        }
        pendingCaptionLines = [];
      }

      // Default values & cleanup
      if (userVal.startsWith('@')) {
        userVal = userVal.substring(1);
      }

      // Detect Jenis Sosmed based on Link first, then Platform value, then default to Twitter/X
      let jenisSosmed: 'Twitter/X' | 'Instagram' | 'Facebook' | 'TikTok' | 'YouTube' | 'Threads' | 'Lainnya' = 'Twitter/X';
      const detectSource = linkVal || platformVal;

      if (detectSource) {
        const lowerSource = detectSource.toLowerCase();
        if (/facebook\.com|fb\.com|fb\.watch|facebook|fb/i.test(lowerSource)) {
          jenisSosmed = 'Facebook';
        } else if (/instagram\.com|instagr\.am|instagram|ig/i.test(lowerSource)) {
          jenisSosmed = 'Instagram';
        } else if (/threads\.net|threads\.com|threads/i.test(lowerSource)) {
          jenisSosmed = 'Threads';
        } else if (/tiktok\.com|tiktok/i.test(lowerSource)) {
          jenisSosmed = 'TikTok';
        } else if (/youtube\.com|youtu\.be|youtube|yt/i.test(lowerSource)) {
          jenisSosmed = 'YouTube';
        } else if (/twitter\.com|x\.com|twitter|tweet/i.test(lowerSource) || lowerSource === 'post') {
          jenisSosmed = 'Twitter/X';
        } else if (platformVal) {
          jenisSosmed = 'Lainnya';
        }
      }

      // Auto-extract username from link if still empty or 'anonim'
      if (linkVal && (!userVal || userVal === 'anonim')) {
        const lowerUrl = linkVal.toLowerCase();
        if (/twitter\.com|x\.com/i.test(lowerUrl)) {
          const match = linkVal.match(/(?:twitter|x)\.com\/([a-zA-Z0-9_]+)/i);
          if (match && match[1] && !['home', 'intent', 'share', 'hashtag', 'search', 'i'].includes(match[1].toLowerCase())) {
            userVal = match[1];
          }
        } else if (/instagram\.com|instagr\.am/i.test(lowerUrl)) {
          const match = linkVal.match(/instagram\.com\/([a-zA-Z0-9_\.]+)/i);
          if (match && match[1] && !['p', 'reels', 'stories', 'explore'].includes(match[1].toLowerCase())) {
            userVal = match[1];
          }
        } else if (/facebook\.com|fb\.com/i.test(lowerUrl)) {
          const match = linkVal.match(/facebook\.com\/([a-zA-Z0-9_\.]+)/i);
          if (match && match[1] && !['sharer', 'share', 'pages', 'groups', 'watch', 'p', 'profile.php'].includes(match[1].toLowerCase())) {
            userVal = match[1];
          }
        } else if (/tiktok\.com/i.test(lowerUrl)) {
          const match = linkVal.match(/tiktok\.com\/@([a-zA-Z0-9_\.]+)/i);
          if (match && match[1]) {
            userVal = match[1];
          }
        } else if (/youtube\.com|youtu\.be/i.test(lowerUrl)) {
          const match = linkVal.match(/youtube\.com\/@([a-zA-Z0-9_\.\-]+)/i);
          if (match && match[1]) {
            userVal = match[1];
          }
        } else if (/threads\.net|threads\.com/i.test(lowerUrl)) {
          const match = linkVal.match(/threads\.(?:net|com)\/t\/([a-zA-Z0-9_\-]+)/i) || linkVal.match(/threads\.(?:net|com)\/@([a-zA-Z0-9_\.]+)/i);
          if (match && match[1]) {
            userVal = match[1];
          } else {
            const generalMatch = linkVal.match(/threads\.(?:net|com)\/([a-zA-Z0-9_\.]+)/i);
            if (generalMatch && generalMatch[1] && !['share', 'p'].includes(generalMatch[1].toLowerCase())) {
              userVal = generalMatch[1];
            }
          }
        }
      }

      if (!userVal) userVal = 'anonim';

      // Safe fallback for date-time
      if (!waktuVal) {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        waktuVal = (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
      }

      // Check if caption contains only a URL or is empty
      const isOnlyLink = /^https?:\/\/[^\s]+$/i.test(captionVal.trim());

      if (captionVal && captionVal.trim() && !isOnlyLink) {
        parsed.push({
          jenisSosmed,
          username: userVal,
          link: linkVal,
          waktuPosting: waktuVal,
          caption: captionVal
        });
      }
    });

    // Handle leftover pending caption lines
    if (pendingCaptionLines.length > 0) {
      if (parsed.length > 0) {
        const lastIndex = parsed.length - 1;
        parsed[lastIndex].caption = parsed[lastIndex].caption + '\n' + pendingCaptionLines.join('\n');
      } else {
        const rawText = pendingCaptionLines.join('\n');
        let linkVal = '';
        let captionVal = rawText;
        const urlMatch = rawText.match(urlRegex);
        if (urlMatch) {
          linkVal = urlMatch[1];
          captionVal = rawText.replace(linkVal, '').trim();
          captionVal = captionVal.replace(/^[-:| ]+/, '').trim();
        }

        let jenisSosmed: 'Twitter/X' | 'Instagram' | 'Facebook' | 'TikTok' | 'YouTube' | 'Threads' | 'Lainnya' = 'Twitter/X';
        if (linkVal) {
          const lowerSource = linkVal.toLowerCase();
          if (/facebook\.com|fb\.com|fb\.watch|facebook|fb/i.test(lowerSource)) {
            jenisSosmed = 'Facebook';
          } else if (/instagram\.com|instagr\.am|instagram|ig/i.test(lowerSource)) {
            jenisSosmed = 'Instagram';
          } else if (/threads\.net|threads\.com|threads/i.test(lowerSource)) {
            jenisSosmed = 'Threads';
          } else if (/tiktok\.com|tiktok/i.test(lowerSource)) {
            jenisSosmed = 'TikTok';
          } else if (/youtube\.com|youtu\.be|youtube|yt/i.test(lowerSource)) {
            jenisSosmed = 'YouTube';
          } else if (/twitter\.com|x\.com|twitter|tweet/i.test(lowerSource)) {
            jenisSosmed = 'Twitter/X';
          }
        }

        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const waktuVal = (new Date(now.getTime() - offset)).toISOString().slice(0, 16);

        parsed.push({
          jenisSosmed,
          username: 'anonim',
          link: linkVal,
          waktuPosting: waktuVal,
          caption: captionVal
        });
      }
      pendingCaptionLines = [];
    }

    if (parsed.length === 0) {
      alert('Tidak ada baris data valid yang berhasil terbaca (atau baris data hanya berisi link saja).');
      return;
    }

    // Eliminate duplicate links
    const seenLinks = new Set<string>();
    const uniqueParsed: any[] = [];
    parsed.forEach(item => {
      if (item.link && item.link.trim()) {
        const cleanLink = item.link.trim().toLowerCase();
        if (seenLinks.has(cleanLink)) {
          return; // Skip duplicate link
        }
        seenLinks.add(cleanLink);
      }
      uniqueParsed.push(item);
    });

    setParsedBatchItems(uniqueParsed);
    setBatchStep('preview');
  };

  const handleExcelUpload = (file: File) => {
    setExcelError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error('Gagal membaca file.');
        }
        
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        if (workbook.SheetNames.length === 0) {
          throw new Error('File Excel kosong atau tidak valid.');
        }
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Dynamically find the header row index (e.g. searching row 0 to 15)
        const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
        let bestRowIndex = 0;
        let maxMatchCount = 0;
        const rowsToSearch = Math.min(rawRows.length, 15);
        
        for (let r = 0; r < rowsToSearch; r++) {
          const row = rawRows[r];
          if (!Array.isArray(row)) continue;
          
          let matchCount = 0;
          const hasCaption = row.some(cell => /^(mentions?|caption|isi)$/i.test(String(cell).trim()));
          const hasDate = row.some(cell => /^(dates?|waktu|time)$/i.test(String(cell).trim()));
          const hasLink = row.some(cell => /^(links?|url)$/i.test(String(cell).trim()));
          const hasAuthor = row.some(cell => /^(authors?|username|user)$/i.test(String(cell).trim()));
          
          if (hasCaption) matchCount++;
          if (hasDate) matchCount++;
          if (hasLink) matchCount++;
          if (hasAuthor) matchCount++;
          
          if (matchCount > maxMatchCount) {
            maxMatchCount = matchCount;
            bestRowIndex = r;
          }
        }

        const headerRange = maxMatchCount > 0 ? bestRowIndex : 0;
        const rows = XLSX.utils.sheet_to_json<any>(worksheet, { range: headerRange });
        
        if (rows.length === 0) {
          throw new Error('Tidak ada baris data di sheet pertama.');
        }
        
        const parsed: any[] = [];
        
        rows.forEach((row: any) => {
          const keys = Object.keys(row);
          
          const findVal = (patterns: RegExp[]): string => {
            for (const pattern of patterns) {
              const matchingKey = keys.find(k => pattern.test(k.trim()));
              if (matchingKey !== undefined && row[matchingKey] !== undefined && row[matchingKey] !== null) {
                const val = row[matchingKey];
                if (val instanceof Date) {
                  const offset = val.getTimezoneOffset() * 60000;
                  return new Date(val.getTime() - offset).toISOString().slice(0, 16);
                }
                const strVal = String(val).trim();
                if (strVal.toLowerCase() === 'null' || strVal.toLowerCase() === 'undefined') {
                  return '';
                }
                return strVal;
              }
            }
            return '';
          };
          
          let captionVal = findVal([/^(mentions?|caption|isi)$/i, /mention/i, /caption/i, /isi/i]);
          let waktuVal = findVal([/^(dates?|waktu|time)$/i, /date/i, /waktu/i, /time/i]);
          let linkVal = findVal([/^(links?|url)$/i, /link/i, /url/i]);
          let userVal = findVal([/^(authors?|username|user)$/i, /author/i, /username/i, /user/i]);
          
          if (userVal.startsWith('@')) {
            userVal = userVal.substring(1);
          }
          if (!userVal) userVal = 'anonim';
          
          if (!captionVal && linkVal) {
            captionVal = `Postingan dari ${userVal}`;
          }
          
          let jenisSosmed: 'Twitter/X' | 'Instagram' | 'Facebook' | 'TikTok' | 'YouTube' | 'Threads' | 'Lainnya' = 'Twitter/X';
          const detectSource = linkVal;
          if (detectSource) {
            const lowerSource = detectSource.toLowerCase();
            if (/facebook\.com|fb\.com|fb\.watch|facebook|fb/i.test(lowerSource)) {
              jenisSosmed = 'Facebook';
            } else if (/instagram\.com|instagr\.am|instagram|ig/i.test(lowerSource)) {
              jenisSosmed = 'Instagram';
            } else if (/threads\.net|threads\.com|threads/i.test(lowerSource)) {
              jenisSosmed = 'Threads';
            } else if (/tiktok\.com|tiktok/i.test(lowerSource)) {
              jenisSosmed = 'TikTok';
            } else if (/youtube\.com|youtu\.be|youtube|yt/i.test(lowerSource)) {
              jenisSosmed = 'YouTube';
            } else if (/twitter\.com|x\.com|twitter|tweet/i.test(lowerSource)) {
              jenisSosmed = 'Twitter/X';
            }
          }
          
          if (linkVal && (!userVal || userVal === 'anonim')) {
            const lowerUrl = linkVal.toLowerCase();
            if (/twitter\.com|x\.com/i.test(lowerUrl)) {
              const match = linkVal.match(/(?:twitter|x)\.com\/([a-zA-Z0-9_]+)/i);
              if (match && match[1] && !['home', 'intent', 'share', 'hashtag', 'search', 'i'].includes(match[1].toLowerCase())) {
                userVal = match[1];
              }
            } else if (/instagram\.com|instagr\.am/i.test(lowerUrl)) {
              const match = linkVal.match(/instagram\.com\/([a-zA-Z0-9_\.]+)/i);
              if (match && match[1] && !['p', 'reels', 'stories', 'explore'].includes(match[1].toLowerCase())) {
                userVal = match[1];
              }
            } else if (/facebook\.com|fb\.com/i.test(lowerUrl)) {
              const match = linkVal.match(/facebook\.com\/([a-zA-Z0-9_\.]+)/i);
              if (match && match[1] && !['sharer', 'share', 'pages', 'groups', 'watch', 'p', 'profile.php'].includes(match[1].toLowerCase())) {
                userVal = match[1];
              }
            } else if (/tiktok\.com/i.test(lowerUrl)) {
              const match = linkVal.match(/tiktok\.com\/@([a-zA-Z0-9_\.]+)/i);
              if (match && match[1]) {
                userVal = match[1];
              }
            } else if (/youtube\.com|youtu\.be/i.test(lowerUrl)) {
              const match = linkVal.match(/youtube\.com\/@([a-zA-Z0-9_\.\-]+)/i);
              if (match && match[1]) {
                userVal = match[1];
              }
            } else if (/threads\.net|threads\.com/i.test(lowerUrl)) {
              const match = linkVal.match(/threads\.(?:net|com)\/t\/([a-zA-Z0-9_\-]+)/i) || linkVal.match(/threads\.(?:net|com)\/@([a-zA-Z0-9_\.]+)/i);
              if (match && match[1]) {
                userVal = match[1];
              } else {
                const generalMatch = linkVal.match(/threads\.(?:net|com)\/([a-zA-Z0-9_\.]+)/i);
                if (generalMatch && generalMatch[1] && !['share', 'p'].includes(generalMatch[1].toLowerCase())) {
                  userVal = generalMatch[1];
                }
              }
            }
          }
          
          if (!waktuVal) {
            const now = new Date();
            const offset = now.getTimezoneOffset() * 60000;
            waktuVal = (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
          } else {
            try {
              const d = new Date(waktuVal);
              if (!isNaN(d.getTime())) {
                const offset = d.getTimezoneOffset() * 60000;
                waktuVal = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
              }
            } catch (err) {
              // ignore
            }
          }
          
          if (captionVal && captionVal.trim()) {
            parsed.push({
              jenisSosmed,
              username: userVal,
              link: linkVal,
              waktuPosting: waktuVal,
              caption: captionVal
            });
          }
        });
        
        if (parsed.length === 0) {
          throw new Error('Tidak ada baris data valid yang berhasil dicocokkan. Pastikan memiliki setidaknya kolom "Mention".');
        }
        
        // Eliminate duplicate links
        const seenLinks = new Set<string>();
        const uniqueParsed: any[] = [];
        parsed.forEach(item => {
          if (item.link && item.link.trim()) {
            const cleanLink = item.link.trim().toLowerCase();
            if (seenLinks.has(cleanLink)) {
              return; // Skip duplicate link
            }
            seenLinks.add(cleanLink);
          }
          uniqueParsed.push(item);
        });

        setParsedBatchItems(uniqueParsed);
        setBatchStep('preview');
      } catch (err: any) {
        setExcelError(err.message || 'Gagal membaca file Excel.');
      }
    };
    reader.onerror = () => {
      setExcelError('Error saat membaca file.');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBatchSubmit = async () => {
    if (parsedBatchItems.length === 0) return;

    setIsSubmitting(true);
    
    const itemsToProcess = [...parsedBatchItems];
    const totalItems = itemsToProcess.length;
    const chunkSize = 20; // safe chunk size to avoid gateway timeouts and rate-limiting
    let successCount = 0;
    let failedCount = 0;
    
    setBatchProgress({
      current: 0,
      total: totalItems,
      successCount: 0,
      failedCount: 0,
      statusText: `Memulai pemrosesan massal... (${totalItems} item)`
    });

    try {
      for (let i = 0; i < totalItems; i += chunkSize) {
        const chunk = itemsToProcess.slice(i, i + chunkSize);
        const currentBatchNum = Math.floor(i / chunkSize) + 1;
        const totalBatches = Math.ceil(totalItems / chunkSize);
        
        setBatchProgress(prev => prev ? {
          ...prev,
          current: i,
          statusText: `Memproses batch ${currentBatchNum} dari ${totalBatches}... (${chunk.length} item)`
        } : null);

        try {
          const res = await authFetch('/api/social-news/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: chunk,
              user: user ? { id: user.id, username: user.username, role: user.role } : undefined
            })
          });

          if (res.ok) {
            const data = await res.json();
            successCount += data.count || chunk.length;
          } else {
            console.error(`Batch ${currentBatchNum} failed status:`, res.status);
            failedCount += chunk.length;
          }
        } catch (err) {
          console.error(`Batch ${currentBatchNum} network error:`, err);
          failedCount += chunk.length;
        }

        setBatchProgress(prev => prev ? {
          ...prev,
          current: Math.min(i + chunkSize, totalItems),
          successCount,
          failedCount,
        } : null);
      }

      await loadSocialNews();
      
      if (failedCount === 0) {
        alert(`Berhasil mengimpor & menganalisis seluruh ${successCount} data media sosial secara bertahap!`);
        setBatchInputText('');
        setParsedBatchItems([]);
        setBatchStep('input');
        setInputMode('single');
      } else {
        alert(`Pemrosesan selesai dengan kendala teknis.\nBerhasil diimpor: ${successCount} item.\nGagal diimpor: ${failedCount} item.`);
        setBatchInputText('');
        setParsedBatchItems([]);
        setBatchStep('input');
        setInputMode('single');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan tidak terduga saat memproses data massal.');
    } finally {
      setIsSubmitting(false);
      setBatchProgress(null);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Apakah Anda yakin ingin menghapus analisis berita media sosial ini?')) {
      await deleteSocialNews(id);
    }
  };

  // Filter & Sort computation
  const filteredAndSortedNews = useMemo(() => {
    let result = [...socialNews];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        (item.caption && item.caption.toLowerCase().includes(query)) ||
        (item.username && item.username.toLowerCase().includes(query)) ||
        (item.kategori && item.kategori.toLowerCase().includes(query)) ||
        (item.lokasi && item.lokasi.toLowerCase().includes(query))
      );
    }

    // Social Media Type filter
    if (filterSosmed !== 'Semua') {
      result = result.filter(item => item.jenisSosmed === filterSosmed);
    }

    // Sentiment filter
    if (filterSentiment !== 'Semua') {
      result = result.filter(item => item.sentimen === filterSentiment);
    }

    // Category filter
    if (filterCategory !== 'Semua') {
      result = result.filter(item => item.kategori === filterCategory);
    }

    // Location filter
    if (filterLocation !== 'Semua') {
      result = result.filter(item => item.lokasi === filterLocation);
    }

    // Date filters (Dari Tanggal & Sampai Tanggal)
    if (filterStartDate) {
      result = result.filter(item => {
        if (!item.waktuPosting) return false;
        const itemDateStr = item.waktuPosting.slice(0, 10); // "YYYY-MM-DD"
        return itemDateStr >= filterStartDate;
      });
    }

    if (filterEndDate) {
      result = result.filter(item => {
        if (!item.waktuPosting) return false;
        const itemDateStr = item.waktuPosting.slice(0, 10); // "YYYY-MM-DD"
        return itemDateStr <= filterEndDate;
      });
    }

    // Hour Range filters (Rentang Jam)
    if (filterStartHour !== 'Semua') {
      const startH = parseInt(filterStartHour, 10);
      result = result.filter(item => {
        if (!item.waktuPosting || item.waktuPosting.length < 13) return false;
        const itemHourStr = item.waktuPosting.slice(11, 13);
        const itemHour = parseInt(itemHourStr, 10);
        return !isNaN(itemHour) && itemHour >= startH;
      });
    }

    if (filterEndHour !== 'Semua') {
      const endH = parseInt(filterEndHour, 10);
      result = result.filter(item => {
        if (!item.waktuPosting || item.waktuPosting.length < 13) return false;
        const itemHourStr = item.waktuPosting.slice(11, 13);
        const itemHour = parseInt(itemHourStr, 10);
        return !isNaN(itemHour) && itemHour <= endH;
      });
    }

    // Sort order
    result.sort((a, b) => {
      const timeA = new Date(a.waktuPosting).getTime() || 0;
      const timeB = new Date(b.waktuPosting).getTime() || 0;
      return sortBy === 'terbaru' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [socialNews, searchQuery, filterSosmed, filterSentiment, filterCategory, filterLocation, sortBy, filterStartDate, filterEndDate, filterStartHour, filterEndHour]);

  const itemsPerPage = 25;
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredAndSortedNews.length / itemsPerPage));
  }, [filteredAndSortedNews]);

  const paginatedNews = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedNews.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedNews, currentPage]);

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6" id="social-news-view-container">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Input (Only for roles with write access: Admin, Analis, Editor) */}
        {user?.role !== 'Viewer' && (
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[#121118] border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-xs sticky top-24">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-700 animate-pulse" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Kamera Tangkap Berita Sosmed</h3>
                </div>
              </div>

              <div className="space-y-4">
                {/* Mode Switch Tabs */}
                <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl text-xs font-bold gap-1">
                  <button
                    type="button"
                    onClick={() => setInputMode('single')}
                    className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      inputMode === 'single'
                        ? 'bg-white dark:bg-slate-800 text-blue-800 dark:text-blue-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Input Satuan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('batch');
                      setBatchStep('input');
                    }}
                    className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      inputMode === 'batch'
                        ? 'bg-white dark:bg-slate-800 text-blue-800 dark:text-blue-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <ListPlus className="w-3.5 h-3.5" />
                    <span>Input Massal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('newsapi')}
                    className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      inputMode === 'newsapi'
                        ? 'bg-white dark:bg-slate-800 text-blue-800 dark:text-blue-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Cari NewsAPI</span>
                  </button>
                </div>

                {inputMode === 'single' ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Jenis Media Sosial */}
                    <div className="space-y-1">
                      <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Jenis Media Sosial
                      </label>
                      <select
                        value={jenisSosmed}
                        onChange={(e) => setJenisSosmed(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 focus:outline-none transition"
                      >
                        <option value="Twitter/X">Twitter/X</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Facebook">Facebook</option>
                        <option value="TikTok">TikTok</option>
                        <option value="YouTube">YouTube</option>
                        <option value="Threads">Threads</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>

                    {/* Username / Nama Akun */}
                    <div className="space-y-1">
                      <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Username / Nama Akun
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          required
                          placeholder="Contoh: pertamina"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 focus:outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Link Media Sosial */}
                    <div className="space-y-1">
                      <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Link Media Sosial (URL)
                      </label>
                      <input
                        type="url"
                        placeholder="https://twitter.com/username/status/..."
                        value={link}
                        onChange={(e) => handleLinkChange(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 focus:outline-none transition"
                      />
                    </div>

                    {/* Waktu Posting */}
                    <div className="space-y-1">
                      <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Waktu Posting
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={waktuPosting}
                        onChange={(e) => setWaktuPosting(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 focus:outline-none transition"
                      />
                    </div>

                    {/* Caption / Isi Postingan */}
                    <div className="space-y-1">
                      <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Caption / Isi Postingan <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Tempel teks atau deskripsi postingan sosmed di sini..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 focus:outline-none transition resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !caption.trim()}
                      className="w-full py-2.5 px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all duration-300 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Sedang Menganalisis dengan AI...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>Proses Analisis Isu</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : inputMode === 'batch' ? (
                  <div className="space-y-4">
                    {batchStep === 'input' ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-700/5 border border-blue-700/20 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
                          <p className="font-bold text-blue-900 dark:text-blue-400 flex items-center gap-1">
                            <Info className="w-3.5 h-3.5" /> Panduan Format Unggah Massal:
                          </p>
                          <ul className="list-disc pl-4 space-y-1">
                            <li><strong>Metode 1 (Unggah Excel):</strong> Tarik & taruh file Excel di area bawah dengan format kolom wajib: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-bold">Mentions</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-bold">Date</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-bold">Link</code>, dan <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-bold">Author</code>.</li>
                            <li><strong>Metode 2 (Salin-Tempel Excel):</strong> Salin baris tabel Excel lalu tempel di papan tempel di bawah. Kolom wajib berurutan: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Caption</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Waktu</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Link</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Username</code>.</li>
                            <li><strong>Metode 3 (Plain text):</strong> Cukup tempel daftar postingan biasa (satu caption per baris).</li>
                          </ul>
                        </div>

                        {/* Excel File Dropzone/Picker */}
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingExcel(true);
                          }}
                          onDragLeave={() => setIsDraggingExcel(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingExcel(false);
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                              handleExcelUpload(e.dataTransfer.files[0]);
                            }
                          }}
                          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-300 relative ${
                            isDraggingExcel 
                              ? 'border-blue-700 bg-blue-700/10 scale-[1.01]' 
                              : 'border-slate-200 dark:border-white/5 hover:border-blue-700/50 hover:bg-slate-50 dark:hover:bg-white/[0.01]'
                          }`}
                        >
                          <input
                            type="file"
                            id="excel-file-upload"
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleExcelUpload(e.target.files[0]);
                              }
                            }}
                          />
                          <label htmlFor="excel-file-upload" className="cursor-pointer space-y-2 block">
                            <div className="mx-auto w-10 h-10 bg-blue-100 dark:bg-blue-950/50 rounded-full flex items-center justify-center text-blue-800 dark:text-blue-400">
                              <UploadCloud className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Unggah File Excel (.xlsx, .xls)
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Seret & taruh file di sini atau klik untuk memilih file
                              </p>
                              <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">
                                Pencocokan Header: <span className="font-bold text-blue-800 dark:text-blue-400">Mentions</span> | <span className="font-bold text-blue-800 dark:text-blue-400">Date</span> | <span className="font-bold text-blue-800 dark:text-blue-400">Link</span> | <span className="font-bold text-blue-800 dark:text-blue-400">Author</span>
                              </p>
                            </div>
                          </label>
                        </div>

                        {excelError && (
                          <div className="flex items-center gap-2 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] text-rose-600 dark:text-rose-400">
                            <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                            <span className="font-semibold">{excelError}</span>
                          </div>
                        )}

                        <div className="relative my-3 flex py-1 items-center">
                          <div className="flex-grow border-t border-slate-200 dark:border-white/5"></div>
                          <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Atau Tempel Teks Manual</span>
                          <div className="flex-grow border-t border-slate-200 dark:border-white/5"></div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Papan Tempel Data Sosial (Paste Here)
                          </label>
                          <textarea
                            rows={8}
                            placeholder="Contoh format Excel:&#13;Masyarakat keluhkan antrean bensin...	2026-06-25 10:00	https://x.com/status/...	@pertamina&#13;&#13;Atau tempel tulisan biasa (1 baris 1 postingan):&#13;Antrean BBM solar mulai panjang di Tol Trans Jawa...&#13;Warga keluhkan kelangkaan solar di SPBU Merak..."
                            value={batchInputText}
                            onChange={(e) => setBatchInputText(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 focus:outline-none transition resize-none"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleParseBatchText}
                          disabled={!batchInputText.trim()}
                          className="w-full py-2.5 px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all duration-300 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Clipboard className="w-4 h-4 text-blue-200" />
                          <span>Pratinjau Hasil Impor ({batchInputText.split('\n').filter(Boolean).length})</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setBatchStep('input')}
                            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Kembali</span>
                          </button>
                          <span className="bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            {parsedBatchItems.length} Posting Terbaca
                          </span>
                        </div>

                        {/* Preview List of Parsed Items */}
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1 border border-slate-100 dark:border-white/5 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/30">
                          {parsedBatchItems.map((item, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-950 p-2.5 border border-slate-200 dark:border-white/5 rounded-xl text-[11px] space-y-1">
                              <div className="flex items-center justify-between">
                                <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${getSosmedColor(item.jenisSosmed)}`}>
                                  {item.jenisSosmed}
                                </span>
                                <span className="text-slate-400 text-[10px]">
                                  @{item.username}
                                </span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-400 line-clamp-2 italic">
                                "{item.caption}"
                              </p>
                            </div>
                          ))}
                        </div>

                        {batchProgress && (
                          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-950/30 rounded-xl space-y-2 text-left">
                            <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              <span className="truncate max-w-[80%]">{batchProgress.statusText}</span>
                              <span>{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-blue-700 to-indigo-600 h-2 transition-all duration-300"
                                style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-emerald-600 dark:text-emerald-400">✓ Berhasil: {batchProgress.successCount}</span>
                              <span className="text-slate-400">Total: {batchProgress.total} item</span>
                              <span className="text-rose-600 dark:text-rose-400">✗ Gagal: {batchProgress.failedCount}</span>
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleBatchSubmit}
                          disabled={isSubmitting || parsedBatchItems.length === 0}
                          className="w-full py-2.5 px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all duration-300 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isSubmitting ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Sedang Memproses Massal... {batchProgress ? `${Math.round((batchProgress.current / batchProgress.total) * 100)}%` : ''}</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 text-emerald-300 animate-pulse" />
                              <span>Kirim & Analisis Massal ({parsedBatchItems.length} Item)</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleNewsApiSubmit} className="space-y-4">
                    <div className="p-3 bg-blue-700/5 border border-blue-700/20 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
                      <p className="font-bold text-blue-900 dark:text-blue-400 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" /> Crawling via NewsAPI.org:
                      </p>
                      <p>Cari artikel berita online terbaru berdasarkan kata kunci secara langsung. Artikel akan dianalisis secara otomatis oleh AI dan disimpan ke sistem.</p>
                    </div>

                    {/* Kata Kunci Pencarian */}
                    <div className="space-y-1">
                      <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Kata Kunci Pencarian <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Pertamina, Kelangkaan Solar, Subsidi"
                        value={newsQuery}
                        onChange={(e) => setNewsQuery(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 focus:outline-none transition"
                      />
                    </div>

                    {/* Bahasa Berita */}
                    <div className="space-y-1">
                      <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Bahasa Berita
                      </label>
                      <select
                        value={newsLanguage}
                        onChange={(e) => setNewsLanguage(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 focus:outline-none transition"
                      >
                        <option value="id">Bahasa Indonesia (ID)</option>
                        <option value="en">Bahasa Inggris (EN)</option>
                        <option value="ar">Bahasa Arab (AR)</option>
                      </select>
                    </div>

                    {/* API Key Optional */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Custom NewsAPI API Key
                        </label>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 italic">Opsional</span>
                      </div>
                      <input
                        type="password"
                        placeholder="Masukkan API Key NewsAPI Anda"
                        value={newsApiKey}
                        onChange={(e) => setNewsApiKey(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 focus:outline-none transition"
                      />
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal">
                        Biarkan kosong untuk menggunakan default server (jika sudah dikonfigurasi). Dapatkan API key gratis di <a href="https://newsapi.org" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">newsapi.org</a>.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !newsQuery.trim()}
                      className="w-full py-2.5 px-4 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all duration-300 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Mengekstrak & Menganalisis Berita...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 text-blue-200" />
                          <span>Crawling & Impor Berita</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Right Column: News List & Analytics results */}
        <div className={`${user?.role === 'Viewer' ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-4`}>
          
          {/* Main Content & Filters Card exactly like Portal Monitoring */}
          <div className="bg-white dark:bg-[#121118] border border-slate-200 dark:border-white/5 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            
            {/* Header Title section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-700 animate-pulse" />
                  Daftar Pantauan Berita Sosmed ({filteredAndSortedNews.length})
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Arsip postingan media sosial, analisis sentimen, dan klasifikasi isu.
                </p>
              </div>

              {/* Sorting option integrated directly */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[10px] uppercase font-bold text-slate-400">Urutkan:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2 py-1 bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="terbaru">Terbaru</option>
                  <option value="terlama">Terlama</option>
                </select>
              </div>
            </div>

            {/* Search Input Bar (Main Action, Exactly like Portal Monitoring) */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kata kunci, caption, atau username..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-xs placeholder:text-slate-400 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-700/30 transition shadow-inner"
                />
              </div>

              {/* Filter Lanjutan Button (Exactly like Portal Monitoring) */}
              <button
                type="button"
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className={`flex items-center justify-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  isFilterExpanded || activeFiltersCount > 0
                    ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-950/60'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filter Lanjutan</span>
                {activeFiltersCount > 0 ? (
                  <span className="flex items-center justify-center px-1.5 py-0.5 bg-blue-800 text-white font-bold rounded-full text-[9px] min-w-[18px]">
                    {activeFiltersCount}
                  </span>
                ) : (
                  <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${isFilterExpanded ? 'rotate-90' : 'rotate-0'}`} />
                )}
              </button>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-transparent hover:border-rose-200/50 rounded-xl text-xs font-bold transition cursor-pointer"
                  title="Reset Semua Filter"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin-once" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}
            </div>

            {/* Collapsible Advanced Filters panel (Exactly like Portal Monitoring) */}
            <AnimatePresence initial={false}>
              {isFilterExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 p-4 bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-white/5 shadow-xs">
                    
                    {/* Sosmed Filter */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Sosmed</label>
                      <select
                        value={filterSosmed}
                        onChange={(e) => setFilterSosmed(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-700/30 shadow-xs cursor-pointer"
                      >
                        <option value="Semua">Semua Platform</option>
                        <option value="Twitter/X">Twitter/X</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Facebook">Facebook</option>
                        <option value="TikTok">TikTok</option>
                        <option value="YouTube">YouTube</option>
                        <option value="Threads">Threads</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>

                    {/* Sentimen Filter */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Sentimen</label>
                      <select
                        value={filterSentiment}
                        onChange={(e) => setFilterSentiment(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-700/30 shadow-xs cursor-pointer"
                      >
                        <option value="Semua">Semua Sentimen</option>
                        <option value="Positif">Positif</option>
                        <option value="Netral">Netral</option>
                        <option value="Negatif">Negatif</option>
                      </select>
                    </div>

                    {/* Kategori Filter */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Kategori</label>
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-700/30 shadow-xs cursor-pointer"
                      >
                        <option value="Semua">Semua Kategori</option>
                        {uniqueCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Wilayah Filter */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Wilayah</label>
                      <select
                        value={filterLocation}
                        onChange={(e) => setFilterLocation(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-700/30 shadow-xs cursor-pointer"
                      >
                        <option value="Semua">Semua Wilayah</option>
                        {uniqueLocations.map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>

                    {/* Dari Tanggal */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Dari Tanggal</label>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        onClick={(e) => {
                          try {
                            (e.currentTarget as any).showPicker();
                          } catch (err) {}
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-700/30 shadow-xs cursor-pointer"
                      />
                    </div>

                    {/* Sampai Tanggal */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Sampai Tanggal</label>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        onClick={(e) => {
                          try {
                            (e.currentTarget as any).showPicker();
                          } catch (err) {}
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-700/30 shadow-xs cursor-pointer"
                      />
                    </div>

                    {/* Jam Mulai */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Jam Mulai</label>
                      <select
                        value={filterStartHour}
                        onChange={(e) => setFilterStartHour(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-700/30 shadow-xs cursor-pointer"
                      >
                        <option value="Semua">Semua Jam</option>
                        {hoursArray.map(h => (
                          <option key={h} value={h}>{h}:00</option>
                        ))}
                      </select>
                    </div>

                    {/* Jam Selesai */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Jam Selesai</label>
                      <select
                        value={filterEndHour}
                        onChange={(e) => setFilterEndHour(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-700/30 shadow-xs cursor-pointer"
                      >
                        <option value="Semua">Semua Jam</option>
                        {hoursArray.map(h => (
                          <option key={h} value={h}>{h}:59</option>
                        ))}
                      </select>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Listing View (directly inside the card) */}
            <div className="pt-2">
              {filteredAndSortedNews.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 dark:border-white/5 rounded-xl">
                <Info className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-bounce" />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tidak ada berita media sosial yang ditemukan.</p>
                <p className="text-[10px] text-slate-400 mt-1">Silakan tambahkan tangkapan postingan baru di kolom sebelah kiri.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-4">
                  {paginatedNews.map((item) => {
                    const sentColor = 
                      item.sentimen === 'Positif' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400' :
                      item.sentimen === 'Negatif' ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400' :
                      'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400';

                    return (
                      <div 
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] hover:bg-slate-50 hover:dark:bg-white/[0.04] transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                      >
                        {/* Top info header line */}
                        <div className="flex items-center justify-between gap-2 flex-wrap text-[10px] font-bold">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full ${getSosmedColor(item.jenisSosmed)}`}>
                              {item.jenisSosmed}
                            </span>
                            <span className="text-slate-600 dark:text-slate-400 font-mono">
                              @{item.username}
                            </span>
                            <span className="text-slate-400 font-medium">
                              Diposting: {formatDateTime(item.waktuPosting)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            {/* Sentiment Badge */}
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase ${sentColor}`}>
                              {item.sentimen}
                            </span>
                          </div>
                        </div>

                        {/* Content Section */}
                        <div className="space-y-1.5">
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium line-clamp-2">
                            {item.caption}
                          </p>
                          {item.ringkasan && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium italic bg-slate-100/50 dark:bg-slate-900/30 px-2 py-1 rounded-md">
                              {item.ringkasan}
                            </div>
                          )}
                        </div>

                        {/* Bottom action footer */}
                        <div className="flex items-center justify-between text-[10px] font-bold pt-2 border-t border-slate-100 dark:border-white/5 text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors">
                          <div className="flex items-center gap-3.5 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Tag className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                              <span>Kategori: {item.kategori || 'Sosial Kemasyarakatan'}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span>Provinsi: {item.lokasi || 'Nasional'}</span>
                            </span>
                            {item.link && (
                              <a 
                                href={item.link} 
                                target="_blank" 
                                rel="noreferrer" 
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-blue-500 hover:underline hover:text-blue-600 cursor-pointer"
                              >
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                <span>Buka Link</span>
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button 
                              className="p-1 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition cursor-pointer"
                              title="Detail Analisis"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            {user?.role !== 'Viewer' && (
                              <button
                                onClick={(e) => handleDelete(item.id, e)}
                                className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-slate-100 dark:border-white/5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <div>
                      Menampilkan <span className="text-slate-800 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="text-slate-800 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredAndSortedNews.length)}</span> dari <span className="text-slate-800 dark:text-white">{filteredAndSortedNews.length}</span> data
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 hover:bg-slate-50 hover:dark:bg-white/[0.04] disabled:opacity-40 disabled:hover:bg-white disabled:dark:hover:bg-slate-900 transition-colors cursor-pointer"
                      >
                        Sebelumnya
                      </button>
                      
                      {/* Page Numbers */}
                      {(() => {
                        const pages: (number | string)[] = [];
                        for (let i = 1; i <= totalPages; i++) {
                          if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                            pages.push(i);
                          } else if (pages[pages.length - 1] !== '...') {
                            pages.push('...');
                          }
                        }
                        return pages.map((p, index) => {
                          if (p === '...') {
                            return <span key={`dots-${index}`} className="px-1 text-slate-400 dark:text-slate-600">...</span>;
                          }
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setCurrentPage(p as number)}
                              className={`w-7 h-7 flex items-center justify-center rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                                currentPage === p
                                  ? 'bg-blue-800 text-white border-blue-800'
                                  : 'border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 hover:dark:bg-white/[0.04]'
                              }`}
                            >
                              {p}
                            </button>
                          );
                        });
                      })()}

                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 hover:bg-slate-50 hover:dark:bg-white/[0.04] disabled:opacity-40 disabled:hover:bg-white disabled:dark:hover:bg-slate-900 transition-colors cursor-pointer"
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Details View Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#121118] border border-slate-200 dark:border-white/5 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse shrink-0" />
                <h4 className="text-base font-extrabold tracking-tight text-slate-800 dark:text-white font-display">Detail Analisis Isu Media Sosial</h4>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Profile card metadata block */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold mb-0.5">Platform</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${getSosmedColor(selectedItem.jenisSosmed)}`}>
                    {selectedItem.jenisSosmed}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Username</span>
                  <span className="text-slate-800 dark:text-white text-xs">@{selectedItem.username}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Waktu Posting</span>
                  <span className="text-slate-800 dark:text-white text-xs">{formatDateTime(selectedItem.waktuPosting)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Kategori AI</span>
                  <span className="text-slate-800 dark:text-white text-xs">{selectedItem.kategori}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">Sentimen</span>
                  <span className={`inline-block px-2 py-0.5 mt-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    selectedItem.sentimen === 'Positif' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400' :
                    selectedItem.sentimen === 'Negatif' ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400' :
                    'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400'
                  }`}>
                    {selectedItem.sentimen}
                  </span>
                </div>
              </div>

              {/* Caption Section */}
              <div className="space-y-1">
                <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Caption Postingan</span>
                <div className="p-3 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-250/20 dark:border-white/5 rounded-xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {selectedItem.caption}
                </div>
              </div>

              {/* Summary Block */}
              {selectedItem.ringkasan && (
                <div className="space-y-1">
                  <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Ringkasan Pintar (1 Kalimat)</span>
                  <div className="p-3 bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-200/20 rounded-xl text-xs text-indigo-900 dark:text-indigo-300 font-semibold leading-relaxed">
                    {selectedItem.ringkasan}
                  </div>
                </div>
              )}

              {/* AI Strategic Analysis Block */}
              {selectedItem.analisis && (
                <div className="space-y-1">
                  <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    Analisis Sentimen & Isu Strategis AI
                  </span>
                  <div className="p-4 bg-blue-50/30 dark:bg-blue-950/10 border border-blue-200/20 rounded-xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {selectedItem.analisis}
                  </div>
                </div>
              )}

              {/* Extra Location Info tags */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-white/5">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>Provinsi Deteksi: {selectedItem.lokasi}</span>
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
              {selectedItem.link ? (
                <a 
                  href={selectedItem.link} 
                  target="_blank" 
                  rel="noreferrer"
                  className="py-1.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-200 dark:border-white/10"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Postingan Asli</span>
                </a>
              ) : (
                <div />
              )}
              <button 
                onClick={() => setSelectedItem(null)}
                className="py-1.5 px-5 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              >
                Selesai Membaca
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
