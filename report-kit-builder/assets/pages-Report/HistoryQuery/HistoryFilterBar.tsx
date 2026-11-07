import React, { useState } from 'react';
import dayjs from 'dayjs';
import type { DateRange } from 'react-day-picker';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Card } from '@client/src/components/ui/card';
import { Calendar } from '@client/src/components/ui/calendar';
import { Checkbox } from '@client/src/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import { Skeleton } from '@client/src/components/ui/skeleton';

/** ECharts 折线系列上限 */
const MAX_VARIABLES: number = 5;

interface RangePreset {
  label: string;
  days: number;
}

const RANGE_PRESETS: RangePreset[] = [
  { label: '最近7天', days: 7 },
  { label: '最近30天', days: 30 },
  { label: '最近90天', days: 90 },
];

export interface HistoryFilterBarProps {
  variables: string[];
  variablesLoading: boolean;
  selected: string[];
  onSelectedChange: (next: string[]) => void;
  range: DateRange;
  onRangeChange: (next: DateRange) => void;
  querying: boolean;
  onQuery: () => void;
}

const HistoryFilterBar: React.FC<HistoryFilterBarProps> = ({
  variables,
  variablesLoading,
  selected,
  onSelectedChange,
  range,
  onRangeChange,
  querying,
  onQuery,
}) => {
  const [popoverOpen, setPopoverOpen] = useState<boolean>(false);
  const reachedLimit: boolean = selected.length >= MAX_VARIABLES;

  const handlePreset = (preset: RangePreset): void => {
    const next: DateRange = {
      from: dayjs()
        .subtract(preset.days - 1, 'day')
        .startOf('day')
        .toDate(),
      to: dayjs().endOf('day').toDate(),
    };
    onRangeChange(next);
    setPopoverOpen(false);
  };

  const handleCalendarSelect = (next: DateRange | undefined): void => {
    const value: DateRange = { from: next?.from, to: next?.to };
    onRangeChange(value);
    if (value.from && value.to) {
      setPopoverOpen(false);
    }
  };

  const handleToggleVariable = (varname: string, checked: boolean): void => {
    if (checked) {
      if (reachedLimit) return;
      onSelectedChange([...selected, varname]);
    } else {
      onSelectedChange(selected.filter((item: string) => item !== varname));
    }
  };

  const handleSelectAll = (): void => {
    onSelectedChange(variables.slice(0, MAX_VARIABLES));
  };

  const handleClearAll = (): void => {
    onSelectedChange([]);
  };

  const rangeLabel: string =
    range.from && range.to
      ? `${dayjs(range.from).format('YYYY-MM-DD')} ~ ${dayjs(range.to).format('YYYY-MM-DD')}`
      : '请选择时间范围';

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm text-muted-foreground">
            时间范围
          </span>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[240px] justify-start">
                <CalendarIcon className="size-4" />
                {rangeLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <div className="flex gap-1 border-b p-2">
                {RANGE_PRESETS.map((preset: RangePreset) => (
                  <Button
                    key={preset.days}
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePreset(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <Calendar
                mode="range"
                numberOfMonths={2}
                selected={range}
                onSelect={handleCalendarSelect}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="ml-auto">
          <Button onClick={onQuery} disabled={querying || selected.length === 0}>
            {querying ? '查询中…' : '查询'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">变量</span>
          <div className="ml-auto flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              disabled={variablesLoading || variables.length === 0}
            >
              全选
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              disabled={selected.length === 0}
            >
              清空
            </Button>
          </div>
        </div>

        {variablesLoading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_: unknown, index: number) => (
              <Skeleton key={index} className="h-8 w-28" />
            ))}
          </div>
        ) : variables.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无可用变量</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {variables.map((varname: string) => {
                const checked: boolean = selected.includes(varname);
                const disabled: boolean = reachedLimit && !checked;
                return (
                  <label
                    key={varname}
                    className={`flex h-8 items-center gap-2 rounded-md border px-3 text-sm ${
                      checked
                        ? 'border-primary text-primary'
                        : 'text-foreground'
                    } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={(value: boolean) =>
                        handleToggleVariable(varname, value)
                      }
                    />
                    {varname}
                  </label>
                );
              })}
            </div>
            {reachedLimit && (
              <p className="text-sm text-muted-foreground">
                最多同时勾选 {MAX_VARIABLES} 个变量，已选满
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

export default HistoryFilterBar;
