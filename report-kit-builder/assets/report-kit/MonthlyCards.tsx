import React, { useEffect, useState } from 'react';
import type {
  MonthlyPeriodRow,
  MonthlySummary,
} from '@shared/api.interface';
import { ReadingValue } from '@client/src/components/report-kit/ReadingValueCell';
import { getDailyStatus } from '@client/src/components/report-kit/MonthlyTable';
import MonthlyPager from '@client/src/components/report-kit/MonthlyPager';

const PAGE_SIZE: number = 4;

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

const READING_LABEL_CLASS: string =
  'whitespace-nowrap text-[9px] leading-tight text-[#8B93A5]';
const USAGE_LABEL_CLASS: string =
  'whitespace-nowrap text-[10px] leading-tight text-[#8B93A5]';

const STATUS_BADGE_CLASS: Record<string, string> = {
  停机: 'bg-[#F2F3F5] text-[#98A0AD]',
  冷机未开: 'bg-[#F2F3F5] text-[#98A0AD]',
  试机: 'bg-[#FFF3E0] text-[#C07818]',
  '试机/切机': 'bg-[#FFF3E0] text-[#C07818]',
};

interface ReadingColProps {
  label: string;
  value: number | null;
  ts: string | null;
  formatter: (v: number) => string;
  divider?: boolean;
}

const ReadingCol: React.FC<ReadingColProps> = ({
  label,
  value,
  ts,
  formatter,
  divider,
}) => {
  const text: string = value === null ? '-' : formatter(value);
  const valueSizeClass: string = 'text-[11px]';
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 ${
        divider ? 'border-l border-rk-bg-mist-2' : ''
      }`}
    >
      <span className={READING_LABEL_CLASS}>{label}</span>
      <span
        className={`whitespace-nowrap font-semibold tabular-nums text-[#26324A] ${valueSizeClass}`}
      >
        <ReadingValue value={value} ts={ts} formatter={formatter} />
      </span>
    </div>
  );
};

interface PeriodCardProps {
  row: MonthlyPeriodRow;
  status: string | null;
  excluded: boolean;
}

const PeriodCard: React.FC<PeriodCardProps> = ({ row, status, excluded }) => (
  <div
    className={`rounded-[12px] px-3 py-1.5 shadow-[0_1px_3px_rgba(30,40,70,0.06)] ${
      excluded ? 'bg-[#FDECEC]' : 'bg-white'
    }`}
  >
    <div className="flex items-center justify-between gap-2 border-b border-[#F0F2F6] pb-1">
      <p className="break-all text-xs font-semibold leading-snug text-[#1C2434]">
        {row.label}
      </p>
      {status === null ? null : (
        <span
          className={`shrink-0 rounded-full px-2 py-px text-[9px] leading-tight ${
            STATUS_BADGE_CLASS[status] ?? 'bg-[#EEF1F6] text-[#7A869A]'
          }`}
        >
          {status}
        </span>
      )}
    </div>

    <div className="mt-1 flex flex-col gap-1">
      <div className="flex items-stretch gap-0 rounded-[8px] bg-[#F7F9FC] px-1 py-0.5">
        <ReadingCol
          label="起始冷量"
          value={row.coolStart}
          ts={row.coolStartTs ?? null}
          formatter={formatCool}
        />
        <ReadingCol
          label="结束冷量"
          value={row.coolEnd}
          ts={row.coolEndTs ?? null}
          formatter={formatCool}
          divider
        />
        <ReadingCol
          label="起始电量"
          value={row.elecStart}
          ts={row.elecStartTs ?? null}
          formatter={formatElec}
          divider
        />
        <ReadingCol
          label="结束电量"
          value={row.elecEnd}
          ts={row.elecEndTs ?? null}
          formatter={formatElec}
          divider
        />
      </div>

      <div className="grid grid-cols-3">
        <div className="flex min-w-0 flex-col items-center gap-0.5">
          <span className={USAGE_LABEL_CLASS}>冷量用量</span>
          {row.coolUsage === null ? (
            <span className="text-xs text-rk-ink-faint">-</span>
          ) : status === '停机' ? (
            <span className="text-[11px] text-rk-ink-faint">停机</span>
          ) : (
            <span className="whitespace-nowrap text-[13px] font-semibold tabular-nums text-[#26324A]">
              {formatCool(row.coolUsage)}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-col items-center gap-0.5 border-l border-rk-bg-mist-2">
          <span className={USAGE_LABEL_CLASS}>电量用量</span>
          <span className="whitespace-nowrap text-[13px] font-semibold tabular-nums text-[#26324A]">
            {row.elecUsage === null ? '-' : formatElec(row.elecUsage)}
          </span>
        </div>
        <div className="flex min-w-0 flex-col items-center gap-0.5 border-l border-rk-bg-mist-2">
          <span className={USAGE_LABEL_CLASS}>COP</span>
          <span className="whitespace-nowrap text-[13px] font-semibold tabular-nums text-[#1A5FD0]">
            {row.cop === null ? '-' : formatCop(row.cop)}
          </span>
        </div>
      </div>
    </div>
  </div>
);

interface MonthlyCardsProps {
  mode: 'full-year' | 'month';
  rows: MonthlyPeriodRow[];
  summary: MonthlySummary;
  workshop?: 'pei' | 'mfg';
  excludeKinds?: string;
}

const MonthlyCards: React.FC<MonthlyCardsProps> = ({
  mode,
  rows,
  summary,
  workshop = 'pei',
  excludeKinds = '',
}) => {
  const safeRows: MonthlyPeriodRow[] = Array.isArray(rows) ? rows : [];
  const excludedKinds: Set<string> = new Set(
    excludeKinds
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s !== ''),
  );
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    setPage(1);
  }, [rows, mode]);

  const scope: string = mode === 'full-year' ? '全年' : '当月';
  const pageCount: number = Math.max(1, Math.ceil(safeRows.length / PAGE_SIZE));
  const current: number = Math.min(page, pageCount);
  const pageRows: MonthlyPeriodRow[] = safeRows.slice(
    (current - 1) * PAGE_SIZE,
    current * PAGE_SIZE,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5 md:hidden">
      <div className="shrink-0 rounded-[10px] bg-[#1F2D4E] px-3 py-2">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-[10px] leading-tight text-white/65">
              {scope}冷量
            </p>
            <p className="whitespace-nowrap text-[17px] font-bold tabular-nums text-white">
              {summary.coolUsage === null ? '-' : formatCool(summary.coolUsage)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] leading-tight text-white/65">
              {scope}电量
            </p>
            <p className="whitespace-nowrap text-[17px] font-bold tabular-nums text-white">
              {summary.elecUsage === null
                ? '-'
                : formatElec(summary.elecUsage)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] leading-tight text-white/65">
              {scope}COP
            </p>
            <p className="whitespace-nowrap text-[17px] font-bold tabular-nums text-white">
              {summary.cop === null ? '-' : formatCop(summary.cop)}
            </p>
          </div>
        </div>
      </div>

      <MonthlyPager pageCount={pageCount} page={current} onPageChange={setPage} total={safeRows.length}>
        <div className="flex flex-col gap-1 pb-0.5">
          {pageRows.map((row: MonthlyPeriodRow) => (
            <PeriodCard
              key={row.label}
              row={row}
              status={
                mode === 'month'
                  ? getDailyStatus(row.label, row.coolUsage, workshop)
                  : null
              }
              excluded={
                (row.kind === 'stopped' || row.kind === 'trial') &&
                excludedKinds.has(row.kind)
              }
            />
          ))}
        </div>
      </MonthlyPager>
    </div>
  );
};

export default MonthlyCards;
