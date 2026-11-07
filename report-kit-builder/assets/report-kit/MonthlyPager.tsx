import React, { useEffect, useRef, useState } from 'react';

interface MonthlyPagerProps {
  pageCount: number;
  page: number;
  onPageChange: (page: number) => void;
  children: React.ReactNode;
  total?: number;
}

const BTN_CLASS: string =
  'flex min-h-[34px] items-center rounded-[8px] border border-rk-line bg-white px-2.5 text-xs font-medium text-rk-ink disabled:opacity-40';

const MonthlyPager: React.FC<MonthlyPagerProps> = ({
  pageCount,
  page,
  onPageChange,
  children,
  total,
}) => {
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (page > pageCount && pageCount > 0) onPageChange(pageCount);
  }, [page, pageCount, onPageChange]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>): void => {
    touchX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>): void => {
    if (touchX.current === null) return;
    const delta: number = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(delta) < 60) return;
    if (delta < 0 && page < pageCount) onPageChange(page + 1);
    if (delta > 0 && page > 1) onPageChange(page - 1);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="min-h-0 flex-1 overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
      <div
        data-testid="monthly-card-pager"
        className="flex shrink-0 flex-nowrap items-center justify-center gap-2.5 pt-1.5"
      >
        <button
          type="button"
          data-testid="monthly-pager-prev"
          className={BTN_CLASS}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          上一页
        </button>
          <span className="whitespace-nowrap text-xs tabular-nums text-rk-ink-soft">
            {typeof total === 'number' ? `共 ${total} 行 · ` : ''}第 {page}/
            {pageCount} 页
          </span>
        <button
          type="button"
          data-testid="monthly-pager-next"
          className={BTN_CLASS}
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          下一页
        </button>
      </div>
    </div>
  );
};

export default MonthlyPager;
