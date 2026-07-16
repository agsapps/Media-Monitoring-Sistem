import React from 'react';
import { useAppState } from '../AppContext';
import { 
  Globe, 
  BarChart3, 
  FileEdit, 
  Database, 
  Settings2, 
  ChevronLeft,
  ChevronRight,
  Users,
  FileText,
  MessageSquare,
  ShieldCheck,
  Terminal
} from 'lucide-react';
import { Logo } from './Logo';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, activeTab, setTab, settings, isCrawlSyncing, triggerAutoSync } = useAppState();

  const menuItems = [
    { id: 'portal' as const, label: 'Media Monitoring', icon: Globe, roles: ['Admin', 'Analis', 'Editor', 'Viewer'] },
    { id: 'social-news' as const, label: 'Sosmed Monitoring', icon: MessageSquare, roles: ['Admin', 'Analis', 'Editor', 'Viewer'] },
    { id: 'dashboard' as const, label: 'Analitik', icon: BarChart3, roles: ['Admin', 'Analis', 'Editor', 'Viewer'] },
    { id: 'chatbot' as const, label: 'Security Chat', icon: ShieldCheck, roles: ['Admin', 'Analis', 'Editor', 'Viewer'] },
    { id: 'pdf-studio' as const, label: 'PDF Export Studio', icon: FileText, roles: ['Admin'] },
    { id: 'manage' as const, label: 'Dokumentasi Isu', icon: FileEdit, roles: ['Admin', 'Analis', 'Editor'] },
    { id: 'master' as const, label: 'Konfigurasi Kategori', icon: Database, roles: ['Admin'] },
    { id: 'settings' as const, label: 'Konfigurasi Crawler', icon: Settings2, roles: ['Admin'] },
    { id: 'users' as const, label: 'Manajemen Akun & Role', icon: Users, roles: ['Admin'] },
    { id: 'monitoring' as const, label: 'Terminal Monitoring', icon: Terminal, roles: ['Admin'] },
  ];

  const filteredItems = menuItems.filter(item => 
    item.roles.includes(user ? user.role : null)
  );

  return (
    <>
      {/* Backdrop for mobile drawer */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs z-40 md:hidden animate-fade-in"
        />
      )}
      
      <aside 
        className={`flex flex-col border-r md:border-r-0 border-slate-200 dark:border-white/5 bg-white dark:bg-[#121118] text-slate-800 dark:text-slate-100 transition-all duration-500 ease-out fixed md:relative inset-y-0 left-0 z-50 md:z-30 h-screen md:h-[calc(100vh-2rem)] md:my-4 md:ml-4 md:rounded-[24px] shadow-2xl dark:shadow-black/50 ${
          isOpen 
            ? 'w-64 translate-x-0' 
            : 'w-64 md:w-16 -translate-x-full md:translate-x-0'
        }`}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="flex flex-col flex-1 overflow-hidden h-full rounded-[24px]">
          {/* Brand Icon Header */}
          <div className={`flex items-center gap-3 border-b border-slate-100 dark:border-white/5 overflow-hidden min-h-[5.5rem] py-4 transition-all duration-500 ${isOpen ? 'p-4' : 'px-3 py-4'}`}>
            <div className="flex items-center justify-center flex-shrink-0 cursor-pointer hover:scale-105 transition" onClick={() => { setTab('portal'); if (window.innerWidth < 768) setIsOpen(false); }}>
              <Logo className={`${isOpen ? 'w-14 h-14' : 'w-10 h-10'} flex-shrink-0 transition-all duration-300`} />
            </div>
            <div className={`transition-all duration-500 flex-1 min-w-0 origin-left ${
              isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none scale-95'
            }`}>
              <h1 className="text-sm font-extrabold font-display leading-tight tracking-wide text-slate-900 dark:text-white uppercase flex flex-col">
                <span className="block text-black dark:text-white">{settings.companyName.split(' ')[0]}</span>
                <span className="text-amber-500 dark:text-amber-400 block truncate">{settings.companyName.split(' ').slice(1).join(' ') || 'Monitor'}</span>
              </h1>
              <div className="flex flex-col mt-0.5">
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold tracking-widest block uppercase">Media Intelligence</span>
                {isCrawlSyncing ? (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-700"></span>
                    </span>
                    <span className="text-[9px] text-blue-800 dark:text-blue-400 font-black tracking-wider animate-pulse whitespace-nowrap">
                      Sinkronisasi...
                    </span>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      triggerAutoSync();
                    }}
                    className="inline-flex items-center gap-1 text-[9px] text-slate-400 hover:text-blue-700 dark:text-slate-500 dark:hover:text-blue-400 font-bold tracking-wider mt-1 transition cursor-pointer text-left self-start"
                    title="Klik untuk menyinkronkan ulang data sekarang"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Terhubung & Terkini
                  </button>
                )}
              </div>
            </div>
          </div>
   
          {/* Navigations */}
          <nav className="flex-1 px-3 py-4 space-y-2.5 landscape:space-y-0.5 md:space-y-2.5 overflow-y-auto">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setTab(item.id);
                    if (window.innerWidth < 768) {
                      setIsOpen(false);
                    }
                  }}
                  className={`w-full flex items-center justify-start gap-3 px-3 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ease-out group relative hover:scale-[1.02] active:scale-[0.98] ${
                    isActive 
                      ? 'bg-blue-800 dark:bg-blue-800 text-white shadow-lg shadow-blue-700/20 dark:shadow-blue-800/30' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-violet-650 dark:hover:text-blue-300 hover:bg-blue-50/80 dark:hover:bg-blue-950/30'
                  }`}
                  title={!isOpen ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${!isActive && 'group-hover:scale-110'}`} id={`sidebar-nav-${item.id}-icon`}/>
                  <span className={`transition-all duration-500 origin-left truncate ${
                    isOpen ? 'opacity-100 translate-x-0 max-w-[155px]' : 'opacity-0 -translate-x-3 max-w-0 pointer-events-none'
                  }`}>
                    {item.label}
                  </span>
                  {!isOpen && (
                    <div className="absolute left-16 hidden group-hover:block bg-slate-950 text-white text-[10px] py-1 px-2.5 rounded-md whitespace-nowrap shadow-xl z-50">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}

          </nav>
   
        </div>
 
        {/* Collapse Trigger Button (Desktop only) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute top-1/2 -right-3.5 transform -translate-y-1/2 hidden md:flex items-center justify-center w-7 h-7 bg-white dark:bg-[#1e1c26] border border-slate-200 dark:border-white/10 rounded-full text-slate-500 hover:text-[#1e3a8a] dark:hover:text-blue-400 shadow-[0_3px_10px_rgb(0,0,0,0.1)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] cursor-pointer z-50 hover:scale-110 active:scale-95 transition-all duration-350"
          title={isOpen ? 'Tutup Sidebar' : 'Buka Sidebar'}
        >
          {isOpen ? <ChevronLeft className="w-4 h-4 transition-transform duration-300" id="sidebar-chevron-left-icon"/> : <ChevronRight className="w-4 h-4 transition-transform duration-300" id="sidebar-chevron-right-icon"/>}
        </button>
      </aside>
    </>
  );
};
