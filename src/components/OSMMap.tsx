import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAppState } from '../AppContext';
import { Maximize2, Minimize2, ChevronDown, ChevronUp, RefreshCw, Wifi, Newspaper, X, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProvinceCoords {
  [key: string]: [number, number];
}

// Coordinate mapping for Indonesian provinces
const PROVINCE_COORDINATES: ProvinceCoords = {
  'Nasional': [-2.0, 118.0],
  'Aceh': [4.6951, 96.7494],
  'Sumatera Utara': [2.1121, 99.1386],
  'Sumatera Barat': [-0.7399, 100.8000],
  'Riau': [0.5071, 101.5408],
  'Kepulauan Riau': [1.1500, 104.4500],
  'Jambi': [-1.6101, 103.6131],
  'Sumatera Selatan': [-3.3194, 103.9144],
  'Kepulauan Bangka Belitung': [-2.7410, 106.4406],
  'Bengkulu': [-3.7928, 102.2608],
  'Lampung': [-5.1300, 105.2600],
  'DKI Jakarta': [-6.2088, 106.8456],
  'Jawa Barat': [-6.9175, 107.6191],
  'Jawa Tengah': [-7.1509, 110.1402],
  'DI Yogyakarta': [-7.7956, 110.3695],
  'Jawa Timur': [-7.5360, 112.2331],
  'Banten': [-6.4058, 106.0600],
  'Bali': [-8.4095, 115.1889],
  'Nusa Tenggara Barat': [-8.6529, 117.3616],
  'Nusa Tenggara Timur': [-8.6573, 121.0794],
  'Kalimantan Barat': [-0.2788, 111.4753],
  'Kalimantan Tengah': [-1.6814, 113.3824],
  'Kalimantan Selatan': [-3.0926, 115.2838],
  'Kalimantan Timur': [0.5387, 116.4194],
  'Kalimantan Utara': [3.0731, 116.0414],
  'Sulawesi Utara': [1.4300, 124.9000],
  'Sulawesi Tengah': [-1.4300, 121.4456],
  'Sulawesi Selatan': [-4.5586, 119.8000],
  'Sulawesi Tenggara': [-4.1449, 122.1746],
  'Gorontalo': [0.6999, 122.4467],
  'Sulawesi Barat': [-2.8441, 119.2321],
  'Maluku': [-3.2385, 130.1453],
  'Maluku Utara': [0.8248, 127.3619],
  'Papua': [-4.2699, 138.0803],
  'Papua Barat': [-1.3361, 133.1747],
  'Papua Selatan': [-6.8523, 140.4079],
  'Papua Tengah': [-3.9511, 136.2163],
  'Papua Pegunungan': [-4.0931, 138.8540],
  'Papua Barat Daya': [-0.9329, 131.5422]
};

export const normalizeProvinceName = (name: string): string => {
  if (!name) return 'Nasional';
  const clean = name.trim().toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^provinsi/, '')
    .replace(/^prov/, '');

  if (clean === 'diy' || clean === 'diyogyakarta' || clean === 'daerahistimewayogyakarta' || clean === 'dikyogyakarta') {
    return 'DI Yogyakarta';
  }
  if (clean === 'dkijakarta' || clean === 'daerahkhususibukotajakarta' || clean === 'jakarta') {
    return 'DKI Jakarta';
  }
  if (clean === 'kepri' || clean === 'kepulauanriau') {
    return 'Kepulauan Riau';
  }
  if (clean === 'babel' || clean === 'kepulauanbangkabelitung' || clean === 'bangkabelitung') {
    return 'Kepulauan Bangka Belitung';
  }
  if (clean === 'papuabaratdaya') return 'Papua Barat Daya';
  if (clean === 'papuabarat') return 'Papua Barat';
  if (clean === 'papuaselatan') return 'Papua Selatan';
  if (clean === 'papuatengah') return 'Papua Tengah';
  if (clean === 'papuapegunungan') return 'Papua Pegunungan';

  const matchedKey = Object.keys(PROVINCE_COORDINATES).find(key => {
    const kClean = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    return kClean === clean;
  });

  return matchedKey || name;
};

interface OSMMapProps {
  selectedProvince: string;
  setSelectedProvince: (province: string) => void;
  provinceStats: Record<string, {
    newsCount: number;
    mediaCount: number;
    positif: number;
    negatif: number;
    netral: number;
  }>;
  filteredNews?: any[];
  isDetailOpen?: boolean;
  isOffscreen?: boolean;
  onViewAll?: (provinceName: string) => void;
}

