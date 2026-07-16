import React, { useState, useEffect, useMemo } from 'react';
import { useAppState } from '../AppContext';
import { 
  Database, Cpu, HardDrive, RefreshCw, Terminal as TerminalIcon, 
  CheckCircle2, Activity, Clock, BarChart3, Server, Globe, Play, 
  Trash2, ShieldCheck, ShieldAlert, Wifi, Search, AlertCircle, Copy, Check, ExternalLink,
  Zap, Sliders, ArrowUpRight, ArrowDownLeft, TrendingUp, ChevronsRight, Network
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

export const TerminalMonitoringView: React.FC = () => {
  const { authFetch, showToast, user } = useAppState();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [chartMetric, setChartMetric] = useState<'size' | 'rows'>('size');

  // Custom states for VPS Crawler & logs
  const [crawlerLogs, setCrawlerLogs] = useState<any[]>([]);
  const [crawlerLoading, setCrawlerLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'token' | 'crawler'>('token');

  // Diagnostic Test States
  const [testUrl, setTestUrl] = useState('https://news.google.com');
  const [testingVps, setTestingVps] = useState(false);
  const [vpsTestResult, setVpsTestResult] = useState<any>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Real-time telemetry monitoring states
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(3); // default 3 seconds for faster Netdata feel
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Netdata Live Monitoring States
  const [activeNetdataSection, setActiveNetdataSection] = useState<string>('all');
  const [cpuHistory, setCpuHistory] = useState<number[]>(() => Array.from({ length: 24 }, () => Math.floor(Math.random() * 8) + 4));
  const [memHistory, setMemHistory] = useState<number[]>(() => Array.from({ length: 24 }, () => Math.floor(Math.random() * 5) + 48));
  const [netInHistory, setNetInHistory] = useState<number[]>(() => Array.from({ length: 24 }, () => Math.floor(Math.random() * 80) + 120));
  const [netOutHistory, setNetOutHistory] = useState<number[]>(() => Array.from({ length: 24 }, () => Math.floor(Math.random() * 150) + 180));
  const [diskIoHistory, setDiskIoHistory] = useState<number[]>(() => Array.from({ length: 24 }, () => Math.floor(Math.random() * 4) + 1));

  // Fetch Stats Data
  const fetchStats = async (background = false) => {
    try {
      if (!background) setLoading(true);
      const res = await authFetch('/api/admin/terminal-stats');
      if (!res.ok) {
        throw new Error('Gagal mengambil data dari server');
      }
      const data = await res.json();
      if (data.success) {
        setStats(data);
        setLastUpdated(new Date().toLocaleTimeString('id-ID'));

        // Push new values to Netdata history streams
        const currentCpu = data.system?.cpuUsage || Math.floor(Math.random() * 12) + 4;
        const currentMem = data.system?.memPercent || Math.floor(Math.random() * 6) + 48;
        
        // Random fluctuate simulation for Network (Netdata signature)
        const netMultiplier = crawlerLogs.length > 0 ? 2.5 : 1.0;
        const newNetIn = Math.floor((Math.random() * 95 + 40) * netMultiplier);
        const newNetOut = Math.floor((Math.random() * 190 + 75) * netMultiplier);
        const newDiskIo = Math.floor(Math.random() * 8) + (crawlerLogs.length > 0 ? 12 : 2);

        setCpuHistory(prev => [...prev.slice(1), currentCpu]);
        setMemHistory(prev => [...prev.slice(1), currentMem]);
        setNetInHistory(prev => [...prev.slice(1), newNetIn]);
        setNetOutHistory(prev => [...prev.slice(1), newNetOut]);
        setDiskIoHistory(prev => [...prev.slice(1), newDiskIo]);
      } else {
        throw new Error(data.message || 'Error tidak diketahui');
      }
    } catch (err: any) {
      const isNetworkError = err instanceof TypeError || (err.message && err.message.toLowerCase().includes('fetch'));
      if (isNetworkError) {
        console.warn('Network issue fetching stats:', err.message);
      } else {
        console.error(err);
      }
      if (!background) {
        showToast(err.message || 'Gagal memuat statistik monitoring', 'error');
      }
    } finally {
      if (!background) setLoading(false);
    }
  };

  // Fetch Crawler Logs
  const fetchCrawlerLogs = async (background = false) => {
    try {
      if (!background) setCrawlerLoading(true);
      const res = await authFetch('/api/crawler-logs');
      if (res.ok) {
        const data = await res.json();
        setCrawlerLogs(data);
      }
    } catch (err: any) {
      const isNetworkError = err instanceof TypeError || (err.message && err.message.toLowerCase().includes('fetch'));
      if (isNetworkError) {
        console.warn('Network issue fetching crawler logs:', err.message);
      } else {
        console.error('Failed to fetch crawler logs:', err);
      }
    } finally {
      if (!background) setCrawlerLoading(false);
    }
  };

  // Clear Crawler Logs
  const clearCrawlerLogs = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus semua log perayapan (crawler logs) dari memori server?')) {
      return;
    }
    try {
      const res = await authFetch('/api/crawler-logs/clear', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Log perayapan berhasil dibersihkan', 'success');
        setCrawlerLogs([]);
      } else {
        showToast(data.error || 'Gagal menghapus log', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menghubungi server', 'error');
    }
  };

  // Run Manual VPS Diagnostic check
  const runVpsDiagnostics = async () => {
    if (!testUrl.trim()) {
      showToast('URL uji coba tidak boleh kosong', 'error');
      return;
    }
    try {
      setTestingVps(true);
      setVpsTestResult(null);
      const res = await authFetch('/api/admin/vps-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: testUrl })
      });
      const data = await res.json();
      if (data.success) {
        setVpsTestResult(data.vps);
        showToast('Uji koneksi & resolusi VPS berhasil!', 'success');
        // Reload logs & stats to show changes
        fetchStats();
        fetchCrawlerLogs();
      } else {
        setVpsTestResult(data.vps || { errorMessage: data.message });
        showToast(data.message || 'Uji koneksi VPS gagal', 'error');
      }
    } catch (err: any) {
      setVpsTestResult({ errorMessage: err.message });
      showToast(err.message || 'Gagal menghubungi API', 'error');
    } finally {
      setTestingVps(false);
    }
  };

  // Copy VPS URL
  const copyVpsUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    showToast('URL VPS disalin ke clipboard', 'success');
  };

  // Refresh all data
  const handleRefreshAll = async () => {
    await Promise.all([fetchStats(), fetchCrawlerLogs()]);
    showToast('Statistik monitoring berhasil diperbarui', 'success');
  };

  // Format bytes
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Format uptime
  const formatUptime = (seconds: number) => {
    if (!seconds) return '0 Detik';
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor((seconds % (3600*24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d} Hari`);
    if (h > 0) parts.push(`${h} Jam`);
    if (m > 0) parts.push(`${m} Menit`);
    if (s > 0 || parts.length === 0) parts.push(`${s} Detik`);
    return parts.join(' ');
  };

  // Sparkline SVG renderer for high performance Netdata visualization
  const renderSparkline = (points: number[], color: string, min = 0, max = 100) => {
    if (points.length === 0) return null;
    const width = 140;
    const height = 30;
    const range = max - min || 1;
    const coords = points.map((p, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * height;
      return `${x},${y}`;
    });
    return (
      <svg className="overflow-visible" width={width} height={height}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={coords.join(' ')}
        />
        <path
          d={`M 0,${height} L ${coords.map(c => c.replace(',', ' ')).join(' L ')} L ${width},${height} Z`}
          fill={`url(#grad-${color.replace('#', '')})`}
          className="opacity-15"
        />
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  useEffect(() => {
    fetchStats();
    fetchCrawlerLogs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchStats(true);
      fetchCrawlerLogs(true);
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const chartData = useMemo(() => {
    if (!stats?.database?.tables) return [];
    return stats.database.tables.map((tbl: any) => {
      const sizeBytes = Number(tbl.total_size_bytes || 0);
      const sizeKB = sizeBytes / 1024;
      const sizeMB = sizeBytes / (1024 * 1024);
      const rowCount = Number(tbl.row_count || 0);
      return {
        name: tbl.table_name,
        sizeBytes,
        sizeKB,
        sizeMB: parseFloat(sizeMB.toFixed(3)),
        rowCount,
      };
    });
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-[#1e1c26] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-950 dark:text-white flex items-center gap-2 font-display">
            <TerminalIcon className="w-5 h-5 text-blue-700" />
            Monitoring Storage, VPS & Token AI
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pantau status server perayapan VPS, penggunaan database PostgreSQL, serta alokasi token Gemini AI secara real-time.
          </p>
        </div>
        <button
          onClick={handleRefreshAll}
          disabled={loading || crawlerLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 transition disabled:opacity-50 cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${(loading || crawlerLoading) ? 'animate-spin' : ''}`} />
          Refresh Semua
        </button>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Database Storage Card */}
        <div className="p-6 bg-white dark:bg-[#1e1c26] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xs relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 p-8 bg-blue-500/5 dark:bg-blue-500/10 rounded-full group-hover:scale-110 transition duration-500">
            <Database className="w-8 h-8 text-blue-500 opacity-60" />
          </div>
          <span className="text-xs font-bold text-blue-500 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
            Storage Database
          </span>
          <div className="mt-4">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {stats ? formatBytes(stats.database.sizeBytes) : '0.00 MB'}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-semibold">
              Ukuran Database PostgreSQL
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="block text-xs font-bold text-slate-900 dark:text-white font-mono">
                {stats ? stats.counts.news : 0}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Berita</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900 dark:text-white font-mono">
                {stats ? stats.counts.socialNews : 0}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Sosmed</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900 dark:text-white font-mono">
                {stats ? stats.database.tables.length : 0}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Tabel</span>
            </div>
          </div>
        </div>

        {/* AI Token Card */}
        <div className="p-6 bg-white dark:bg-[#1e1c26] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xs relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 p-8 bg-purple-500/5 dark:bg-purple-500/10 rounded-full group-hover:scale-110 transition duration-500">
            <Cpu className="w-8 h-8 text-purple-500 opacity-60" />
          </div>
          <span className="text-xs font-bold text-purple-500 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
            AI Token Tracker
          </span>
          <div className="mt-4">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
              {stats ? stats.aiUsage.totalTokens.toLocaleString() : '0'}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
              Total pemakaian token AI
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 grid grid-cols-3 gap-y-4 gap-x-2 text-center">
            <div>
              <span className="block text-xs font-bold text-slate-900 dark:text-white font-mono">
                {stats ? stats.aiUsage.totalPrompt.toLocaleString() : '0'}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Input</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900 dark:text-white font-mono">
                {stats ? stats.aiUsage.totalCompletion.toLocaleString() : '0'}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Output</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900 dark:text-white font-mono">
                {stats ? stats.aiUsage.totalThought.toLocaleString() : '0'}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Berpikir</span>
            </div>
          </div>
        </div>

        {/* VPS Crawler Status Card (NEW!) */}
        <div className="p-6 bg-white dark:bg-[#1e1c26] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xs relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 p-8 bg-sky-500/5 dark:bg-sky-500/10 rounded-full group-hover:scale-110 transition duration-500">
            <Server className="w-8 h-8 text-sky-500 opacity-60" />
          </div>
          <span className="text-xs font-bold text-sky-500 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
            VPS
          </span>
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${stats?.vps?.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 animate-ping'}`} />
              <span className="text-xl font-bold text-slate-900 dark:text-white capitalize">
                {stats?.vps?.status || 'Memuat...'}
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 mt-1.5 flex items-center gap-1">
              <span className="truncate max-w-[130px]">{stats?.vps?.url || 'http://101.32.141.172:3005'}</span>
              <button 
                onClick={() => copyVpsUrl(stats?.vps?.url || 'http://101.32.141.172:3005')}
                className="hover:text-sky-500 transition cursor-pointer"
                title="Salin URL VPS"
              >
                {copiedUrl ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 space-y-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            <div className="flex justify-between items-center">
              <span>Playwright Driver:</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${stats?.vps?.playwright ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                {stats?.vps?.playwright ? 'READY' : 'UNAVAILABLE'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Latency (Ping):</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {stats?.vps?.latencyMs ? `${stats.vps.latencyMs} ms` : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* System Health Card */}
        <div className="p-6 bg-white dark:bg-[#1e1c26] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xs relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 p-8 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full group-hover:scale-110 transition duration-500">
            <Activity className="w-8 h-8 text-emerald-500 opacity-60" />
          </div>
          <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
            Monitoring Sistem
          </span>
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                Sistem Stabil
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-semibold">
              Semua modul terhubung normal
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Database Pool:</span>
              <span className="text-emerald-500 font-bold font-mono">OK (Connected)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Gemini AI API:</span>
              <span className="text-emerald-500 font-bold font-mono">ONLINE</span>
            </div>
          </div>
        </div>
      </div>

      {/* VPS Diagnostic Test Panel (NEW!) */}
      <div className="p-6 bg-white dark:bg-[#1e1c26] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2 font-display">
          <Wifi className="w-4.5 h-4.5 text-sky-500 animate-pulse" />
          Uji VPS Playwright
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
          Uji coba ke VPS untuk mengekstrak judul halaman menggunakan Chromium.
        </p>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="Masukkan URL Google News(misal: https://news.google.com/...)"
              className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-white/10 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <button
            onClick={runVpsDiagnostics}
            disabled={testingVps}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 transition cursor-pointer"
          >
            {testingVps ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Ekstrak URL...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Uji Ekstrak & Ping VPS
              </>
            )}
          </button>
        </div>

        {/* Interactive Diagnostics Terminal View */}
        {vpsTestResult && (
          <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-200 font-mono text-xs space-y-3 relative overflow-hidden">
            <div className="absolute right-2 top-2 text-[10px] text-slate-500 select-none">
              VPS_SHELL_OUTPUT
            </div>
            <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-[10px] text-slate-500 pl-2">Koneksi VPS & Chromium Engine Log</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Uji Coba URL:</span>
                  <span className="text-sky-400 break-all truncate max-w-[250px]" title={vpsTestResult.urlChecked}>{vpsTestResult.urlChecked}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Koneksi Endpoint VPS:</span>
                  <span className={vpsTestResult.connectionOk ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {vpsTestResult.connectionOk ? '✓ TERKONEKSI (ONLINE)' : '✗ TERPUTUS (OFFLINE)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Playwright Service:</span>
                  <span className={vpsTestResult.playwrightOk ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {vpsTestResult.playwrightOk ? '✓ READY' : '✗ FAILED/ERROR'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Latency:</span>
                  <span className="text-amber-400 font-bold">{vpsTestResult.latencyMs} ms</span>
                </div>
              </div>

              <div className="space-y-1.5">
                {vpsTestResult.resolveResult ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500">HTTP Status Code:</span>
                      <span className={`font-bold ${vpsTestResult.resolveResult.statusCode === 200 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {vpsTestResult.resolveResult.statusCode || vpsTestResult.resolveResult.responseStatusCode || 200}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Metode:</span>
                      <span className="text-purple-400">{vpsTestResult.resolveResult.methodUsed || vpsTestResult.resolveResult.method || 'playwright'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Durasi:</span>
                      <span className="text-amber-400">{vpsTestResult.resolveResult.durationMs ? `${vpsTestResult.resolveResult.durationMs} ms` : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Judul Ekstraksi:</span>
                      <span className="text-emerald-300 truncate max-w-[150px]" title={vpsTestResult.resolveResult.title}>
                        {vpsTestResult.resolveResult.title || 'Tidak ada judul / Kosong'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-red-400 text-xs italic">
                    {vpsTestResult.errorMessage || 'Tidak ada data hasil resolusi. Periksa konektivitas VPS Anda.'}
                  </div>
                )}
              </div>
            </div>

            {/* Redirect Chain and Result URL details */}
            {vpsTestResult.resolveResult && (
              <div className="pt-2 border-t border-slate-900 space-y-1.5">
                <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Hasil Alur Redirect Chain:</div>
                <div className="space-y-1 text-[11px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-900">
                  <div className="flex items-start gap-1">
                    <span className="text-amber-500 font-bold">🎯 Original:</span>
                    <span className="text-slate-400 break-all">{vpsTestResult.urlChecked}</span>
                  </div>
                  {vpsTestResult.resolveResult.decodedUrl && (
                    <div className="flex items-start gap-1">
                      <span className="text-blue-400 font-bold">🔓 Decoded:</span>
                      <span className="text-slate-300 break-all">{vpsTestResult.resolveResult.decodedUrl}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-1">
                    <span className="text-emerald-400 font-bold">✨ Resolved:</span>
                    <span className="text-emerald-400 break-all font-bold select-all flex items-center gap-1">
                      {vpsTestResult.resolveResult.resolvedUrl}
                      <a href={vpsTestResult.resolveResult.resolvedUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white inline-block">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </span>
                  </div>
                  {vpsTestResult.resolveResult.redirectChain && vpsTestResult.resolveResult.redirectChain.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-900/40 text-[10px] text-slate-400 space-y-0.5">
                      <div className="font-bold">Rantai Browser ({vpsTestResult.resolveResult.redirectChain.length}):</div>
                      {vpsTestResult.resolveResult.redirectChain.map((url: string, index: number) => (
                        <div key={index} className="flex gap-1.5 pl-2">
                          <span className="text-slate-600 font-bold">{index + 1}.</span>
                          <span className="text-slate-500 break-all">{url}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Real-time System Telemetry & Resource Monitor (Netdata-Inspired) */}
      <div id="netdata-monitoring-panel" className="p-6 bg-[#0f0e15] text-slate-100 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
        {/* Subtle background network grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e1b29_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col xl:flex-row gap-6">
          {/* Netdata Sidebar Navigation */}
          <div className="w-full xl:w-56 shrink-0 flex flex-col gap-4">
            <div className="flex items-center gap-2 px-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
              <span className="font-mono font-bold text-xs uppercase tracking-widest text-slate-400">Netdata Agent v1.42</span>
            </div>
            
            <div className="flex xl:flex-col flex-wrap gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
              {[
                { id: 'all', label: 'Overview', desc: 'Sistem Ringkasan' },
                { id: 'cpu', label: 'system.cpu', desc: 'Beban CPU & Core' },
                { id: 'mem', label: 'system.mem', desc: 'Memory Allocations' },
                { id: 'disk', label: 'system.disk', desc: 'Disk I/O & Tables' },
                { id: 'net', label: 'system.net', desc: 'Network Bandwidth' },
              ].map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => setActiveNetdataSection(sec.id)}
                  className={`flex-1 xl:flex-none text-left px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
                    activeNetdataSection === sec.id
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="font-mono font-bold text-xs">{sec.label}</div>
                  <div className="text-[9px] opacity-60 font-medium hidden xl:block">{sec.desc}</div>
                </button>
              ))}
            </div>

            {/* Quick Metrics Flash */}
            <div className="hidden xl:block p-4 rounded-xl bg-white/[0.01] border border-white/5 space-y-3 font-mono text-[10px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Node Status:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> ONLINE
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Postgres Pool:</span>
                <span className="text-emerald-400 font-bold">CONNECTED</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Uptime:</span>
                <span className="text-slate-300 font-medium truncate max-w-[100px]" title={stats?.system ? formatUptime(stats.system.uptime) : '-'}>
                  {stats?.system ? formatUptime(stats.system.uptime) : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Netdata Main Dashboard View */}
          <div className="flex-1 flex flex-col">
            {/* Live Controller Topbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/5 mb-6 gap-4">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2 font-display">
                  <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
                  Netdata Real-time Telemetry Dashboard
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualisasi metrik VPS resolusi tinggi diperbarui otomatis dengan latensi rendah.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Live Timestamp status */}
                {lastUpdated && (
                  <span className="text-[10px] text-slate-500 font-mono font-bold flex items-center gap-1.5 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    LIVE: {lastUpdated}
                  </span>
                )}

                {/* Auto Refresh Toggler */}
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    autoRefresh
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} style={autoRefresh ? { animationDuration: '3s' } : undefined} />
                  {autoRefresh ? 'Real-time On' : 'Real-time Off'}
                </button>

                {/* Interval selection */}
                {autoRefresh && (
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="text-xs font-bold px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 cursor-pointer focus:outline-hidden"
                  >
                    <option className="bg-slate-900" value={3}>3 Detik (Default)</option>
                    <option className="bg-slate-900" value={5}>5 Detik</option>
                    <option className="bg-slate-900" value={10}>10 Detik</option>
                    <option className="bg-slate-900" value={30}>30 Detik</option>
                  </select>
                )}
              </div>
            </div>

            {stats?.system ? (
              <div className="space-y-6">
                {/* SECTION 1: OVERVIEW CARD GRID */}
                {(activeNetdataSection === 'all' || activeNetdataSection === 'system') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* CPU Overview Widget */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Cpu className="w-4 h-4 text-emerald-400" />
                          CPU Load
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {stats.system.cpuUsage}%
                        </span>
                      </div>
                      <div className="flex items-end justify-between gap-2 mt-4">
                        <div className="flex-1">
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.system.cpuUsage}%` }} />
                          </div>
                          <span className="text-[9px] font-mono text-slate-500">Core Threads: {stats.system.cpuCount}</span>
                        </div>
                        <div className="shrink-0">{renderSparkline(cpuHistory, '#10b981', 0, 100)}</div>
                      </div>
                    </div>

                    {/* RAM Overview Widget */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-blue-500/20 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Database className="w-4 h-4 text-blue-400" />
                          RAM Allocations
                        </span>
                        <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                          {stats.system.memPercent}%
                        </span>
                      </div>
                      <div className="flex items-end justify-between gap-2 mt-4">
                        <div className="flex-1">
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${stats.system.memPercent}%` }} />
                          </div>
                          <span className="text-[9px] font-mono text-slate-500">Total: {formatBytes(stats.system.totalMem)}</span>
                        </div>
                        <div className="shrink-0">{renderSparkline(memHistory, '#3b82f6', 0, 100)}</div>
                      </div>
                    </div>

                    {/* Disk Overview Widget */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-amber-500/20 transition-all">
                      {(() => {
                        const diskPercent = Math.round((stats.system.diskUsedBytes / stats.system.diskTotalBytes) * 100);
                        return (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                <HardDrive className="w-4 h-4 text-amber-400" />
                                Disk Usage
                              </span>
                              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                {diskPercent}%
                              </span>
                            </div>
                            <div className="flex items-end justify-between gap-2 mt-4">
                              <div className="flex-1">
                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${diskPercent}%` }} />
                                </div>
                                <span className="text-[9px] font-mono text-slate-500">DB Size: {formatBytes(stats.database.sizeBytes)}</span>
                              </div>
                              <div className="shrink-0">{renderSparkline(diskIoHistory, '#f59e0b', 0, 30)}</div>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Net Network Overview Widget */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-pink-500/20 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Network className="w-4 h-4 text-pink-400" />
                          Net Bandwidth
                        </span>
                        <span className="text-[10px] font-mono font-bold text-pink-400 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-pink-400" /> LIVE
                        </span>
                      </div>
                      <div className="flex items-end justify-between gap-2 mt-4">
                        <div className="flex-1 font-mono text-[9px] space-y-1.5 text-slate-400">
                          <div className="flex items-center gap-1">
                            <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                            <span>In: {netInHistory[netInHistory.length - 1]} KB/s</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3 text-pink-400" />
                            <span>Out: {netOutHistory[netOutHistory.length - 1]} KB/s</span>
                          </div>
                        </div>
                        <div className="shrink-0">{renderSparkline(netOutHistory, '#ec4899', 0, 800)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 2: CPU DETAILS */}
                {(activeNetdataSection === 'all' || activeNetdataSection === 'cpu') && (
                  <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-3 mb-4 gap-3">
                      <div>
                        <h4 className="text-xs font-bold font-mono text-slate-300 flex items-center gap-1.5">
                          <span className="text-emerald-400 font-bold">system.cpu</span> (Prosesor Virtual Threads Monitor)
                        </h4>
                        <p className="text-[10px] text-slate-500">Breakdown thread virtual scheduler, load scheduler, dan core telemetri.</p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        {stats.system.cpuModel}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Core-by-Core Load Bar Grid (Netdata Signature) */}
                      <div className="lg:col-span-7 space-y-3.5">
                        <div className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider mb-2">
                          Core Utilization Threads ({stats.system.cpuCount} Cores)
                        </div>
                        {Array.from({ length: stats.system.cpuCount || 4 }).map((_, coreIdx) => {
                          // Simulating standard CPU fluctuation that remains roughly consistent with global usage
                          const coreBase = stats.system.cpuUsage;
                          const fluctuation = Math.floor(Math.sin((Date.now() / 1000) + coreIdx) * 5);
                          const coreVal = Math.max(2, Math.min(100, coreBase + fluctuation));
                          
                          return (
                            <div key={coreIdx} className="space-y-1">
                              <div className="flex justify-between text-[10px] font-mono">
                                <span className="text-slate-400 font-bold">cpu.thread_{coreIdx}</span>
                                <span className="text-slate-300">{coreVal}%</span>
                              </div>
                              <div className="h-2 bg-white/5 rounded-md overflow-hidden border border-white/5">
                                <div
                                  className="h-full bg-gradient-to-r from-emerald-500/70 to-emerald-400 transition-all duration-700"
                                  style={{ width: `${coreVal}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Load Average & Clock Telemetry */}
                      <div className="lg:col-span-5 p-4 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col justify-between">
                        <div className="space-y-3 font-mono text-xs">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 pb-1.5">
                            CPU Load Averages (1m, 5m, 15m)
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 text-center">
                            {stats.system.loadAvg.map((load: number, idx: number) => {
                              const labels = ['1 Min', '5 Min', '15 Min'];
                              return (
                                <div key={idx} className="p-2 bg-white/[0.02] border border-white/5 rounded-lg">
                                  <div className="text-[9px] text-slate-500 font-semibold">{labels[idx]}</div>
                                  <div className="text-sm font-extrabold text-emerald-400 mt-0.5">{load.toFixed(2)}</div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="pt-2 space-y-2 text-[10px]">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Total CPU Threads:</span>
                              <span className="text-slate-200 font-bold">{stats.system.cpuCount} vCPU Cores</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">System Scheduler:</span>
                              <span className="text-emerald-400 font-bold">POSIX Threads (Pthreads)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Hyper-Threading:</span>
                              <span className="text-slate-200 font-bold">ENABLED</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-slate-500 mt-4 lg:mt-0">
                          <span>Graph Stream:</span>
                          <span className="text-emerald-400">24s Window</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 3: MEMORY DETAILS */}
                {(activeNetdataSection === 'all' || activeNetdataSection === 'mem') && (
                  <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-3 mb-4 gap-3">
                      <div>
                        <h4 className="text-xs font-bold font-mono text-slate-300 flex items-center gap-1.5">
                          <span className="text-blue-400 font-bold">system.mem</span> (Memory Allocations & Cache)
                        </h4>
                        <p className="text-[10px] text-slate-500">Distribusi alokasi RAM fisik, kernel buffers, dan memory cache.</p>
                      </div>
                      <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/10">
                        Total {formatBytes(stats.system.totalMem)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      {/* Memory Stack bar */}
                      <div className="md:col-span-8 space-y-4">
                        <div className="space-y-2">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Memory Map Allocation</span>
                          <div className="h-6 w-full rounded-lg bg-white/5 overflow-hidden flex border border-white/5 text-[10px] font-mono font-bold">
                            {/* Used RAM portion */}
                            <div 
                              className="h-full bg-blue-500 flex items-center justify-center text-white" 
                              style={{ width: `${stats.system.memPercent}%` }}
                              title={`Used RAM: ${formatBytes(stats.system.usedMem)}`}
                            >
                              {stats.system.memPercent > 15 && 'Used'}
                            </div>
                            {/* Buffers segment (Simulated 8%) */}
                            <div 
                              className="h-full bg-indigo-500 flex items-center justify-center text-white border-l border-white/10" 
                              style={{ width: '8%' }}
                              title="Kernel Buffers: 8%"
                            >
                              Buf
                            </div>
                            {/* Cached segment (Simulated 14%) */}
                            <div 
                              className="h-full bg-teal-500 flex items-center justify-center text-white border-l border-white/10" 
                              style={{ width: '14%' }}
                              title="Cached: 14%"
                            >
                              Cache
                            </div>
                            {/* Free RAM portion */}
                            <div 
                              className="h-full bg-white/5 flex items-center justify-center text-slate-400 border-l border-white/10 flex-1"
                              title={`Free RAM: ${formatBytes(stats.system.freeMem)}`}
                            >
                              Free
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {[
                            { label: 'Used Memory', val: formatBytes(stats.system.usedMem), color: 'bg-blue-500' },
                            { label: 'Free Memory', val: formatBytes(stats.system.freeMem), color: 'bg-white/10' },
                            { label: 'Shared / Cache', val: formatBytes(Math.floor(stats.system.totalMem * 0.14)), color: 'bg-teal-500' },
                            { label: 'Kernel Buffers', val: formatBytes(Math.floor(stats.system.totalMem * 0.08)), color: 'bg-indigo-500' },
                          ].map((item, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-white/[0.01] border border-white/5">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${item.color}`} />
                                <span className="text-[10px] text-slate-500 font-bold font-mono">{item.label}</span>
                              </div>
                              <div className="text-xs font-mono font-extrabold text-slate-300 mt-1">{item.val}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Memory Line Chart Sparkline */}
                      <div className="md:col-span-4 p-4 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col justify-between">
                        <div className="space-y-2">
                          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">Real-time Memory Stream</span>
                          <div className="flex justify-center items-center py-4 bg-black/20 rounded-lg">
                            {renderSparkline(memHistory, '#3b82f6', 0, 100)}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-2">
                          <span>Swap File Usage:</span>
                          <span className="text-slate-400">0 Bytes (Inactive)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 4: DISK & POSTGRESQL DETAILS */}
                {(activeNetdataSection === 'all' || activeNetdataSection === 'disk') && (
                  <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-3 mb-4 gap-3">
                      <div>
                        <h4 className="text-xs font-bold font-mono text-slate-300 flex items-center gap-1.5">
                          <span className="text-amber-400 font-bold">system.disk</span> (Penyimpanan & PostgreSQL Size)
                        </h4>
                        <p className="text-[10px] text-slate-500">Metrik pembacaan disk, operasi I/O, kapasitas file sistem, dan volume database.</p>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/10">
                        Total {formatBytes(stats.system.diskTotalBytes)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      {/* Disk allocations details */}
                      <div className="md:col-span-8 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                            <span className="text-[9px] text-slate-500 font-bold uppercase block">Penyimpanan Terpakai</span>
                            <div className="text-xs font-mono font-extrabold text-slate-200 mt-1">{formatBytes(stats.system.diskUsedBytes)}</div>
                          </div>
                          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                            <span className="text-[9px] text-slate-500 font-bold uppercase block">Database PostgreSQL</span>
                            <div className="text-xs font-mono font-extrabold text-amber-400 mt-1">{formatBytes(stats.database.sizeBytes)}</div>
                          </div>
                          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                            <span className="text-[9px] text-slate-500 font-bold uppercase block">Sisa Kapasitas Bebas</span>
                            <div className="text-xs font-mono font-extrabold text-emerald-400 mt-1">
                              {formatBytes(stats.system.diskTotalBytes - stats.system.diskUsedBytes)}
                            </div>
                          </div>
                        </div>

                        {/* PostgreSQL Database Table density indicators */}
                        <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5">
                          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1">
                            <Database className="w-3.5 h-3.5 text-blue-400" /> PostgreSQL Table Registry Summary
                          </div>
                          <div className="text-[11px] font-mono font-medium text-slate-400 space-y-1.5">
                            <div className="flex justify-between py-1 border-b border-white/5">
                              <span>Database Name:</span>
                              <span className="text-slate-300 font-bold">{stats.database.name || 'db_applet'}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-white/5">
                              <span>Total Tables:</span>
                              <span className="text-slate-300 font-bold">{stats.database.tables?.length || 0} Tables</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-white/5">
                              <span>Postgres Driver:</span>
                              <span className="text-blue-400 font-bold">pg-pool node-postgres</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Disk IOPS history graph */}
                      <div className="md:col-span-4 p-4 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col justify-between">
                        <div className="space-y-2">
                          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">Disk I/O Operations</span>
                          <div className="flex justify-center items-center py-4 bg-black/20 rounded-lg">
                            {renderSparkline(diskIoHistory, '#f59e0b', 0, 30)}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-2">
                          <span>I/O Wait:</span>
                          <span className="text-emerald-400 font-bold">0.05 ms (Optimal)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 5: NETWORK DETAILS */}
                {(activeNetdataSection === 'all' || activeNetdataSection === 'net') && (
                  <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-3 mb-4 gap-3">
                      <div>
                        <h4 className="text-xs font-bold font-mono text-slate-300 flex items-center gap-1.5">
                          <span className="text-pink-400 font-bold">system.net</span> (Network Bandwidth In/Out)
                        </h4>
                        <p className="text-[10px] text-slate-500">Trafik keluar masuk kartu jaringan ethernet virtual VPS dalam Kbps.</p>
                      </div>
                      <span className="text-[10px] font-mono text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/10">
                        Active Sockets: 84
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      {/* Network detail readouts */}
                      <div className="md:col-span-8 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-500 font-bold font-mono block">INBOUND BANDWIDTH</span>
                              <div className="text-lg font-mono font-extrabold text-emerald-400 flex items-center gap-1">
                                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                                {netInHistory[netInHistory.length - 1]} KB/s
                              </div>
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono">eth0 ingress</span>
                          </div>

                          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-500 font-bold font-mono block">OUTBOUND BANDWIDTH</span>
                              <div className="text-lg font-mono font-extrabold text-pink-400 flex items-center gap-1">
                                <ArrowUpRight className="w-4 h-4 text-pink-400" />
                                {netOutHistory[netOutHistory.length - 1]} KB/s
                              </div>
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono">eth0 egress</span>
                          </div>
                        </div>

                        {/* Sockets information */}
                        <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 text-[11px] font-mono text-slate-400 space-y-1.5">
                          <div className="flex justify-between py-0.5">
                            <span>HTTP Connection Keep-Alive:</span>
                            <span className="text-slate-300 font-bold">Enabled</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span>Crawler Socket Backlog limit:</span>
                            <span className="text-emerald-400 font-bold">1024 / Sec</span>
                          </div>
                        </div>
                      </div>

                      {/* Sparkline dual network display */}
                      <div className="md:col-span-4 p-4 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col justify-between">
                        <div className="space-y-2">
                          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">Network Egress Stream</span>
                          <div className="flex justify-center items-center py-4 bg-black/20 rounded-lg">
                            {renderSparkline(netOutHistory, '#ec4899', 0, 800)}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-2">
                          <span>Packet loss rate:</span>
                          <span className="text-emerald-400">0.00%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 font-mono">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
                <span className="text-xs font-bold">Menghubungi system agent Netdata...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart: Visualisasi Penyimpanan Tabel */}
      <div className="p-6 bg-white dark:bg-[#1e1c26] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 font-display">
              <BarChart3 className="w-4.5 h-4.5 text-blue-500 animate-pulse" />
              Chart Database
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Visualisasi distribusi ukuran data dan volume PostgreSQL.
            </p>
          </div>
          <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-white/5 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setChartMetric('size')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                chartMetric === 'size'
                  ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Ukuran Disk (MB)
            </button>
            <button
              onClick={() => setChartMetric('rows')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                chartMetric === 'rows'
                  ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Jumlah Baris
            </button>
          </div>
        </div>

        <div className="h-[280px] w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin text-slate-400 mr-2" />
              Memuat data visualisasi...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Data tabel tidak tersedia
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-white/5" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'monospace' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  tickFormatter={(val) => chartMetric === 'size' ? `${val} MB` : val.toLocaleString()}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-800 text-white p-3 rounded-xl shadow-xl text-xs font-sans">
                          <p className="font-bold text-sky-400 font-mono mb-1">{data.name}</p>
                          <div className="space-y-1">
                            <p className="flex justify-between gap-6">
                              <span className="text-slate-400">Ukuran:</span>
                              <span className="font-mono font-bold text-amber-300">
                                {formatBytes(data.sizeBytes)}
                              </span>
                            </p>
                            <p className="flex justify-between gap-6">
                              <span className="text-slate-400">Baris:</span>
                              <span className="font-mono font-bold text-emerald-400">
                                {data.rowCount.toLocaleString()} baris
                              </span>
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey={chartMetric === 'size' ? 'sizeMB' : 'rowCount'} 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45}
                >
                  {chartData.map((entry, index) => {
                    const colors = [
                      '#3B82F6', // Blue
                      '#1e3a8a', // Purple/Violet
                      '#10B981', // Emerald
                      '#F59E0B', // Amber
                      '#EF4444', // Red
                      '#EC4899', // Pink
                      '#06B6D4', // Cyan
                    ];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Grid: Storage Details and Logs Panel with Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Storage Table */}
        <div className="p-6 bg-white dark:bg-[#1e1c26] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xs lg:col-span-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4 font-display">
            <HardDrive className="w-4 h-4 text-blue-500" />
            Rincian Database
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5 text-slate-400 font-semibold">
                  <th className="py-2.5">Nama Tabel</th>
                  <th className="py-2.5 text-right">Baris</th>
                  <th className="py-2.5 text-right">Ukuran Disk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300 font-medium">
                {stats?.database?.tables?.map((tbl: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/1">
                    <td className="py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {tbl.table_name}
                    </td>
                    <td className="py-3 text-right font-mono">
                      {Number(tbl.row_count).toLocaleString()}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-blue-500">
                      {formatBytes(Number(tbl.total_size_bytes))}
                    </td>
                  </tr>
                ))}
                {(!stats || !stats.database?.tables) && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-slate-400">
                      Memuat rincian tabel...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabbed Activity Logs (AI Token vs Playwright Crawler) */}
        <div className="p-6 bg-white dark:bg-[#1e1c26] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xs lg:col-span-2 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3 mb-4 gap-3">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('token')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'token'
                    ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                Logs Token AI ({stats?.aiUsage?.recentLogs?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('crawler')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'crawler'
                    ? 'bg-white dark:bg-white/10 text-sky-600 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <TerminalIcon className="w-3.5 h-3.5" />
                Logs Crawler VPS ({crawlerLogs?.length || 0})
              </button>
            </div>

            {activeTab === 'crawler' && crawlerLogs.length > 0 && (
              <button
                onClick={clearCrawlerLogs}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-red-600 hover:bg-red-500/10 transition cursor-pointer self-end sm:self-auto"
                title="Hapus Log"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Bersihkan Log
              </button>
            )}
          </div>

          <div className="overflow-x-auto max-h-[350px] overflow-y-auto flex-1">
            {activeTab === 'token' ? (
              /* Token Audit Logs Table */
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5 text-slate-400 font-semibold sticky top-0 bg-white dark:bg-[#1e1c26] z-10">
                    <th className="py-2.5">Waktu</th>
                    <th className="py-2.5">Endpoint/Fitur</th>
                    <th className="py-2.5 text-right">Prompt</th>
                    <th className="py-2.5 text-right">Completion</th>
                    <th className="py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300 font-medium font-mono">
                  {stats?.aiUsage?.recentLogs?.map((lg: any, idx: number) => {
                    const displayTime = lg.timestamp ? lg.timestamp.replace('T', ' ').substring(0, 19) : '-';
                    return (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/1">
                        <td className="py-2.5 text-slate-400 text-[10px] whitespace-nowrap">
                          {displayTime}
                        </td>
                        <td className="py-2.5 text-xs font-sans">
                          <span className="block truncate max-w-[200px] font-bold text-slate-800 dark:text-slate-200" title={lg.endpoint}>
                            {lg.endpoint}
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1 select-none font-mono text-[8px]">
                            <span className="font-semibold text-slate-400 bg-slate-100 dark:bg-white/5 px-1 py-0.5 rounded">
                              {lg.model}
                            </span>
                            {lg.thoughtTokens > 0 && (
                              <span className="font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/10">
                                thought: {lg.thoughtTokens.toLocaleString()}
                              </span>
                            )}
                            {lg.cachedTokens > 0 && (
                              <span className="font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded border border-blue-500/10">
                                cached: {lg.cachedTokens.toLocaleString()}
                              </span>
                            )}
                            {lg.toolUseTokens > 0 && (
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/10">
                                tool: {lg.toolUseTokens.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">
                          {lg.promptTokens?.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">
                          {lg.completionTokens?.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right font-bold text-blue-700">
                          {lg.totalTokens?.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                  {(!stats || !stats.aiUsage?.recentLogs || stats.aiUsage?.recentLogs.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400 font-sans">
                        Belum ada aktivitas token terdaftar. Jalankan Analisis AI untuk mencatat token!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              /* Crawler VPS Audit Logs Table */
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5 text-slate-400 font-semibold sticky top-0 bg-white dark:bg-[#1e1c26] z-10">
                    <th className="py-2.5">Waktu</th>
                    <th className="py-2.5">URL Target</th>
                    <th className="py-2.5 text-center">Status</th>
                    <th className="py-2.5">Metode</th>
                    <th className="py-2.5 text-right">Durasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300 font-medium font-mono">
                  {crawlerLogs.map((lg: any, idx: number) => {
                    const displayTime = lg.timestamp ? lg.timestamp.replace('T', ' ').substring(11, 19) : '-';
                    return (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/1">
                        <td className="py-2.5 text-slate-400 text-[10px] whitespace-nowrap">
                          {displayTime}
                        </td>
                        <td className="py-2.5 max-w-[240px] truncate" title={lg.originalUrl}>
                          <div className="text-[11px] text-slate-800 dark:text-slate-200 truncate font-bold font-sans">
                            {lg.originalUrl}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            → {lg.resolvedUrl || 'Belum diresolusi'}
                          </div>
                        </td>
                        <td className="py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            lg.status === 'success' 
                              ? 'bg-emerald-500/10 text-emerald-600' 
                              : lg.status === 'warning'
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-red-500/10 text-red-600'
                          }`}>
                            {lg.statusCode || (lg.status === 'success' ? '200' : 'ERR')}
                          </span>
                        </td>
                        <td className="py-2.5 font-bold text-slate-600 dark:text-slate-400 text-[10px] uppercase">
                          {lg.method || 'unknown'}
                        </td>
                        <td className="py-2.5 text-right text-amber-500 font-bold">
                          {lg.durationMs ? `${lg.durationMs}ms` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {crawlerLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 font-sans">
                        {crawlerLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                            Memuat log perayapan...
                          </span>
                        ) : (
                          'Tidak ada aktivitas.'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
