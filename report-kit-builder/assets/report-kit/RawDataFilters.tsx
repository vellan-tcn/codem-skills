import React from 'react';
import dayjs from 'dayjs';
import { CalendarDays, Search } from 'lucide-react';
import type { RawGranularityParam, RawStepUnit } from '@shared/api.interface';
import { Button } from '@client/src/components/ui/button';
import { Calendar } from '@client/src/components/ui/calendar';
import { Input } from '@client/src/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';

const GRANULARITY_OPTIONS: { value: RawGranularityParam; label: string }[] = [
  { value: 'raw', label: '原始' },
  { value: '5min', label: '5分钟' },
  { value: 'hour', label: '小时' },
  { value: 'day', label: '日' },
  { value: 'month', label: '月' },
  { value: 'custom', label: '自定义' },
];

const UNIT_OPTIONS: { value: RawStepUnit; label: string }[] = [
  { value: 'minute', label: '分钟' },
  { value: 'hour', label: '小时' },
  { value: 'day', label: '天' },
];


const TRIGGER_CLS: string =
  'h-[28px] rounded-md border border-rk-line bg-white px-1.5 text-xs flex items-center justify-center gap-1 text-rk-ink md:px-3 md:text-sm md:gap-2 md:h-8';

interface DateTimePickProps {
  label: string;
  date: dayjs.Dayjs;
  time: string;
  onDateChange: (d: dayjs.Dayjs) => void;
  onTimeChange: (t: string) => void;
}

const DateTimePick: React.FC<DateTimePickProps> = ({
  label,
  date,
  time,
  onDateChange,
  onTimeChange,
}) => {
  const safeDate: dayjs.Dayjs =
    date && typeof date.format === 'function' ? date : dayjs();
  return (
  <div className="flex min-w-0 flex-1 flex-col gap-1 md:w-[232px] md:flex-row md:items-center md:gap-2">
    <span className="shrink-0 text-[10px] text-rk-ink-soft">{label}</span>
    <div className="grid min-w-0 flex-1 grid-cols-2 gap-1 md:flex">
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className={`${TRIGGER_CLS} min-w-0`}>
            <CalendarDays className="hidden h-4 w-4 shrink-0 text-rk-ink-soft md:block" />
            <span className="truncate text-[11px] md:text-sm"><span className="md:hidden">{safeDate.format('MM-DD')}</span><span className="hidden md:inline">{safeDate.format('YYYY-MM-DD')}</span></span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={safeDate.toDate()}
            onSelect={(d: Date | undefined) => {
              if (d) onDateChange(dayjs(d));
            }}
          />
        </PopoverContent>
      </Popover>
      <Input
        type="time"
        value={time}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onTimeChange(e.target.value)
        }
        className="h-[28px] min-h-0 w-full appearance-none py-0 px-1 text-center text-[11px] leading-none md:h-8 md:w-[92px] md:px-3 md:text-sm"
        aria-label={`${label}时刻`}
      />
    </div>
  </div>
  );
};

export interface RawDataFiltersProps {
  startDate: dayjs.Dayjs;
  onStartDateChange: (d: dayjs.Dayjs) => void;
  endDate: dayjs.Dayjs;
  onEndDateChange: (d: dayjs.Dayjs) => void;
  startTime: string;
  onStartTimeChange: (t: string) => void;
  endTime: string;
  onEndTimeChange: (t: string) => void;
  granularity: RawGranularityParam;
  onGranularityChange: (g: RawGranularityParam) => void;
  customValue: string;
  onCustomValueChange: (v: string) => void;
  customUnit: RawStepUnit;
  onCustomUnitChange: (u: RawStepUnit) => void;
  granularityError: string | null;
  loading: boolean;
  onQuery: () => void;
}

const RawDataFilters: React.FC<RawDataFiltersProps> = ({
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  granularity,
  onGranularityChange,
  customValue,
  onCustomValueChange,
  customUnit,
  onCustomUnitChange,
  granularityError,
  loading,
  onQuery,
}) => {
  const isCustom: boolean = granularity === 'custom';
  return (
    <div className="rounded-[14px] bg-white p-4 md:rounded-[10px] md:p-2.5">
      <div className="flex flex-col gap-1.5 md:flex-row md:flex-wrap md:items-end md:gap-x-3 md:gap-y-2">
        <div className="flex w-full min-w-0 items-stretch gap-1.5 md:w-auto md:flex-1 md:flex-nowrap md:items-center md:gap-3">
          <DateTimePick
            label="起始时间"
            date={startDate}
            time={startTime}
            onDateChange={onStartDateChange}
            onTimeChange={onStartTimeChange}
          />
          <DateTimePick
            label="结束时间"
            date={endDate}
            time={endTime}
            onDateChange={onEndDateChange}
            onTimeChange={onEndTimeChange}
          />
        </div>

        <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 md:w-auto md:flex-1 md:gap-x-2 md:gap-y-1">
          <span className="shrink-0 text-[11px] text-rk-ink-soft">粒度</span>
          <Select
            value={granularity}
            onValueChange={(v: string) =>
              onGranularityChange(v as RawGranularityParam)
            }
          >
            <SelectTrigger className="data-[size=default]:h-[28px] w-[84px] justify-center gap-1 px-2 text-xs [&_svg]:size-3.5 md:h-8 md:w-[110px] md:px-3 md:text-sm">
              <SelectValue placeholder="选择粒度" />
            </SelectTrigger>
            <SelectContent>
              {GRANULARITY_OPTIONS.map(
                (opt: { value: RawGranularityParam; label: string }) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          {isCustom ? (
            <>
              <Input
                type="text"
                inputMode="numeric"
                value={customValue}
                placeholder="数值"
                aria-label="自定义粒度数值"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onCustomValueChange(e.target.value)
                }
                className="h-[28px] w-[60px] text-center text-xs md:h-8 md:w-[72px] md:text-center md:text-sm"
              />
              <Select
                value={customUnit}
                onValueChange={(v: string) =>
                  onCustomUnitChange(v as RawStepUnit)
                }
              >
                <SelectTrigger className="data-[size=default]:h-[28px] w-[84px] justify-center px-2 text-xs md:h-8 md:w-[90px] md:text-sm">
                  <SelectValue placeholder="单位" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map(
                    (opt: { value: RawStepUnit; label: string }) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </>
          ) : null}
          <Button
            onClick={onQuery}
            disabled={loading}
            className="h-[28px] min-h-[28px] ml-auto w-auto shrink-0 px-3 py-0 text-xs md:h-8 md:w-auto md:px-5 md:text-sm"
          >
            <Search className="h-4 w-4" />
            {loading ? '查询中…' : '查询'}
          </Button>
          {granularityError !== null ? (
            <p className="w-full text-xs text-rk-danger">{granularityError}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default RawDataFilters;
