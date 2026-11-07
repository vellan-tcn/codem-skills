import React, { useEffect, useRef, useState } from 'react';
import type {
  MonthlyPeriodRow,
  MonthlySummary,
} from '@shared/api.interface';
import PaginationBar from '@client/src/components/report-kit/PaginationBar';
import ReadingValueCell from '@client/src/components/report-kit/ReadingValueCell';
import MonthlyCards from '@client/src/components/report-kit/MonthlyCards';

function formatCool(v: number): string {
  return v.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
}

function formatElec(v: number): string {
  return v.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCop(v: number): string {
  return v.toLocaleString('zh-CN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

const TH_CLASS: string =
  'h-[58px] border-r border-white/25 bg-rk-navy px-0.5 text-center align-middle text-[13px] font-semibold last:border-r-0 md:sticky md:top-0 md:z-10 md:whitespace-nowrap md:px-2 md:text-[15px]';
const TD_CLASS: string =
  'h-[52px] break-words border-b border-r border-b-rk-bg-mist border-r-[#DCE3E9] px-0.5 align-middle text-[12px] text-[#18324D] last:border-r-0 md:px-2 md:text-[14px]';
const NUM_CELL_CLASS: string =
  'break-all text-center tabular-nums md:break-normal md:whitespace-nowrap';

const NOT_STARTED_THRESHOLD = 100;
const TRIAL_COOL_MAX = 5000;
const TRIAL_START = '2026-03-24';
const TRIAL_END = '2026-04-02';
const SINGLE_DAY_PATTERN = /^(\d{4}-\d{2}-\d{2})$/u;

export function getDailyStatus(
  label: string,
  usage: number | null,
  workshop: 'pei' | 'mfg' = 'pei',
): string | null {
  if (usage === null) return null;
  if (usage === 0) return '停机';
  if (workshop === 'mfg') {
    const mfgMatch: RegExpExecArray | null = SINGLE_DAY_PATTERN.exec(label);
    if (mfgMatch !== null && usage > 0 && usage <= 3000) {
      return '试机/切机';
    }
    return null;
  }
  const match: RegExpExecArray | null = SINGLE_DAY_PATTERN.exec(label);
  if (match === null) return null;
  if (usage <= NOT_STARTED_THRESHOLD) return '冷机未开';
  const date: string = match[1];
  if (date >= TRIAL_START && date <= TRIAL_END && usage <= TRIAL_COOL_MAX) {
    return '试机';
  }
  return null;
}

interface ValueCellProps {
  value: number | null;
  formatter: (v: number) => string;
}

const ValueCell: React.FC<ValueCellProps> = ({ value, formatter }) => (
  <td className={`${TD_CLASS} ${NUM_CELL_CLASS}`}>
    {value === null ? '-' : formatter(value)}
  </td>
);

const READING_TD_CLASS: string = `${TD_CLASS} ${NUM_CELL_CLASS}`;

interface CoolUsageCellProps {
  value: number | null;
  status: string | null;
}

const CoolUsageCell: React.FC<CoolUsageCellProps> = ({ value, status }) => (
  <td className={`${TD_CLASS} ${NUM_CELL_CLASS}`}>
    {value === null ? (
      '-'
    ) : status === '停机' ? (
      <span className="text-xs font-normal text-rk-ink-faint">停机</span>
    ) : (
      <>
        {formatCool(value)}
        {status !== null ? (
          <div className="text-xs font-normal leading-tight text-rk-ink-faint">
            {status}
          </div>
        ) : null}
      </>
    )}
  </td>
);

const SUMMARY_TD_CLASS: string = `${TD_CLASS} sticky bottom-0 border-t border-t-[#A8C3EA] bg-rk-bg-brand-soft text-center tabular-nums`;
const SUMMARY_STICKY_STYLE: React.CSSProperties = {
  position: 'sticky',
  bottom: 0,
};

interface MonthlyTableProps {
  mode: 'full-year' | 'month';
  rows: MonthlyPeriodRow[];
  summary: MonthlySummary;
  workshop?: 'pei' | 'mfg';
  /** 当前剔除的异常类别（逗号分隔），命中 kind 的行整行标色 */
  excludeKinds?: string;
}

const MonthlyTable: React.FC<MonthlyTableProps> = ({
  mode,
  rows,
  summary,
  workshop = 'pei',
  excludeKinds = '',
}) => {
  const excludedKinds: Set<string> = new Set(
    excludeKinds
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s !== ''),
  );
  const safeRows: MonthlyPeriodRow[] = Array.isArray(rows) ? rows : [];
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPage(1);
  }, [rows]);

  const showAll: boolean = mode === 'month';
  const totalPages: number = Math.max(1, Math.ceil(safeRows.length / pageSize));
  const current: number = Math.min(page, totalPages);
  const pageRows: MonthlyPeriodRow[] = showAll
    ? safeRows
    : safeRows.slice((current - 1) * pageSize, current * pageSize);

  const handlePageChange = (nextPage: number, nextPageSize: number): void => {
    setPage(nextPage);
    setPageSize(nextPageSize);
    if (scrollRef.current !== null) scrollRef.current.scrollTop = 0;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col md:h-full">
      <MonthlyCards
          mode={mode}
          rows={safeRows}
          summary={summary}
          workshop={workshop}
          excludeKinds={excludeKinds}
        />
      <div className="hidden min-h-0 flex-1 flex-col md:flex">
      <div
        ref={scrollRef}
        className="overflow-x-auto rounded-[10px] border border-rk-line md:min-h-0 md:flex-1 md:overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <table className="w-full max-w-full table-fixed border-separate border-spacing-0">
          <colgroup>
            <col className="w-[12.5%]" />
            <col className="w-[12.5%]" />
            <col className="w-[12.5%]" />
            <col className="w-[12.5%]" />
            <col className="w-[12.5%]" />
            <col className="w-[12.5%]" />
            <col className="w-[12.5%]" />
            <col className="w-[12.5%]" />
          </colgroup>
          <thead>
            <tr className="bg-rk-navy text-white">
              <th className={TH_CLASS}>
                {mode === 'full-year' ? '月份' : '日期'}
              </th>
              <th className={TH_CLASS}>起始冷量示数</th>
              <th className={TH_CLASS}>结束冷量示数</th>
              <th className={TH_CLASS}>冷量用量</th>
              <th className={TH_CLASS}>起始电量示数</th>
              <th className={TH_CLASS}>结束电量示数</th>
              <th className={TH_CLASS}>电量用量</th>
              <th className={TH_CLASS} title="COP = 冷量用量 ÷ 电量用量">
                COP
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row: MonthlyPeriodRow) => {
                const tildeIdx: number = row.label.indexOf('~');
                const excluded: boolean =
                  (row.kind === 'stopped' || row.kind === 'trial') &&
                  excludedKinds.has(row.kind);
                return (
                <tr
                  key={row.label}
                  className={
                    excluded ? 'bg-[#FDECEC]' : 'odd:bg-white even:bg-[#F5F8FA]'
                  }
                >
                  <td className={`${TD_CLASS} ${NUM_CELL_CLASS}`}>
                    {tildeIdx >= 0 ? (
                      <span className="block leading-tight">
                        <span className="block">{row.label.slice(0, tildeIdx + 1)}</span>
                        <span className="block">{row.label.slice(tildeIdx + 1)}</span>
                      </span>
                    ) : (
                      row.label
                    )}
                  </td>
                <ReadingValueCell
                  tdClass={READING_TD_CLASS}
                  value={row.coolStart}
                  ts={row.coolStartTs ?? null}
                  formatter={formatCool}
                />
                <ReadingValueCell
                  tdClass={READING_TD_CLASS}
                  value={row.coolEnd}
                  ts={row.coolEndTs ?? null}
                  formatter={formatCool}
                />
                <CoolUsageCell
                  value={row.coolUsage}
                  status={
                    mode === 'month'
                      ? getDailyStatus(row.label, row.coolUsage, workshop)
                      : null
                  }
                />
                <ReadingValueCell
                  tdClass={READING_TD_CLASS}
                  value={row.elecStart}
                  ts={row.elecStartTs ?? null}
                  formatter={formatElec}
                />
                <ReadingValueCell
                  tdClass={READING_TD_CLASS}
                  value={row.elecEnd}
                  ts={row.elecEndTs ?? null}
                  formatter={formatElec}
                />
                <ValueCell value={row.elecUsage} formatter={formatElec} />
                <ValueCell
                  value={row.cop}
                  formatter={formatCop}
                />
                </tr>
                );
              })}
            {safeRows.length > 0 ? (
              <tr className="font-semibold">
                <td
                  className={`${SUMMARY_TD_CLASS} break-all md:break-normal`}
                  style={SUMMARY_STICKY_STYLE}
                >
                  {mode === 'full-year' ? '全年汇总' : '当月汇总'}
                </td>
                <td className={SUMMARY_TD_CLASS} style={SUMMARY_STICKY_STYLE}>
                  -
                </td>
                <td className={SUMMARY_TD_CLASS} style={SUMMARY_STICKY_STYLE}>
                  -
                </td>
                <td className={SUMMARY_TD_CLASS} style={SUMMARY_STICKY_STYLE}>
                  {summary.coolUsage === null
                    ? '-'
                    : formatCool(summary.coolUsage)}
                </td>
                <td className={SUMMARY_TD_CLASS} style={SUMMARY_STICKY_STYLE}>
                  -
                </td>
                <td className={SUMMARY_TD_CLASS} style={SUMMARY_STICKY_STYLE}>
                  -
                </td>
                <td className={SUMMARY_TD_CLASS} style={SUMMARY_STICKY_STYLE}>
                  {summary.elecUsage === null
                    ? '-'
                    : formatElec(summary.elecUsage)}
                </td>
                <td className={SUMMARY_TD_CLASS} style={SUMMARY_STICKY_STYLE}>
                  {summary.cop === null ? '-' : formatCop(summary.cop)}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {showAll ? null : (
        <PaginationBar
          total={safeRows.length}
          page={current}
          pageSize={pageSize}
          onChange={handlePageChange}
        />
      )}
      </div>
    </div>
  );
};

export default MonthlyTable;
