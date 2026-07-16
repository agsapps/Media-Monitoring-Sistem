import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppProvider, useAppState } from './AppContext';
import { Sidebar } from './components/Sidebar';
import { PortalView } from './components/PortalView';
import { DashboardView } from './components/DashboardView';
import { ManageView } from './components/ManageView';
import { MasterDataView } from './components/MasterDataView';
import { SettingsView } from './components/SettingsView';
import { UsersView } from './components/UsersView';
import { PDFExportStudio } from './components/PDFExportStudio';
import { SocialNewsView } from './components/SocialNewsView';
import { ChatbotView } from './components/ChatbotView';
import { AuthModal } from './components/AuthModal';
import { LoginGate } from './components/LoginGate';
import { TerminalMonitoringView } from './components/TerminalMonitoringView';
import { 
  Sun, Moon, ShieldAlert, AlertTriangle, ShieldCheck, 
  User, Database, Globe, FileText, Menu,
  Cpu, Copy, Check, X, RefreshCw, Maximize, Minimize, MapPin,
  Camera, Upload, LogOut,
  Chrome, Compass, Laptop, Smartphone, Tablet
} from 'lucide-react';

const getBrowserInfo = (ua: string) => {
  if (!ua) return { name: 'Peramban Web', color: 'text-slate-500 bg-slate-500/10 border-slate-500/20 dark:text-slate-400 dark:bg-slate-500/5', icon: 'generic' };
  if (ua.includes('Edg/')) return { name: 'Microsoft Edge', color: 'text-sky-600 bg-sky-500/10 border-sky-500/20 dark:text-sky-450 dark:bg-sky-500/5', icon: 'edge' };
  if (ua.includes('OPR/') || ua.includes('Opera')) return { name: 'Opera', color: 'text-red-600 bg-red-500/10 border-red-500/20 dark:text-red-450 dark:bg-red-500/5', icon: 'opera' };
  if (ua.includes('Chrome') && !ua.includes('Edg/')) return { name: 'Google Chrome', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-450 dark:bg-emerald-500/5', icon: 'chrome' };
  if (ua.includes('Firefox')) return { name: 'Mozilla Firefox', color: 'text-orange-600 bg-orange-500/10 border-orange-500/20 dark:text-orange-450 dark:bg-orange-500/5', icon: 'firefox' };
  if (ua.includes('Safari') && !ua.includes('Chrome')) return { name: 'Apple Safari', color: 'text-blue-600 bg-blue-500/10 border-blue-500/20 dark:text-blue-450 dark:bg-blue-500/5', icon: 'safari' };
  return { name: 'Peramban Web', color: 'text-slate-500 bg-slate-500/10 border-slate-500/20 dark:text-slate-400 dark:bg-slate-500/5', icon: 'generic' };
};

const getDeviceInfo = (ua: string) => {
  if (!ua) return { name: 'Desktop', icon: 'desktop' };
  const uaLower = ua.toLowerCase();
  if (uaLower.includes('ipad')) return { name: 'Tablet', icon: 'tablet' };
  if (uaLower.includes('iphone') || (uaLower.includes('android') && uaLower.includes('mobile'))) return { name: 'Smartphone', icon: 'phone' };
  if (uaLower.includes('android')) return { name: 'Tablet', icon: 'tablet' };
  return { name: 'Desktop', icon: 'desktop' };
};

const renderBrowserIcon = (icon: string) => {
  switch (icon) {
    case 'chrome':
      return <Chrome className="w-3 h-3" />;
    case 'safari':
      return <Compass className="w-3 h-3" />;
    case 'firefox':
      return <Globe className="w-3 h-3 text-orange-500" />;
    case 'edge':
      return <Globe className="w-3 h-3 text-sky-500" />;
    case 'opera':
      return <Globe className="w-3 h-3 text-red-500" />;
    default:
      return <Globe className="w-3 h-3" />;
  }
};

const renderDeviceIcon = (icon: string) => {
  switch (icon) {
    case 'phone':
      return <Smartphone className="w-3 h-3" />;
    case 'tablet':
      return <Tablet className="w-3 h-3" />;
    default:
      return <Laptop className="w-3 h-3" />;
  }
};

const DashboardLayout: React.FC = () => {
  const { 
    activeTab, theme, user, logout, settings, isLoading,
    toasts, dismissToast, themeMode, setThemeMode, authFetch, showToast, updateProfile
  } = useAppState();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [activeReaders, setActiveReaders] = useState(1);
  const [activeSessions, setActiveSessions] = useState<{ id: string; ip: string; mac: string; userAgent: string; location?: string }[]>([]);
  const [isSessionsDropdownOpen, setIsSessionsDropdownOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // --- DATABASE DIAGNOSTICS FOR CUSTOM POSTGRES ---
  const [isDiagModalOpen, setIsDiagModalOpen] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<any>(null);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [diagTab, setDiagTab] = useState<'tables' | 'queries'>('tables');
  const [diagQueries, setDiagQueries] = useState<any[]>([]);
  const [diagQueriesLoading, setDiagQueriesLoading] = useState(false);

  const fetchQueryHistory = async () => {
    setDiagQueriesLoading(true);
    try {
      const res = await authFetch('/api/diagnostics/db-queries');
      const data = await res.json();
      if (res.ok && data.success) {
        setDiagQueries(data.queries || []);
      }
    } catch (err) {
      console.error('Failed to fetch query logs:', err);
    } finally {
      setDiagQueriesLoading(false);
    }
  };

  const runDbDiagnostics = async () => {
    setDiagLoading(true);
    setDiagError(null);
    setDiagResult(null);
    try {
      const res = await authFetch('/api/diagnostics/db-tables');
      const data = await res.json();
      if (res.ok && data.success) {
        setDiagResult(data);
        showToast('Diagnostik PostgreSQL berhasil dimuat!', 'success');
      } else {
        setDiagError(data.message || 'Gagal terhubung ke database.');
        showToast('Koneksi PostgreSQL kustom gagal!', 'error');
      }
      await fetchQueryHistory();
    } catch (err: any) {
      setDiagError(err.message || 'Gagal menghubungi server diagnostik.');
      showToast('Koneksi server gagal!', 'error');
    } finally {
      setDiagLoading(false);
    }
  };

  // Profile Edit States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Sync profile form states when user changes or modal opens
  React.useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileEmail(user.email || '');
      setProfileAvatarUrl(user.avatarUrl || '');
    }
  }, [user, isProfileModalOpen]);

  // Sync fullscreen state with document changes (e.g. if exited via Escape key)
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Sync favicon with settings.logoUrl
  React.useEffect(() => {
    const favicon = document.getElementById('dynamic-favicon') as HTMLLinkElement;
    if (favicon) {
      const activeLogoUrl = settings?.logoUrl || "https://www.image2url.com/r2/default/images/1780156246537-cd69ae8e-001c-4401-bc28-6450bd31ace9.png";
      favicon.href = activeLogoUrl;
    }
  }, [settings?.logoUrl]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
        // Collapse sidebar automatically for a fully immersive layout
        setIsSidebarOpen(false);
        showToast('Masuk ke mode Layar Penuh (Full Screen). Tekan ESC untuk keluar.', 'success');
      }).catch(err => {
        console.error('Fullscreen error:', err);
        // Fallback: simulate full screen layout by collapsing the sidebar
        setIsFullscreen(true);
        setIsSidebarOpen(false);
        showToast('Mode Imersif Diaktifkan (Sidebar disembunyikan)', 'success');
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        setIsSidebarOpen(true);
      }).catch(err => {
        console.error('Exit fullscreen error:', err);
        setIsFullscreen(false);
        setIsSidebarOpen(true);
      });
    }
  };

  // --- TIME CLOCK STATE & INTRUCTION 2 ---
  const [currentTime, setCurrentTime] = useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatIndonesianDateTimeWithWIB = (date: Date) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    try {
      const dayName = days[new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })).getDay()];
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      
      const formatter = new Intl.DateTimeFormat('id-ID', options);
      const formattedParts = formatter.formatToParts(date);
      
      let day = '';
      let month = '';
      let year = '';
      let hour = '';
      let minute = '';
      let second = '';
      
      formattedParts.forEach(part => {
        if (part.type === 'day') day = part.value;
        if (part.type === 'month') month = part.value;
        if (part.type === 'year') year = part.value;
        if (part.type === 'hour') hour = part.value;
        if (part.type === 'minute') minute = part.value;
        if (part.type === 'second') second = part.value;
      });
      
      return `${dayName}, ${day} ${month} ${year} - ${hour}:${minute}:${second} WIB`;
    } catch (err) {
      return date.toLocaleDateString();
    }
  };

  // Real-time active readers fetching from backend via heartbeat checks
  React.useEffect(() => {
    // Generate or fetch a unique session identifier for this tab
    const sessionKey = 'active_reader_session_id';
    let sessId = '';
    try {
      sessId = sessionStorage.getItem(sessionKey) || '';
      if (!sessId) {
        sessId = 'reader-' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        sessionStorage.setItem(sessionKey, sessId);
      }
    } catch (e) {
      sessId = 'reader-fallback-' + Math.random();
    }

    const pingHeartbeat = async () => {
      try {
        const res = await authFetch('/api/active-sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId: sessId })
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.activeCount === 'number') {
            setActiveReaders(data.activeCount);
          }
          if (Array.isArray(data.sessions)) {
            setActiveSessions(data.sessions);
          }
        }
      } catch (err) {
        console.warn('Gagal memuat status real-time pengguna aktf:', err);
      }
    };

    // Execute immediately and then repeat every 5 seconds when visible
    pingHeartbeat();
    
    let timer: any = null;
    const startTimer = () => {
      if (!timer) {
        timer = setInterval(() => {
          if (!document.hidden) {
            pingHeartbeat();
          }
        }, 5000);
      }
    };

    const stopTimer = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    startTimer();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTimer();
      } else {
        pingHeartbeat();
        startTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Resize listener to toggle sidebar open/closed nicely when resizing across viewport boundaries
  React.useEffect(() => {
    let lastWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      const wasDesktop = lastWidth >= 768;
      const isDesktop = currentWidth >= 768;
      
      if (wasDesktop !== isDesktop) {
        setIsSidebarOpen(isDesktop);
      }
      lastWidth = currentWidth;
    };
    
    // Set initial layout
    if (typeof window !== 'undefined') {
      setIsSidebarOpen(window.innerWidth >= 768);
      window.addEventListener('resize', handleResize);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // Active Screen Selector Router
  const renderTabContent = () => {
    switch (activeTab) {
      case 'portal':
        return <PortalView />;
      case 'dashboard':
        return <DashboardView />;
      case 'social-news':
        return <SocialNewsView />;
      case 'chatbot':
        return <ChatbotView />;
      case 'manage':
        return <ManageView />;
      case 'master':
        return <MasterDataView />;
      case 'settings':
        return <SettingsView />;
      case 'users':
        return <UsersView />;
      case 'monitoring':
        return user?.role === 'Admin' ? <TerminalMonitoringView /> : <PortalView />;
      case 'pdf-studio':
        return user?.role === 'Admin' ? <PDFExportStudio /> : <PortalView />;
      default:
        return <PortalView />;
    }
  };

  const getBreadcrumbLabel = () => {
    switch (activeTab) {
      case 'portal': return 'Media Monitoring';
      case 'dashboard': return 'Analitik';
      case 'social-news': return 'Daftar Berita dari Media Sosial';
      case 'chatbot': return 'Security Chat';
      case 'manage': return 'Dokumentasi & Pengelolaan Isu';
      case 'master': return 'Klasifikasi';
      case 'settings': return 'Konfigurasi Crawler';
      case 'users': return 'Manajemen Akun & Role';
      case 'monitoring': return 'Terminal Monitoring';
      case 'pdf-studio': return 'PDF Export Studio';
      default: return 'Portal';
    }
  };

  return (
    <div className={`min-h-screen flex bg-white dark:bg-slate-950 font-sans transition-colors duration-200`}>
      {/* Dynamic Collapsible Sidebar navigation */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
      />

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* TOP BAR BRANDING NAVIGATION INSPIRED BY NIXTIO */}
        <header className="sticky top-2 sm:top-4 mt-2 sm:mt-4 mx-2.5 sm:mx-6 z-20 flex items-center justify-between h-14 sm:h-16 px-3 sm:px-6 bg-white/80 dark:bg-[#09080d]/80 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl shadow-xs transition-all">
          
          {/* Left panel branding with Mobile Hamburger & Mini Mock Presence */}
          <div className="flex items-center gap-2 sm:gap-3.5 text-xs text-slate-400 dark:text-slate-500">
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer md:hidden flex items-center justify-center shadow-xs border border-slate-200/50 dark:border-white/5"
              title="Toggle Menu"
            >
              <motion.div
                animate={{ rotate: isSidebarOpen ? 90 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex items-center justify-center"
              >
                <Menu className="w-5.5 h-5.5" />
              </motion.div>
            </motion.button>
            
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-slate-700 dark:text-slate-300 font-bold tracking-wider uppercase text-[8.5px] sm:text-[10px] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full truncate max-w-[80px] sm:max-w-none">
                {getBreadcrumbLabel()}
              </span>
            </div>

            {/* Real-time WIB Digital Clock display, visible on sm and up */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-300 text-[10.5px] font-bold tracking-wide shadow-xs shrink-0">
              <span className="font-mono">{formatIndonesianDateTimeWithWIB(currentTime)}</span>
            </div>

            {/* REAL-TIME WEBSITE VISITOR PRESENCE PILLS WITH IP & MAC SELECTION - ONLY ACTIVE FOR ADMIN */}
            {user?.role === 'Admin' && (
              <div className="hidden lg:flex items-center gap-2 ml-4">
                {/* Presence Group 1 - Active Readers count with details popover */}
                <div className="relative font-sans">
                  <button
                    onClick={() => setIsSessionsDropdownOpen(!isSessionsDropdownOpen)}
                    className="flex items-center gap-2 bg-emerald-500/10 dark:bg-emerald-500/20 px-3.5 py-1.5 rounded-full border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/20 cursor-pointer select-none text-[10.5px] text-emerald-700 dark:text-emerald-400 font-extrabold shadow-xs transition active:scale-[0.98]"
                    title="Klik untuk detail IP / MAC Pengguna"
                  >
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </div>
                    <span><span className="font-mono">{activeReaders}</span> Pengguna Aktif</span>
                  </button>

                  {/* ACTIVE SESSIONS DETAILED DROPDOWN OVERLAY */}
                  <AnimatePresence>
                    {isSessionsDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute left-0 mt-2.5 w-80 bg-white dark:bg-[#0c0b11] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl p-4 z-50 text-slate-850 dark:text-white"
                      >
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-150 dark:border-white/5 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-gray-400">Arus Sesi Aktif ({activeSessions.length})</h4>
                          </div>
                          <button 
                            onClick={() => setIsSessionsDropdownOpen(false)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-2.5 pr-0.5">
                          {activeSessions.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                              Memuat data pengguna...
                            </div>
                          ) : (
                             activeSessions.map((session) => {
                               const isCopiedIP = copiedIndex === `ip-${session.id}`;
                               const isCopiedMAC = copiedIndex === `mac-${session.id}`;
                               
                               const handleCopy = (text: string, idStr: string) => {
                                 navigator.clipboard.writeText(text);
                                 setCopiedIndex(idStr);
                                 setTimeout(() => setCopiedIndex(null), 2000);
                               };

                               const browser = getBrowserInfo(session.userAgent);
                               const device = getDeviceInfo(session.userAgent);

                               return (
                                 <div 
                                   key={session.id} 
                                   className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-150/50 dark:border-white/5 flex flex-col gap-2 hover:bg-slate-100 hover:dark:bg-white/10 transition"
                                 >
                                   {/* Browser & Device Indicator Header */}
                                   <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/50 dark:border-white/5">
                                     <div className="flex items-center gap-1.5">
                                       <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition-colors ${browser.color}`}>
                                         {renderBrowserIcon(browser.icon)}
                                         <span>{browser.name}</span>
                                       </span>
                                     </div>
                                     <div className="flex items-center gap-1 text-[9.5px] text-slate-500 dark:text-slate-400 font-medium">
                                       {renderDeviceIcon(device.icon)}
                                       <span>{device.name}</span>
                                     </div>
                                   </div>

                                   {/* IP Row */}
                                   <div className="flex items-center justify-between text-xs font-semibold">
                                     <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] uppercase">
                                       <Globe className="w-3 h-3 text-emerald-500" />
                                       <span>IP Address</span>
                                     </div>
                                     <button 
                                       onClick={() => handleCopy(session.ip, `ip-${session.id}`)}
                                       className="flex items-center gap-1 hover:text-blue-800 dark:hover:text-blue-400 px-1 py-0.5 rounded transition text-[11px] font-mono font-bold cursor-pointer"
                                       title="Salin IP"
                                     >
                                       <span>{session.ip}</span>
                                       {isCopiedIP ? (
                                         <Check className="w-3 h-3 text-emerald-500" />
                                       ) : (
                                         <Copy className="w-3 h-3 text-slate-400" />
                                       )}
                                     </button>
                                   </div>

                                   {/* MAC Row */}
                                   <div className="flex items-center justify-between text-xs font-semibold">
                                     <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] uppercase">
                                       <Cpu className="w-3 h-3 text-blue-700" />
                                       <span>MAC Address</span>
                                     </div>
                                     <button 
                                       onClick={() => handleCopy(session.mac, `mac-${session.id}`)}
                                       className="flex items-center gap-1 hover:text-blue-800 dark:hover:text-blue-400 px-1 py-0.5 rounded transition text-[11px] font-mono font-bold cursor-pointer"
                                       title="Salin MAC Address"
                                     >
                                       <span>{session.mac}</span>
                                       {isCopiedMAC ? (
                                         <Check className="w-3 h-3 text-emerald-500" />
                                       ) : (
                                         <Copy className="w-3 h-3 text-slate-400" />
                                       )}
                                     </button>
                                   </div>

                                   {/* Geolocation Row */}
                                   <div className="flex items-center justify-between text-xs font-semibold">
                                     <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] uppercase">
                                       <MapPin className="w-3 h-3 text-rose-500" />
                                       <span>Lokasi Sesi</span>
                                     </div>
                                     <span 
                                       className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[170px]"
                                       title={session.location || 'Mendeteksi lokasi...'}
                                     >
                                       {session.location || 'DKI Jakarta, ID'}
                                     </span>
                                   </div>

                                   {/* UserAgent Tooltip/Label */}
                                   <div className="text-[8.5px] text-slate-400 dark:text-slate-500 text-ellipsis overflow-hidden whitespace-nowrap pt-1 border-t border-slate-200/50 dark:border-white/5 font-mono" title={session.userAgent}>
                                     {session.userAgent}
                                   </div>
                                 </div>
                               );
                             })
                          )}
                        </div>

                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Presence Group 2 - PostgreSQL Connection Diagnostics */}
                <button
                  onClick={() => {
                    setIsDiagModalOpen(true);
                    runDbDiagnostics();
                  }}
                  className="flex items-center gap-2 bg-indigo-500/10 dark:bg-indigo-500/20 px-3.5 py-1.5 rounded-full border border-indigo-500/20 hover:border-indigo-500/50 hover:bg-indigo-500/20 cursor-pointer select-none text-[10.5px] text-indigo-700 dark:text-indigo-400 font-extrabold shadow-xs transition active:scale-[0.98]"
                  title="Klik untuk Diagnostik PostgreSQL Kustom"
                >
                  <Database className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                  <span>Diag Postgres</span>
                </button>
              </div>
            )}
          </div>

          {/* Right panel settings & authentication displays */}
          <div className="flex items-center gap-2 sm:gap-3.5">
            {/* Quick Demo Assist Indicator if Guest */}
            {!user && (
              <span className="hidden sm:inline-flex items-center gap-1 bg-yellow-50 dark:bg-amber-950/20 border border-yellow-200/30 dark:border-amber-900/20 px-2.5 py-1 rounded-full text-[9px] font-extrabold text-yellow-700 dark:text-amber-400 uppercase tracking-wider">
                <AlertTriangle className="w-3 h-3 text-amber-500" id="top-demo-warn"/>
                <span>View-Only</span>
              </span>
            )}

            {/* Dark, Light & System Theme selector pills */}
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-[#121118]/80 border border-slate-205 dark:border-white/5 rounded-full p-1 select-none">
              <button
                onClick={() => setThemeMode('light')}
                className={`p-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                  themeMode === 'light'
                    ? 'bg-white dark:bg-slate-800 text-amber-500 shadow-sm'
                    : 'text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-300'
                }`}
                title="Pilih Tema Terang"
              >
                <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => setThemeMode('dark')}
                className={`p-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                  themeMode === 'dark'
                    ? 'bg-white dark:bg-slate-800 text-blue-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-300'
                }`}
                title="Pilih Tema Gelap"
              >
                <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => setThemeMode('system')}
                className={`p-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                  themeMode === 'system'
                    ? 'bg-white dark:bg-slate-800 text-blue-500 shadow-sm'
                    : 'text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-300'
                }`}
                title="Ikuti Tema Sistem OS"
              >
                <Laptop className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* Full Screen Mode Toggle Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-slate-100 dark:bg-[#121118]/80 border border-slate-200 dark:border-white/5 rounded-full text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-white transition-all duration-200 cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
              title={isFullscreen ? "Keluar dari Layar Penuh" : "Masuk ke Layar Penuh"}
            >
              {isFullscreen ? (
                <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-700" />
              ) : (
                <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />
              )}
            </button>
            {/* Profile Avatar Trigger with elegant Dropdown menu */}
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-1.5 sm:gap-2.5 hover:opacity-90 active:scale-98 transition focus:outline-hidden cursor-pointer"
                  title="Menu Profil"
                >
                  <div className="hidden sm:block text-right pr-0.5 py-1">
                    <span className="block text-xs font-bold text-slate-800 dark:text-white leading-normal mb-0.5">{user.name}</span>
                    <span className="text-[9px] uppercase tracking-wider text-slate-450 dark:text-blue-400 font-mono font-extrabold">{user.role} Room</span>
                  </div>
                  
                  {user.avatarUrl ? (
                    <img 
                      src={user.avatarUrl} 
                      alt={user.name} 
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-200 dark:border-slate-850 shadow-sm"
                      onError={(e) => {
                        // fallback if error loading image
                        (e.target as any).style.display = 'none';
                        const fallbackEl = document.getElementById(`avatar-fallback-${user.id}`);
                        if (fallbackEl) fallbackEl.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  
                  {/* Initial Fallback if no avatarUrl or error */}
                  <div 
                    id={`avatar-fallback-${user.id}`}
                    style={{ display: user.avatarUrl ? 'none' : 'flex' }}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-800 dark:bg-blue-700 text-white font-black items-center justify-center text-[10px] sm:text-xs uppercase border border-slate-200 dark:border-slate-950 shadow-md"
                  >
                    {user.username.slice(0, 2)}
                  </div>
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {isProfileDropdownOpen && (
                    <>
                      {/* Invisible backdrop to close the dropdown when clicking outside */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsProfileDropdownOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2.5 w-60 bg-white dark:bg-[#121118] border border-slate-200 dark:border-white/5 rounded-2xl shadow-xl z-50 p-2 overflow-hidden"
                      >
                        {/* Dropdown Header User Info */}
                        <div className="px-3.5 py-3 border-b border-slate-100 dark:border-white/5">
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{user.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{user.email || `${user.username}@monitoring.id`}</p>
                          <span className="inline-block mt-1.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 font-mono font-extrabold text-[8px] uppercase tracking-wider rounded-md border border-blue-100/30 dark:border-blue-950/10">
                            {user.role} Account
                          </span>
                        </div>

                        {/* Dropdown Actions */}
                        <div className="pt-1.5 space-y-0.5">
                          <button
                            onClick={() => {
                              setIsProfileModalOpen(true);
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer text-left"
                          >
                            <Camera className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Edit Profil & Foto</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              logout();
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all cursor-pointer text-left"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Keluar</span>
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="py-1 px-3 sm:py-1.5 sm:px-4 flex items-center gap-1 sm:gap-1.5 bg-slate-900 hover:bg-slate-850 dark:bg-blue-800 dark:hover:bg-blue-900 text-white font-bold text-[10px] sm:text-[11px] tracking-wide rounded-full shadow-md hover:scale-[1.02] active:scale-95 transition cursor-pointer"
              >
                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" id="top-login-icon"/>
                <span>Login</span>
              </button>
            )}
          </div>
        </header>

        {/* COMPONENT RENDER SCREEN REGIONS */}
        <main className="p-6 landscape:p-4 md:p-6 w-full max-w-none flex-1 transition-all duration-300 pb-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={theme}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="w-full"
            >
              {isLoading ? (
                <div className="space-y-6 animate-pulse">
                  <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                    <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                    <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                    <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                  </div>
                  <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
                </div>
              ) : !user ? (
                <LoginGate />
              ) : (
                renderTabContent()
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Global Footer element */}
        <footer className="py-5 bg-white dark:bg-slate-900 text-center border-t border-slate-150 dark:border-slate-800 text-[10px] text-slate-400 font-medium tracking-wide">
          {settings.footerText}
        </footer>

        {/* Edit Profile Modal Dialog */}
        <AnimatePresence>
          {isProfileModalOpen && user && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Overlay Backdrop with Blur */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
                onClick={() => setIsProfileModalOpen(false)}
              />

              {/* Modal Container */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.4 }}
                className="relative bg-white dark:bg-[#121118] border border-slate-200 dark:border-white/5 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden p-6 z-10"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5 mb-5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-blue-800 dark:text-blue-400">
                      <Camera className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white">Ubah Profil & Foto</h3>
                  </div>
                  <button 
                    onClick={() => setIsProfileModalOpen(false)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 hover:text-slate-650 dark:hover:text-white transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Avatar Preview & Selection */}
                <div className="flex flex-col items-center gap-3 mb-5">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-blue-700/30 dark:border-blue-700/50 bg-slate-100 dark:bg-slate-800 shadow-md flex items-center justify-center">
                      {profileAvatarUrl ? (
                        <img 
                          src={profileAvatarUrl} 
                          alt="Avatar Preview" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as any).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profileName || user.username)}`;
                          }}
                        />
                      ) : (
                        <span className="text-2xl font-black text-blue-800 dark:text-blue-400 uppercase">
                          {(profileName || user.username).slice(0, 2)}
                        </span>
                      )}
                    </div>
                    
                    {/* Floating camera badge */}
                    <label 
                      htmlFor="profile-upload" 
                      className="absolute bottom-0 right-0 p-1.5 bg-slate-900 dark:bg-blue-800 text-white rounded-full shadow-lg border border-white dark:border-slate-950 cursor-pointer hover:scale-110 active:scale-95 transition"
                      title="Unggah Foto dari File"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </label>
                    <input 
                      id="profile-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 1.5 * 1024 * 1024) {
                            showToast('Ukuran berkas melebihi batas maksimal 1.5MB!', 'error');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setProfileAvatarUrl(reader.result as string);
                            showToast('Foto profil berhasil diunggah ke formulir!', 'success');
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                  
                  {profileAvatarUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileAvatarUrl('');
                        showToast('Foto profil dihapus dari formulir!', 'success');
                      }}
                      className="text-[10px] text-rose-500 hover:text-rose-600 font-bold hover:underline transition cursor-pointer"
                    >
                      Hapus Foto Profil
                    </button>
                  )}
                </div>

                {/* Profile Fields Form */}
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!profileName.trim()) {
                      showToast('Nama Lengkap tidak boleh kosong!', 'error');
                      return;
                    }
                    setIsSavingProfile(true);
                    const success = await updateProfile(profileName, profileEmail, profileAvatarUrl);
                    setIsSavingProfile(false);
                    if (success) {
                      setIsProfileModalOpen(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-450 dark:text-slate-400 mb-1.5">Nama Lengkap</label>
                    <input 
                      type="text" 
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Nama Lengkap"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#181622] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-700 dark:focus:border-blue-700 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-450 dark:text-slate-400 mb-1.5">Alamat Email</label>
                    <input 
                      type="email" 
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      placeholder="Alamat Email"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#181622] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-700 dark:focus:border-blue-700 transition"
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsProfileModalOpen(false)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#181622] dark:hover:bg-slate-800/80 rounded-xl text-xs font-bold text-slate-650 dark:text-slate-350 transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="flex-1 py-2.5 bg-blue-800 hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-800/20 dark:shadow-none transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isSavingProfile ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <span>Simpan Perubahan</span>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* PostgreSQL Connection Diagnostics Modal Dialog */}
        <AnimatePresence>
          {isDiagModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Overlay Backdrop with Blur */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
                onClick={() => setIsDiagModalOpen(false)}
              />

              {/* Modal Container */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.4 }}
                className="relative bg-white dark:bg-[#121118] border border-slate-200 dark:border-white/5 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden p-6 z-10 flex flex-col max-h-[85vh]"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5 mb-5 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg text-indigo-800 dark:text-indigo-400">
                      <Database className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white">Diagnostik PostgreSQL Kustom</h3>
                  </div>
                  <button 
                    onClick={() => setIsDiagModalOpen(false)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 hover:text-slate-650 dark:hover:text-white transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto pr-1 flex flex-col min-h-0">
                  
                  {/* Tabs Selector */}
                  {diagResult && !diagLoading && (
                    <div className="flex border-b border-slate-100 dark:border-white/5 mb-4 select-none shrink-0">
                      <button
                        type="button"
                        onClick={() => setDiagTab('tables')}
                        className={`flex-1 pb-2 text-xs font-black text-center border-b-2 transition-all cursor-pointer ${
                          diagTab === 'tables'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-extrabold'
                            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
                        }`}
                      >
                        Skema & Tabel ({diagResult.tables?.length || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDiagTab('queries');
                          fetchQueryHistory();
                        }}
                        className={`flex-1 pb-2 text-xs font-black text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          diagTab === 'queries'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-extrabold'
                            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
                        }`}
                      >
                        <span>Histori Query</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 text-[9px] rounded-full text-slate-500 dark:text-slate-400 font-bold">
                          {diagQueries.length}
                        </span>
                      </button>
                    </div>
                  )}

                  <div className="space-y-4 flex-1">
                    {/* Status Banner */}
                    {diagLoading ? (
                      <div className="p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-950/30 flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Menghubungkan ke PostgreSQL kustom...</p>
                        <p className="text-[10px] text-slate-400">Memeriksa kredensial di .env dan mengambil tabel...</p>
                      </div>
                    ) : diagError ? (
                      <div className="p-4.5 rounded-2xl bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/30 space-y-2">
                        <div className="flex items-center gap-2 text-rose-800 dark:text-rose-400">
                          <ShieldAlert className="w-5 h-5 shrink-0" />
                          <span className="text-xs font-black">Koneksi Database Gagal!</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-350 bg-white/50 dark:bg-black/20 p-2.5 rounded-lg border border-rose-200/20 dark:border-white/5 font-mono text-xs overflow-x-auto max-h-36">
                          {diagError}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Silakan periksa variabel kredensial <code className="font-bold font-mono">CUSTOM_SQL_HOST</code>, <code className="font-bold font-mono">CUSTOM_SQL_USER</code>, <code className="font-bold font-mono">CUSTOM_SQL_PASSWORD</code>, dan <code className="font-bold font-mono">CUSTOM_SQL_DB_NAME</code> di panel konfigurasi <code className="font-bold font-mono">.env</code> Anda.
                        </p>
                      </div>
                    ) : diagResult ? (
                      diagTab === 'tables' ? (
                        <div className="space-y-4">
                          {/* Connection Success Banner */}
                          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950/30 flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-800 dark:text-emerald-400">
                              <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-800 dark:text-white">{diagResult.message}</p>
                              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">Kredensial valid dan dapat diakses sepenuhnya oleh backend!</p>
                            </div>
                          </div>

                          {/* Connection Metadata */}
                          <div className="bg-slate-50 dark:bg-[#181622] border border-slate-200/80 dark:border-white/5 rounded-2xl p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/50 dark:border-white/5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kredensial Terdeteksi (.env)</span>
                              <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 font-extrabold text-[8.5px] tracking-wide rounded border border-blue-500/10">PostgreSQL Kustom Saya</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
                              <div>
                                <span className="block text-[9px] text-slate-400 dark:text-slate-500 uppercase">Database Name</span>
                                <span className="font-mono text-slate-800 dark:text-slate-200 font-bold break-all">{diagResult.config?.database || '-'}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-slate-400 dark:text-slate-500 uppercase">Database Host</span>
                                <span className="font-mono text-slate-800 dark:text-slate-200 font-bold break-all">{diagResult.config?.host || '-'}</span>
                              </div>
                              <div className="col-span-2 pt-1">
                                <span className="block text-[9px] text-slate-400 dark:text-slate-500 uppercase">Database User</span>
                                <span className="font-mono text-slate-800 dark:text-slate-200 font-bold break-all">{diagResult.config?.user || '-'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Discovered Tables List */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Daftar Tabel Terdeteksi ({diagResult.tables?.length || 0})</span>
                              <span className="text-[10px] font-bold text-slate-450 uppercase font-mono">Public Schema</span>
                            </div>
                            
                            {(!diagResult.tables || diagResult.tables.length === 0) ? (
                              <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#181622] rounded-2xl border border-dashed border-slate-200 dark:border-white/5">
                                Tidak ditemukan tabel di dalam skema publik database.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-0.5">
                                {diagResult.tables.map((t: any) => (
                                  <div 
                                    key={t.name}
                                    className="p-2.5 bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 hover:dark:bg-white/[0.06] border border-slate-150 dark:border-white/5 rounded-xl flex items-center justify-between transition-all"
                                  >
                                    <div className="flex items-center gap-1.5 truncate">
                                      <FileText className="w-3.5 h-3.5 text-indigo-500/80 shrink-0" />
                                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate font-mono">{t.name}</span>
                                    </div>
                                    <span className="px-1.5 py-0.5 bg-slate-150 dark:bg-white/10 rounded-md text-[9.5px] font-mono font-bold text-slate-500 dark:text-slate-400">
                                      {t.columnCount} col
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Queries history log tab */
                        <div className="space-y-3">
                          <div className="flex items-center justify-between shrink-0">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Histori Query (10 Terakhir)</span>
                            <button
                              type="button"
                              onClick={fetchQueryHistory}
                              disabled={diagQueriesLoading}
                              className="text-[9.5px] font-extrabold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer flex items-center gap-1 transition-all select-none"
                            >
                              <RefreshCw className={`w-3 h-3 ${diagQueriesLoading ? 'animate-spin' : ''}`} />
                              <span>Refresh Query</span>
                            </button>
                          </div>

                          {diagQueriesLoading && diagQueries.length === 0 ? (
                            <div className="p-10 text-center flex flex-col items-center justify-center gap-2">
                              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                              <span className="text-xs font-semibold text-slate-500">Memuat log histori...</span>
                            </div>
                          ) : diagQueries.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#181622] rounded-2xl border border-dashed border-slate-200 dark:border-white/5 font-sans">
                              Belum ada query yang dijalankan backend sejak aplikasi dihidupkan.
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-0.5">
                              {diagQueries.map((entry: any, i: number) => (
                                <div 
                                  key={i} 
                                  className="p-3 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 rounded-2xl space-y-2 hover:border-indigo-500/10 dark:hover:border-indigo-500/20 transition-all"
                                >
                                  {/* Entry header metadata */}
                                  <div className="flex items-center justify-between text-[10px]">
                                    <div className="flex items-center gap-2 font-sans font-bold">
                                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] tracking-wider uppercase font-black ${
                                        entry.status === 'SUCCESS' 
                                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-450'
                                      }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${entry.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                        {entry.status}
                                      </span>
                                      <span className="font-mono text-slate-400 dark:text-slate-500 font-semibold">
                                        {new Date(entry.timestamp).toLocaleTimeString()}
                                      </span>
                                    </div>
                                    <span className="font-mono text-slate-500 dark:text-slate-400 font-extrabold bg-slate-150 dark:bg-white/10 px-1.5 py-0.5 rounded text-[9px]">
                                      {entry.duration} ms
                                    </span>
                                  </div>

                                  {/* Entry Query Text Container */}
                                  <div className="relative group">
                                    <pre className="font-mono text-[9.5px] leading-relaxed break-all bg-slate-900 text-emerald-400 dark:bg-black p-3 rounded-xl border border-white/5 select-all font-semibold max-h-36 overflow-y-auto overflow-x-hidden whitespace-pre-wrap">
                                      {entry.query}
                                    </pre>
                                  </div>

                                  {/* Params JSON if exists and non-empty */}
                                  {entry.params && entry.params.length > 0 && (
                                    <div className="font-sans text-[9px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 bg-slate-100/50 dark:bg-white/[0.01] p-1.5 rounded-lg border border-slate-200/20 dark:border-white/5 truncate">
                                      <span className="font-black uppercase tracking-wider text-[8px] text-indigo-500">Parameters:</span>
                                      <code className="font-mono font-bold text-slate-650 dark:text-slate-350 truncate">{JSON.stringify(entry.params)}</code>
                                    </div>
                                  )}

                                  {/* Error string if failure */}
                                  {entry.status === 'FAILED' && entry.error && (
                                    <div className="p-2 rounded-lg bg-rose-500/5 border border-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-[9px] leading-normal whitespace-pre-wrap">
                                      <span className="font-black uppercase tracking-wider text-[8px] mr-1 block text-rose-500">Error Message:</span>
                                      {entry.error}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                        Klik tombol dibawah untuk melakukan pengujian diagnostik koneksi database.
                      </div>
                    )}
                  </div>

                </div>

                {/* Footer buttons */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-white/5 flex gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsDiagModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#181622] dark:hover:bg-slate-800/80 rounded-xl text-xs font-bold text-slate-650 dark:text-slate-350 transition cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={runDbDiagnostics}
                    disabled={diagLoading}
                    className="flex-1 py-2.5 bg-indigo-800 hover:bg-indigo-900 dark:bg-indigo-700 dark:hover:bg-indigo-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-800/20 dark:shadow-none transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {diagLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menguji...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Mulai Diagnostik</span>
                      </>
                    )}
                  </button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Auth Credentials Pop-Up Modal */}
        <AuthModal 
          isOpen={isLoginModalOpen} 
          onClose={() => setIsLoginModalOpen(false)} 
        />

        {/* FLOATING ACTION NOTIFICATIONS System (Toasts with Swipe-To-Dismiss) */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-[90vw] sm:max-w-[400px] pointer-events-none">
          <AnimatePresence mode="popLayout">
            {toasts.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 200, scale: 0.9, transition: { duration: 0.2 } }}
                drag="x"
                dragDirectionLock
                dragConstraints={{ left: -100, right: 300 }}
                dragElastic={{ left: 0.1, right: 0.8 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 120 || info.offset.x < -80) {
                    dismissToast(item.id);
                  }
                }}
                className="pointer-events-auto cursor-grab active:cursor-grabbing select-none"
              >
                <div className={`flex items-center gap-3 px-4.5 py-3 rounded-xl shadow-2xl border text-sm font-semibold transition-all duration-200 ${
                  item.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900' 
                    : item.type === 'error'
                    ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900'
                    : 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900'
                }`}>
                  {item.type === 'success' ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" id={`toast-success-shield-${item.id}`}/>
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0" id={`toast-error-shield-${item.id}`} />
                  )}
                  <span className="flex-grow select-none">{item.message}</span>
                  <button 
                    onClick={() => dismissToast(item.id)}
                    className="ml-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white flex-shrink-0 p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <DashboardLayout />
    </AppProvider>
  );
}
