import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  NewsItem, 
  Category, 
  MediaSource, 
  User, 
  ActivityLog, 
  CustomSettings, 
  DashboardStats,
  Highlight,
  CrawlKeyword,
  Sentiment
} from './types';
import { setGlobalSettingsLogos } from './utils/pdfReportGenerator';
import { getCachedAccessToken } from './googleAuth';
import { appendSocialToSheet, appendIssueToSheet } from './sheetsService';


export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  user: User | null;
  token: string | null;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  news: NewsItem[];
  categories: Category[];
  medias: MediaSource[];
  logs: ActivityLog[];
  settings: CustomSettings;
  stats: DashboardStats | null;
  highlights: Highlight[];
  keywords: CrawlKeyword[];
  socialNews: any[];
  activeTab: 'portal' | 'dashboard' | 'manage' | 'master' | 'settings' | 'users' | 'pdf-studio' | 'social-news' | 'chatbot';
  theme: 'light' | 'dark';
  themeMode: 'light' | 'dark' | 'system';
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  isLoading: boolean;
  isCrawlSyncing: boolean;
  triggerAutoSync: () => Promise<void>;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  toasts: ToastItem[];
  dismissToast: (id: string) => void;
  selectedProvince: string;
  setSelectedProvince: (province: string) => void;
  portalLocationFilter: string;
  setPortalLocationFilter: (location: string) => void;
  socialLocationFilter: string;
  setSocialLocationFilter: (location: string) => void;
  
  // Actions
  setTab: (tab: 'portal' | 'dashboard' | 'manage' | 'master' | 'settings' | 'users' | 'pdf-studio' | 'social-news' | 'chatbot') => void;
  toggleTheme: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
  
  // Auth API
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  
  // News API
  loadNews: (filters?: { search?: string; category?: string; sentiment?: string; media?: string; date?: string; startDate?: string; endDate?: string; status?: string; location?: string }) => Promise<void>;
  saveNewsItem: (newsData: any, isEdit?: boolean, id?: string) => Promise<any>;
  removeNewsItem: (id: string) => Promise<boolean>;
  batchDeleteNews: (ids: string[]) => Promise<boolean>;
  batchUpdateCategory: (ids: string[], categoryId: string) => Promise<boolean>;
  batchUpdatePublishDate: (ids: string[], publishDate: string) => Promise<boolean>;
  batchUpdatePublishTime: (ids: string[], publishTime: string) => Promise<boolean>;
  batchUpdateSentiment: (ids: string[], sentiment: Sentiment) => Promise<boolean>;
  batchUpdateLocation: (ids: string[], location: string) => Promise<boolean>;

  // Social News API
  loadSocialNews: () => Promise<void>;
  createSocialNews: (payload: { jenisSosmed: string; caption: string; link: string; username: string; waktuPosting: string }) => Promise<boolean>;
  createSocialNewsBatch: (items: any[]) => Promise<boolean>;
  deleteSocialNews: (id: string) => Promise<boolean>;

  // Highlight API
  loadHighlights: () => Promise<void>;
  saveHighlight: (data: any, isEdit?: boolean, id?: string) => Promise<any>;
  removeHighlight: (id: string) => Promise<boolean>;
  reorderHighlights: (ids: string[]) => Promise<boolean>;
  
  // Scraper Keywords API
  loadKeywords: () => Promise<void>;
  saveKeyword: (text: string, active?: boolean, id?: string) => Promise<boolean>;
  removeKeyword: (id: string) => Promise<boolean>;
  
  // Master API
  createCategory: (name: string, color: string) => Promise<boolean>;
  updateCategory: (id: string, name: string, color: string) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;
  createMedia: (name: string, type: 'Online' | 'Cetak' | 'TV' | 'Radio', reach: 'Nasional' | 'Lokal' | 'Internasional', date?: string, provinsi?: string) => Promise<boolean>;
  loadMasterData: () => Promise<void>;
  
  // Analytics API
  loadStats: () => Promise<void>;
  loadLogs: () => Promise<void>;
  analyzeWithGemini: (payload: { title?: string; text?: string; url?: string; mediaName?: string; publishDate?: string; publishTime?: string }) => Promise<any>;
  crawlGoogleNews: (keyword: string, when: string, method?: string) => Promise<any[]>;
  
  // Settings API
  saveSettings: (settingsData: Partial<CustomSettings>) => Promise<boolean>;
  batchImportNews: (items: any[]) => Promise<any>;
  syncDatabase: () => Promise<boolean>;
  updateProfile: (name: string, email: string, avatarUrl: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultSettingsInit: CustomSettings = {
  companyName: 'Security Head Office',
  logoUrl: 'https://www.image2url.com/r2/default/images/1780156246537-cd69ae8e-001c-4401-bc28-6450bd31ace9.png',
  primaryColor: '#0f172a',
  headerText: 'Media Monitoring Report & Issue Tracking',
  footerText: 'Powered by Security Head Office © 2026',
  enableAiAssistant: true,
  theme: 'light',
  schedulerIntervalMinutes: 30,
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const authFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers);
    const activeToken = token || localStorage.getItem('mi_token');
    if (activeToken) {
      headers.set('Authorization', `Bearer ${activeToken}`);
    }
    const res = await fetch(input, {
      ...init,
      headers
    });
    if ((res.status === 401 || res.status === 403) && (user || token)) {
      const urlStr = typeof input === 'string' ? input : 'url' in input ? input.url : '';
      if (!urlStr.includes('/api/auth/login')) {
        console.warn('[Session Expired] Logging out user due to invalid token:', res.status);
        localStorage.removeItem('mi_user');
        localStorage.removeItem('mi_token');
        setUser(null);
        setToken(null);
        showToast('Sesi Anda telah berakhir. Silakan login kembali.', 'error');
      }
    }
    return res;
  };
  const [news, setNews] = useState<NewsItem[]>([]);
  const newsRef = React.useRef<NewsItem[]>([]);
  React.useEffect(() => {
    newsRef.current = news;
  }, [news]);

  const hasLoadedInitialNews = React.useRef(false);
  const notifiedRef = React.useRef<Set<string>>(new Set());
  const [categories, setCategories] = useState<Category[]>([]);
  const [medias, setMedias] = useState<MediaSource[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [settings, setSettings] = useState<CustomSettings>(defaultSettingsInit);

  useEffect(() => {
    if (settings) {
      setGlobalSettingsLogos(
        settings.pdfExportLogoLeft || "",
        settings.pdfExportLogoRight || "",
        settings.pdfExportLogoCoverLeft || "",
        settings.pdfExportLogoCoverRight || ""
      );
    }
  }, [settings]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [keywords, setKeywords] = useState<CrawlKeyword[]>([]);
  const [socialNews, setSocialNews] = useState<any[]>([]);
  const [activeTab, setTab] = useState<'portal' | 'dashboard' | 'manage' | 'master' | 'settings' | 'users' | 'pdf-studio' | 'social-news' | 'chatbot'>('portal');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [themeMode, setThemeModeState] = useState<'light' | 'dark' | 'system'>('system');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCrawlSyncing, setIsCrawlSyncing] = useState<boolean>(false);

  const triggerAutoSync = async () => {
    // Only users with role 'Admin' or 'Analis' can trigger/poll the crawler status.
    // We check both state and localStorage to ensure we have the latest user info on startup.
    const activeUser = user || (() => {
      try {
        const stored = localStorage.getItem('mi_user');
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    })();

    const hasCrawlerPermission = activeUser && (activeUser.role === 'Admin' || activeUser.role === 'Analis');

    if (!hasCrawlerPermission) {
      // For public users or other roles, we just hot-refresh the local data from the DB
      // without making unauthorized/redirecting scheduler API calls
      try {
        setIsCrawlSyncing(true);
        await Promise.all([
          loadNews(),
          loadStats(),
          loadHighlights(),
          loadSocialNews()
        ]);
      } catch (err) {
        console.error('Failed to refresh data:', err);
      } finally {
        setIsCrawlSyncing(false);
      }
      return;
    }

    try {
      setIsCrawlSyncing(true);
      // Trigger background crawler on startup or manual call
      await authFetch('/api/scheduler/trigger', { method: 'POST' });
      
      let pollCount = 0;
      let failureCount = 0;
      const interval = setInterval(async () => {
        pollCount++;
        try {
          const res = await authFetch('/api/scheduler/status');
          failureCount = 0; // Reset failure count on success
          if (res.ok) {
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const data = await res.json();
              // Stop polling if crawling is done OR we hit max limit (36 seconds to prevent infinite lock)
              if (!data.running || pollCount >= 12) {
                clearInterval(interval);
                setIsCrawlSyncing(false);
                
                // Hot-refresh news updates and dashboard metrics
                await Promise.all([
                  loadNews(),
                  loadStats(),
                  loadHighlights(),
                  loadSocialNews()
                ]);
                
                if (data.running === false && pollCount > 1) {
                  showToast('Aplikasi otomatis diperbarui dengan rilis berita terbaru!', 'success');
                }
              }
            } else {
              // Non-JSON response (e.g. redirected to cookie check html in frame context). Stop polling.
              console.warn('[Scheduler Polling] Non-JSON response received from status endpoint, stopping poll.');
              clearInterval(interval);
              setIsCrawlSyncing(false);
              
              // Still trigger refresh of UI items
              await Promise.all([
                loadNews(),
                loadStats(),
                loadHighlights(),
                loadSocialNews()
              ]);
            }
          } else {
            // Non-ok response, stop polling
            clearInterval(interval);
            setIsCrawlSyncing(false);
          }
        } catch (e) {
          failureCount++;
          console.warn(`[Scheduler Polling] Transient connection warning (Failed to fetch count: ${failureCount}/3):`, e);
          if (failureCount >= 3) {
            console.error('Error polling sync status (max consecutive failures reached):', e);
            clearInterval(interval);
            setIsCrawlSyncing(false);
          }
        }
      }, 3000); // Check every 3 seconds
    } catch (err) {
      console.error('Failed to run automatic crawler sync:', err);
      setIsCrawlSyncing(false);
    }
  };

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('Nasional');
  const [portalLocationFilter, setPortalLocationFilter] = useState<string>('all');
  const [socialLocationFilter, setSocialLocationFilter] = useState<string>('Semua');

  // Show dynamic toast helper
  const showToast = React.useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setToast({ message, type });
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToast = React.useCallback(() => {
    setToasts([]);
    setToast(null);
  }, []);

  // Set theme mode (light, dark, system)
  const setThemeMode = React.useCallback((mode: 'light' | 'dark' | 'system') => {
    setThemeModeState(mode);
    localStorage.setItem('mi_theme_mode', mode);
    
    let resolved: 'light' | 'dark' = 'light';
    if (mode === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolved = mode;
    }
    
    setTheme(resolved);
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.setProperty('color-scheme', 'only dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.setProperty('color-scheme', 'only light');
    }
  }, []);

  // Toggle Theme helper (cycles themeMode)
  const toggleTheme = React.useCallback(() => {
    let nextMode: 'light' | 'dark' | 'system';
    if (themeMode === 'light') {
      nextMode = 'dark';
    } else if (themeMode === 'dark') {
      nextMode = 'system';
    } else {
      nextMode = 'light';
    }
    setThemeMode(nextMode);
    showToast(`Tema warna diatur ke: ${nextMode === 'system' ? 'Sistem' : nextMode === 'dark' ? 'Gelap' : 'Terang'}`, 'info');
  }, [themeMode, setThemeMode, showToast]);

  // Listen for prefers-color-scheme system theme changes
  useEffect(() => {
    if (themeMode !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? 'dark' : 'light';
      setTheme(resolved);
      if (resolved === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.style.setProperty('color-scheme', 'only dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.setProperty('color-scheme', 'only light');
      }
    };
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [themeMode]);

  // Init Data load
  useEffect(() => {
    // Check localStorage for logged-in user session
    const storedUser = localStorage.getItem('mi_user');
    const storedToken = localStorage.getItem('mi_token');
    const storedThemeMode = localStorage.getItem('mi_theme_mode') as 'light' | 'dark' | 'system' | null;
    const storedTheme = localStorage.getItem('mi_theme');

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch (e) {
        localStorage.removeItem('mi_user');
        localStorage.removeItem('mi_token');
      }
    }

    const finalThemeMode = storedThemeMode || (storedTheme === 'dark' ? 'dark' : storedTheme === 'light' ? 'light' : 'system');
    setThemeModeState(finalThemeMode);

    let resolved: 'light' | 'dark' = 'light';
    if (finalThemeMode === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolved = finalThemeMode;
    }

    setTheme(resolved);
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.setProperty('color-scheme', 'only dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.setProperty('color-scheme', 'only light');
    }

    // Load initial system settings & master lists
    const loadInit = async () => {
      setIsLoading(true);
      try {
        // Fetch Settings
        const sRes = await authFetch('/api/settings');
        if (sRes.ok) {
          const sData = await sRes.json();
          setSettings(sData);
          
          // Prioritize localStorage over database-level global general settings theme
          const localThemeMode = localStorage.getItem('mi_theme_mode') as 'light' | 'dark' | 'system' | null;
          const finalMode = localThemeMode || sData.theme || 'system';
          
          setThemeModeState(finalMode as 'light' | 'dark' | 'system');
          
          let resolvedDb: 'light' | 'dark' = 'light';
          if (finalMode === 'system') {
            resolvedDb = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          } else {
            resolvedDb = finalMode as 'light' | 'dark';
          }
          
          setTheme(resolvedDb);
          if (resolvedDb === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.style.setProperty('color-scheme', 'only dark');
          } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.style.setProperty('color-scheme', 'only light');
          }
        }
        
        await Promise.all([
          loadMasterData(),
          loadNews(),
          loadStats(),
          loadHighlights(),
          loadKeywords(),
          loadSocialNews()
        ]);

        // Automatically kickstart a background auto-sync on app boot to guarantee latest news updates
        triggerAutoSync();
      } catch (err) {
        console.error('Error bootstrapping client state:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInit();
  }, []);

  // Load fresh user profile whenever token is set or loaded on start (syncs avatarUrl across devices)
  useEffect(() => {
    const fetchFreshProfile = async () => {
      if (!token) return;
      try {
        const res = await authFetch('/api/users/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
            localStorage.setItem('mi_user', JSON.stringify(data.user));
          }
        }
      } catch (err) {
        console.warn('[Profile Sync] Failed to fetch fresh profile:', err);
      }
    };
    fetchFreshProfile();
  }, [token]);

  // Sync state changes Toast Auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        clearToast();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Authenticate user
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('mi_user', JSON.stringify(data.user));
        localStorage.setItem('mi_token', data.token);
        showToast(`Selamat datang kembali, ${data.user.name}!`, 'success');
        
        // Re-fetch statistics and audit log
        loadLogs();
        return true;
      } else {
        showToast(data.message || 'Gagal login!', 'error');
        return false;
      }
    } catch (err) {
      showToast('Gagal terhubung dengan server auth!', 'error');
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('mi_user');
    localStorage.removeItem('mi_token');
    showToast('Berhasil keluar sistem.', 'info');
    if (activeTab !== 'portal') {
      setTab('portal');
    }
  };

  const updateProfile = async (name: string, email: string, avatarUrl: string): Promise<boolean> => {
    try {
      const res = await authFetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, avatarUrl })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        localStorage.setItem('mi_user', JSON.stringify(data.user));
        showToast('Profil dan foto berhasil diperbarui!', 'success');
        return true;
      } else {
        showToast(data.message || 'Gagal memperbarui profil!', 'error');
        return false;
      }
    } catch (err) {
      showToast('Gagal terhubung ke server untuk memperbarui profil!', 'error');
      return false;
    }
  };

  // News fetch with filter query params support
  const loadNews = React.useCallback(async (filters?: { search?: string; category?: string; sentiment?: string; media?: string; date?: string; startDate?: string; endDate?: string; status?: string; location?: string }) => {
    try {
      const params = new URLSearchParams();
      if (filters) {
        if (filters.search) params.append('search', filters.search);
        if (filters.category) params.append('category', filters.category);
        if (filters.sentiment) params.append('sentiment', filters.sentiment);
        if (filters.media) params.append('media', filters.media);
        if (filters.date) params.append('date', filters.date);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.status) params.append('status', filters.status);
        if (filters.location) params.append('location', filters.location);
      } else {
        // By default on public portal, show Published news only
        // unless of course we are an manager/editor inside managing view
        if (activeTab === 'portal') {
          params.append('status', 'Published');
        }
      }

      const res = await authFetch(`/api/news?_t=${Date.now()}&${params.toString()}`);
      if (res.ok) {
        const data = await res.json() as NewsItem[];
        
        // Check for newly added CRITICAL ISSUE news items
        const currentNews = newsRef.current;
        if (hasLoadedInitialNews.current && currentNews.length > 0) {
          const newCriticalNews = data.filter((item) => {
            const isCriticalMsg = item.categoryName?.trim().toUpperCase() === 'CRITICAL ISSUE' || item.categoryId === 'cat-22';
            const isNewItem = !currentNews.some((existing) => existing.id === item.id) && !notifiedRef.current.has(item.id);
            return isCriticalMsg && isNewItem;
          });

          if (newCriticalNews.length > 0) {
            newCriticalNews.forEach((criticalItem) => {
              notifiedRef.current.add(criticalItem.id);
              // Trigger red escalation toast alert
              showToast(`ESKALASI MEDIA (CRITICAL): "${criticalItem.title}" [Media: ${criticalItem.mediaName || 'Online'}]!`, 'error');
              
              // Play double sawtooth synthesizer warning tones to alert user
              try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                if (audioCtx) {
                  const osc = audioCtx.createOscillator();
                  const gain = audioCtx.createGain();
                  osc.connect(gain);
                  gain.connect(audioCtx.destination);
                  osc.type = 'sawtooth';
                  osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5 tone
                  gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
                  osc.start();
                  osc.stop(audioCtx.currentTime + 0.3);
                  
                  setTimeout(() => {
                    try {
                      const osc2 = audioCtx.createOscillator();
                      const gain2 = audioCtx.createGain();
                      osc2.connect(gain2);
                      gain2.connect(audioCtx.destination);
                      osc2.type = 'sawtooth';
                      osc2.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 tone
                      gain2.gain.setValueAtTime(0.12, audioCtx.currentTime);
                      osc2.start();
                      osc2.stop(audioCtx.currentTime + 0.35);
                    } catch (_) {}
                  }, 320);
                }
              } catch (audioErr) {
                console.warn('Real-time escalation sound alert blocked/failed:', audioErr);
              }
            });
          }
        } else {
          // Pre-populate notified sets on initial launch so we don't spam notifications for old records
          data.forEach((item) => {
            const isCriticalMsg = item.categoryName?.trim().toUpperCase() === 'CRITICAL ISSUE' || item.categoryId === 'cat-22';
            if (isCriticalMsg) {
              notifiedRef.current.add(item.id);
            }
          });
          hasLoadedInitialNews.current = true;
        }

        setNews(data);
      }
    } catch (err) {
      console.error('Error fetching news list:', err);
    }
  }, [activeTab, showToast]);

  const loadMasterData = React.useCallback(async () => {
    try {
      const [catRes, medRes] = await Promise.all([
        authFetch('/api/categories'),
        authFetch('/api/medias')
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (medRes.ok) setMedias(await medRes.json());
    } catch (e) {
      console.error('Error loading master lists:', e);
    }
  }, []);

  const loadStats = React.useCallback(async () => {
    try {
      const res = await authFetch(`/api/stats?_t=${Date.now()}`);
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (err) {
      console.error('Error calculating dashboard numbers:', err);
    }
  }, []);

  const loadLogs = React.useCallback(async () => {
    try {
      const res = await authFetch(`/api/logs?_t=${Date.now()}`);
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (err) {
      console.error('Error getting security trails:', err);
    }
  }, []);

  const loadHighlights = React.useCallback(async () => {
    try {
      const res = await authFetch(`/api/highlights?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setHighlights(data);
      }
    } catch (err) {
      console.error('Error fetching highlights:', err);
    }
  }, []);

  const saveHighlight = async (data: any, isEdit = false, id?: string) => {
    try {
      const url = isEdit ? `/api/highlights/${id}` : '/api/highlights';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          user: user ? { id: user.id, username: user.username, role: user.role } : undefined
        })
      });
      if (res.ok) {
        const bodyObj = await res.json();
        if (bodyObj.success) {
          showToast(isEdit ? 'Highlight berhasil diperbarui!' : 'Highlight baru ditambahkan!', 'success');
          await loadHighlights();
          return bodyObj.highlight;
        } else {
          showToast(bodyObj.message || 'Gagal menyimpan highlight!', 'error');
        }
      } else {
        const bodyObj = await res.json().catch(() => ({ message: 'Gagal menghubungi server' }));
        showToast(bodyObj.message || 'Error koneksi server!', 'error');
      }
    } catch (err) {
      showToast('Gagal menghubungi server!', 'error');
    }
    return null;
  };

  const removeHighlight = async (id: string): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/highlights/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Highlight berhasil dihapus!', 'success');
        await loadHighlights();
        return true;
      }
    } catch (err) {
      showToast('Gagal menghapus highlight!', 'error');
    }
    return false;
  };

  const reorderHighlights = async (ids: string[]): Promise<boolean> => {
    try {
      const res = await authFetch('/api/highlights/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids,
          user: user ? { id: user.id, username: user.username, role: user.role } : undefined
        })
      });
      if (res.ok) {
        showToast('Urutan manual berhasil disimpan!', 'success');
        await loadHighlights();
        return true;
      }
    } catch (err) {
      showToast('Gagal menyimpan urutan manual!', 'error');
    }
    return false;
  };

  const loadKeywords = async () => {
    try {
      const res = await authFetch('/api/keywords');
      if (res.ok) {
        setKeywords(await res.json());
      }
    } catch (err) {
      console.error('Error fetching crawling keywords:', err);
    }
  };

  const saveKeyword = async (text: string, active = true, id?: string): Promise<boolean> => {
    try {
      const isEdit = !!id;
      const url = isEdit ? `/api/keywords/${id}` : '/api/keywords';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          active,
          user: user ? { id: user.id, username: user.username, role: user.role } : undefined
        })
      });
      if (res.ok) {
        showToast(isEdit ? 'Topik berhasil diperbarui!' : 'Kata kunci pemantauan berhasil ditambahkan!', 'success');
        await loadKeywords();
        return true;
      } else {
        const errObj = await res.json().catch(() => ({}));
        showToast(errObj.error || 'Gagal menyimpan kata kunci!', 'error');
      }
    } catch (err) {
      showToast('Gagal menghubungi server!', 'error');
    }
    return false;
  };

  const removeKeyword = async (id: string): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/keywords/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Topik pemantauan berhasil dihapus!', 'success');
        await loadKeywords();
        return true;
      }
    } catch (err) {
      showToast('Gagal menghapus kata kunci!', 'error');
    }
    return false;
  };

  const saveNewsItem = async (newsData: any, isEdit = false, id?: string) => {
    try {
      const url = isEdit ? `/api/news/${id}` : '/api/news';
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newsData,
          user: user ? { id: user.id, username: user.username, role: user.role } : undefined
        })
      });

      if (res.ok) {
        const item = await res.json();
        showToast(isEdit ? 'Berita berhasil diperbarui!' : 'Berita baru berhasil ditayangkan!', 'success');
        // Refresh items and numbers
        await loadNews();
        await loadStats();

        // Automatic Google Sheets export on ADDITION of data
        if (!isEdit) {
          try {
            const googleToken = getCachedAccessToken();
            if (googleToken && settings.googleSpreadsheetId) {
              await appendIssueToSheet(
                googleToken,
                settings.googleSpreadsheetId,
                settings.googleSheetName || 'Daftar Isu',
                {
                  id: item.id,
                  publishDate: item.publishDate,
                  publishTime: item.publishTime || '12:00',
                  title: item.title,
                  summary: item.summary,
                  mediaName: item.mediaName,
                  categoryName: item.categoryName,
                  sentiment: item.sentiment,
                  location: item.location || 'DKI Jakarta',
                  link: item.link || '',
                  tags: item.tags || [],
                  status: item.status
                }
              );
              showToast('Berita baru berhasil diekspor otomatis ke Google Sheets!', 'success');
            }
          } catch (eSheets) {
            console.warn('Auto-sync to Google Sheets on saveNewsItem failed:', eSheets);
          }
        }

        return item;
      } else {
        const errData = await res.json();
        showToast(errData.message || 'Gagal menyimpan artikel!', 'error');
        return null;
      }
    } catch (err) {
      showToast('Galat jaringan saat menyimpan berita!', 'error');
      return null;
    }
  };

  const batchImportNews = async (items: any[]) => {
    try {
      const res = await authFetch('/api/news/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          user: user ? { id: user.id, username: user.username, role: user.role } : undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Berhasil mengimpor ${data.count} isu dari Google Sheets!`, 'success');
        await loadNews();
        await loadStats();
        await loadLogs();
        return data;
      } else {
        const errData = await res.json();
        showToast(errData.message || 'Gagal mengimpor isu!', 'error');
        return null;
      }
    } catch (e) {
      console.error('Network error during batch import:', e);
      showToast('Gagal terhubung dengan server untuk mengimpor isu!', 'error');
      return null;
    }
  };

  const removeNewsItem = async (id: string): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/news/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: user ? { id: user.id, username: user.username, role: user.role } : undefined
        })
      });

      if (res.ok) {
        showToast('Artikel berhasil dihapus dari sistem.', 'success');
        await loadNews();
        await loadStats();
        return true;
      } else {
        showToast('Gagal menghapus berita!', 'error');
        return false;
      }
    } catch (err) {
      showToast('Gagal koneksi server saat menghapus berita!', 'error');
      return false;
    }
  };

  const batchDeleteNews = async (ids: string[]): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/news/batch-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids,
          user: user ? { id: user.id, username: user.username, role: user.role } : undefined
        })
      });

      if (res.ok) {
        showToast(`${ids.length} artikel berhasil dihapus dari sistem.`, 'success');
        await loadNews();
        await loadStats();
        return true;
      } else {
        showToast('Gagal menghapus berita terpilih!', 'error');
        return false;
      }
    } catch (err) {
      showToast('Gagal koneksi server saat menghapus berita terpilih!', 'error');
      return false;
    }
  };

  const batchUpdateCategory = async (ids: string[], categoryId: string): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/news/batch-update-category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids,
          categoryId,
          user: user ? { id: user.id, username: user.username, role: user.role } : undefined
        })
      });

      if (res.ok) {
        showToast(`${ids.length} artikel berhasil diperbarui kategorinya.`, 'success');
        await loadNews();
        await loadStats();
        return true;
      } else {
        const errData = await res.json();
        showToast(errData.message || 'Gagal mengubah kategori berita terpilih!', 'error');
        return false;
      }
    } catch (err) {
      showToast('Gagal koneksi server saat mengubah kategori berita terpilih!', 'error');
      return false;
    }
  };

  const batchUpdatePublishDate = async (ids: string[], publishDate: string): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/news/batch-update-publish-date`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids,
          publishDate,
          user: user ? { id: user.id, username: user.username, role: user.role } : undefined
        })
      });

      if (res.ok) {
        showToast(`${ids.length} artikel berhasil diperbarui tanggal publikasinya.`, 'success');
        await loadNews();
        await loadStats();
        return true;
      } else {
        const errData = await res.json();
        showToast(errData.message || 'Gagal mengubah tanggal publikasi berita terpilih!', 'error');
        return false;
      }
    } catch (err) {
      showToast('Gagal koneksi server saat mengubah tanggal publikasi berita terpilih!', 'error');
      return false;
    }
  };

  const batchUpdatePublishTime = async (ids: string[], publishTime: string): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/news/batch-update-publish-time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids,
          publishTime,
          user: user ? { id: user.id, username: user.username, role: user.role } : undefined
        })
      });

      if (res.ok) {
        showToast(`${ids.length} artikel berhasil diperbarui jam publikasinya.`, 'success');
        await loadNews();
        await loadStats();
        return true;
      } else {
        const errData = await res.json();
        showToast(errData.message || 'Gagal mengubah jam publikasi berita terpilih!', 'error');
        return false;
      }
    } catch (err) {
      showToast('Gagal koneksi server saat mengubah jam publikasi berita terpilih!', 'error');
      return false;
    }
  };

  const batchUpdateSentiment = async (ids: string[], sentiment: Sentiment): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/news/batch-update-sentiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids,
          sentiment,
          user: user ? { id: user.id, username: user.username, role: user.role } : undefined
        })
      });

      if (res.ok) {
        showToast(`${ids.length} artikel berhasil diperbarui sentimennya menjadi ${sentiment}.`, 'success');
        await loadNews();
        await loadStats();
        return true;
      } else {
        const errData = await res.json();
        showToast(errData.message || 'Gagal mengubah sentimen berita terpilih!', 'error');
        return false;
      }
    } catch (err) {
      showToast('Gagal koneksi server saat mengubah sentimen berita terpilih!', 'error');
      return false;
    }
  };

  const batchUpdateLocation = async (ids: string[], location: string): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/news/batch-update-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids,
          location,
          user: user ? { id: user.id, username: user.username, role: user.role } : undefined
        })
      });

      if (res.ok) {
        showToast(`${ids.length} artikel berhasil diperbarui wilayahnya menjadi ${location}.`, 'success');
        await loadNews();
        await loadStats();
        return true;
      } else {
        const errData = await res.json();
        showToast(errData.message || 'Gagal mengubah wilayah berita terpilih!', 'error');
        return false;
      }
    } catch (err) {
      showToast('Gagal koneksi server saat mengubah wilayah berita terpilih!', 'error');
      return false;
    }
  };

  const createCategory = async (name: string, color: string): Promise<boolean> => {
    try {
      const res = await authFetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          color,
          user: user ? { id: user.id, username: user.username, role: user.role } : undefined
        })
      });

      if (res.ok) {
        showToast(`Kategori "${name}" ditambahkan.`, 'success');
        await loadMasterData();
        return true;
      }
      return false;
    } catch (e) {
      showToast('Gagal menambah kategori.', 'error');
      return false;
    }
  };

  const updateCategory = async (id: string, name: string, color: string): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          color,
          user: user ? { id: user.id, username: user.username, role: user.role } : undefined
        })
      });

      if (res.ok) {
        showToast(`Kategori "${name}" berhasil diubah.`, 'success');
        await loadMasterData();
        return true;
      }
      return false;
    } catch (e) {
      showToast('Gagal mengubah kategori.', 'error');
      return false;
    }
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    try {
      const uParam = user ? encodeURIComponent(JSON.stringify({ id: user.id, username: user.username, role: user.role })) : '';
      const res = await authFetch(`/api/categories/${id}?user=${uParam}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        showToast('Kategori berhasil dihapus.', 'success');
        await loadMasterData();
        return true;
      }
      return false;
    } catch (e) {
      showToast('Gagal menghapus kategori.', 'error');
      return false;
    }
  };

  const loadSocialNews = React.useCallback(async () => {
    try {
      const res = await authFetch(`/api/social-news?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        
        // Self-healing synchronization:
        // If the stateless backend restarted and returned empty, but the user's
        // browser has previously created social news in local storage, restore them!
        const stored = localStorage.getItem('mi_social_news');
        if (data.length === 0 && stored) {
          try {
            const parsedStored = JSON.parse(stored);
            if (parsedStored && parsedStored.length > 0) {
              console.log('[Self-Healing Sync] Restoring social news from localStorage backup to server...', parsedStored);
              await authFetch('/api/social-news/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  items: parsedStored,
                  user: user ? { id: user.id, username: user.username, role: user.role } : undefined
                })
              });
              
              // Refetch the successfully restored list from the server
              const refetchRes = await authFetch(`/api/social-news?_t=${Date.now()}`);
              if (refetchRes.ok) {
                const refetchedData = await refetchRes.json();
                setSocialNews(refetchedData);
                return;
              }
            }
          } catch (e) {
            console.error('Failed to auto-restore social news backup:', e);
          }
        }
        
        setSocialNews(data);
        try {
          localStorage.setItem('mi_social_news', JSON.stringify(data));
        } catch (storageError) {
          console.warn('[Storage] Quota exceeded or error setting mi_social_news backup. Trying to store a smaller subset...', storageError);
          try {
            // Keep only the latest 100 items as a lightweight backup to prevent exceeding quota
            const subset = data.slice(0, 100);
            localStorage.setItem('mi_social_news', JSON.stringify(subset));
          } catch (subsetError) {
            console.error('[Storage] Slicing to 100 also failed or still exceeded quota. Removing mi_social_news key.', subsetError);
            try {
              localStorage.removeItem('mi_social_news');
            } catch (removeError) {}
          }
        }
      }
    } catch (err) {
      console.error('Error loading social news:', err);
      const stored = localStorage.getItem('mi_social_news');
      if (stored) {
        try {
          setSocialNews(JSON.parse(stored));
        } catch (e) {}
      }
    }
  }, [user]);

  const createSocialNews = async (payload: { jenisSosmed: string; caption: string; link: string; username: string; waktuPosting: string }): Promise<boolean> => {
    try {
      const res = await authFetch('/api/social-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          user: user ? { id: user.id, username: user.username, role: user.role } : undefined
        })
      });

      if (res.ok) {
        const resData = await res.json();
        const createdItem = resData.data;
        showToast('Berita media sosial berhasil dianalisis & disimpan!', 'success');
        await loadSocialNews();

        // Auto-sync to Google Sheets if configured and Google token is cached
        try {
          const googleToken = getCachedAccessToken();
          if (googleToken && settings.googleSpreadsheetId) {
            await appendSocialToSheet(
              googleToken,
              settings.googleSpreadsheetId,
              settings.googleSheetSosmedName || 'Pantauan Sosmed',
              {
                id: createdItem.id,
                tanggalInput: createdItem.tanggalInput || createdItem.createdAt || new Date().toISOString(),
                jenisSosmed: createdItem.jenisSosmed,
                username: createdItem.username,
                caption: createdItem.caption,
                link: createdItem.link,
                waktuPosting: createdItem.waktuPosting,
                sentimen: createdItem.sentimen,
                kategori: createdItem.kategori,
                lokasi: createdItem.lokasi,
                urgensi: createdItem.urgensi,
                ringkasan: createdItem.ringkasan,
                analisis: createdItem.analisis
              }
            );
            showToast('Berita sosmed tersinkronisasi otomatis ke Google Sheets!', 'success');
          }
        } catch (eSheets) {
          console.warn('Social news sheets auto-sync error:', eSheets);
        }

        return true;
      } else {
        const errData = await res.json();
        showToast(errData.message || 'Gagal menyimpan berita media sosial!', 'error');
        return false;
      }
    } catch (err) {
      showToast('Gagal koneksi server saat menyimpan berita media sosial!', 'error');
      return false;
    }
  };

  const createSocialNewsBatch = async (items: any[]): Promise<boolean> => {
    try {
      const res = await authFetch('/api/social-news/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          user: user ? { id: user.id, username: user.username, role: user.role } : undefined
        })
      });

      if (res.ok) {
        showToast('Unggah massal berita media sosial berhasil dianalisis!', 'success');
        await loadSocialNews();
        return true;
      } else {
        const errData = await res.json();
        showToast(errData.message || 'Gagal menyimpan berita massal media sosial!', 'error');
        return false;
      }
    } catch (err) {
      showToast('Gagal koneksi server saat memproses unggah massal!', 'error');
      return false;
    }
  };

  const deleteSocialNews = async (id: string): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/social-news/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: user ? { id: user.id, username: user.username, role: user.role } : undefined
        })
      });

      if (res.ok) {
        showToast('Berita media sosial berhasil dihapus.', 'success');
        await loadSocialNews();
        return true;
      } else {
        const errData = await res.json();
        showToast(errData.message || 'Gagal menghapus berita media sosial!', 'error');
        return false;
      }
    } catch (err) {
      showToast('Gagal koneksi server saat menghapus berita media sosial!', 'error');
      return false;
    }
  };

  const createMedia = async (name: string, type: 'Online' | 'Cetak' | 'TV' | 'Radio', reach: 'Nasional' | 'Lokal' | 'Internasional', date?: string, provinsi?: string): Promise<boolean> => {
    try {
      const res = await authFetch('/api/medias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          reach,
          date,
          provinsi,
          user: user ? { id: user.id, username: user.username, role: user.role } : undefined
        })
      });

      if (res.ok) {
        showToast(`Sumber Media "${name}" ditambahkan.`, 'success');
        await loadMasterData();
        return true;
      }
      return false;
    } catch (e) {
      showToast('Gagal menambah media.', 'error');
      return false;
    }
  };

  const analyzeWithGemini = async (payload: { title?: string; text?: string; url?: string; mediaName?: string; publishDate?: string; publishTime?: string }): Promise<any> => {
    try {
      const res = await authFetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        return data.analysis;
      } else {
        showToast('Gagal menganalisis berita dengan AI!', 'error');
        return null;
      }
    } catch (e) {
      showToast('Kesalahan koneksi saat menghubungi AI Engine.', 'error');
      return null;
    }
  };

  const crawlGoogleNews = async (keyword: string, when: string, method: string = settings?.autoCrawlMethod || 'auto'): Promise<any[]> => {
    try {
      const uParam = user ? encodeURIComponent(JSON.stringify({ id: user.id, username: user.username, role: user.role })) : '';
      const response = await authFetch(`/api/crawl-google-news?keyword=${encodeURIComponent(keyword)}&when=${encodeURIComponent(when)}&method=${encodeURIComponent(method)}&user=${uParam}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          showToast(`Berhasil menemukan ${data.count} berita dari Google News.`, 'success');
          return data.items;
        } else {
          showToast(data.message || 'Gagal crawling berita.', 'error');
          return [];
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(errorData.message || 'Gagal crawling Google News.', 'error');
        return [];
      }
    } catch (e) {
      showToast('Koneksi terputus saat crawling Google News.', 'error');
      return [];
    }
  };

  const saveSettings = async (settingsData: Partial<CustomSettings>): Promise<boolean> => {
    try {
      const res = await authFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settingsData,
          user: user ? { id: user.id, username: user.username, role: user.role } : undefined
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        showToast('Pengaturan konfigurasi berhasil diperbarui.', 'success');
        return true;
      }
      return false;
    } catch (e) {
      showToast('Gagal menyimpan pengaturan.', 'error');
      return false;
    }
  };

  const syncDatabase = async (): Promise<boolean> => {
    try {
      showToast('Menghubungkan ke Google Cloud Firestore...', 'info');
      const res = await authFetch('/api/database/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        showToast('Sinkronisasi Firestore berhasil! Memuat ulang data lokal...', 'success');
        await Promise.all([
          loadMasterData(),
          loadNews(),
          loadStats(),
          loadHighlights(),
          loadKeywords(),
          loadSocialNews(),
          loadLogs()
        ]);
        showToast('Seluruh data berhasil diperbarui dengan Firestore!', 'success');
        return true;
      } else {
        const err = await res.json();
        showToast(err.message || 'Gagal sinkronisasi dengan database awan.', 'error');
        return false;
      }
    } catch (e) {
      showToast('Kesalahan koneksi saat menyinkronkan database.', 'error');
      return false;
    }
  };

  return (
    <AppContext.Provider value={{
      user,
      token,
      authFetch,
      news,
      categories,
      medias,
      logs,
      settings,
      stats,
      highlights,
      keywords,
      socialNews,
      activeTab,
      theme,
      themeMode,
      setThemeMode,
      isLoading,
      isCrawlSyncing,
      triggerAutoSync,
      toast,
      toasts,
      dismissToast,
      selectedProvince,
      setSelectedProvince,
      portalLocationFilter,
      setPortalLocationFilter,
      socialLocationFilter,
      setSocialLocationFilter,
      setTab,
      toggleTheme,
      showToast,
      clearToast,
      login,
      logout,
      loadNews,
      saveNewsItem,
      removeNewsItem,
      batchDeleteNews,
      batchUpdateCategory,
      batchUpdatePublishDate,
      batchUpdatePublishTime,
      batchUpdateSentiment,
      batchUpdateLocation,
      loadSocialNews,
      createSocialNews,
      createSocialNewsBatch,
      deleteSocialNews,
      loadHighlights,
      saveHighlight,
      removeHighlight,
      reorderHighlights,
      loadKeywords,
      saveKeyword,
      removeKeyword,
      createCategory,
      updateCategory,
      deleteCategory,
      createMedia,
      loadMasterData,
      loadStats,
      loadLogs,
      analyzeWithGemini,
      crawlGoogleNews,
      saveSettings,
      batchImportNews,
      syncDatabase,
      updateProfile
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
};
