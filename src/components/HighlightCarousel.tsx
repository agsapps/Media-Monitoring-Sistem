import React, { useRef, useState, useEffect } from 'react';
import { useAppState } from '../AppContext';
import { 
  ChevronLeft, ChevronRight, Calendar, Clock, MapPin, 
  ExternalLink, Globe, Copy, Check, MessageSquare
} from 'lucide-react';
import { formatDateDDMMYYYY, formatSummaryText } from '../types';

const getsentimentDetails = (sentiment: string) => {
  const norm = (sentiment || 'Netral').toLowerCase();
  if (norm.includes('pos')) {
    return {
      label: 'POSITIF',
      colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15',
      ribbonClass: 'bg-emerald-500',
    };
  }
  if (norm.includes('neg')) {
    return {
      label: 'NEGATIF',
      colorClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/15',
      ribbonClass: 'bg-rose-500',
    };
  }
  return {
    label: 'NETRAL',
    colorClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15',
    ribbonClass: 'bg-blue-500',
  };
};

export const HighlightCarousel: React.FC = () => {
  const { highlights, setSelectedProvince, setTab, showToast } = useAppState();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Modal Popup state for selected highlight
  const [activeHighlight, setActiveHighlight] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Drag and Swipe states
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Touch Swiping / Dragging support for perfect mobile & mobile emulation experience
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchScrollLeft, setTouchScrollLeft] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  // Auto scroll logic (5 seconds)
  useEffect(() => {
    if (isPaused || !highlights || highlights.length <= 1) return;
    
    const interval = setInterval(() => {
      if (containerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
        const reachedEnd = scrollLeft + clientWidth >= scrollWidth - 20;
        
        if (reachedEnd) {
          containerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          // Scroll by roughly one card width
          containerRef.current.scrollBy({ left: 360, behavior: 'smooth' });
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused, highlights]);

  if (!highlights || highlights.length === 0) {
    return null;
  }

  // Prev / Next button actions
  const scrollPrev = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: -360, behavior: 'smooth' });
    }
  };

  const scrollNext = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: 360, behavior: 'smooth' });
    }
  };

  // Drag Scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeftState(containerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Drag sensitivity
    containerRef.current.scrollLeft = scrollLeftState - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    setIsPaused(true);
    setIsSwiping(true);
    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    setTouchScrollLeft(containerRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || !containerRef.current) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - touchStartX;
    containerRef.current.scrollLeft = touchScrollLeft - diffX;
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    setIsPaused(false);
  };

  // Copy link handler
  const handleCopyLink = (hl: any) => {
    const shareUrl = hl.link || window.location.href;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedId(hl.id);
      showToast('Tautan berhasil disalin!', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      showToast('Gagal menyalin tautan.', 'error');
    });
  };

  // WhatsApp Share handler
  const handleShareWhatsApp = (hl: any) => {
    const text = `*Highlight Isu Hari Ini*\n\n*${hl.title}*\n_${hl.categoryName} - ${hl.location}_\n\n${hl.summary}\n\nSumber: ${hl.link || '-'}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div 
      id="highlight-hari-ini-section"
      className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4"
    >
      {/* Header section with buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-6 bg-red-500 rounded-full animate-pulse" />
          <h3 className="text-sm sm:text-base font-extrabold tracking-tight font-display text-slate-900 dark:text-white flex items-center gap-2 uppercase">
            <span>HIGHLIGHT HARI INI</span>
            {highlights.some(hl => hl.isPinned) && (
              <span className="text-[9px] bg-red-500/10 text-red-600 dark:text-red-400 font-bold px-1.5 py-0.5 rounded border border-red-500/15 uppercase tracking-wide animate-pulse">
                📌 Pinned Isu
              </span>
            )}
          </h3>
        </div>

        {/* Carousel buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={scrollPrev}
            aria-label="Previous Highlight"
            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 transition shadow-sm cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={scrollNext}
            aria-label="Next Highlight"
            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 transition shadow-sm cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Card Horizontal Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={() => {
          handleMouseUpOrLeave();
          setIsPaused(false);
        }}
        onMouseEnter={() => setIsPaused(true)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex gap-4 overflow-x-auto overflow-y-hidden scrollbar-none scroll-smooth py-1 px-0.5 -mx-1 cursor-grab active:cursor-grabbing select-none touch-pan-x"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {highlights.map((hl) => {
          return (
            <div
              key={hl.id}
              onClick={() => setActiveHighlight(hl)}
              className="flex-shrink-0 w-[300px] sm:w-[350px] h-[220px] bg-white dark:bg-slate-800/85 border border-slate-200/80 dark:border-white/5 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300/60 dark:hover:border-blue-700/40 transition-all duration-300 flex flex-col justify-between overflow-hidden relative group cursor-pointer"
            >
              {/* Highlight ribbon or indicator */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${
                hl.isPinned 
                  ? 'bg-amber-500' 
                  : getsentimentDetails(hl.sentiment || 'Netral').ribbonClass
              }`} />

              {/* Card Header Body */}
              <div className="p-4 space-y-2.5 pb-2">
                
                {/* Meta details (Kategori & Wilayah) */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider truncate shrink-0 ${
                      hl.isPinned
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/10'
                        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10'
                    }`}>
                      {hl.categoryName || 'Sektor Utama'}
                    </span>

                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider border shrink-0 ${
                      getsentimentDetails(hl.sentiment || 'Netral').colorClass
                    }`}>
                      {getsentimentDetails(hl.sentiment || 'Netral').label}
                    </span>

                    <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate flex items-center gap-1 shrink font-medium">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{hl.location || 'Nasional'}</span>
                    </span>
                  </div>

                  {/* Media publisher */}
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded flex items-center gap-1 border border-slate-200/30 dark:border-white/5 shrink-0">
                    <Globe className="w-2.5 h-2.5 text-blue-700" />
                    <span>{hl.mediaName || 'Online'}</span>
                  </span>
                </div>

                {/* Main Content */}
                <div className="space-y-1.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-snug line-clamp-2 pr-2 select-text group-hover:text-blue-800 dark:group-hover:text-blue-400 transition-colors">
                    {hl.title}
                  </h4>
                  <p className="text-[10.5px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed font-normal select-text">
                    {hl.summary}
                  </p>
                </div>
              </div>

              {/* Card Footer row */}
              <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] sm:text-[11px] font-medium text-slate-400 dark:text-slate-500 shrink-0">
                {/* Date publication context */}
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                  <Calendar className="w-3 h-3 text-blue-700/70" />
                  <span>{hl.publishDate}</span>
                  {hl.publishTime && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <Clock className="w-3 h-3 text-indigo-500/70" />
                      <span>{hl.publishTime}</span>
                    </>
                  )}
                </div>

                {/* Article redirect anchor */}
                {hl.link && (
                  <a
                    href={hl.link}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-blue-800 dark:text-blue-400 hover:text-blue-900 hover:underline font-bold transition-all shrink-0 cursor-pointer"
                  >
                    <span>Sumber</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAILED HIGHLIGHT POPUP MODAL (Persis Detail Isu) */}
      {activeHighlight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-[500px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Upper colored band */}
            <div className={`h-1.5 bg-gradient-to-r ${activeHighlight.isPinned ? 'from-amber-500 to-amber-600' : 'from-blue-800 to-indigo-600'}`} />
            
            {/* Header row */}
            <div className="p-4 md:p-5 pb-3 border-b border-slate-50 dark:border-slate-800 flex items-start justify-between gap-2">
              <div className="space-y-1 max-w-[88%]">
                <div className="flex flex-wrap gap-1.5 items-center text-[9px] font-bold text-slate-400 font-mono uppercase">
                  {activeHighlight.isPinned && (
                    <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15 rounded">
                      📌 Pinned Isu
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                    {activeHighlight.categoryName}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border ${
                    getsentimentDetails(activeHighlight.sentiment || 'Netral').colorClass
                  }`}>
                    {getsentimentDetails(activeHighlight.sentiment || 'Netral').label}
                  </span>
                  <span>📅 {formatDateDDMMYYYY(activeHighlight.publishDate)} {activeHighlight.publishTime || '12:00'}</span>
                  <button
                    onClick={() => {
                      setSelectedProvince(activeHighlight.location || 'DKI Jakarta');
                      setTab('dashboard');
                      setActiveHighlight(null);
                      showToast(`Menampilkan lokasi ${activeHighlight.location || 'DKI Jakarta'} di Peta OpenStreetMap`, 'info');
                    }}
                    className="text-blue-800 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer font-bold"
                    title="Klik untuk membuka sebaran isu di Peta Analitik"
                  >
                    📍 {activeHighlight.location || 'DKI Jakarta'}
                  </button>
                </div>
                <h3 className="text-sm md:text-base font-bold font-display text-slate-900 dark:text-white leading-tight">
                  {activeHighlight.title}
                </h3>
                <p className="text-[11px] text-slate-500">Sumber: <span className="font-semibold text-slate-800 dark:text-slate-200">{activeHighlight.mediaName}</span></p>
              </div>

              <button 
                onClick={() => setActiveHighlight(null)}
                className="p-1 px-2 hover:bg-slate-200 dark:hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white text-[11px] font-bold tracking-tight transition"
              >
                Tutup
              </button>
            </div>

            {/* Modal Body scrollable area */}
            <div className="p-4 md:p-5 space-y-4 max-h-[55vh] overflow-y-auto">
              {/* Optional Core Clip visual */}
              {activeHighlight.imageUrl && (
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950">
                  <img src={activeHighlight.imageUrl} alt={activeHighlight.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}

              {/* Highlights content */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-black text-slate-600 dark:text-slate-400 tracking-wider uppercase">Summary Analisis Isu</h4>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60 rounded-xl">
                  <p className="text-xs font-normal text-slate-900 dark:text-slate-100 leading-relaxed font-sans whitespace-pre-line">
                    {formatSummaryText(activeHighlight.summary)}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer Share Tools */}
            <div className="p-4 md:p-5 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              
              <div className="flex flex-wrap gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-400 items-center">
                <span>Bagikan:</span>
                <button
                  onClick={() => handleShareWhatsApp(activeHighlight)}
                  className="px-2 py-1 text-[10px] font-bold bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 rounded-lg text-emerald-600 dark:text-emerald-400 transition cursor-pointer flex items-center gap-1.5 shadow-sm hover:shadow"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>

                <button
                  onClick={() => handleCopyLink(activeHighlight)}
                  className="px-2 py-1 text-[10px] font-bold bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-405 transition cursor-pointer flex items-center gap-1.5 shadow-sm hover:shadow"
                >
                  {copiedId === activeHighlight.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Link</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {activeHighlight.link && (
                  <a 
                    href={activeHighlight.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 px-4 py-2 text-xs font-bold bg-blue-800 hover:bg-blue-900 text-white rounded-lg transition active:scale-95 shadow shadow-blue-700/10 cursor-pointer"
                  >
                    <span>Sumber</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

