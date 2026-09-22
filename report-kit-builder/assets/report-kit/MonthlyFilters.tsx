import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';

const MONTH_LABELS: string[] = [
  '全年', '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
];

const CHIP_CLS: string =
  'flex h-[28px] shrink-0 items-center justify-center rounded-full border px-2 text-[11px] whitespace-nowrap transition-colors md:h-auto md:min-h-0 md:px-3 md:py-1 md:text-xs';

interface MonthlyFiltersProps {
  years: number[];
  year: number | null;
  onYearChange: (y: number) => void;
  month: number | null;
  onMonthChange: (m: number | null) => void;
}

const MonthlyFilters: React.FC<MonthlyFiltersProps> = ({
  years,
  year,
  onYearChange,
  month,
  onMonthChange,
}) => {
  const yearList: number[] = Array.isArray(years) ? years : [];
  return (
    <div className="rounded-[12px] border border-rk-line bg-white px-2 py-1 md:rounded-[10px] md:border-0 md:p-2.5">
      <div className="flex items-center gap-2 md:gap-3">
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-xs text-rk-ink-soft md:inline md:text-[11px]">
            年份
          </span>
          <Select
            value={year === null ? undefined : String(year)}
            onValueChange={(v: string) => onYearChange(Number(v))}
          >
            <SelectTrigger className="h-[28px] w-[80px] rounded-full border-rk-line text-xs data-[size=default]:h-[28px] md:h-8 md:w-[110px] md:data-[size=default]:h-8">
              <SelectValue placeholder="选择年份" />
            </SelectTrigger>
            <SelectContent>
              {yearList.map((y: number) => (
                <SelectItem key={y} value={String(y)}>
                  {y}年
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative min-w-0 flex-1 md:flex md:flex-1 md:flex-wrap md:gap-1.5">
          <div className="flex gap-1.5 overflow-x-auto py-1 pr-6 [scrollbar-width:none] md:flex-wrap md:overflow-visible md:py-0 md:pr-0">
            {MONTH_LABELS.map((label: string, idx: number) => {
              const value: number | null = idx === 0 ? null : idx;
              const isActive: boolean = month === value;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onMonthChange(value)}
                  className={`${CHIP_CLS} ${
                    isActive
                      ? 'border-rk-table-head bg-rk-table-head text-white'
                      : 'border-rk-line bg-white text-rk-ink hover:border-rk-blue'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent md:hidden"
            aria-hidden="true"
          />
        </div>

      </div>
    </div>
  );
};

export default MonthlyFilters;
