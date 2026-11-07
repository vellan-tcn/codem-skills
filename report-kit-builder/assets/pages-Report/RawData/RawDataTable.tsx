import React, { useEffect, useRef, useState } from 'react';
import type { RawDataPoint } from '@shared/api.interface';
import PaginationBar from '@client/src/components/report-kit/PaginationBar';

function formatCool(v: number): string {
  return v.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
}

function formatElec(v: number): string {
  return v.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function shortTime(ts: string): string {
  return ts.length > 10 ? ts.slice(0, 16) : ts;
}

const TH_CLASS: string =
  'h-[58px] border-r border-white/25 bg-rk-navy px-1 text-center align-middle text-[13px] font-semibold last:border-r-0 max-md:h-[30px] max-md:text-[11px] md:sticky md:top-0 md:z-10 md:whitespace-nowrap md:px-2 md:text-[15px]';

interface ValueCellProps {
  value: number | null;
  formatter: (v: number) => string;
}

const ValueCell: React.FC<ValueCellProps> = ({ value, formatter }) => (
  <td className="h-[52px] whitespace-nowrap border-b border-r border-b-rk-bg-mist border-r-[#DCE3E9] px-1 text-center align-middle text-[12px] tabular-nums text-[#18324D] last:border-r-0 max-md:h-[30px] max-md:text-[11px] md:px-2 md:text-[14px]">
    {value === null ? '-' : formatter(value)}
  </td>
);

interface RawDataTableProps {
  points: RawDataPoint[];
}

const RawDataTable: React.FC<RawDataTableProps> = ({ points }) => {
  const safePoints: RawDataPoint[] = Array.isArray(points) ? points : [];
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(30);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return;
    const el = scrollRef.current;
    if (el === null) return;
    const apply = (): void => {
      const rows: number = Math.max(4, Math.floor((el.clientHeight - 30) / 30));
      setPageSize((prev: number) => (prev === rows ? prev : rows));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);


  useEffect(() => {
    setPage(1);
  }, [points]);

  const totalPages: number = Math.max(
    1,
    Math.ceil(safePoints.length / pageSize),
  );
  const current: number = Math.min(page, totalPages);
  const pagePoints: RawDataPoint[] = safePoints.slice(
    (current - 1) * pageSize,
    current * pageSize,
  );

  const handlePageChange = (nextPage: number, nextPageSize: number): void => {
    setPage(nextPage);
    setPageSize(nextPageSize);
    if (scrollRef.current !== null) scrollRef.current.scrollTop = 0;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col md:h-full">
      <p className="hidden text-[11px] leading-tight text-rk-ink-faint md:hidden">
        左右滑动查看全部列
      </p>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-[10px] border border-rk-line md:min-h-0 md:flex-1 md:overflow-y-auto"
      >
        <table className="w-full max-w-full table-auto border-separate border-spacing-0 min-w-0 md:min-w-0">
          <thead>
            <tr className="bg-rk-navy text-white">
              <th className={TH_CLASS}>时间</th>
              <th className={TH_CLASS}>冷量示数值</th>
              <th className={TH_CLASS}>电量示数值</th>
            </tr>
          </thead>
          <tbody>
            {pagePoints.map((point: RawDataPoint) => (
              <tr key={point.ts} className="odd:bg-white even:bg-[#F5F8FA]">
                <td className="h-[52px] whitespace-nowrap border-b border-r border-b-rk-bg-mist border-r-[#DCE3E9] px-1 text-center align-middle text-[12px] text-[#18324D] max-md:h-[30px] max-md:text-[11px] md:px-2 md:text-[14px]">
                  <span className="md:hidden">{shortTime(point.ts)}</span>
                  <span className="hidden md:inline">{point.ts}</span>
                </td>
                <ValueCell value={point.cool} formatter={formatCool} />
                <ValueCell value={point.elec} formatter={formatElec} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationBar
        total={safePoints.length}
        page={current}
        pageSize={pageSize}
        onChange={handlePageChange}
      />
    </div>
  );
};

export default RawDataTable;