export const OSMMap: React.FC<OSMMapProps> = React.memo(({
  selectedProvince,
  setSelectedProvince,
  provinceStats,
  filteredNews = [],
  isDetailOpen = true,
  isOffscreen = false,
  onViewAll
}) => {
  const { theme, setTab, setPortalLocationFilter, showToast, news } = useAppState();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth > 768 : true;
  });

  const [isLeafletReady, setIsLeafletReady] = useState(() => typeof window !== 'undefined' && !!(window as any).L);

  useEffect(() => {
    if (isLeafletReady) return;
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && (window as any).L) {
        setIsLeafletReady(true);
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isLeafletReady]);

  const [showLatestTicker, setShowLatestTicker] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);

  // All recent news headlines matching the active filters
  const top3RecentNews = useMemo(() => {
    let source = filteredNews !== undefined ? filteredNews : (news || []);
    let filtered = [...source].filter(n => n.status === 'Published' || !n.status);
    const normSelected = normalizeProvinceName(selectedProvince);
    if (normSelected && normSelected !== 'Nasional') {
      filtered = filtered.filter(
        n => normalizeProvinceName(n.location) === normSelected
      );
    }
    return filtered
      .sort((a, b) => {
        const dateA = a.publishDate || '';
        const dateB = b.publishDate || '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        
        const timeA = a.publishTime || '00:00';
        const timeB = b.publishTime || '00:00';
        if (timeA !== timeB) return timeB.localeCompare(timeA);

        const createA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const createB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return createB - createA;
      });
  }, [news, filteredNews, selectedProvince]);

  // Reset ticker index when selected province changes
  useEffect(() => {
    setTickerIndex(0);
  }, [selectedProvince]);

  // Set Interval for auto-cycling ticker headlines
  useEffect(() => {
    if (!showLatestTicker || top3RecentNews.length <= 1) return;
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % top3RecentNews.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [showLatestTicker, top3RecentNews]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const tileLayerRef = useRef<any>(null);

  // Auto scroll references and state for expanded "Kabar Terkini"
  const newsListRef = useRef<HTMLDivElement>(null);
  const [isNewsHovered, setIsNewsHovered] = useState(false);

  // Auto scroll effect for Expanded "Kabar Terkini" news list in fullscreen mode (card-by-card scrolling)
  useEffect(() => {
    if (!isFullscreen || !showLatestTicker || isNewsHovered) return;

    const container = newsListRef.current;
    if (!container) return;

    const intervalId = setInterval(() => {
      if (isNewsHovered) return;

      const cards = Array.from(container.children) as HTMLElement[];
      if (cards.length <= 1) return;

      // Find current scroll position
      const scrollTop = container.scrollTop;
      const containerRect = container.getBoundingClientRect();

      // Find which card is currently active (closest to the top of viewport)
      let currentIdx = cards.findIndex((card) => {
        const cardRect = card.getBoundingClientRect();
        const relativeTop = cardRect.top - containerRect.top;
        // If the card top is near or below the container's visible top
        return relativeTop >= -15;
      });

      if (currentIdx === -1) {
        currentIdx = 0;
      }

      // Go to next card
      const nextIndex = (currentIdx + 1) % cards.length;
      const targetCard = cards[nextIndex];

      if (targetCard) {
        const cardRect = targetCard.getBoundingClientRect();
        const targetScrollTop = cardRect.top - containerRect.top + container.scrollTop - 4;
        
        container.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
      }
    }, 4000); // Transitions card-by-card every 4.0 seconds (relaxed, easy reading)

    return () => clearInterval(intervalId);
  }, [isFullscreen, showLatestTicker, isNewsHovered, top3RecentNews]);

  // BMKG earthquake states & refs
  const [showQuakes, setShowQuakes] = useState(false);
  const [isQuakesPanelExpanded, setIsQuakesPanelExpanded] = useState(true);
  const [quakes, setQuakes] = useState<any[]>([]);
  const [isLoadingQuakes, setIsLoadingQuakes] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const quakesMarkersRef = useRef<any[]>([]);
  const [quakesTimeRange, setQuakesTimeRange] = useState<'24h' | 'all'>('24h');



  // Filter BMKG earthquakes to show either last 24 hours or all
  const filteredQuakes = useMemo(() => {
    if (quakesTimeRange === 'all') return quakes;
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    return quakes.filter((quake) => {
      if (!quake.dateTime) return false;
      const t = new Date(quake.dateTime).getTime();
      return t >= twentyFourHoursAgo;
    });
  }, [quakes, quakesTimeRange]);

  const syncBMKGQuakes = async (isManual: boolean = false) => {
    setIsLoadingQuakes(true);
    try {
      const response = await fetch('/api/bmkg/quakes');
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          const fetchedData = json.data || [];
          
          // Check if there are newly added stronger earthquakes (Magnitude >= 5.0)
          if (quakes.length > 0) {
            const newStrongQuakes = fetchedData.filter((newItem: any) => {
              const mag = parseFloat(newItem.magnitude) || 0;
              const alreadyExists = quakes.some((oldItem: any) => oldItem.key === newItem.key);
              return !alreadyExists && mag >= 5.0;
            });

            if (newStrongQuakes.length > 0) {
              newStrongQuakes.forEach((item: any) => {
                showToast(`GEMPA TERKINI (M ${item.magnitude}): ${item.wilayah} (${item.kedalaman})!`, 'error');
              });
            }
          }

          setQuakes(fetchedData);
          setLastSynced(new Date());
          if (isManual) {
            showToast('Sinkronisasi data gempa real-time BMKG berhasil!', 'success');
            // Sound alarm beep
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              if (audioCtx) {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 tone
                gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.15);
              }
            } catch (_) {}
          }
        }
      }
    } catch (error) {
      console.error('Error syncing BMKG quakes:', error);
      if (isManual) {
        showToast('Gagal menyinkronkan data gempa BMKG', 'error');
      }
    } finally {
      setIsLoadingQuakes(false);
    }
  };

  // Dynamic layout adjustment to bypass containing blocks or overflow-hidden limits on ancestral nodes
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    const elementsToRestore: { el: HTMLElement; style: string }[] = [];
    
    if (isFullscreen) {
      // Temporarily hide scrolling on body/html in true fullscreen to prevent double scrollbars
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      elementsToRestore.push({ el: document.body, style: `overflow: ${origOverflow}` });

      let parent = mapContainerRef.current.parentElement;
      while (parent && parent !== document.body) {
        const originalStyle = parent.getAttribute('style') || '';
        elementsToRestore.push({ el: parent, style: originalStyle });
        
        const computed = window.getComputedStyle(parent);
        if (computed.overflow === 'hidden' || computed.overflowX === 'hidden' || computed.overflowY === 'hidden') {
          parent.style.setProperty('overflow', 'visible', 'important');
        }
        if (computed.transform !== 'none') {
          parent.style.setProperty('transform', 'none', 'important');
        }
        if (computed.willChange !== 'auto') {
          parent.style.setProperty('will-change', 'auto', 'important');
        }
        // Force safe stacking elevations
        parent.style.setProperty('z-index', '9999', 'important');
        
        parent = parent.parentElement;
      }
    }
    
    return () => {
      // Revert parent stylings back to original states on close
      elementsToRestore.forEach(({ el, style }) => {
        if (el === document.body) {
          document.body.style.overflow = style.replace('overflow: ', '');
        } else {
          if (style) {
            el.setAttribute('style', style);
          } else {
            el.removeAttribute('style');
          }
        }
      });
    };
  }, [isFullscreen]);

  // Helper to compile sentiment trend data of a province
  const getProvinceSentimentTrendData = (provName: string) => {
    // Collect all news for this province
    const normProv = normalizeProvinceName(provName);
    const provinceNews = (filteredNews || []).filter(
      (item: any) => normalizeProvinceName(item.location) === normProv
    );

    if (provinceNews.length === 0) return [];

    // Group items by date string (chronologically)
    const grouped: Record<string, { positif: number; negatif: number; netral: number; date: Date }> = {};
    
    provinceNews.forEach((item: any) => {
      let dateStr = item.publishDate;
      if (!dateStr) return;
      
      // Normalize date string for sorting
      let sortKey = dateStr;
      const parts = dateStr.split('-');
      if (parts.length === 3 && parts[2].length === 4) {
        // DD-MM-YYYY -> YYYY-MM-DD
        sortKey = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      
      const d = new Date(sortKey);
      if (isNaN(d.getTime())) return;

      if (!grouped[sortKey]) {
        grouped[sortKey] = { positif: 0, negatif: 0, netral: 0, date: d };
      }

      const s = String(item.sentiment).toLowerCase();
      if (s === 'positif') grouped[sortKey].positif += 1;
      else if (s === 'negatif') grouped[sortKey].negatif += 1;
      else grouped[sortKey].netral += 1;
    });

    // Sort chronologically by key
    const sortedKeys = Object.keys(grouped).sort();
    return sortedKeys.map((key) => {
      const info = grouped[key];
      return {
        dateStr: key,
        rawDate: info.date,
        positif: info.positif,
        negatif: info.negatif,
        netral: info.netral,
        score: info.positif - info.negatif,
        total: info.positif + info.negatif + info.netral
      };
    });
  };

  const generateSparklineSvg = (trendData: any[]) => {
    if (trendData.length === 0) {
      return `
        <div class="text-center italic text-[9.5px] py-2 bg-slate-500/5 dark:bg-black/10 rounded-xl my-2 text-slate-450 dark:text-slate-500 border border-slate-200/40 dark:border-white/[0.04]">
          Belum ada data tren sentimen
        </div>
      `;
    }

    const width = 145;
    const height = 22;
    const padding = 2;

    // Determine values
    const minVal = Math.min(...trendData.map((d: any) => d.score));
    const maxVal = Math.max(...trendData.map((d: any) => d.score));
    const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

    let points: { x: number; y: number }[] = [];
    if (trendData.length === 1) {
      const yVal = height / 2;
      points = [
        { x: 0, y: yVal },
        { x: width, y: yVal }
      ];
    } else {
      points = trendData.map((d: any, i: number) => {
        const x = (i / (trendData.length - 1)) * width;
        const y = height - ((d.score - minVal) / range) * (height - 2 * padding) - padding;
        return { x, y };
      });
    }

    const pathD = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

    // Final trend direction & color
    const lastScore = trendData[trendData.length - 1].score;
    let mainColor = '#6366f1'; // Indigo (neutral)
    let trendLabel = 'Stabil';
    let trendIcon = '↕️';

    if (lastScore > 0) {
      mainColor = '#10b981'; // Emerald (positive)
      trendLabel = 'Positif';
      trendIcon = '📈';
    } else if (lastScore < 0) {
      mainColor = '#ef4444'; // Red (negative)
      trendLabel = 'Negatif';
      trendIcon = '📉';
    }

    // Gradient Unique Identifier to avoid colliding with other SVG gradients
    const gradId = `spark-gradient-${Math.floor(Math.random() * 1000000)}`;

    return `
      <div class="my-1.5">
        <div class="flex items-center justify-between text-[9.5px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
          <span>Tren Sentimen:</span>
          <span class="font-mono font-bold text-[9px]" style="color: ${mainColor}">${trendIcon} ${trendLabel}</span>
        </div>
        <div class="p-0.5 px-1 bg-slate-500/5 dark:bg-black/15 rounded-lg border border-slate-200/55 dark:border-white/[0.04] flex items-center justify-center">
          <svg width="${width}" height="${height}" class="overflow-visible">
            <defs>
              <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="${mainColor}" stop-opacity="0.3" />
                <stop offset="100%" stop-color="${mainColor}" stop-opacity="0.0" />
              </linearGradient>
            </defs>
            <path d="${areaD}" fill="url(#${gradId})" />
            <path d="${pathD}" fill="none" stroke="${mainColor}" stroke-dasharray="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="${points[points.length - 1].x}" cy="${points[points.length - 1].y}" r="2.5" fill="${mainColor}" stroke="#ffffff" stroke-width="1" />
          </svg>
        </div>
      </div>
    `;
  };

  // Invalidate map size when toggling fullscreen or detail sidebar panel
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 300); // 300ms is perfect for CSS flex transition duration
    }
  }, [isFullscreen, isDetailOpen]);

  // Initialize the Leaflet map
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    // Create Leaflet map centered at Indonesia
    const initCenter: [number, number] = isOffscreen ? [-2.5, 118.0] : [-2.0, 118.0];
    const initZoom = isOffscreen ? 4.8 : (typeof window !== 'undefined' && window.innerWidth < 768 ? 4 : 5);

    const mapInstance = L.map(mapContainerRef.current, {
      center: initCenter,
      zoom: initZoom,
      minZoom: 3,
      maxZoom: 9,
      zoomControl: !isOffscreen, // hide zoom controls on offscreen export maps
      fadeAnimation: !isOffscreen,
      markerZoomAnimation: !isOffscreen,
      zoomAnimation: !isOffscreen,
      zoomSnap: 0.1,
      zoomDelta: 0.2, // Smaller step increments for much smoother zooming
      wheelPxPerZoomLevel: 120, // Increases the distance required on the scroll wheel to zoom, making it feel very premium and gradual
      wheelDebounceTime: 40 // Debounces rapid scroll wheel events to prevent visual stuttering
    });

    mapRef.current = mapInstance;

    // Add Tile Layer depending on initial theme
    const tileUrl = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const tileLayerInstance = L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
      crossOrigin: true,
      updateWhenIdle: true, // Only load tiles when panning has ended to save network bandwidth and avoid browser rendering lag
      updateWhenZooming: false, // Turn off continuous tile loading during zooming animations to maintain buttery-smooth rendering
      keepBuffer: 4 // Cache 4 lines of offscreen tiles in memory to instantly render them when panning back slightly
    }).addTo(mapInstance);

    tileLayerRef.current = tileLayerInstance;

    // Build markers for provinces
    rebuildMarkers();

    // Clean up on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current = {};
      quakesMarkersRef.current.forEach((marker: any) => {
        try {
          if (mapRef.current) mapRef.current.removeLayer(marker);
        } catch (_) {}
      });
      quakesMarkersRef.current = [];
    };
  }, [isLeafletReady]);

  // Update Tile Layer if dark/light theme changes
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current || !tileLayerRef.current) return;

    const tileUrl = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    tileLayerRef.current.setUrl(tileUrl);
  }, [theme]);

  // Rebuild markers when stats or filteredNews change
  useEffect(() => {
    rebuildMarkers();
  }, [provinceStats, selectedProvince, filteredNews]);

  // Handle earthquake layer updates when active or data loads
  useEffect(() => {
    rebuildQuakeMarkers();
  }, [showQuakes, filteredQuakes]);

  // Setup auto-syncer background polling interval when BMKG layer is toggled on
  useEffect(() => {
    let intervalId: any = null;
    
    if (showQuakes) {
      if (quakes.length === 0) {
        syncBMKGQuakes(false);
      }
      
      // Auto-refresh every 30 seconds to keep data perfectly real-time
      intervalId = setInterval(() => {
        syncBMKGQuakes(false);
      }, 30000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [showQuakes]);



  const rebuildQuakeMarkers = () => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    // Clean up existing quakes markers
    quakesMarkersRef.current.forEach((marker: any) => {
      try {
        mapRef.current.removeLayer(marker);
      } catch (_) {}
    });
    quakesMarkersRef.current = [];

    if (!showQuakes) return;

    // Place high-contrast, concentric pulsing markers for each earthquake
    filteredQuakes.forEach((quake) => {
      if (!quake.lat || !quake.lng) return;

      const mag = parseFloat(quake.magnitude) || 0;
      let ringColorClass = 'border-amber-550 bg-amber-500/20';
      let centerColorClass = 'bg-amber-500';
      let textBadgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300';
      let severityLabel = 'Sedang';

      if (mag >= 6.0) {
        ringColorClass = 'border-rose-500 bg-rose-500/20';
        centerColorClass = 'bg-rose-600';
        textBadgeClass = 'bg-rose-100 text-rose-800 dark:bg-rose-955 dark:text-rose-200 font-extrabold';
        severityLabel = 'Sangat Kuat / Kritis';
      } else if (mag >= 5.0) {
        ringColorClass = 'border-orange-500 bg-orange-500/20';
        centerColorClass = 'bg-orange-600';
        textBadgeClass = 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-300 font-bold';
        severityLabel = 'Kuat';
      } else {
        ringColorClass = 'border-yellow-450 bg-yellow-450/20';
        centerColorClass = 'bg-yellow-500';
        textBadgeClass = 'bg-yellow-100 text-yellow-850 dark:bg-yellow-950/60 dark:text-yellow-300';
        severityLabel = 'Ringan';
      }

      // Render concentric HTML shockwave waves styled using global CSS
      const customIconHtml = `<div class="custom-quake-marker-wrapper select-none pointer-events-none"><div class="absolute w-12 h-12 rounded-full border opacity-0 bmkg-pulse-wave-1 ${ringColorClass}"></div><div class="absolute w-12 h-12 rounded-full border opacity-0 bmkg-pulse-wave-2 ${ringColorClass}"></div><div class="absolute w-12 h-12 rounded-full border opacity-0 bmkg-pulse-wave-3 ${ringColorClass}"></div><div class="custom-quake-marker-center ${centerColorClass} border border-white dark:border-slate-900"><span class="custom-quake-marker-number">${mag.toFixed(1)}</span></div></div>`;

      const customIcon = L.divIcon({
        html: customIconHtml,
        className: 'custom-div-icon-quake',
        iconSize: [56, 56],
        iconAnchor: [28, 28],
        popupAnchor: [0, -14]
      });

      const tsunamiLabel = (quake.potensi || '').toLowerCase().includes('tidak berpotensi')
        ? '<span class="text-emerald-600 dark:text-emerald-400 font-bold">Aman (Tidak Berpotensi Tsunami)</span>'
        : '<span class="text-rose-650 dark:text-rose-400 font-black animate-pulse">SIAGA / AWAS TSUNAMI BMKG!</span>';

      const feltDetails = quake.dirasakan
        ? `<div class="mt-2 pt-1.5 border-t border-slate-200 dark:border-white/10 text-[9.5px]">
             <span class="popup-label">Dirasakan (Skala MMI):</span>
             <p class="mt-0.5 font-mono text-[9px] text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-500/5 dark:bg-black/20 p-1.5 rounded-lg border border-slate-200/50 dark:border-white/[0.04]">${quake.dirasakan}</p>
           </div>`
        : '';

      const popupContent = `
        <div class="p-2 w-[215px] font-sans select-none leading-normal">
          <div class="border-b border-slate-300 dark:border-white/15 pb-1.5 mb-2 flex items-center justify-between gap-1">
            <span class="px-1.5 py-0.5 rounded text-[8.5px] uppercase tracking-wider ${textBadgeClass}">
              Gempa M ${mag.toFixed(1)}
            </span>
            <span class="text-[9px] text-slate-400 dark:text-slate-500 font-bold">INFO BMKG</span>
          </div>

          <h4 class="popup-title font-black text-[11.5px] tracking-tight leading-snug m-0 mb-2">
            ${quake.wilayah}
          </h4>

          <div class="space-y-1.5 text-[10px]">
            <div class="flex justify-between">
              <span class="popup-label">Waktu:</span>
              <span class="popup-value font-mono text-[9px] text-right">${quake.tanggal}, ${quake.jam}</span>
            </div>
            <div class="flex justify-between">
              <span class="popup-label">Kedalaman:</span>
              <span class="popup-value font-mono text-cyan-600 dark:text-cyan-400">${quake.kedalaman}</span>
            </div>
            <div class="flex justify-between">
              <span class="popup-label">Parameter:</span>
              <span class="popup-value font-mono text-[9px]">${quake.lat.toFixed(3)} ${quake.lat < 0 ? 'LS' : 'LU'}, ${quake.lng.toFixed(3)} BT</span>
            </div>
            <div class="flex justify-between pt-1 border-t border-slate-200/50 dark:border-white/[0.05]">
              <span class="popup-label">Magnitudo:</span>
              <span class="popup-value font-mono text-[11px]" style="color: ${mag >= 6.0 ? '#f43f5e' : (mag >= 5.0 ? '#f97316' : '#eab308')}">${mag.toFixed(1)} SR (${severityLabel})</span>
            </div>
            <div class="pt-1.5 border-t border-slate-200/50 dark:border-white/[0.05] text-[9px]">
              <span class="popup-label">Status Tsunami:</span>
              <div class="mt-0.5 leading-snug">${tsunamiLabel}</div>
            </div>
            ${feltDetails}
          </div>
        </div>
      `;

      const marker = L.marker([quake.lat, quake.lng], { icon: customIcon })
        .addTo(mapRef.current);

      marker.bindPopup(popupContent, {
        className: 'custom-osm-popup-container hide-on-print',
        maxWidth: 240,
        minWidth: 200,
        autoPan: true,
        autoPanPadding: [30, 30],
        offset: [0, -4]
      });

      quakesMarkersRef.current.push(marker);
    });
  };



  // Center/Fly to the selected province on external coordinate changes
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    const normalizedSelected = normalizeProvinceName(selectedProvince);
    const coords = PROVINCE_COORDINATES[normalizedSelected];
    if (coords) {
      if (normalizedSelected === 'Nasional') {
        const targetZoom = isOffscreen ? 4.8 : (typeof window !== 'undefined' && window.innerWidth < 768 ? 4 : 5);
        const targetCenter: [number, number] = isOffscreen ? [-2.5, 118.0] : coords;
        mapRef.current.setView(targetCenter, targetZoom, { animate: !isOffscreen });
      } else {
        // Zoom to focus beautifully (zoom 7)
        mapRef.current.setView(coords, 7, { animate: !isOffscreen });
      }
    }
  }, [selectedProvince]);

  const rebuildMarkers = () => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    // Clean up existing markers
    Object.values(markersRef.current).forEach((marker: any) => {
      mapRef.current.removeLayer(marker);
    });
    markersRef.current = {};

    // Create markers for active or representative provinces in PROVINCE_COORDINATES
    Object.entries(PROVINCE_COORDINATES).forEach(([provinceName, coords]) => {
      const statsKey = Object.keys(provinceStats).find(
        k => normalizeProvinceName(k) === normalizeProvinceName(provinceName)
      );
      const stats = (statsKey ? provinceStats[statsKey] : null) || { newsCount: 0, mediaCount: 0, positif: 0, negatif: 0, netral: 0 };
      const isSelected = normalizeProvinceName(selectedProvince) === normalizeProvinceName(provinceName);

      // Dynamic verification & calculation matching the sentiment data provided from the dashboard state
      let posCount = stats.positif ?? 0;
      let negCount = stats.negatif ?? 0;
      let neutCount = stats.netral ?? 0;
      let totalCount = stats.newsCount ?? 0;

      // Logic check: Validate and load dynamically from filteredNews if available to guarantee live visual consistency
      if (filteredNews && filteredNews.length > 0) {
        const provinceNews = filteredNews.filter(
          item => normalizeProvinceName(item.location) === normalizeProvinceName(provinceName)
        );
        if (provinceNews.length > 0) {
          let dynPos = 0;
          let dynNeg = 0;
          let dynNeut = 0;
          provinceNews.forEach(item => {
            const s = (item.sentiment || '').toLowerCase().trim();
            if (s === 'positif') {
              dynPos++;
            } else if (s === 'negatif') {
              dynNeg++;
            } else {
              dynNeut++;
            }
          });
          posCount = dynPos;
          negCount = dynNeg;
          neutCount = dynNeut;
          totalCount = provinceNews.length;
        }
      }

      // Skip rendering if province has 0 activities to ensure high fidelity layout clean space
      if (totalCount === 0) {
        return;
      }

      // Determine dominant sentiment dynamically with full tie-breaker resilience
      let dominant: 'positif' | 'negatif' | 'netral' = 'netral';
      if (totalCount > 0) {
        if (negCount > posCount && negCount > neutCount) {
          dominant = 'negatif';
        } else if (posCount > negCount && posCount > neutCount) {
          dominant = 'positif';
        } else if (neutCount > posCount && neutCount > negCount) {
          dominant = 'netral';
        } else {
          // Tie-breaking check using absolute maximum values
          const maxVal = Math.max(posCount, negCount, neutCount);
          if (maxVal === negCount) {
            dominant = 'negatif';
          } else if (maxVal === posCount) {
            dominant = 'positif';
          } else {
            dominant = 'netral';
          }
        }
      }

      // Generate custom HTML DivIcon colors (Red for negative, Green for positive, Blue for neutral)
      let pulseColor = 'bg-blue-500 pulse-color-netral';
      let centerColor = 'bg-blue-600 center-color-netral';

      if (dominant === 'negatif') {
        pulseColor = 'bg-red-500 pulse-color-negatif';
        centerColor = 'bg-red-600 center-color-negatif';
      } else if (dominant === 'positif') {
        pulseColor = 'bg-emerald-500 pulse-color-positif';
        centerColor = 'bg-emerald-600 center-color-positif';
      }

      const borderClass = isSelected ? 'ring-4 ring-[#1e3a8a] ring-offset-2 ring-offset-slate-950' : 'border border-white dark:border-slate-900';

      const customIconHtml = `<div class="custom-map-marker-wrapper select-none pointer-events-none"><div class="custom-map-marker-pulse animate-ping opacity-35 ${pulseColor}"></div><div class="custom-map-marker-center ${centerColor} ${borderClass}"><span class="custom-map-marker-number">${totalCount}</span></div></div>`;

      const customIcon = L.divIcon({
        html: customIconHtml,
        className: 'custom-div-icon-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -10]
      });

      // Calculate dominant percentage for absolute precision
      const totalForPct = totalCount || 1;
      const pctPos = Math.round((posCount / totalForPct) * 100);
      const pctNeg = Math.round((negCount / totalForPct) * 100);
      const pctNeut = Math.max(0, 100 - pctPos - pctNeg);

      // Trend data compiled for sparkline
      const trendData = getProvinceSentimentTrendData(provinceName);
      const sparklineHtml = generateSparklineSvg(trendData);

      // Bind premium styled click popup designed like an elegant classic card with supreme contrast and no emojis
      const popupContent = `
        <div class="p-2 w-[165px] font-sans select-none leading-normal">
          <!-- Province Name Header -->
          <div class="border-b border-slate-300 dark:border-white/15 pb-1 mb-1.5">
            <h4 class="popup-title font-black text-[12px] m-0 tracking-tight leading-tight">
               ${provinceName}
            </h4>
          </div>
 
          <!-- Total news info row -->
          <div class="flex items-center justify-between text-[10px] mb-1.5">
            <span class="popup-label">Jumlah Berita:</span>
            <span class="popup-value font-mono text-[11.5px]">
              ${totalCount}
            </span>
          </div>
 
          <!-- Sentiment counts (Bigger with clear high-contrast indicators without icons) -->
          <div class="space-y-1 mt-1.5 mb-2 pt-1.5 border-t border-slate-200 dark:border-white/10 text-[9.5px]">
            ${totalCount > 0 ? `
              <div class="flex justify-between items-center popup-sentiment-pos">
                <span>Positif</span>
                <span class="font-mono font-extrabold">${posCount} (${pctPos}%)</span>
              </div>
              <div class="flex justify-between items-center popup-sentiment-neut">
                <span>Netral</span>
                <span class="font-mono font-extrabold">${neutCount} (${pctNeut}%)</span>
              </div>
              <div class="flex justify-between items-center popup-sentiment-neg">
                <span>Negatif</span>
                <span class="font-mono font-extrabold">${negCount} (${pctNeg}%)</span>
              </div>
              
              <!-- Sentiment Trend Sparkline -->
              ${sparklineHtml}
            ` : `
              <div class="text-center italic text-[9px] popup-no-data py-1">Belum ada berita</div>
            `}
          </div>    </div>
 
          <!-- Classic "Lihat Semua Berita" Action Button -->
          <button 
            type="button" 
            class="leaflet-view-btn w-full cursor-pointer py-1 px-2 text-center text-[9px] font-extrabold rounded-md select-none transition-all duration-200 border-0"
            title="Lihat Semua Berita"
          >
            Lihat Semua Berita →
          </button>
        </div>
      `;
 
      const marker = L.marker(coords, { icon: customIcon })
        .addTo(mapRef.current);
 
      marker.bindPopup(popupContent, {
        className: 'custom-osm-popup-container hide-on-print',
        maxWidth: 180,
        minWidth: 160,
        autoPan: true,
        autoPanPadding: [20, 20],
        offset: [0, -6]
      });

      marker.on('popupopen', (e: any) => {
        // Sync selected province state upon opening a marker's popup
        if (selectedProvince !== provinceName) {
          setSelectedProvince(provinceName);
        }

        // Dynamic centering with cozy offset on mobile viewport
        const popup = e.popup;
        const map = mapRef.current;
        if (map && popup) {
          const latLng = popup.getLatLng();
          if (latLng) {
            const px = map.project(latLng);
            // shift up slightly depending on zoom or bounds to perfectly fit cards
            px.y -= 100;
            map.panTo(map.unproject(px), { animate: true, duration: 0.6 });
          }
        }

        const popupEl = e.popup.getElement();
        if (popupEl) {
          const btn = popupEl.querySelector('.leaflet-view-btn');
          if (btn) {
            btn.onclick = (event: MouseEvent) => {
              event.preventDefault();
              event.stopPropagation();
              if (onViewAll) {
                onViewAll(provinceName);
              } else {
                setPortalLocationFilter(provinceName);
                setTab('portal');
              }
            };
          }
        }
      });

      markersRef.current[provinceName] = marker;

      // Automatically open popup if this province is currently selected
      if (isSelected) {
        setTimeout(() => {
          if (marker && mapRef.current) {
            marker.openPopup();
          }
        }, 100);
      }
    });
  };

  const L = (window as any).L;
  if (!L) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[340px] text-slate-400 font-mono text-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3" />
        Menyiapkan Peta OpenStreetMap...
      </div>
    );
  }

  return (
    <>
      <div id="osm-map-container" className={`transition-all duration-300 ${isFullscreen ? 'fixed inset-0 w-screen h-screen z-[9999] bg-white dark:bg-slate-900 flex flex-col overflow-hidden pb-4' : 'relative w-full h-full min-h-[340px] rounded-2xl overflow-hidden border border-slate-200/40 dark:border-slate-800/40 shadow-inner'}`}>
        <div 
          ref={mapContainerRef} 
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 1 }}
        />

        {/* 'Show Latest' Toggle Button */}
        <button
          type="button"
          id="btn-show-latest-map"
          onClick={() => {
            setShowLatestTicker(!showLatestTicker);
            if (!showLatestTicker) {
              setTickerIndex(0);
            }
          }}
          className={`hide-on-print absolute top-4 left-4 z-[1010] px-3 py-1.5 sm:px-3.5 sm:py-2.5 rounded-xl border font-extrabold text-[10.5px] tracking-wider uppercase flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer backdrop-blur-md ${
            showLatestTicker
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500 shadow-indigo-950/20'
              : 'bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
          title="Tampilkan seluruh berita sesuai filter"
        >
          <Newspaper className={`w-3.5 h-3.5 ${showLatestTicker ? 'animate-bounce text-white' : 'text-indigo-500 dark:text-indigo-400'}`} />
          <span>{showLatestTicker ? 'Sembunyikan' : 'Show Latest'}</span>
        </button>

        {/* Ticker Popup of Latest News */}
        <AnimatePresence>
          {showLatestTicker && (
            isFullscreen ? (
              // Fullscreen Expanded Panel (Stretches from top to bottom)
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="hide-on-print absolute top-4 bottom-4 right-4 z-[1010] w-[320px] sm:w-[380px] backdrop-blur-md bg-white/95 dark:bg-[#0c0b11]/95 text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-800/80 shadow-2xl rounded-2xl p-4 flex flex-col gap-3 h-[calc(100%-2rem)]"
              >
                {/* Panel Header */}
                <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-850 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-450 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <span className="text-[11px] font-black tracking-wider text-slate-600 dark:text-white uppercase font-sans truncate max-w-[180px] sm:max-w-[240px]" title={selectedProvince && selectedProvince !== 'Nasional' ? `KABAR TERKINI - ${selectedProvince}` : 'KABAR TERKINI'}>
                      KABAR TERKINI{selectedProvince && selectedProvince !== 'Nasional' ? `: ${selectedProvince}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded leading-none">
                      {top3RecentNews.length} berita
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowLatestTicker(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* News List Container (Scrollable) */}
                <div 
                  ref={newsListRef}
                  onMouseEnter={() => setIsNewsHovered(true)}
                  onMouseLeave={() => setIsNewsHovered(false)}
                  className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 scrollbar-thin"
                >
                  {top3RecentNews.length > 0 ? (
                    top3RecentNews.map((item) => {
                      const sentimentColors = 
                        item.sentiment === 'Positif'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15'
                          : item.sentiment === 'Negatif'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/15'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15';

                      return (
                        <div
                          key={item.id}
                          className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100/70 dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-800/80 hover:border-indigo-500/40 hover:shadow-md transition-all duration-250 cursor-pointer group"
                          onClick={() => {
                            if (item.link) {
                              window.open(item.link, '_blank', 'noopener,noreferrer');
                            } else {
                              showToast(`Berita: ${item.title}`, 'info');
                            }
                          }}
                        >
                          {/* Badges row */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${sentimentColors}`}>
                              {item.sentiment ? item.sentiment.toUpperCase() : 'NETRAL'}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 truncate max-w-[110px]" title={item.mediaName}>
                              {item.mediaName}
                            </span>
                            {item.location && (
                              <span 
                                className="text-[9px] text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center gap-0.5 max-w-[100px] truncate hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation(); // prevent opening link
                                  setSelectedProvince(item.location || 'Nasional');
                                }}
                                title={`Fokus wilayah ${item.location}`}
                              >
                                <MapPin className="w-2.5 h-2.5" />
                                <span>{item.location}</span>
                              </span>
                            )}
                          </div>

                          {/* Headline Title */}
                          <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 line-clamp-3 leading-snug group-hover:text-indigo-500 transition-colors">
                            {item.title}
                          </h4>

                          {/* Footer row */}
                          <div className="text-[8.5px] font-mono text-slate-400 dark:text-slate-500 pt-1 border-t border-dashed border-slate-100 dark:border-slate-850">
                            📅 {item.publishDate || '-'} {item.publishTime || ''}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center py-12 font-mono font-bold leading-normal px-4">
                      Tidak ada berita terbaru untuk {selectedProvince && selectedProvince !== 'Nasional' ? `Provinsi ${selectedProvince}` : 'ditampilkan'}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              // Normal Standard Ticker Popup
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="hide-on-print absolute bottom-4 right-4 z-[1010] w-[290px] sm:w-[350px] backdrop-blur-md bg-white/95 dark:bg-[#0c0b11]/95 text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-800/80 shadow-xl rounded-xl p-3 flex flex-col gap-1.5"
              >
                {/* Ticker Header */}
                <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-850 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-450 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <span className="text-[10px] font-black tracking-wider text-slate-500 dark:text-white uppercase font-sans truncate max-w-[150px] sm:max-w-[200px]" title={selectedProvince && selectedProvince !== 'Nasional' ? `KABAR TERKINI - ${selectedProvince}` : 'KABAR TERKINI'}>
                      KABAR TERKINI{selectedProvince && selectedProvince !== 'Nasional' ? `: ${selectedProvince}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded leading-none">
                      {top3RecentNews.length > 0 ? `${tickerIndex + 1}/${top3RecentNews.length}` : '0/0'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowLatestTicker(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Ticker Core Slider Area */}
                {top3RecentNews.length > 0 ? (
                  (() => {
                    const item = top3RecentNews[tickerIndex];
                    if (!item) return null;
                    const sentimentColors = 
                      item.sentiment === 'Positif'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15'
                        : item.sentiment === 'Negatif'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/15'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15';

                    return (
                      <div className="flex flex-col gap-1.5 min-h-[64px] justify-between">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col gap-1 cursor-pointer hover:opacity-90 select-none"
                            onClick={() => {
                              if (item.link) {
                                window.open(item.link, '_blank', 'noopener,noreferrer');
                              } else {
                                showToast(`Berita: ${item.title}`, 'info');
                              }
                            }}
                          >
                            {/* Badges row */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${sentimentColors}`}>
                                {item.sentiment ? item.sentiment.toUpperCase() : 'NETRAL'}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 truncate max-w-[125px]" title={item.mediaName}>
                                {item.mediaName}
                              </span>
                              {item.location && (
                                <span 
                                  className="text-[9px] text-slate-500 hover:text-indigo-500 hover:underline font-extrabold flex items-center gap-0.5 max-w-[105px] truncate cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation(); // prevent opening link
                                    setSelectedProvince(item.location || 'Nasional');
                                  }}
                                  title={`Klik untuk fokus wilayah ${item.location}`}
                                >
                                  <MapPin className="w-2.5 h-2.5" />
                                  <span>{item.location}</span>
                                </span>
                              )}
                            </div>

                            {/* Headline Title */}
                            <h4 className="text-[11.5px] font-extrabold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug hover:text-indigo-500 transition-colors">
                              {item.title}
                            </h4>
                          </motion.div>
                        </AnimatePresence>

                        {/* Manual Cycle Navigation Controls */}
                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50 pt-1.5">
                          <span className="text-[8.5px] font-mono text-slate-400 dark:text-slate-500 font-medium">
                            📅 {item.publishDate || '-'} {item.publishTime || ''}
                          </span>
                          {top3RecentNews.length > 1 && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTickerIndex((prev) => (prev - 1 + top3RecentNews.length) % top3RecentNews.length);
                                }}
                                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200/20 transition-all cursor-pointer"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTickerIndex((prev) => (prev + 1) % top3RecentNews.length);
                                }}
                                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200/20 transition-all cursor-pointer"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center py-4 font-mono font-bold leading-normal px-2">
                    Tidak ada berita terbaru untuk {selectedProvince && selectedProvince !== 'Nasional' ? `Provinsi ${selectedProvince}` : 'ditampilkan'}
                  </div>
                )}
              </motion.div>
            )
          )}
        </AnimatePresence>



        {/* BMKG Earthquake Toggle Button */}
        <button
          type="button"
          onClick={() => setShowQuakes(!showQuakes)}
          className={`hide-on-print absolute top-4 z-[1010] px-3.5 py-2.5 rounded-xl border font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer backdrop-blur-md ${
            isFullscreen && showLatestTicker
              ? 'right-[400px] sm:right-[460px]'
              : 'right-15'
          } ${
            showQuakes
              ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500 shadow-rose-950/20 glow-navy-active'
              : 'bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
          title="Tampilkan Informasi Gempa Bumi Terkini BMKG"
        >
          {isLoadingQuakes ? (
            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <div className={`w-2.5 h-2.5 rounded-full ${showQuakes ? 'bg-white animate-ping' : 'bg-rose-550 bg-rose-600'} flex-shrink-0`} />
          )}
          <span>{showQuakes ? 'Sembunyikan Gempa BMKG' : 'Peta Gempa BMKG'}</span>
        </button>

        {/* Fullsize/Fullscreen toggle button */}
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className={`hide-on-print absolute top-4 z-[1010] p-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-200/50 dark:border-slate-800/50 shadow-md text-slate-700 dark:text-slate-300 hover:scale-105 active:scale-95 transition hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${
            isFullscreen && showLatestTicker
              ? 'right-[340px] sm:right-[400px]'
              : 'right-4'
          }`}
          title={isFullscreen ? "Kembali ke Ukuran Normal" : "Perbesar Layar Peta (Fullsize)"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>



        {showQuakes && (
          <div 
            onClick={() => {
              if (!isQuakesPanelExpanded) {
                setIsQuakesPanelExpanded(true);
              }
            }}
            className={`hide-on-print absolute top-16 z-[1010] bg-white/95 dark:bg-[#0c0b11]/95 backdrop-blur-md border border-rose-100 dark:border-rose-950/60 shadow-xl select-none transition-all duration-300 ease-in-out ${
              isFullscreen && showLatestTicker
                ? 'right-[340px] sm:right-[400px]'
                : 'right-4'
            } ${
              isQuakesPanelExpanded 
                ? "p-3 sm:p-3.5 rounded-2xl w-[260px] sm:w-[320px] max-w-[85vw] flex flex-col gap-2.5" 
                : "p-2 rounded-xl flex items-center justify-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900 shadow-md hover:scale-105 active:scale-95 cursor-pointer"
            }`}
            title={isQuakesPanelExpanded ? undefined : "Klik untuk Perluas Live Feed BMKG"}
          >
            {!isQuakesPanelExpanded ? (
              <div className="flex items-center gap-1.5 px-1 py-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 tracking-wider">
                  BMKG
                </span>
                {filteredQuakes.length > 0 && (
                  <span className="bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 text-[8.5px] font-black px-1.5 py-0.5 rounded-full leading-none">
                    {filteredQuakes.length}
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
            ) : (
              <>
                {/* Clickable Header for Collapse/Expand (Buka-Tutup) */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsQuakesPanelExpanded(false);
                  }}
                  className="flex items-center justify-between gap-3 pb-1.5 border-b border-slate-100 dark:border-slate-800/60 cursor-pointer hover:opacity-80 transition-opacity"
                  title="Klik untuk Sembunyikan Log BMKG"
                >
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                    <span className="text-[10px] font-extrabold text-slate-800 dark:text-white uppercase tracking-wider font-sans">
                      Live Feed BMKG ({quakesTimeRange === '24h' ? '24 Jam' : 'Semua'})
                    </span>
                    {filteredQuakes.length > 0 && (
                      <span className="bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 text-[8.5px] font-black px-1.5 py-0.5 rounded-full">
                        {filteredQuakes.length}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 px-1 py-0.5 rounded text-[8px] font-bold">
                      Auto
                    </span>
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>

                {/* Collapsible Content */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">
                      Status Sinkronisasi
                    </span>
                    <span className="text-[10px] font-mono text-slate-600 dark:text-slate-350 font-bold mt-0.5">
                      {lastSynced 
                        ? `Ok • ${lastSynced.toLocaleTimeString('id-ID')}` 
                        : 'Menghubungkan...'
                      }
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isLoadingQuakes}
                    onClick={(e) => {
                       e.stopPropagation(); // prevent collapsing when clicking the button
                      syncBMKGQuakes(true);
                    }}
                    className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border border-rose-200/50 dark:border-rose-900/50 text-[10px] font-black transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    title="Sinkronisasikan data BMKG sekarang secara manual"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingQuakes ? 'animate-spin' : ''}`} />
                    <span>{isLoadingQuakes ? 'Sinkron...' : 'Sinkronisasi'}</span>
                  </button>
                </div>

                {/* Time Range Selector */}
                <div className="flex items-center justify-between gap-2 bg-slate-500/5 dark:bg-black/20 p-1.5 rounded-lg border border-slate-200/40 dark:border-white/[0.04]" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">
                    Rentang Waktu
                  </span>
                  <div className="flex bg-slate-200/60 dark:bg-slate-900 border border-slate-300/40 dark:border-white/5 rounded-md p-0.5">
                    <button
                      type="button"
                      onClick={() => setQuakesTimeRange('24h')}
                      className={`px-2 py-0.5 text-[8.5px] font-black rounded-sm transition-all cursor-pointer ${
                        quakesTimeRange === '24h'
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      24 Jam
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuakesTimeRange('all')}
                      className={`px-2 py-0.5 text-[8.5px] font-black rounded-sm transition-all cursor-pointer ${
                        quakesTimeRange === 'all'
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Semua
                    </button>
                  </div>
                </div>

                {filteredQuakes.length > 0 && (
                  <div className="text-[8.5px] leading-relaxed text-slate-400 dark:text-slate-500 font-semibold bg-slate-500/5 dark:bg-black/20 p-2 rounded-lg border border-slate-200/40 dark:border-white/[0.04]">
                    Terdeteksi <span className="text-rose-500 dark:text-rose-450 font-black">{filteredQuakes.length}</span> aktivitas guncangan seismik dalam rentang {quakesTimeRange === '24h' ? '24 jam terakhir' : 'seluruh data'} di wilayah patahan tektonik Indonesia.
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Collapsible map legend at the bottom left */}
        <div className="hide-on-print absolute bottom-3 left-3 z-[1010] flex flex-col gap-1 select-none">
          {!isLegendOpen ? (
            <button
               onClick={() => setIsLegendOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/95 dark:bg-[#0c0b11]/95 backdrop-blur-md rounded-xl border border-slate-250 dark:border-slate-800 shadow-md text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-200 dark:border-slate-950 shadow-xs" title="Dominan Positif" />
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-slate-200 dark:border-slate-950 shadow-xs" title="Dominan Negatif" />
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-slate-200 dark:border-slate-950 shadow-xs" title="Dominan Netral" />
                {showQuakes && <span className="w-2.5 h-2.5 rounded-full bg-rose-600 border border-slate-200 dark:border-slate-950 shadow-xs" title="Gempa Terkini" />}
              </div>
              <span className="ml-1 text-slate-500 dark:text-slate-400">Legenda Peta</span>
              <ChevronUp className="w-3.5 h-3.5 text-slate-450" />
            </button>
          ) : (
            <div className="bg-white/95 dark:bg-[#0c0b11]/95 backdrop-blur-md p-3 rounded-xl border border-slate-200/50 dark:border-slate-800 shadow-lg flex flex-col gap-2 max-w-[280px]">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-1.5 font-bold">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">Legenda Peta</span>
                <button 
                  onClick={() => setIsLegendOpen(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Sembunyikan Legenda"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div className="flex flex-col gap-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="legend-dot legend-dot-positif flex-shrink-0" />
                  <span>Dominan Positif</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="legend-dot legend-dot-negatif flex-shrink-0" />
                  <span>Dominan Negatif</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="legend-dot legend-dot-netral flex-shrink-0" />
                  <span>Dominan Netral</span>
                </div>
              </div>

              {showQuakes && (
                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2 flex flex-col gap-1.5 text-[9.5px]">
                  <span className="text-[8.5px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Skala Magnitudo Gempa</span>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
                      <span className="legend-dot legend-dot-quake flex-shrink-0" />
                      <span>≥ 6.0 SR (Sangat Kuat)</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
                      <span className="legend-dot legend-dot-quake-strong flex-shrink-0" />
                      <span>5.0 - 5.9 SR (Kuat)</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
                      <span className="legend-dot legend-dot-quake-light flex-shrink-0" />
                      <span>&lt; 5.0 SR (Ringan / Felt)</span>
                    </div>
                  </div>
                  <div className="text-[8.5px] leading-relaxed text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800/40">
                    * Gelombang rambat lingkaran mensimulasikan energi episentrum bencana.
                  </div>
                </div>
              )}
              
              <div className="text-[9px] text-slate-450 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-1.5 font-semibold leading-relaxed font-mono">
                Pin: <span className="text-emerald-500 font-bold">Positif</span> / <span className="text-red-500 font-bold">Negatif</span> / <span className="text-blue-500 font-bold">Netral</span>
              </div>
            </div>
          )}
        </div>
        

      </div>
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.selectedProvince === nextProps.selectedProvince &&
    prevProps.isDetailOpen === nextProps.isDetailOpen &&
    prevProps.provinceStats === nextProps.provinceStats &&
    prevProps.filteredNews === nextProps.filteredNews
  );
});
