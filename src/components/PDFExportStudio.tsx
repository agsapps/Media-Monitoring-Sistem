import React, { useState, useMemo } from 'react';
import { useAppState } from '../AppContext';
import { 
  FileText, Sliders, Download, RefreshCw, Calendar, Search
} from 'lucide-react';
import { generatePDFReport, getDefaultLogoBase64, getDefaultLogoRightBase64, getDefaultLogoCoverLeftBase64, getDefaultLogoCoverRightBase64 } from '../utils/pdfReportGenerator';
import { safeHtml2Canvas } from '../utils/safeHtml2Canvas';
import { OSMMap } from './OSMMap';

export const PDFExportStudio: React.FC = () => {
  const { news, showToast, highlights, settings, saveSettings } = useAppState();

  // Selected province state for the offscreen OSM Map snapshot
  const [selectedProvinceMap, setSelectedProvinceMap] = useState('Nasional');



  // General Customization States
  const [reportTitle, setReportTitle] = useState('LAPORAN KHUSUS MEDIA MONITORING');
  const [reportType, setReportType] = useState<'Weekly' | 'Monthly' | 'Custom'>('Custom');
  const [customReportText, setCustomReportText] = useState(
    `**Kebijakan Energi & Tata Kelola**
- Pengawasan distribusi BBM subsidi diperketat melalui verifikasi QR Code dan STNK guna memastikan ketepatan sasaran.
- Regulasi kebijakan publik regional dioptimalkan untuk meminimalkan potensi kebocoran energi bersubsidi.

---

**Pengamanan & Logistik Regional**
- Patroli keamanan laut dan darat ditingkatkan di wilayah perbatasan untuk mengantisipasi potensi kerawanan logistik.`
  );

  const [customLogo, setCustomLogo] = useState<string | undefined>(undefined);
  const [customLogoRight, setCustomLogoRight] = useState<string | undefined>(undefined);
  const [uploadedImages, setUploadedImages] = useState<{
    src: string;
    size: 'small' | 'medium' | 'large' | 'full';
    caption: string;
    aspectRatio?: number;
  }[]>([]);
  const [defaultLogo, setDefaultLogo] = useState<string>(settings?.pdfExportLogoLeft || getDefaultLogoBase64());
  const [defaultLogoRight, setDefaultLogoRight] = useState<string>(settings?.pdfExportLogoRight || getDefaultLogoRightBase64());
  const [defaultLogoCoverLeft, setDefaultLogoCoverLeft] = useState<string>(settings?.pdfExportLogoCoverLeft || getDefaultLogoCoverLeftBase64());
  const [defaultLogoCoverRight, setDefaultLogoCoverRight] = useState<string>(settings?.pdfExportLogoCoverRight || getDefaultLogoCoverRightBase64());

  React.useEffect(() => {
    if (settings) {
      setDefaultLogo(settings.pdfExportLogoLeft || getDefaultLogoBase64());
      setDefaultLogoRight(settings.pdfExportLogoRight || getDefaultLogoRightBase64());
      setDefaultLogoCoverLeft(settings.pdfExportLogoCoverLeft || getDefaultLogoCoverLeftBase64());
      setDefaultLogoCoverRight(settings.pdfExportLogoCoverRight || getDefaultLogoCoverRightBase64());
    }
  }, [settings]);

  // Filter States
  const [selectedSentiment, setSelectedSentiment] = useState<'All' | 'Positif' | 'Negatif' | 'Netral'>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedProvince, setSelectedProvince] = useState<string>('All');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  React.useEffect(() => {
    try {
      const prefillString = localStorage.getItem('pdf_studio_prefill');
      if (prefillString) {
        const prefill = JSON.parse(prefillString);
        if (prefill.startDate) setStartDate(prefill.startDate);
        if (prefill.endDate) setEndDate(prefill.endDate);
        if (prefill.sentiment) {
          setSelectedSentiment(prefill.sentiment);
        }
        if (prefill.category) {
          setSelectedCategory(prefill.category);
        }
        if (prefill.province) {
          setSelectedProvince(prefill.province);
        }
        if (prefill.search) setSearchKeyword(prefill.search);
        
        localStorage.removeItem('pdf_studio_prefill');
        showToast('Filter dari halaman sebelumnya berhasil diterapkan!', 'info');
      }
    } catch (err) {
      console.warn('[PDF prefill error]:', err);
    }
  }, []);

  // Normalize and compare dates
  const parseDateToComparable = (dateStr: string): number => {
    if (!dateStr) return 0;
    const dmYMatch = dateStr.trim().match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    if (dmYMatch) {
      const [, day, month, year] = dmYMatch;
      return new Date(`${year}-${month}-${day}`).getTime();
    }
    const yMdMatch = dateStr.trim().match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
    if (yMdMatch) {
      const [, year, month, day] = yMdMatch;
      return new Date(`${year}-${month}-${day}`).getTime();
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.getTime();
    }
    return 0;
  };

  const handleDefaultLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] as File | undefined;
    if (file) {
      const reader = new FileReader();
      reader.onload = async (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        const success = await saveSettings({ pdfExportLogoLeft: base64 });
        if (success) {
          showToast('Default Logo Kiri berhasil diganti dan disimpan permanen di sistem!', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetDefaultLogo = async () => {
    const success = await saveSettings({ pdfExportLogoLeft: "" });
    if (success) {
      showToast('Logo default kiri telah dikembalikan ke logo sistem asli.', 'info');
    }
  };

  const handleDefaultLogoRightUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] as File | undefined;
    if (file) {
      const reader = new FileReader();
      reader.onload = async (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        const success = await saveSettings({ pdfExportLogoRight: base64 });
        if (success) {
          showToast('Default Logo Kanan berhasil diganti dan disimpan permanen di sistem!', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetDefaultLogoRight = async () => {
    const success = await saveSettings({ pdfExportLogoRight: "" });
    if (success) {
      showToast('Logo default kanan telah dikembalikan ke logo bintang emas asli.', 'info');
    }
  };

  const handleDefaultLogoCoverLeftUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] as File | undefined;
    if (file) {
      const reader = new FileReader();
      reader.onload = async (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        const success = await saveSettings({ pdfExportLogoCoverLeft: base64 });
        if (success) {
          showToast('Default Logo Cover Kiri (Halaman 1) berhasil diganti dan disimpan permanen di sistem!', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetDefaultLogoCoverLeft = async () => {
    const success = await saveSettings({ pdfExportLogoCoverLeft: "" });
    if (success) {
      showToast('Logo Cover Kiri (Halaman 1) telah dikembalikan ke logo sistem asli.', 'info');
    }
  };

  const handleDefaultLogoCoverRightUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] as File | undefined;
    if (file) {
      const reader = new FileReader();
      reader.onload = async (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        const success = await saveSettings({ pdfExportLogoCoverRight: base64 });
        if (success) {
          showToast('Default Logo Cover Kanan (Halaman 1) berhasil diganti dan disimpan permanen di sistem!', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetDefaultLogoCoverRight = async () => {
    const success = await saveSettings({ pdfExportLogoCoverRight: "" });
    if (success) {
      showToast('Logo Cover Kanan (Halaman 1) telah dikembalikan ke logo sistem asli.', 'info');
    }
  };

  const removeAttachmentImg = (idx: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== idx));
    showToast('Lampiran visual dihapus.', 'info');
  };

  const updateAttachmentSize = (idx: number, size: 'small' | 'medium' | 'large' | 'full') => {
    setUploadedImages((prev) => prev.map((img, i) => i === idx ? { ...img, size } : img));
  };

  const updateAttachmentCaption = (idx: number, caption: string) => {
    setUploadedImages((prev) => prev.map((img, i) => i === idx ? { ...img, caption } : img));
  };

  // Page Inclusion States
  const [includeMap, setIncludeMap] = useState(true);

  // Is Generating State
  const [isCompiling, setIsCompiling] = useState(false);

  // Distinct categories matching application metadata
  const categoriesList = [
    'All',
    'Kenaikan Harga BBM',
    'Subsidi & Distribusi',
    'Antrean BBM',
    'Penyalahgunaan BBM',
    'Kebijakan Pemerintah',
    'Infrastruktur'
  ];

  // Distinct provinces listing
  const provincesList = [
    'All',
    'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'D.I. Yogyakarta', 'Banten',
    'Sumatera Utara', 'Riau', 'Kepulauan Riau', 'Sumatera Selatan', 'Lampung',
    'Kalimantan Timur', 'Kalimantan Barat', 'Kalimantan Selatan',
    'Sulawesi Utara', 'Sulawesi Selatan', 'Papua', 'Bali', 'Nusa Tenggara Barat'
  ];

  // 1. Process Filtered News
  const filteredNews = useMemo(() => {
    // Only compile Published news items
    let subset = news.filter((n) => n.status === 'Published');

    // Sentiment Filter
    if (selectedSentiment !== 'All') {
      subset = subset.filter((n) => n.sentiment === selectedSentiment);
    }

    // Category Filter
    if (selectedCategory !== 'All') {
      subset = subset.filter(
        (n) => n.categoryId === selectedCategory || n.categoryName === selectedCategory
      );
    }

    // Province Filter
    if (selectedProvince !== 'All') {
      subset = subset.filter(
        (n) => (n.location || '').toLowerCase() === selectedProvince.toLowerCase()
      );
    }

    // Text Search Filter
    if (searchKeyword.trim() !== '') {
      const query = searchKeyword.toLowerCase();
      subset = subset.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          (n.summary || '').toLowerCase().includes(query)
      );
    }

    // Start Date Filter
    if (startDate) {
      const startMs = new Date(startDate).getTime();
      subset = subset.filter((n) => {
        const itemMs = parseDateToComparable(n.publishDate || n.createdAt);
        return itemMs >= startMs;
      });
    }

    // End Date Filter
    if (endDate) {
      const endMs = new Date(endDate).getTime() + (24 * 60 * 60 * 1000) - 1;
      subset = subset.filter((n) => {
        const itemMs = parseDateToComparable(n.publishDate || n.createdAt);
        return itemMs <= endMs;
      });
    }

    return subset;
  }, [news, selectedSentiment, selectedCategory, selectedProvince, searchKeyword, startDate, endDate]);

  // 2. Metrics calculated instantly relative to active filter
  const metrics = useMemo(() => {
    const total = filteredNews.length;
    const positif = filteredNews.filter((n) => n.sentiment === 'Positif').length;
    const netral = filteredNews.filter((n) => n.sentiment === 'Netral').length;
    const negatif = filteredNews.filter((n) => n.sentiment === 'Negatif').length;

    // Get dominant category
    const catFreq: Record<string, number> = {};
    filteredNews.forEach((n) => {
      const name = n.categoryName || 'Lainnya';
      catFreq[name] = (catFreq[name] || 0) + 1;
    });
    const sortedCats = Object.entries(catFreq).sort((a, b) => b[1] - a[1]);
    const topTopic = sortedCats.length > 0 ? sortedCats[0][0] : 'Umum';

    // Get dominant region
    const provFreq: Record<string, number> = {};
    filteredNews.forEach((n) => {
      const name = n.location || 'Nasional';
      provFreq[name] = (provFreq[name] || 0) + 1;
    });
    const sortedProvs = Object.entries(provFreq).sort((a, b) => b[1] - a[1]);
    const topRegion = sortedProvs.length > 0 ? sortedProvs[0][0] : 'Nasional';

    // Simple risk estimation
    let riskLevel = 'RENDAH';
    if (negatif > total * 0.45) {
      riskLevel = 'TINGGI (AWAS)';
    } else if (negatif > total * 0.2) {
      riskLevel = 'SEDANG (WASPADA)';
    }

    return {
      total,
      positif,
      netral,
      negatif,
      topTopic,
      topRegion,
      riskLevel,
      postPercent: total > 0 ? Math.round((positif / total) * 100) : 0,
      netPercent: total > 0 ? Math.round((netral / total) * 100) : 0,
      negPercent: total > 0 ? Math.round((negatif / total) * 100) : 0
    };
  }, [filteredNews]);

  // Province stats computed specifically for map visualizer
  const provinceStatsForMap = useMemo(() => {
    const map: Record<string, { newsCount: number; mediaCount: number; positif: number; negatif: number; netral: number; criticalIssues: string[] }> = {};
    const seedProvinces = ['Nasional', 'DKI Jakarta', 'Jawa Barat', 'Jawa Timur', 'Sumatera Utara', 'Kalimantan Timur', 'Sulawesi Selatan', 'Papua'];
    seedProvinces.forEach(p => {
      map[p] = { newsCount: 0, mediaCount: 0, positif: 0, negatif: 0, netral: 0, criticalIssues: [] };
    });

    filteredNews.forEach(item => {
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
  }, [filteredNews]);

  // Date range label
  const dateRangeLabel = useMemo(() => {
    if (filteredNews.length === 0) return 'Tidak Ada Berita';
    const dates = filteredNews
      .map((n) => n.publishDate)
      .filter(Boolean)
      .sort();
    if (dates.length === 0) return 'Periode Juni 2026';
    if (dates.length === 1) return dates[0];
    return `${dates[0]} s/d ${dates[dates.length - 1]}`;
  }, [filteredNews]);

  // Clear all configurations to default
  const handleReset = () => {
    setReportTitle('LAPORAN KHUSUS MEDIA MONITORING');
    setReportType('Custom');
    setSelectedSentiment('All');
    setSelectedCategory('All');
    setSelectedProvince('All');
    setSearchKeyword('');
    setIncludeMap(true);
    setCustomReportText(
      'Berdasarkan pantauan intelijen media pada periode ini, fluktuasi sentimen opini publik menunjukkan stabilitas relatif tinggi. Potensi kerawanan sosial akibat penyesuaian tarif BBM bersubsidi berhasil dinetralisir melalui intervensi kehumasan kolaboratif.'
    );
    showToast('Konfigurasi PDF direset ke bawaan.', 'info');
  };

  // Helper utility to convert SVG Base64 or XML to standard PNG base64 to ensure jsPDF addImage success
  const ensurePngBase64 = (base64OrSvg: string | undefined): Promise<string> => {
    return new Promise((resolve) => {
      if (!base64OrSvg) {
        resolve("");
        return;
      }
      if (!base64OrSvg.startsWith("data:image/svg+xml")) {
        resolve(base64OrSvg);
        return;
      }
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, 256, 256);
            ctx.drawImage(img, 0, 0, 256, 256);
            resolve(canvas.toDataURL("image/png"));
            return;
          }
        } catch (e) {
          console.error("[SVG to PNG conversion failed]:", e);
        }
        resolve(base64OrSvg);
      };
      img.onerror = () => {
        resolve(base64OrSvg);
      };
      img.src = base64OrSvg;
    });
  };

  // Compile and Trigger jsPDF Builder
  const handleExportPDF = async () => {
    if (filteredNews.length === 0) {
      showToast('Tidak ada rilis berita terfilter untuk diekspor.', 'error');
      return;
    }

    setIsCompiling(true);
    showToast('Memproses Report...', 'info');

    try {
      // 1. Try to fetch the map preview canvas snapshot in background if present on page
      let mapSnapshotBase64: string | undefined = undefined;
      const mapElement = document.getElementById('studio-offscreen-map-container') || document.getElementById('osm-map-container');
      if (mapElement && includeMap) {
        try {
          // Give the offscreen Leaflet map engine ample time to render, load tiles, and place marks perfectly
          await new Promise((resolve) => setTimeout(resolve, 850));

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

      // Convert active logos to clean high-DPI PNGs dynamically before compilation
      const pngLogoLeft = await ensurePngBase64(customLogo || defaultLogo);
      const pngLogoRight = await ensurePngBase64(customLogoRight || defaultLogoRight);

      // 2. Generate stats payload
      const statsPayload = {
        total: metrics.total,
        positif: metrics.positif,
        netral: metrics.netral,
        negatif: metrics.negatif,
        topTopic: metrics.topTopic,
        topRegion: metrics.topRegion,
        riskLevel: metrics.riskLevel
      };

      // 3. Compile province statistics for page appendix map breakdown
      const provinceStats: Record<string, { newsCount: number; positif: number; netral: number; negatif: number }> = {};
      filteredNews.forEach((item) => {
        const prov = item.location || 'Nasional';
        if (!provinceStats[prov]) {
          provinceStats[prov] = { newsCount: 0, positif: 0, netral: 0, negatif: 0 };
        }
        provinceStats[prov].newsCount += 1;
        if (item.sentiment === 'Positif') provinceStats[prov].positif += 1;
        else if (item.sentiment === 'Netral') provinceStats[prov].netral += 1;
        else if (item.sentiment === 'Negatif') provinceStats[prov].negatif += 1;
      });

      // 4. Fire trigger to PDF utility
      await generatePDFReport(
        reportTitle.toUpperCase(),
        reportType,
        dateRangeLabel,
        customReportText,
        statsPayload,
        mapSnapshotBase64,
        provinceStats,
        highlights, // standard highlights
        filteredNews,
        pngLogoLeft,
        uploadedImages,
        pngLogoRight
      );

      showToast('Report PDF Berhasil Diunduh!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal mengunduh file.', 'error');
    } finally {
      setIsCompiling(false);
    }
  };



  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950 px-4 sm:px-6 pb-6" id="pdf-studio-view">
      
      {/* HEADER HERO AREA */}
      <div className="mb-5 mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-700" />
            PDF Export Studio — High-Fidelity
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Buat, kustomisasi, filter, dan unduh dokumen laporan formal Security Head Office secara interaktif.
          </p>
        </div>

        {/* BUTTON ACTIONS */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3.5 py-2 hover:bg-slate-200 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Kustomisasi</span>
          </button>
          
          <button
            onClick={handleExportPDF}
            disabled={isCompiling || filteredNews.length === 0}
            className="relative overflow-hidden px-5 py-2.5 bg-gradient-to-r from-blue-800 to-indigo-600 hover:from-blue-700 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            {isCompiling ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Mengompilasi...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Laporan PDF ({filteredNews.length} Berita)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* CORE SINGLE-COLUMN WORKSPACE AREA */}
      <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col gap-6 overflow-y-auto min-h-0 pr-1 select-none pb-12">

          {/* CARD 1.5: LOGO & LAMPIRAN VISUAL KUSTOM */}
          <div className="bg-white dark:bg-[#0c0a12] border border-slate-200 dark:border-white/5 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <span className="p-1 rounded-lg bg-blue-700/10 text-blue-700">📷</span>
              Gambar &amp; Logo Kustom Laporan (Pojok Kiri &amp; Kanan)
            </h3>

            <div className="space-y-4">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1 border-b border-slate-100 dark:border-white/5 pb-5">
              {/* LEFT LOGO COLUMN */}
              <div className="space-y-4">
                <div className="bg-blue-700/10 p-2 rounded-xl border border-blue-700/15">
                  <span className="text-[9.5px] font-black text-blue-800 dark:text-blue-400 uppercase tracking-wider block">👈 POJOK KIRI ATAS (SISTEM - BISA DIGANTI)</span>
                </div>
                
                {/* Default Logo Left */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase">1. Logo Default Kiri (Sistem)</h4>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 p-2 rounded-xl justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={defaultLogo}
                        alt="Logo Kiri Default"
                        className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-150 p-0.5"
                      />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">Logo Kiri Sistem</p>
                        <p className="text-[8px] text-emerald-500 font-bold truncate">
                          {settings?.pdfExportLogoLeft ? "Kustom (Tersimpan)" : "Sistem (Default)"}
                        </p>
                      </div>
                    </div>
                    {settings?.pdfExportLogoLeft && (
                      <button
                        type="button"
                        onClick={handleResetDefaultLogo}
                        className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition animate-pulse"
                        title="Reset ke Logo Sistem"
                      >
                        🔄
                      </button>
                    )}
                  </div>
                  
                  {/* File Upload Button */}
                  <div className="pt-1">
                    <label className="w-full flex items-center justify-center border border-dashed border-slate-300 dark:border-white/20 rounded-xl px-2.5 py-1.5 bg-slate-50 dark:bg-white/[0.03] cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.08] transition text-[10px] text-slate-600 dark:text-slate-300 font-bold gap-1">
                      📁 Upload File Logo Kiri
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleDefaultLogoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Custom Left Logo (Temporary) */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <h4 className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase">2. Logo Kustom Kiri (Sekali Cetak)</h4>
                  {customLogo ? (
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 p-2 rounded-xl justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={customLogo}
                          alt="Logo Kustom Kiri"
                          className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-150 p-0.5"
                        />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">Logo Kiri Temporer</p>
                          <p className="text-[8px] text-amber-500 font-bold">Menggantikan default untuk saat ini</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCustomLogo(undefined)}
                        className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition"
                        title="Hapus Logo Temporer"
                      >
                        🗑️
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Masukkan URL Logo Temporer..."
                        className="flex-1 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1 text-[10px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val) {
                              setCustomLogo(val);
                              showToast('Logo kustom sekali-cetak berhasil diterapkan!', 'success');
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          const val = input.value.trim();
                          if (val) {
                            setCustomLogo(val);
                            showToast('Logo kustom sekali-cetak berhasil diterapkan!', 'success');
                            input.value = '';
                          }
                        }}
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[9px] px-2 py-1 rounded-xl transition"
                      >
                        Terapkan
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT LOGO COLUMN */}
              <div className="space-y-4 md:border-l md:border-slate-100 md:dark:border-white/5 md:pl-6">
                <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/15">
                  <span className="text-[9.5px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider block">👉 POJOK KANAN ATAS (SISTEM - BISA DIGANTI)</span>
                </div>

                {/* Default Logo Right */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase">1. Logo Default Kanan (Sistem)</h4>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 p-2 rounded-xl justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={defaultLogoRight}
                        alt="Logo Kanan Default"
                        className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-150 p-0.5"
                      />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">Logo Kanan Sistem</p>
                        <p className="text-[8px] text-emerald-500 font-bold truncate">
                          {settings?.pdfExportLogoRight ? "Kustom (Tersimpan)" : "Sistem (Default)"}
                        </p>
                      </div>
                    </div>
                    {settings?.pdfExportLogoRight && (
                      <button
                        type="button"
                        onClick={handleResetDefaultLogoRight}
                        className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition animate-pulse"
                        title="Reset ke Logo Sistem"
                      >
                        🔄
                      </button>
                    )}
                  </div>

                  {/* File Upload Button */}
                  <div className="pt-1">
                    <label className="w-full flex items-center justify-center border border-dashed border-slate-300 dark:border-white/20 rounded-xl px-2.5 py-1.5 bg-slate-50 dark:bg-white/[0.03] cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.08] transition text-[10px] text-slate-600 dark:text-slate-300 font-bold gap-1">
                      📁 Upload File Logo Kanan
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleDefaultLogoRightUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Custom Right Logo (Temporary) */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <h4 className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase">2. Logo Kustom Kanan (Sekali Cetak)</h4>
                  {customLogoRight ? (
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 p-2 rounded-xl justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={customLogoRight}
                          alt="Logo Kustom Kanan"
                          className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-150 p-0.5"
                        />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">Logo Kanan Temporer</p>
                          <p className="text-[8px] text-amber-500 font-bold">Menggantikan default untuk saat ini</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCustomLogoRight(undefined)}
                        className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition"
                        title="Hapus Logo Temporer"
                      >
                        🗑️
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Masukkan URL Logo Temporer..."
                        className="flex-1 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1 text-[10px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val) {
                              setCustomLogoRight(val);
                              showToast('Logo kustom kanan sekali-cetak berhasil diterapkan!', 'success');
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          const val = input.value.trim();
                          if (val) {
                            setCustomLogoRight(val);
                            showToast('Logo kustom kanan sekali-cetak berhasil diterapkan!', 'success');
                            input.value = '';
                          }
                        }}
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[9px] px-2 py-1 rounded-xl transition"
                      >
                        Terapkan
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* COVER LOGOS ROW */}
            <div className="border-t border-slate-100 dark:border-white/5 pt-4 space-y-3">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-400">
                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-700/10 px-2 py-0.5 rounded-md">🌟 LOGO KHUSUS HALAMAN DEPAN (HALAMAN 1)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                {/* COVER LEFT LOGO */}
                <div className="space-y-4">
                  <div className="bg-blue-700/10 p-2 rounded-xl border border-blue-700/15">
                    <span className="text-[9.5px] font-black text-blue-800 dark:text-blue-400 uppercase tracking-wider block">👈 LOGO COVER KIRI (HALAMAN 1)</span>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase">Logo Default Cover Kiri</h4>
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 p-2 rounded-xl justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={defaultLogoCoverLeft}
                          alt="Logo Cover Kiri Default"
                          className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-150 p-0.5"
                        />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">Logo Cover Kiri</p>
                          <p className="text-[8px] text-emerald-500 font-bold truncate">
                            {settings?.pdfExportLogoCoverLeft ? "Kustom (Tersimpan)" : "Sistem (Default)"}
                          </p>
                        </div>
                      </div>
                      {settings?.pdfExportLogoCoverLeft && (
                        <button
                          type="button"
                          onClick={handleResetDefaultLogoCoverLeft}
                          className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition animate-pulse"
                          title="Reset ke Logo Sistem"
                        >
                          🔄
                        </button>
                      )}
                    </div>
                    
                    {/* File Upload Button */}
                    <div className="pt-1">
                      <label className="w-full flex items-center justify-center border border-dashed border-slate-300 dark:border-white/20 rounded-xl px-2.5 py-1.5 bg-slate-50 dark:bg-white/[0.03] cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.08] transition text-[10px] text-slate-600 dark:text-slate-300 font-bold gap-1">
                        📁 Upload Logo Cover Kiri
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleDefaultLogoCoverLeftUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* COVER RIGHT LOGO */}
                <div className="space-y-4 md:border-l md:border-slate-100 md:dark:border-white/5 md:pl-6">
                  <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/15">
                    <span className="text-[9.5px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider block">👉 LOGO COVER KANAN (HALAMAN 1)</span>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase">Logo Default Cover Kanan</h4>
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 p-2 rounded-xl justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={defaultLogoCoverRight}
                          alt="Logo Cover Kanan Default"
                          className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-150 p-0.5"
                        />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">Logo Cover Kanan</p>
                          <p className="text-[8px] text-emerald-500 font-bold truncate">
                            {settings?.pdfExportLogoCoverRight ? "Kustom (Tersimpan)" : "Sistem (Default)"}
                          </p>
                        </div>
                      </div>
                      {settings?.pdfExportLogoCoverRight && (
                        <button
                          type="button"
                          onClick={handleResetDefaultLogoCoverRight}
                          className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition animate-pulse"
                          title="Reset ke Logo Sistem"
                        >
                          🔄
                        </button>
                      )}
                    </div>

                    {/* File Upload Button */}
                    <div className="pt-1">
                      <label className="w-full flex items-center justify-center border border-dashed border-slate-300 dark:border-white/20 rounded-xl px-2.5 py-1.5 bg-slate-50 dark:bg-white/[0.03] cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.08] transition text-[10px] text-slate-600 dark:text-slate-300 font-bold gap-1">
                        📁 Upload Logo Cover Kanan
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleDefaultLogoCoverRightUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

              {/* Attachments Section */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">
                  Galeri Gambar Lampiran / Kliping Visual
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    id="attachment-url-input"
                    type="text"
                    placeholder="Masukkan URL gambar pendukung (http://... atau https://...)"
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-700"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) {
                          const newImg = {
                            src: val,
                            size: 'medium' as const,
                            caption: `Kliping Visual #${uploadedImages.length + 1}`,
                            aspectRatio: 1.3333
                          };
                          setUploadedImages((prev) => [...prev, newImg]);
                          showToast(`Gambar lampiran berhasil ditambahkan!`, 'success');
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('attachment-url-input') as HTMLInputElement;
                      const val = input ? input.value.trim() : '';
                      if (val) {
                        const newImg = {
                          src: val,
                          size: 'medium' as const,
                          caption: `Kliping Visual #${uploadedImages.length + 1}`,
                          aspectRatio: 1.3333
                        };
                        setUploadedImages((prev) => [...prev, newImg]);
                        showToast(`Gambar lampiran berhasil ditambahkan!`, 'success');
                        input.value = '';
                      }
                    }}
                    className="bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs px-4 py-1.5 rounded-xl transition shadow-sm"
                  >
                    Tambah
                  </button>
                </div>

                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 bg-slate-50 dark:bg-white/[0.01] p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                    {uploadedImages.map((img, index) => (
                      <div key={index} className="relative group flex flex-col gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 shadow-sm transition hover:shadow-md">
                        <div className="relative aspect-[16/10] rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 flex items-center justify-center">
                          <img
                            src={img.src}
                            alt={img.caption || `Lampiran #${index + 1}`}
                            className="max-w-full max-h-full object-contain p-1"
                          />
                          <button
                            type="button"
                            onClick={() => removeAttachmentImg(index)}
                            className="absolute top-2 right-2 p-1.5 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-lg transition duration-200 shadow text-xs flex items-center gap-1"
                            title="Hapus Lampiran"
                          >
                            <span>🗑️</span>
                          </button>
                        </div>
                        
                        <div className="space-y-2 text-left">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Dimensi di PDF:</span>
                              <span className="text-[8px] bg-violet-1050/30 text-blue-800 dark:text-blue-400 px-1 py-0.2 rounded font-mono font-bold capitalize">{img.size}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                              {(['small', 'medium', 'large', 'full'] as const).map((sz) => (
                                <button
                                  key={sz}
                                  type="button"
                                  onClick={() => updateAttachmentSize(index, sz)}
                                  className={`text-[9.5px] font-black py-1 px-0.5 rounded-md transition duration-150 ${
                                    img.size === sz
                                      ? 'bg-violet-650 text-white shadow-sm ring-1 ring-blue-700 dark:bg-blue-800'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300'
                                  }`}
                                >
                                  {sz === 'small' ? 'Kecil' : sz === 'medium' ? 'Sedang' : sz === 'large' ? 'Besar' : 'Penuh'}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Nama / Caption Lampiran:</span>
                            <input
                              type="text"
                              value={img.caption}
                              onChange={(e) => updateAttachmentCaption(index, e.target.value)}
                              placeholder={`Lampiran #${index + 1}`}
                              className="w-full text-[10.5px] px-2.5 py-1.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 font-semibold focus:ring-1 focus:ring-blue-700 focus:outline-none transition"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CARD 2: DYNAMIC FILTER SELECTORS */}
          <div className="bg-white dark:bg-[#0c0a12] border border-slate-200 dark:border-white/5 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-700" />
              2. Saringan Konten (Filter Data)
            </h3>

            <div className="space-y-3">
              {/* Keyword Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Cari kata kunci dalam rilis berita..."
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl outline-hidden text-slate-800 dark:text-white"
                />
              </div>

              {/* Sentiment pills */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Filter Sentimen</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['All', 'Positif', 'Negatif', 'Netral'] as const).map((sent) => {
                    const isActive = selectedSentiment === sent;
                    return (
                      <button
                        key={sent}
                        onClick={() => setSelectedSentiment(sent)}
                        className={`py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 cursor-pointer border ${
                          isActive 
                            ? 'bg-gradient-to-tr from-blue-800 to-indigo-600 text-white border-transparent' 
                            : 'bg-slate-50 dark:bg-[#121019] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                      >
                        {sent === 'All' ? 'Semua' : sent}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category dropdown */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Kategori Isu</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-[#121019] border border-slate-200 dark:border-white/5 rounded-xl text-slate-700 dark:text-slate-200 font-medium outline-hidden focus:ring-1 focus:ring-blue-700"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>{cat === 'All' ? 'Semua Kategori' : cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">Wilayah / Provinsi</label>
                  <select
                    value={selectedProvince}
                    onChange={(e) => setSelectedProvince(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-[#121019] border border-slate-200 dark:border-white/5 rounded-xl text-slate-700 dark:text-slate-200 font-medium outline-hidden focus:ring-1 focus:ring-blue-700"
                  >
                    {provincesList.map((prov) => (
                      <option key={prov} value={prov}>{prov === 'All' ? 'Semua Wilayah' : prov}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date range filters */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        (e.currentTarget as any).showPicker();
                      } catch (err) {}
                    }}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl font-medium text-slate-800 dark:text-white focus:ring-1 focus:ring-blue-700 outline-hidden cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    Tanggal Akhir
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        (e.currentTarget as any).showPicker();
                      } catch (err) {}
                    }}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl font-medium text-slate-800 dark:text-white focus:ring-1 focus:ring-blue-700 outline-hidden cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

      </div>

      {/* Off-screen Map Container to facilitate Leaflet loading and HTML2Canvas high-fidelity PDF Snapshot exporting */}
      <div 
        id="studio-offscreen-map-container"
        style={{ 
          position: 'fixed', 
          left: '-3000px', 
          top: '0px', 
          width: '1024px', 
          height: '493px',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          zIndex: -9999,
          pointerEvents: 'none'
        }}
      >
        <div style={{ width: '1024px', height: '493px' }}>
          <OSMMap 
            selectedProvince={selectedProvinceMap}
            setSelectedProvince={setSelectedProvinceMap}
            provinceStats={provinceStatsForMap}
            filteredNews={filteredNews}
            isDetailOpen={false}
            isOffscreen={true}
          />
        </div>
      </div>

    </div>
  );
};
