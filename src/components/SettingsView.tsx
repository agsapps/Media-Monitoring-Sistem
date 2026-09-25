import React, { useState, useEffect } from 'react';
import { useAppState } from '../AppContext';
import { 
  Settings, Save, ShieldCheck, Sparkles, Search, 
  Play, RefreshCw, Clock, Terminal, Check, Plus, Trash2,
  Database, Activity, MessageSquare, Send, ExternalLink, Smartphone,
  Bell, Calendar
} from 'lucide-react';
import { ActivityLog } from '../types';

export const SettingsView: React.FC = () => {
  const { 
    user, 
    settings, 
    saveSettings, 
    showToast,
    categories,
    keywords,
    saveKeyword,
    removeKeyword,
    authFetch
  } = useAppState();

  // CRAWLER & SCHEDULER STATES
  const [schedulerIntervalMinutes, setSchedulerIntervalMinutes] = useState<number>(settings.schedulerIntervalMinutes || 30);
  const [autoCrawlKeywords, setAutoCrawlKeywords] = useState<string>(
    (settings as any).autoCrawlKeywords || 'BBM Subsidi, Penimbunan Solar, Oplos LPG, Penyelundup BBM, Kebocoran Depot Pertamina'
  );
  const [autoCrawlMethod, setAutoCrawlMethod] = useState<string>(settings.autoCrawlMethod || 'auto');
  const [schedulerMaxItemsPerKeyword, setSchedulerMaxItemsPerKeyword] = useState<number>(settings.schedulerMaxItemsPerKeyword || 2);
  const [autoCrawlTargetCategory, setAutoCrawlTargetCategory] = useState<string>(settings.autoCrawlTargetCategory || '');
  const [autoCrawlDefaultStatus, setAutoCrawlDefaultStatus] = useState<'Draft' | 'Published'>((settings as any).autoCrawlDefaultStatus || 'Draft');
  const [serpApiKey, setSerpApiKey] = useState<string>(settings.serpApiKey || '');
  const [openSerpUrl, setOpenSerpUrl] = useState<string>(settings.openSerpUrl || 'https://openserp.org/api/v1');
  const [openSerpApiKey, setOpenSerpApiKey] = useState<string>(settings.openSerpApiKey || '');
  const [twitterApiIoKey, setTwitterApiIoKey] = useState<string>((settings as any).twitterApiIoKey || '');
  const [newsApiKey, setNewsApiKey] = useState<string>((settings as any).newsApiKey || '');
  const [fonnteTarget, setFonnteTarget] = useState<string>((settings as any).fonnteTarget || '6281902052373');
  const [fonnteTargets, setFonnteTargets] = useState<string[]>((settings as any).fonnteTargets || ['6281902052373']);
  const [newPhoneInput, setNewPhoneInput] = useState<string>('');
  const [fonnteCategories, setFonnteCategories] = useState<string[]>((settings as any).fonnteCategories || ['Negatif']);
  const [openWaVpsUrl, setOpenWaVpsUrl] = useState<string>((settings as any).openWaVpsUrl || 'http://101.32.141.172:3006');
  const [openWaToken, setOpenWaToken] = useState<string>((settings as any).openWaToken || '');
  const [whatsappScheduleMode, setWhatsappScheduleMode] = useState<'realtime' | 'scheduled' | 'both'>((settings as any).whatsappScheduleMode || 'realtime');
  const [whatsappStartTime, setWhatsappStartTime] = useState<string>((settings as any).whatsappStartTime || '07:00');
  const [whatsappEndTime, setWhatsappEndTime] = useState<string>((settings as any).whatsappEndTime || '22:00');
  const [whatsappDigestIntervalHours, setWhatsappDigestIntervalHours] = useState<number>((settings as any).whatsappDigestIntervalHours || 3);
  const [whatsappQuietHoursEnabled, setWhatsappQuietHoursEnabled] = useState<boolean>((settings as any).whatsappQuietHoursEnabled !== undefined ? (settings as any).whatsappQuietHoursEnabled : true);
  const [testingWa, setTestingWa] = useState(false);
  const [waStatusMessage, setWaStatusMessage] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [triggeringCrawl, setTriggeringCrawl] = useState(false);
  const [schedulerLogs, setSchedulerLogs] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const handleAddPhone = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPhoneInput.trim()) return;
    let clean = newPhoneInput.trim().replace(/[^0-9]/g, '');
    if (clean.startsWith('08')) {
      clean = '62' + clean.slice(1);
    }
    if (clean.length < 9) {
      showToast('Format nomor tidak valid (minimal 9 digit angka)', 'error');
      return;
    }
    if (fonnteTargets.includes(clean)) {
      showToast('Nomor tersebut sudah ada di daftar penerima', 'info');
      return;
    }
    const updated = [...fonnteTargets, clean];
    setFonnteTargets(updated);
    setFonnteTarget(updated[0]);
    setNewPhoneInput('');
    showToast(`Nomor ${clean} berhasil ditambahkan!`, 'success');
  };

  const handleRemovePhone = (phoneToRemove: string) => {
    const updated = fonnteTargets.filter(num => num !== phoneToRemove);
    setFonnteTargets(updated);
    setFonnteTarget(updated[0] || '');
    showToast(`Nomor ${phoneToRemove} dihapus dari daftar penerima`, 'info');
  };

  const handleTestWhatsApp = async () => {
    setTestingWa(true);
    setWaStatusMessage(null);
    try {
      const targetsToSend = fonnteTargets.length > 0 ? fonnteTargets : [fonnteTarget || '6281902052373'];
      const res = await authFetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targets: targetsToSend,
          message: `🔔 *UJI NOTIFIKASI MEDIA MONITORING*\n\nWhatsApp Gateway berhasil terhubung dan siap mendistribusikan notifikasi berita!\n\nJadwal Aktif: ${whatsappQuietHoursEnabled ? `${whatsappStartTime} - ${whatsappEndTime} WIB` : '24 Jam Non-stop'}\nMode: ${whatsappScheduleMode === 'both' ? 'Real-time Krisis & Ringkasan Berkala' : (whatsappScheduleMode === 'realtime' ? 'Real-time Krisis' : 'Ringkasan Berkala')}\nWaktu: ${new Date().toLocaleString('id-ID')}`
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Pesan WhatsApp berhasil dikirim ke seluruh nomor!', 'success');
        setWaStatusMessage(`✅ ${data.message || 'Berhasil terkirim'} (${data.sent || targetsToSend.length} nomor)`);
      } else {
        showToast(data.message || 'Gagal mengirim pesan WhatsApp. Pastikan sudah scan QR di VPS.', 'error');
        setWaStatusMessage('❌ ' + (data.message || 'Gagal mengirim'));
      }
    } catch (err: any) {
      showToast('Gagal menghubungi WhatsApp Gateway: ' + err.message, 'error');
      setWaStatusMessage('❌ Koneksi terputus: ' + err.message);
    } finally {
      setTestingWa(false);
    }
  };

  const handleCheckWaStatus = async () => {
    try {
      setWaStatusMessage('Mengecek koneksi VPS WhatsApp Gateway...');
      const res = await authFetch('/api/whatsapp/status');
      const data = await res.json();
      if (data.online) {
        setWaStatusMessage(`✅ Online! Terhubung: ${data.details?.user || 'Aktif'} (Port 3006)`);
        showToast('WhatsApp Gateway aktif di port 3006!', 'success');
      } else {
        setWaStatusMessage('⚠️ Gateway belum online atau belum di-scan QR.');
        showToast('Gateway belum aktif. Silakan buka http://101.32.141.172:3006 untuk scan QR.', 'info');
      }
    } catch (err: any) {
      setWaStatusMessage('❌ Tidak dapat menghubungi gateway: ' + err.message);
    }
  };

  // --- POSTGRES CUSTOM CONNECTION TEST & LOG STATES ---
  const [dbTestStatus, setDbTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [dbTestMessage, setDbTestMessage] = useState<string>('');
  const [dbConnectionLogs, setDbConnectionLogs] = useState<any[]>([]);
  const [loadingDbLogs, setLoadingDbLogs] = useState<boolean>(false);

  const fetchDbConnectionLogs = async () => {
    if (user?.role !== 'Admin') return;
    setLoadingDbLogs(true);
    try {
      const res = await authFetch('/api/admin/postgres-connection-logs');
      if (res && res.ok) {
        const data = await res.json();
        if (data?.success) {
          setDbConnectionLogs(data.logs || []);
        }
      }
    } catch (err) {
      console.warn('DB connection logs currently unavailable:', err);
    } finally {
      setLoadingDbLogs(false);
    }
  };

  const handleTestPostgresConnection = async () => {
    if (dbTestStatus === 'testing') return;
    setDbTestStatus('testing');
    setDbTestMessage('Menghubungkan ke database PostgreSQL kustom Anda...');
    showToast('Memulai pengujian koneksi database...', 'info');
    try {
      const res = await authFetch('/api/admin/postgres-test', {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDbTestStatus('success');
        setDbTestMessage(data.message || 'Koneksi Berhasil!');
        showToast(data.message || 'Koneksi database kustom berhasil!', 'success');
      } else {
        setDbTestStatus('failed');
        setDbTestMessage(data.message || data.error || 'Koneksi Gagal!');
        showToast(data.message || 'Koneksi database kustom gagal!', 'error');
      }
    } catch (err: any) {
      setDbTestStatus('failed');
      setDbTestMessage(`Koneksi Gagal: ${err.message || err}`);
      showToast('Koneksi terputus saat menguji database.', 'error');
    } finally {
      fetchDbConnectionLogs();
    }
  };

  useEffect(() => {
    if (user?.role !== 'Admin') return;
    fetchDbConnectionLogs();
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchDbConnectionLogs();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [user?.role]);

  // --- KEYWORD MANAGEMENT STATES ---
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeywordInput.trim()) return;
    setIsAddingKeyword(true);
    try {
      const ok = await saveKeyword(newKeywordInput.trim());
      if (ok) {
        setNewKeywordInput('');
      }
    } catch (err) {
      showToast('Gagal menambahkan kata kunci', 'error');
    } finally {
      setIsAddingKeyword(false);
    }
  };

  const handleToggleKeyword = async (kw: any) => {
    try {
      await saveKeyword(kw.text, !kw.active, kw.id);
    } catch (err) {
      showToast('Gagal merubah status kata kunci', 'error');
    }
  };

  const handleDeleteKeyword = async (id: string) => {
    try {
      await removeKeyword(id);
    } catch (err) {
      showToast('Gagal menghapus kata kunci', 'error');
    }
  };

  // Load scheduler logs
  const fetchSchedulerLogs = async () => {
    if (user?.role !== 'Admin') return;
    setLoadingLogs(true);
    try {
      const res = await authFetch('/api/logs');
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Filter logs to only show scheduler or crawling events
          const filtered = data.filter((log: ActivityLog) => {
            if (!log) return false;
            const u = log.username || '';
            const a = (log.action || '').toLowerCase();
            const t = (log.target || '').toLowerCase();
            return (
              u === 'system-scheduler' ||
              a.includes('scheduler') ||
              a.includes('crawl') ||
              t.includes('scheduler') ||
              t.includes('crawl')
            );
          });
          setSchedulerLogs(filtered.slice(0, 15));
        }
      }
    } catch (err) {
      console.warn('Scheduler logs currently unavailable:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (settings) {
      setSchedulerIntervalMinutes(settings.schedulerIntervalMinutes || 30);
      setAutoCrawlKeywords((settings as any).autoCrawlKeywords || 'BBM Subsidi, Penimbunan Solar, Oplos LPG, Penyelundup BBM, Kebocoran Depot Pertamina');
      setAutoCrawlMethod(settings.autoCrawlMethod || 'auto');
      setSchedulerMaxItemsPerKeyword(settings.schedulerMaxItemsPerKeyword || 2);
      setAutoCrawlTargetCategory(settings.autoCrawlTargetCategory || '');
      setAutoCrawlDefaultStatus((settings as any).autoCrawlDefaultStatus || 'Draft');
      setSerpApiKey(settings.serpApiKey || '');
      setOpenSerpUrl(settings.openSerpUrl || 'https://openserp.org/api/v1');
      setOpenSerpApiKey(settings.openSerpApiKey || '');
      setTwitterApiIoKey((settings as any).twitterApiIoKey || '');
      setNewsApiKey((settings as any).newsApiKey || '');
      setFonnteTarget((settings as any).fonnteTarget || '6281902052373');
      setFonnteTargets((settings as any).fonnteTargets || ['6281902052373']);
      setFonnteCategories((settings as any).fonnteCategories || ['Negatif']);
      setOpenWaVpsUrl((settings as any).openWaVpsUrl || 'http://101.32.141.172:3006');
      setOpenWaToken((settings as any).openWaToken || '');
      setWhatsappScheduleMode((settings as any).whatsappScheduleMode || 'realtime');
      setWhatsappStartTime((settings as any).whatsappStartTime || '07:00');
      setWhatsappEndTime((settings as any).whatsappEndTime || '22:00');
      setWhatsappDigestIntervalHours((settings as any).whatsappDigestIntervalHours || 3);
      setWhatsappQuietHoursEnabled((settings as any).whatsappQuietHoursEnabled !== undefined ? (settings as any).whatsappQuietHoursEnabled : true);
    }
  }, [settings]);

  useEffect(() => {
    if (user?.role !== 'Admin') return;
    fetchSchedulerLogs();
    // Auto-refresh logs every 15 seconds
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchSchedulerLogs();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [user?.role]);

  // Handle configuration save submit
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    const success = await saveSettings({
      schedulerIntervalMinutes,
      autoCrawlKeywords,
      autoCrawlMethod,
      schedulerMaxItemsPerKeyword,
      autoCrawlTargetCategory,
      autoCrawlDefaultStatus,
      serpApiKey,
      openSerpUrl,
      openSerpApiKey,
      twitterApiIoKey,
      newsApiKey,
      fonnteToken: '',
      fonnteTarget: fonnteTargets[0] || fonnteTarget,
      fonnteTargets,
      fonnteCategories,
      whatsappProvider: 'openwa',
      openWaVpsUrl: openWaVpsUrl || 'http://101.32.141.172:3006',
      openWaToken,
      whatsappScheduleMode,
      whatsappStartTime,
      whatsappEndTime,
      whatsappDigestIntervalHours,
      whatsappQuietHoursEnabled
    });
    setSavingSettings(false);
    if (success) {
      fetchSchedulerLogs();
    }
  };

  // Trigger scheduler crawler task manual override
  const handleManualTrigger = async () => {
    if (triggeringCrawl) return;
    setTriggeringCrawl(true);
    showToast('Mengirim sinyal pemicu manual ke latar belakang system...', 'info');
    try {
      const res = await authFetch('/api/scheduler/trigger', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || 'Auto-crawl manual berhasil diluncurkan!', 'success');
        // Wait 1.5 seconds and reload logs
        setTimeout(fetchSchedulerLogs, 1500);
      } else {
        showToast('Gagal memicu crawler secara manual.', 'error');
      }
    } catch (err) {
      showToast('Koneksi terputus saat memicu crawler.', 'error');
    } finally {
      setTriggeringCrawl(false);
    }
  };

  const getRecommendedInfo = (method: string) => {
    switch (method) {
      case 'rss':
        return {
          interval: 15,
          reason: 'Aturan Aktif: Ambil Berita Terbaru Berdasarkan Waktu. Crawler hanya boleh mengambil artikel yang merupakan publikasi paling baru berdasarkan tanggal dan jam, bukan berdasarkan ranking Google, relevansi, popularitas, atau authority domain. Aturan pencarian: Gunakan keyword di auto-crawler sebagai query pencarian, filter hasil hanya dari Google News atau Google Search News, ambil metadata URL, dan urutkan hasil berdasarkan waktu terbaru.',
          badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-405 border-emerald-500/20',
          label: 'Ekonomis & Instan'
        };
      case 'twitterapi':
        return {
          interval: 30,
          reason: 'Memonitor media sosial X (Twitter) menggunakan TwitterAPI.io. Direkomendasikan interval 30 menit untuk melacak percakapan publik secara berkala.',
          badgeColor: 'bg-sky-500/10 text-sky-700 dark:text-sky-450 border-sky-500/20',
          label: 'Real-time X/Twitter'
        };
      case 'beautifulsoup':
        return {
          interval: 45,
          reason: 'Mengambil konten HTML secara penuh. Interval 45 menit disarankan untuk menghindari deteksi bot dan batasan rate limit pencarian.',
          badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-405 border-amber-500/20',
          label: 'Keamanan Menengah'
        };
      case 'serpapi':
        return {
          interval: 120,
          reason: 'Mengonsumsi kredit SerpApi bulanan Anda. Disarankan interval 2 jam (120 menit) untuk mengamankan kuota pencarian berbayar.',
          badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
          label: 'Hemat Kuota'
        };
      case 'openserp':
        return {
          interval: 30,
          reason: 'Bekerja mandiri dengan server OpenSerp host Anda. Interval 30 menit bekerja optimal untuk kebaruan kabar berkelanjutan.',
          badgeColor: 'bg-teal-500/10 text-teal-705 dark:text-teal-400 border-teal-500/20',
          label: 'Responsif Ringan'
        };
      case 'gemini':
        return {
          interval: 180,
          reason: 'Pencarian real-time dengan Gemini Grounding. Aturan Aktif: Ambil Berita Terbaru Berdasarkan Waktu (mengurutkan & deduplikasi ketat berdasarkan publish_datetime paling baru dibanding ranking Google).',
          badgeColor: 'bg-indigo-500/10 text-indigo-705 dark:text-indigo-400 border-indigo-500/20',
          label: 'Model Optimum'
        };
      case 'newsapi':
        return {
          interval: 60,
          reason: 'Mengambil berita resmi langsung dari NewsAPI.org. Direkomendasikan interval 60 menit untuk menjaga batas kuota API Key gratis Anda.',
          badgeColor: 'bg-teal-500/10 text-teal-705 dark:text-teal-400 border-teal-500/20',
          label: 'NewsAPI Official'
        };
      case 'simulation':
        return {
          interval: 15,
          reason: 'Demo simulasi data lokal berjalan bebas hambatan tanpa kueri luar. Silakan jalankan sesering mungkin (15 menit) untuk pengujian.',
          badgeColor: 'bg-blue-700/10 text-purple-705 dark:text-blue-400 border-blue-700/20',
          label: 'Tanpa Batasan'
        };
      case 'auto':
      default:
        return {
          interval: 30,
          reason: 'Menggunakan perutean bertingkat (Cascades) untuk kelancaran mutlak. Interval standar 30 menit disarankan sebagai default penyeimbang.',
          badgeColor: 'bg-slate-500/10 text-slate-705 dark:text-slate-400 border-slate-500/20',
          label: 'Keseimbangan Utama'
        };
    }
  };

  const rec = getRecommendedInfo(autoCrawlMethod);

  // Render restricted access screen if user is not admin
  if (user?.role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#121118] border border-slate-100 dark:border-white/5 rounded-3xl shadow-sm text-center space-y-4 max-w-lg mx-auto mt-8">
        <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/20 rounded-full flex items-center justify-center text-rose-500">
          <Settings className="w-7 h-7" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display uppercase tracking-wider">Akses Terbatas</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Maaf, halaman konfigurasi Crawler AI Sistem hanya dapat diakses oleh administrator dengan role **ADMIN**.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Upper Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/55 dark:border-white/5 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-display text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Manajemen & Monitoring Crawler AI</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kelola frekuensi interval Crawler, kata kunci penelusuran otomatis, dan pantau log aktivitas secara berkala.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-100 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 px-3.5 py-1.5 text-xs font-bold rounded-xl shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Crawler: Aktif
          </span>
        </div>
      </div>

      {/* Grid Control layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Configuration settings form (left side) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-5 bg-white dark:bg-[#121118] border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm space-y-5">
            <form onSubmit={handleSaveConfig} className="space-y-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 font-display uppercase tracking-wider">
              <Settings className="w-4 h-4 text-indigo-500" />
              Parameter Konfigurasi Background Scheduler
            </h3>

            {/* Scheduler Frequency Duration Option */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-white/5 space-y-3">
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                Frekuensi & Durasi Interval Scheduler ({schedulerIntervalMinutes < 60 ? `${schedulerIntervalMinutes} Menit` : `${schedulerIntervalMinutes / 60} Jam`})
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[15, 30, 45, 60, 120, 180, 360, 720].map((mins) => {
                  const isSelected = schedulerIntervalMinutes === mins;
                  const isRecommended = rec.interval === mins;
                  const formatLabel = mins < 60 ? `${mins} Menit` : `${mins / 60} Jam`;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setSchedulerIntervalMinutes(mins)}
                      className={`relative py-3 px-2 text-[10.5px] font-bold rounded-xl border transition duration-150 cursor-pointer text-center ${
                        isSelected
                          ? 'bg-indigo-600 border-transparent text-white shadow-sm'
                          : isRecommended
                            ? 'bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/35 hover:bg-emerald-500/20'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <span>{formatLabel}</span>
                        {isRecommended && (
                          <span className={`text-[8px] font-extrabold uppercase tracking-wide mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            ★ Cocok
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Tentukan seberapa sering Crawler berjalan di latar belakang untuk melakukan pencarian berita di Google News dan merilisnya secara otomatis. Tombol bersimbol <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">★ Cocok</strong> menandakan interval penundaan paling aman guna melindungi performa/kuota crawler terpilih Anda.
              </p>
            </div>

            {/* Default Crawler Engine/Method Option */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-white/5 space-y-2">
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Metode Crawler Media Utama (Latar Belakang)
              </label>
              <select
                value={autoCrawlMethod}
                onChange={e => setAutoCrawlMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="auto">Auto Pipeline (Rekomendasi Cascades)</option>
                <option value="rss">Google News RSS (Bebas Kuota & Cepat)</option>
                <option value="twitterapi">X / Twitter (TwitterAPI.io)</option>
                <option value="beautifulsoup">BeautifulSoup HTML (Scraper Tangguh)</option>
                <option value="serpapi">SerpApi Search Engine</option>
                <option value="openserp">OpenSerp Search Engine (Bebas Hosting)</option>
                <option value="gemini">Gemini Grounding (AI Real-time Search)</option>
                <option value="newsapi">NewsAPI.org (Crawling Berita Resmi)</option>
                <option value="simulation">Peluncur Simulasi Lokal</option>
              </select>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Menentukan mesin pencari mana yang digunakan oleh background scheduler untuk melacak isu strategis terhangat secara berkala.
              </p>

              {/* Dynamic recommendation connection block */}
              <div className="mt-3.5 p-3.5 rounded-xl border border-dashed bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/5 space-y-2.5 transition duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-extrabold tracking-wider uppercase text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    💡 Hubungan Metode & Frekuensi Optimum
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${rec.badgeColor}`}>
                    {rec.label}
                  </span>
                </div>
                
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                  {rec.reason}
                </p>

                {autoCrawlMethod === 'rss' && (
                  <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100/70 dark:border-indigo-900/40 rounded-xl space-y-2 mt-2">
                    <div className="flex items-center gap-1.5 text-indigo-800 dark:text-indigo-400 font-bold text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>RULE: Ambil Berita Terbaru Berdasarkan Waktu (PubDate)</span>
                    </div>
                    <div className="text-[10.5px] text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed font-light">
                      <div>
                        <strong className="text-slate-800 dark:text-slate-200">Tujuan:</strong> Crawler hanya boleh mengambil artikel yang merupakan publikasi paling baru berdasarkan tanggal dan jam (pubDate), bukan berdasarkan ranking Google, relevansi, popularitas, atau authority domain.
                      </div>
                      <div className="space-y-1 pl-3 border-l-2 border-indigo-200 dark:border-indigo-800">
                        <div className="font-bold text-[9px] text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Aturan Operasional:</div>
                        <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                          <li>Gunakan keyword di auto-crawler sebagai query pencarian.</li>
                          <li>Filter hasil hanya dari Google News atau Google Search News.</li>
                          <li>Ambil metadata: URL.</li>
                          <li>Urutkan berdasarkan: <strong>Waktu terbaru (PubDate)</strong>.</li>
                          <li>Bukan berdasarkan ranking Google, relevansi, popularitas, atau authority domain.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {autoCrawlMethod === 'gemini' && (
                  <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100/70 dark:border-blue-950/40 rounded-xl space-y-2 mt-2">
                    <div className="flex items-center gap-1.5 text-blue-950 dark:text-blue-400 font-bold text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                      <span>RULE: Gemini Search Grounding - Indeksasi Terbaru</span>
                    </div>
                    <div className="text-[10.5px] text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed font-light">
                      <div>
                        <strong className="text-slate-800 dark:text-slate-200">Tujuan:</strong> Google Grounding menggunakan indeksasi terbaru, bukan terbaik. Crawler hanya mengumpulkan artikel berita nyata terhangat berdasarkan tanggal dan jam rilis aktual.
                      </div>
                      <div className="space-y-1 pl-3 border-l-2 border-blue-200 dark:border-blue-950">
                        <div className="font-bold text-[9px] text-blue-800 dark:text-blue-400 uppercase tracking-wider">Aturan Google Grounding:</div>
                        <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                          <li>Gunakan kata kunci di auto-crawler sebagai query pencarian.</li>
                          <li>Filter hasil ketat hanya dari Google News atau Google Search News.</li>
                          <li>Ambil metadata URL portal pers asli (bukan tautan perantara news.google.com).</li>
                          <li>Gunakan <strong>indeksasi waktu terbaru</strong>, bukan peringkat relevansi default, popularitas, atau authority domain.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-105 dark:border-white/5 mt-1">
                  <span className="text-[10.5px] text-slate-600 dark:text-slate-400">
                    Interval Cocok: <strong className="text-slate-900 dark:text-white font-bold">{rec.interval < 60 ? `${rec.interval} Menit` : `${rec.interval / 60} Jam`}</strong>
                  </span>
                  
                  {schedulerIntervalMinutes !== rec.interval ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSchedulerIntervalMinutes(rec.interval);
                        showToast(`Interval berhasil disinkronkan ke rekomendasi metode: ${rec.interval < 60 ? `${rec.interval} Menit` : `${rec.interval / 60} Jam`}`, 'success');
                      }}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/45 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-[9.5px] border border-indigo-120 dark:border-indigo-900/40 rounded-lg transition duration-150 cursor-pointer active:scale-95 flex items-center justify-center gap-1"
                    >
                      <span>⚡ Sinkronkan Interval & Metode</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 font-mono">
                      <Check className="w-3.5 h-3.5" /> Sudah Sinkron
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Auto Crawl Keywords Option */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-white/5 space-y-2">
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-indigo-500" />
                Kata Kunci Auto-Crawl (Dipisahkan Koma)
              </label>
              <textarea
                value={autoCrawlKeywords}
                onChange={e => setAutoCrawlKeywords(e.target.value)}
                placeholder="Contoh: BBM, Solar, Elpiji"
                rows={3}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex flex-wrap gap-1 md:gap-1.5 mt-2">
                {autoCrawlKeywords.split(',').map((kw, i) => {
                  const trimmed = kw.trim();
                  if (!trimmed) return null;
                  return (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[9.5px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                      {trimmed}
                    </span>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Gunakan tanda koma (,) untuk menambahkan kata kunci baru secara massal. Latar belakang sistem akan mengecek Google News dengan kueri ini.
              </p>
            </div>

            {/* Scheduler Max Items and Target Category Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-white/5 space-y-2">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                  Maks Berita per Kata Kunci
                </label>
                <select
                  value={schedulerMaxItemsPerKeyword}
                  onChange={e => setSchedulerMaxItemsPerKeyword(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={1}>1 Berita per Siklus</option>
                  <option value={2}>2 Berita per Siklus (Default)</option>
                  <option value={3}>3 Berita per Siklus</option>
                  <option value={5}>5 Berita per Siklus (Intensif)</option>
                </select>
                <p className="text-[9.5px] text-slate-400 dark:text-slate-500">
                  Membatasi asupan data baru per topik guna menghindari banjir notifikasi/data duplikat berlebih.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-white/5 space-y-2">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                  Target Kluster Isu Otomatis
                </label>
                <select
                  value={autoCrawlTargetCategory}
                  onChange={e => setAutoCrawlTargetCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Rekomendasi Otomatis (Analisis AI)</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <p className="text-[9.5px] text-slate-400 dark:text-slate-500">
                  Pilih kluster sasaran utama, atau biarkan AI mendeteksi dan mengkategorikan secara dinamis.
                </p>
              </div>
            </div>

            {/* API KEYS CONFIGURATION */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-white/5 space-y-4">
              <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-200/50 dark:border-white/5 pb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                🛡️ Kredensial & Kunci API Sistem Crawling
              </h4>
              
              <div className="space-y-4">
                {/* SerpApi Key */}
                <div className="space-y-1">
                  <label className="block text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    SerpApi API Key
                  </label>
                  <input
                    type="password"
                    value={serpApiKey}
                    onChange={e => setSerpApiKey(e.target.value)}
                    placeholder="Masukkan kunci API SerpApi (Bawaan sistem aktif jika dikosongkan)"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-light">
                    Digunakan jika ingin menggunakan kuota atau akun SerpApi terdedikasi milik sendiri.
                  </p>
                </div>

                {/* OpenSerp Base URL & Key Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      OpenSerp Base URL
                    </label>
                    <input
                      type="text"
                      value={openSerpUrl}
                      onChange={e => setOpenSerpUrl(e.target.value)}
                      placeholder="https://openserp.org/api/v1"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-light">
                      Endpoint utama untuk perutean engine OpenSerp Anda.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      OpenSerp API Key (Opsional)
                    </label>
                    <input
                      type="password"
                      value={openSerpApiKey}
                      onChange={e => setOpenSerpApiKey(e.target.value)}
                      placeholder="Authorization Key khusus"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-light">
                      Otorisasi opsional jika server hosting OpenSerp Anda diamankan Bearer/X-API-Key.
                    </p>
                  </div>
                </div>

                {/* Twitterapi.io Key */}
                <div className="space-y-1">
                  <label className="block text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    TwitterAPI.io API Key (Kunci X / Twitter Crawling)
                  </label>
                  <input
                    type="password"
                    value={twitterApiIoKey}
                    onChange={e => setTwitterApiIoKey(e.target.value)}
                    placeholder="Masukkan kunci API Twitterapi.io"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-light">
                    Digunakan jika ingin memonitor/crawling pos media sosial X/Twitter menggunakan Twitterapi.io tanpa login mandiri.
                  </p>
                </div>

                {/* NewsAPI Key */}
                <div className="space-y-1">
                  <label className="block text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    NewsAPI.org API Key (Kunci Crawling Berita Utama)
                  </label>
                  <input
                    type="password"
                    value={newsApiKey}
                    onChange={e => setNewsApiKey(e.target.value)}
                    placeholder="Masukkan API Key dari newsapi.org"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-light">
                    Digunakan untuk memonitor ribuan situs berita online global dan nasional secara real-time via NewsAPI.org.
                  </p>
                </div>

                {/* WHATSAPP GATEWAY (VPS 24 JAM) CONFIGURATION CARD */}
                <div className="col-span-1 md:col-span-2 p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 via-slate-50 to-slate-100 dark:from-emerald-950/20 dark:via-slate-900/60 dark:to-slate-900 border border-emerald-500/20 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/10 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-500">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          Bot WhatsApp Gateway (Notifikasi Krisis 24 Jam)
                          <span className="px-1.5 py-0.5 text-[9px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-md font-semibold">VPS Dedicated</span>
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Kirim notifikasi otomatis ke nomor WhatsApp saat sistem AI mendeteksi isu krisis / berita negatif.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCheckWaStatus}
                        className="px-2.5 py-1 text-[10px] bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg flex items-center gap-1 font-medium transition cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Cek Status Gateway
                      </button>
                      <a
                        href={openWaVpsUrl || 'http://101.32.141.172:3006'}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 font-semibold transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Buka Scan QR (Web)
                      </a>
                    </div>
                  </div>

                  {waStatusMessage && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                      {waStatusMessage}
                    </div>
                  )}

                  {/* 1. MANAJEMEN NOMOR TELEPON PENERIMA */}
                  <div className="p-3.5 bg-white/70 dark:bg-slate-900/80 rounded-xl border border-emerald-500/15 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                        1. Daftar Nomor WhatsApp Penerima Alert ({fonnteTargets.length} Nomor Terdaftar)
                      </label>
                      <span className="text-[9.5px] text-slate-400 font-light">
                        Notifikasi krisis akan didistribusikan ke seluruh nomor di bawah ini
                      </span>
                    </div>

                    {/* Input Tambah Nomor */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPhoneInput}
                        onChange={e => setNewPhoneInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddPhone();
                          }
                        }}
                        placeholder="Ketik nomor HP baru... (contoh: 081902052373 atau 6281234567890)"
                        className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddPhone}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Nomor</span>
                      </button>
                    </div>

                    {/* Chip / Tag List Nomor Telepon */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {fonnteTargets.length > 0 ? (
                        fonnteTargets.map(phone => (
                          <div
                            key={phone}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-emerald-700 dark:text-emerald-300 font-mono text-xs transition"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>{phone}</span>
                            <button
                              type="button"
                              onClick={() => handleRemovePhone(phone)}
                              className="ml-1 p-0.5 text-slate-400 hover:text-red-500 rounded transition cursor-pointer"
                              title="Hapus nomor ini"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-[10px] text-amber-500 flex items-center gap-1 py-1">
                          <Clock className="w-3 h-3" />
                          <span>Belum ada nomor WhatsApp. Silakan ketik nomor di atas lalu klik Tambah.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. JADWAL & RENTANG WAKTU PENGIRIMAN WHATSAPP */}
                  <div className="p-3.5 bg-white/70 dark:bg-slate-900/80 rounded-xl border border-emerald-500/15 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-white/5 pb-2">
                      <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-500" />
                        2. Jadwal & Rentang Waktu Pengiriman Berita (Delivery Window)
                      </label>
                      <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {whatsappQuietHoursEnabled ? `Aktif (${whatsappStartTime} - ${whatsappEndTime} WIB)` : '24 Jam Non-stop Aktif'}
                      </span>
                    </div>

                    {/* Mode Pengiriman Berita */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Mode Pengiriman WhatsApp:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setWhatsappScheduleMode('realtime')}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            whatsappScheduleMode === 'realtime'
                              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-bold flex items-center gap-1">
                              <Bell className="w-3 h-3" />
                              Real-time Instan
                            </span>
                            {whatsappScheduleMode === 'realtime' && <Check className="w-3 h-3 text-emerald-500" />}
                          </div>
                          <p className="text-[9.5px] opacity-80 leading-snug">
                            Kirim langsung detik itu juga saat crawler AI menemukan berita krisis / negatif.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setWhatsappScheduleMode('scheduled')}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            whatsappScheduleMode === 'scheduled'
                              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-bold flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Ringkasan Berkala
                            </span>
                            {whatsappScheduleMode === 'scheduled' && <Check className="w-3 h-3 text-emerald-500" />}
                          </div>
                          <p className="text-[9.5px] opacity-80 leading-snug">
                            Kirim rangkuman berita per interval jam tertentu ke nomor penerima.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setWhatsappScheduleMode('both')}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            whatsappScheduleMode === 'both'
                              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-bold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Kombinasi (Rekomendasi)
                            </span>
                            {whatsappScheduleMode === 'both' && <Check className="w-3 h-3 text-emerald-500" />}
                          </div>
                          <p className="text-[9.5px] opacity-80 leading-snug">
                            Real-time saat isu krisis darurat + rekap ringkasan berkala.
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Rentang Jam Operasional (Quiet Hours) */}
                    <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={whatsappQuietHoursEnabled}
                            onChange={e => setWhatsappQuietHoursEnabled(e.target.checked)}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className="text-[10.5px] font-bold text-slate-800 dark:text-slate-200">
                            Aktifkan Pembatasan Rentang Jam Operasional (Quiet Hours)
                          </span>
                        </label>
                        <span className="text-[9px] text-slate-400">Zona Waktu: WIB (UTC+7)</span>
                      </div>

                      {whatsappQuietHoursEnabled ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/5">
                          <div className="space-y-1">
                            <label className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Mulai Kirim (Jam Pagi/Siang)
                            </label>
                            <input
                              type="time"
                              value={whatsappStartTime}
                              onChange={e => setWhatsappStartTime(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <p className="text-[8.5px] text-slate-400 font-light">
                              Bot mulai aktif mendistribusikan notifikasi berita.
                            </p>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Selesai Kirim (Jam Malam)
                            </label>
                            <input
                              type="time"
                              value={whatsappEndTime}
                              onChange={e => setWhatsappEndTime(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <p className="text-[8.5px] text-slate-400 font-light">
                              Di atas jam ini, pesan non-kritis ditahan agar tidak mengganggu istirahat.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          ⚡ Mode 24 Jam Non-stop Aktif: Bot WhatsApp akan mengirimkan alert kapan saja (siang maupun tengah malam).
                        </div>
                      )}
                    </div>

                    {/* Interval Ringkasan / Rekap Berkala */}
                    {(whatsappScheduleMode === 'scheduled' || whatsappScheduleMode === 'both') && (
                      <div className="pt-2 border-t border-slate-100 dark:border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9.5px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                            Interval Ringkasan Berkala
                          </label>
                          <select
                            value={whatsappDigestIntervalHours}
                            onChange={e => setWhatsappDigestIntervalHours(parseInt(e.target.value, 10))}
                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value={1}>Setiap 1 Jam Sekali</option>
                            <option value={2}>Setiap 2 Jam Sekali</option>
                            <option value={3}>Setiap 3 Jam Sekali (Rekomendasi)</option>
                            <option value={6}>Setiap 6 Jam Sekali</option>
                            <option value={12}>Setiap 12 Jam Sekali (Pagi &amp; Sore)</option>
                            <option value={24}>Setiap 24 Jam Sekali (1x Sehari)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9.5px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                            URL WhatsApp Gateway VPS
                          </label>
                          <input
                            type="text"
                            value={openWaVpsUrl || 'http://101.32.141.172:3006'}
                            onChange={e => setOpenWaVpsUrl(e.target.value)}
                            placeholder="http://101.32.141.172:3006"
                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. FILTER KATEGORI & UJI KIRIM PESAN */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/40 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Filter Kategori Alert:</span>
                      <div className="flex items-center gap-1.5">
                        {['Negatif', 'Krisis', 'Semua Berita'].map(cat => {
                          const isSelected = fonnteCategories.includes(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  if (fonnteCategories.length > 1) {
                                    setFonnteCategories(fonnteCategories.filter(c => c !== cat));
                                  }
                                } else {
                                  setFonnteCategories([...fonnteCategories, cat]);
                                }
                              }}
                              className={`px-2 py-0.5 text-[10px] font-medium rounded-md border transition cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={testingWa}
                      onClick={handleTestWhatsApp}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{testingWa ? 'Mengirim Uji Coba...' : `Uji Kirim ke ${fonnteTargets.length} Nomor`}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit button bar */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/10 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingSettings ? 'Menyimpan...' : 'Simpan Konfigurasi Crawler'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* PANEL PENGELOLAAN KATA KUNCI AI AGENT */}
        <div className="bg-white dark:bg-[#121118] border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-3">
            <div className="space-y-1">
              <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                <Sparkles className="w-5 h-5 text-indigo-500 dark:text-indigo-400 animate-pulse animate-duration-3000" />
                Kelola Pengaktifan Kata Kunci AI Agent
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-light">
                Kelola topik aktif yang dipantau secara berkala (Auto-Rilis) oleh Scheduler AI Agent setiap {schedulerIntervalMinutes < 60 ? `${schedulerIntervalMinutes} menit` : `${schedulerIntervalMinutes / 60} jam`}.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/45 border border-indigo-100 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-3 py-1 font-bold rounded-xl text-[10px] shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                Rilis Otomatis: {schedulerIntervalMinutes < 60 ? `${schedulerIntervalMinutes} Menit` : `${schedulerIntervalMinutes / 60} Jam`} Sekali
              </span>
            </div>
          </div>

          {/* Inline Add Form */}
          <form onSubmit={handleAddKeyword} className="flex gap-2">
            <input
              type="text"
              value={newKeywordInput}
              onChange={e => setNewKeywordInput(e.target.value)}
              placeholder="Ketik topik monitoring baru dan tekan Enter atau klik tambah... (contoh: Penimbunan Solar Bersubsidi)"
              className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-slate-955 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              disabled={isAddingKeyword}
            />
            <button
              type="submit"
              disabled={isAddingKeyword || !newKeywordInput.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddingKeyword ? 'Menambah...' : 'Tambah'}</span>
            </button>
          </form>

          {/* Keywords collection grid/table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {keywords && keywords.length > 0 ? (
              keywords.map((kw) => (
                <div 
                  key={kw.id} 
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    kw.active 
                      ? 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-100 dark:border-white/5' 
                      : 'bg-slate-100/30 dark:bg-slate-950/5 border-slate-200/30 dark:border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={kw.active}
                      aria-label={`Toggle active state for keyword: ${kw.text}`}
                      onChange={() => handleToggleKeyword(kw)}
                      className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded-md focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 cursor-pointer shrink-0"
                    />
                    <div className="text-left min-w-0">
                      <p className={`text-xs font-bold truncate ${kw.active ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 line-through'}`} title={kw.text}>
                        {kw.text}
                      </p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                        Ditambah: {new Date(kw.createdAt).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                      kw.active 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-950/30 dark:text-slate-400'
                    }`}>
                      {kw.active ? 'Aktif' : 'Off'}
                    </span>
                    
                    <button
                      type="button"
                      onClick={() => handleDeleteKeyword(kw.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer"
                      title="Hapus kata kunci"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                Belum ada kata kunci terpantau. Silakan tambahkan kata kunci baru di atas.
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Live status (right side) */}
        <div className="space-y-6">
          
          {/* Active control panel action */}
          <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#121118] dark:to-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm">
            <div className="space-y-2">
              <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase">Jalankan</span>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-normal">
                Aktifkan Crawler
              </h4>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-normal font-light">
                Tanpa menunggu interval waktu berikutnya, jalankan pencarian berita dan pemrosesan untuk semua kata kunci aktif saat ini.
              </p>
            </div>

            <button
              onClick={handleManualTrigger}
              disabled={triggeringCrawl}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition transform active:scale-95 cursor-pointer"
            >
              <Play className={`w-3.5 h-3.5 ${triggeringCrawl ? 'animate-spin' : ''}`} />
              <span>{triggeringCrawl ? 'Sedang Memproses...' : 'Jalankan Crawler Sekarang ✨'}</span>
            </button>
          </div>

          {/* Core metadata active information */}
          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/15 border border-indigo-100 dark:border-indigo-900/10 rounded-xl flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <span className="block text-[9.5px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">AI Model Pendamping:</span>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-mono">
                Model: <span className="font-bold text-slate-800 dark:text-white">Gemini 2.1 Flash-Lite</span>
                <br />
                Status: <span className="font-bold text-emerald-600 dark:text-emerald-400">Siap & Terhubung</span>
              </p>
            </div>
          </div>

          {/* Engine Diagnosis & Readiness Status Widget */}
          <div className="p-5 bg-white dark:bg-[#121118] border border-slate-200 dark:border-white/5 rounded-2xl shadow-xs space-y-3">
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase">Diagnostik</span>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none">
              Status Kesiapan Engine Pencari
            </h4>
            
            <div className="space-y-2.5 pt-1">
              {/* RSS status */}
              <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/5 pb-2">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Google News Public RSS
                </span>
                <span className="text-[9.5px] px-2 py-0.5 rounded-md font-bold bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400">
                  Aktif (Bebas Kuota)
                </span>
              </div>

              {/* BeautifulSoup HTML status */}
              <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/5 pb-2">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  BeautifulSoup HTML Scraper
                </span>
                <span className="text-[9.5px] px-2 py-0.5 rounded-md font-bold bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400">
                  Aktif (Cheerio Engine)
                </span>
              </div>

              {/* SerpApi status */}
              <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/5 pb-2">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  SerpApi Search Engine
                </span>
                <span className="text-[9.5px] px-2 py-0.5 rounded-md font-bold bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-400">
                  Aktif (Ready)
                </span>
              </div>

              {/* Gemini Grounding status */}
              <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/5 pb-2">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Gemini AI Grounding
                </span>
                <span className="text-[9.5px] px-2 py-0.5 rounded-md font-bold bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-400">
                  Ready
                </span>
              </div>

              {/* OpenSerp status */}
              <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/5 pb-2">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  OpenSerp Search Engine
                </span>
                <span className="text-[9.5px] px-2 py-0.5 rounded-md font-bold bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400">
                  Aktif (Bebas)
                </span>
              </div>

              {/* Simulation status */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-555 bg-emerald-500"></span>
                  Simulasi Agen Cadangan
                </span>
                <span className="text-[9.5px] px-2 py-0.5 rounded-md font-bold bg-amber-55 bg-amber-50 dark:bg-amber-950/35 text-amber-700 dark:text-amber-400">
                  Siaga (Standby)
                </span>
              </div>
            </div>
          </div>

          {/* Custom PostgreSQL Connection Monitoring Card */}
          <div className="p-5 bg-white dark:bg-[#121118] border border-slate-200 dark:border-white/5 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase">Database Kustom</span>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-indigo-500" />
                  Koneksi PostgreSQL Kustom
                </h4>
              </div>
              <button
                type="button"
                onClick={fetchDbConnectionLogs}
                disabled={loadingDbLogs}
                className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title="Segarkan Log"
              >
                <RefreshCw className={`w-3 h-3 ${loadingDbLogs ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Test Connection Button and Status */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Uji konektivitas ke database .env secara real-time:
                </span>
                {dbTestStatus === 'success' && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase tracking-wider border border-emerald-500/25">
                    Sukses
                  </span>
                )}
                {dbTestStatus === 'failed' && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] font-bold uppercase tracking-wider border border-rose-500/25">
                    Gagal
                  </span>
                )}
                {dbTestStatus === 'testing' && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold uppercase tracking-wider border border-indigo-500/25 animate-pulse">
                    Menguji...
                  </span>
                )}
              </div>

              {dbTestMessage && (
                <div className={`p-2 rounded-lg text-[9.5px] leading-relaxed font-mono ${
                  dbTestStatus === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20'
                    : dbTestStatus === 'failed'
                      ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/20 break-all'
                      : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/20'
                }`}>
                  {dbTestMessage}
                </div>
              )}

              <button
                type="button"
                onClick={handleTestPostgresConnection}
                disabled={dbTestStatus === 'testing'}
                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-[10.5px] font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition transform active:scale-95 cursor-pointer"
              >
                <Activity className={`w-3.5 h-3.5 ${dbTestStatus === 'testing' ? 'animate-spin' : ''}`} />
                <span>{dbTestStatus === 'testing' ? 'Menguji Koneksi...' : 'Uji Koneksi PostgreSQL ⚡'}</span>
              </button>
            </div>

            {/* Connection History Log List */}
            <div className="space-y-2">
              <span className="block text-[9.5px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                Riwayat & Log Koneksi (Real-time)
              </span>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-900 font-mono text-[10px] text-slate-300 leading-relaxed max-h-48 overflow-y-auto space-y-2">
                {dbConnectionLogs.length === 0 ? (
                  <div className="text-center py-4 text-slate-600 italic">
                    Belum ada riwayat koneksi database. Klik "Uji Koneksi" di atas untuk mencoba.
                  </div>
                ) : (
                  dbConnectionLogs.map((log, idx) => {
                    const isSuccess = log.status === 'SUCCESS';
                    return (
                      <div key={`${log.id}-${idx}`} className="border-b border-slate-900 pb-2 last:border-b-0 last:pb-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-sm ${
                            isSuccess 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {log.status}
                          </span>
                          <span className="text-[8px] text-slate-500">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' }) : ''}
                          </span>
                        </div>
                        
                        <p className="text-[9px] text-slate-300">
                          {log.message}
                        </p>
                        
                        <div className="text-[8px] text-slate-500 dark:text-slate-500 space-y-0.5 font-light">
                          <div>Host: <span className="text-slate-400">{log.host}</span> | DB: <span className="text-slate-400">{log.database}</span></div>
                          {log.details && (
                            <div className="mt-1 p-1 bg-slate-900/60 rounded text-[7.5px] text-slate-400 break-all max-h-16 overflow-y-auto">
                              {log.details}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Scheduler logs panel (Terminal view style) */}
      <div className="p-5 bg-white dark:bg-[#121118] border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-bold text-slate-905 dark:text-white uppercase tracking-wider font-display">
              Log Aktivitas Crawling Media (Real-time)
            </h3>
          </div>
          <button 
            onClick={fetchSchedulerLogs}
            disabled={loadingLogs}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg transition cursor-pointer"
            title="Klik untuk menyegarkan log"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Fake Terminal Workspace */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-900 font-mono text-[10.5px] text-slate-300 leading-relaxed max-h-80 overflow-y-auto space-y-2">
          {schedulerLogs.length === 0 ? (
            <div className="text-center py-6 text-slate-600 italic">
              Tidak ada log aktivitas background scheduler terbaru. Menunggu interval pencarian berikutnya...
            </div>
          ) : (
            schedulerLogs.map((log, idx) => (
              <div key={`${log.id}-${idx}`} className="flex flex-col sm:flex-row gap-1 sm:gap-4 border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                <span className="text-indigo-400 font-bold shrink-0">
                  [{new Date(log.timestamp).toLocaleString('id-ID', { hour: 'numeric', minute: 'numeric', second: 'numeric' })}]
                </span>
                <div className="flex-1">
                  <span className="text-emerald-400 font-extrabold mr-1.5 uppercase tracking-wide">
                    {log.action}:
                  </span>
                  <span className="text-slate-200">{log.target}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
