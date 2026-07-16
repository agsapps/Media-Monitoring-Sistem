import React, { useState, useEffect, useRef, useMemo } from 'react';

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number; // Height of an individual item/row
  gap?: number; // Space between rows/items
  overscan?: number; // Number of extra rows to render above/below the viewport
  columns?: number; // 1 for list, >1 for grid
  className?: string; // Class name for the container
  gridClassName?: string; // Class name for grid rows
  renderItem: (item: T, index: number) => React.ReactNode;
}

export function VirtualScroll<T>({
  items,
  itemHeight,
  gap = 16,
  overscan = 3,
  columns = 1,
  className = "",
  gridClassName = "",
  renderItem,
}: VirtualScrollProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const [containerOffsetTop, setContainerOffsetTop] = useState(0);

  // Group items into rows based on the number of columns
  const rows = useMemo(() => {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += columns) {
      result.push(items.slice(i, i + columns));
    }
    return result;
  }, [items, columns]);

  // Handle scrolling and resizing to compute the scroll position relative to the container
  useEffect(() => {
    const handleScrollAndResize = () => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const currentScrollY = window.scrollY;
      
      setScrollTop(currentScrollY);
      setWindowHeight(window.innerHeight);
      setContainerOffsetTop(rect.top + currentScrollY);
    };

    // Initialize
    handleScrollAndResize();

    // Attach listeners
    window.addEventListener('scroll', handleScrollAndResize, { passive: true });
    window.addEventListener('resize', handleScrollAndResize);

    // Also watch for any dynamic layout changes by setting a small interval/timeout or using ResizeObserver
    const observer = new ResizeObserver(() => {
      handleScrollAndResize();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Keep updating offset to account for any layout shifts
    const interval = setInterval(handleScrollAndResize, 1000);

    return () => {
      window.removeEventListener('scroll', handleScrollAndResize);
      window.removeEventListener('resize', handleScrollAndResize);
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  const totalRows = rows.length;
  const rowHeightWithGap = itemHeight + gap;
  const totalHeight = totalRows > 0 ? totalRows * rowHeightWithGap - gap : 0;

  // Calculate start and end rows to render
  const { startRow, endRow } = useMemo(() => {
    // Relative scroll position inside our container
    const relativeScrollTop = Math.max(0, scrollTop - containerOffsetTop);

    const calculatedStartRow = Math.floor(relativeScrollTop / rowHeightWithGap);
    const calculatedEndRow = Math.ceil((relativeScrollTop + windowHeight) / rowHeightWithGap);

    const start = Math.max(0, calculatedStartRow - overscan);
    const end = Math.min(totalRows - 1, calculatedEndRow + overscan);

    return { startRow: start, endRow: end };
  }, [scrollTop, containerOffsetTop, windowHeight, totalRows, rowHeightWithGap, overscan]);

  // The slice of rows to render
  const visibleRows = useMemo(() => {
    const list: { rowIdx: number; rowItems: T[] }[] = [];
    if (totalRows === 0) return list;

    for (let i = startRow; i <= endRow; i++) {
      if (rows[i]) {
        list.push({ rowIdx: i, rowItems: rows[i] });
      }
    }
    return list;
  }, [rows, startRow, endRow, totalRows]);

  return (
    <div ref={containerRef} className={`w-full relative ${className}`}>
      <div style={{ height: `${totalHeight}px`, width: '100%', position: 'relative' }}>
        {visibleRows.map(({ rowIdx, rowItems }) => {
          const topPosition = rowIdx * rowHeightWithGap;
          return (
            <div
              key={rowIdx}
              style={{
                position: 'absolute',
                top: `${topPosition}px`,
                left: 0,
                right: 0,
                height: `${itemHeight}px`,
              }}
              className={columns > 1 ? gridClassName : ""}
            >
              {rowItems.map((item, colIdx) => {
                const itemIndex = rowIdx * columns + colIdx;
                return (
                  <React.Fragment key={itemIndex}>
                    {renderItem(item, itemIndex)}
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
