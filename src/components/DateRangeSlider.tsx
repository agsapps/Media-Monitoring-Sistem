import React, { useRef, useEffect, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

interface DateRangeSliderProps {
  dates: string[]; // Sorted from oldest to newest (ascending)
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  onChange: (start: string, end: string) => void;
  formatDate: (dateStr: string) => string;
}

export const DateRangeSlider: React.FC<DateRangeSliderProps> = ({
  dates,
  startDate,
  endDate,
  onChange,
  formatDate,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeHandle, setActiveHandle] = useState<'left' | 'right' | null>(null);

  // Parse strings to indices
  const getIndexForDate = (dateStr: string, defaultIdx: number) => {
    if (!dateStr) return defaultIdx;
    const idx = dates.indexOf(dateStr);
    return idx !== -1 ? idx : defaultIdx;
  };

  const leftIndex = React.useMemo(() => {
    if (dates.length === 0) return 0;
    return getIndexForDate(startDate, 0);
  }, [dates, startDate]);

  const rightIndex = React.useMemo(() => {
    if (dates.length === 0) return 0;
    return getIndexForDate(endDate, dates.length - 1);
  }, [dates, endDate]);

  const maxIdx = Math.max(0, dates.length - 1);

  // Compute percentages for styles
  const leftPercent = maxIdx === 0 ? 0 : (leftIndex / maxIdx) * 100;
  const rightPercent = maxIdx === 0 ? 100 : (rightIndex / maxIdx) * 100;

  // Handle Dragging
  useEffect(() => {
    if (activeHandle === null) return;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!trackRef.current || dates.length <= 1) return;

      const rect = trackRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const rawPercent = (clientX - rect.left) / rect.width;
      const percent = Math.max(0, Math.min(1, rawPercent));
      const targetIndex = Math.round(percent * maxIdx);

      if (activeHandle === 'left') {
        const nextLeft = Math.min(targetIndex, rightIndex);
        onChange(dates[nextLeft], dates[rightIndex]);
      } else if (activeHandle === 'right') {
        const nextRight = Math.max(targetIndex, leftIndex);
        onChange(dates[leftIndex], dates[nextRight]);
      }
    };

    const handleMouseUp = () => {
      setActiveHandle(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [activeHandle, dates, leftIndex, rightIndex, maxIdx, onChange]);

  const handleTrackMouseDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!trackRef.current || dates.length <= 1) return;

    const rect = trackRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const rawPercent = (clientX - rect.left) / rect.width;
    const percent = Math.max(0, Math.min(1, rawPercent));
    const clickIndex = Math.round(percent * maxIdx);

    // Determine closest handle
    const distLeft = Math.abs(clickIndex - leftIndex);
    const distRight = Math.abs(clickIndex - rightIndex);

    const targetHandle = distLeft < distRight ? 'left' : 'right';
    setActiveHandle(targetHandle);

    if (targetHandle === 'left') {
      const nextLeft = Math.min(clickIndex, rightIndex);
      onChange(dates[nextLeft], dates[rightIndex]);
    } else {
      const nextRight = Math.max(clickIndex, leftIndex);
      onChange(dates[leftIndex], dates[nextRight]);
    }
  };

  const handleStepLeft = (handle: 'left' | 'right', direction: 'prev' | 'next') => {
    if (dates.length <= 1) return;
    const offset = direction === 'prev' ? -1 : 1;
    
    if (handle === 'left') {
      const target = Math.max(0, Math.min(leftIndex + offset, rightIndex));
      onChange(dates[target], dates[rightIndex]);
    } else {
      const target = Math.max(leftIndex, Math.min(rightIndex + offset, maxIdx));
      onChange(dates[leftIndex], dates[target]);
    }
  };

  if (dates.length === 0) {
    return (
      <div className="py-2 text-center text-xs text-slate-450 italic">
        Belum ada rentang tanggal tersedia pada rentang data saat ini.
      </div>
    );
  }

  return (
    <div className="w-full select-none" id="dual-date-range-slider-container">
      {/* Label and Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3.5">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-blue-700" />
          <span className="text-[11px] font-extrabold text-slate-550 dark:text-slate-400 uppercase tracking-widest">
            Rentang Interval Tanggal
          </span>
        </div>
        <div className="text-[11px] text-slate-600 dark:text-slate-350 font-bold bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200/60 dark:border-white/5 flex items-center gap-1.5 shadow-xs">
          <span className="text-blue-800 dark:text-blue-400">{formatDate(dates[leftIndex])}</span>
          <span className="text-slate-400 font-normal">s/d</span>
          <span className="text-blue-800 dark:text-blue-400">{formatDate(dates[rightIndex])}</span>
          <span className="text-[9.5px] px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 rounded font-bold font-mono">
            {rightIndex - leftIndex + 1} Hari
          </span>
        </div>
      </div>

      {/* Main Bar + Controls Layout */}
      <div className="flex items-center gap-3">
        {/* Nudge Left Button for Left Handle */}
        <button
          onClick={() => handleStepLeft('left', 'prev')}
          disabled={leftIndex === 0}
          className="p-1 rounded-lg bg-white dark:bg-[#1c1a24] border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-blue-700 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer shadow-xs"
          title="Geser tanggal mulai ke belakang"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Track Container */}
        <div className="flex-1 px-2.5 py-3.5">
          <div
            ref={trackRef}
            onMouseDown={handleTrackMouseDown}
            onTouchStart={handleTrackMouseDown}
            className="relative h-2 bg-slate-200 dark:bg-slate-800 rounded-full cursor-pointer group"
          >
            {/* Active Range Bar */}
            <div
              className="absolute h-full rounded-full bg-gradient-to-r from-blue-700 to-blue-500 transition-all duration-75 shadow-[0_0_10px_rgba(139,92,246,0.25)]"
              style={{
                left: `${leftPercent}%`,
                width: `${rightPercent - leftPercent}%`,
              }}
            />

            {/* Left Handle */}
            <div
              className={`absolute top-1/2 -ml-2.5 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 border-blue-700 shadow-[0_2px_6px_rgba(0,0,0,0.15)] flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 hover:border-blue-500 transition duration-150 ${
                activeHandle === 'left' ? 'scale-112 border-blue-500 ring-4 ring-blue-700/20' : ''
              }`}
              style={{ left: `${leftPercent}%` }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setActiveHandle('left');
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                setActiveHandle('left');
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-blue-700" />
              {/* Tooltip on drag or hover */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition duration-150 bg-slate-900 text-white text-[9.5px] font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap pointer-events-none">
                {formatDate(dates[leftIndex])}
              </div>
            </div>

            {/* Right Handle */}
            <div
              className={`absolute top-1/2 -ml-2.5 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 border-blue-500 shadow-[0_2px_6px_rgba(0,0,0,0.15)] flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 hover:border-blue-700 transition duration-150 ${
                activeHandle === 'right' ? 'scale-112 border-blue-700 ring-4 ring-blue-500/20' : ''
              }`}
              style={{ left: `${rightPercent}%` }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setActiveHandle('right');
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                setActiveHandle('right');
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {/* Tooltip on drag or hover */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition duration-150 bg-slate-900 text-white text-[9.5px] font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap pointer-events-none">
                {formatDate(dates[rightIndex])}
              </div>
            </div>
          </div>
        </div>

        {/* Nudge Right Button for Right Handle */}
        <button
          onClick={() => handleStepLeft('right', 'next')}
          disabled={rightIndex === maxIdx}
          className="p-1 rounded-lg bg-white dark:bg-[#1c1a24] border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-blue-500 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer shadow-xs"
          title="Geser tanggal akhir ke depan"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Reset Slider to Full Timeline Options */}
        <button
          onClick={() => onChange(dates[0], dates[maxIdx])}
          className="p-1 rounded-lg bg-white dark:bg-[#1c1a24] border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-blue-700 transition cursor-pointer shadow-xs ml-1"
          title="Set rentang penuh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Extreme timeline bounds indicators */}
      <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1 font-mono">
        <span>Oldest: {formatDate(dates[0])}</span>
        <span>Latest: {formatDate(dates[maxIdx])}</span>
      </div>
    </div>
  );
};
