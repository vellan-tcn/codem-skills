import React from 'react';
import dayjs from 'dayjs';
import { CalendarDays, Download, Search } from 'lucide-react';
import type { CheckGranularity } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import { Calendar } from '@client/src/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';

const GRANULARITY_OPTIONS: { value: CheckGranularity; label: string }[] = [
  { value: 'minute', label: '分钟' },
  { value: 'hour', label: '小时' },
  { value: 'day', label: '日' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
];

const TRIGGER_CLS: string =
  'min-h-[44px] rounded-md border border-rk-line bg-white px-3 text-sm flex items-center gap-2 text-rk-ink';

interface DatePickProps {
  label: string;
  value: dayjs.Dayjs;
  onChange: (d: dayjs.Dayjs) => void;
}

const DatePick: React.FC<DatePickProps> = ({ label, value, onChange }) => (
  <div className="flex min-w-0 flex-col gap-1">
    <span className="text-xs text-rk-ink-soft">{label}</span>
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={`${TRIGGER_CLS} w-full`}>
          <CalendarDays className="h-4 w-4 shrink-0 text-rk-ink-soft" />
          <span className="truncate">{value.format('YYYY-MM-DD')}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value.toDate()}
          onSelect={(d: Date | undefined) => {
            if (d) onChange(dayjs(d));
          }}
        />
      </PopoverContent>
    </Popover>
  </div>
);

export interface CheckFiltersProps {
  granularity: CheckGranularity;
  onGranularityChange: (g: CheckGranularity) => void;
  start: dayjs.Dayjs;
  onStartChange: (d: dayjs.Dayjs) => void;
  end: dayjs.Dayjs;
  onEndChange: (d: dayjs.Dayjs) => void;
  loading: boolean;
  onQuery: () => void;
  onExport: () => void;
  canExport: boolean;
}

const CheckFilters: React.FC<CheckFiltersProps> = ({
  granularity,
  onGranularityChange,
  start,
  onStartChange,
  end,
  onEndChange,
  loading,
  onQuery,
  onExport,
  canExport,
}) => {
  return (
    <div className="rounded-[14px] bg-white p-4 md:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-rk-ink-soft">时间粒度</span>
          <div className="flex flex-wrap gap-2">
            {GRANULARITY_OPTIONS.map(
              (opt: { value: CheckGranularity; label: string }) => {
                const isActive: boolean = opt.value === granularity;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onGranularityChange(opt.value)}
                    className={`flex min-h-[44px] items-center rounded-full border px-4 text-sm transition-colors md:min-h-0 md:py-1.5 ${
                      isActive
                        ? 'border-rk-table-head bg-rk-table-head text-white'
                        : 'border-rk-line bg-white text-rk-ink hover:border-rk-blue'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              },
            )}
          </div>
          <span className="text-xs text-rk-ink-faint">
            分钟粒度为表计累计示数；小时/日/月/年取窗口内首末示数差值；Excel 比对仅日/月/年粒度有值
          </span>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
          <div className="grid flex-1 grid-cols-2 gap-3 md:max-w-[420px] md:gap-4">
            <DatePick label="起始日期" value={start} onChange={onStartChange} />
            <DatePick label="结束日期" value={end} onChange={onEndChange} />
          </div>
          <div className="flex gap-2 md:gap-3">
            <Button
              onClick={onQuery}
              disabled={loading}
              className="min-h-[44px] flex-1 md:flex-none"
            >
              <Search className="h-4 w-4" />
              {loading ? '查询中…' : '查询'}
            </Button>
            <Button
              variant="outline"
              onClick={onExport}
              disabled={!canExport}
              className="min-h-[44px] flex-1 md:flex-none"
            >
              <Download className="h-4 w-4" />
              导出 CSV
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckFilters;
