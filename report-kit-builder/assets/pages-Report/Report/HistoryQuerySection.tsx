import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Search, CalendarDays, Download, ChevronDown } from 'lucide-react';
import type { ChartConfiguration, TooltipItem } from 'chart.js';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { sensorDataApi } from '@client/src/api';
import { Button } from '@client/src/components/ui/button';
import { Calendar } from '@client/src/components/ui/calendar';
import { Checkbox } from '@client/src/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@client/src/components/ui/popover';
import type { HistoryQuerySectionProps } from '@client/src/pages/Report/report-types';
import SectionCard from '@client/src/components/report-kit/SectionCard';
import ChartCanvas from '@client/src/components/report-kit/ChartCanvas';
import { CHART_SERIES } from '@client/src/pages/Report/report-constants';
import { buildCsv, downloadCsv, isMobileViewport, shortNumberLabel } from '@client/src/pages/Report/report-utils';
import {
  formatTs,
  mergeSeries,
  sampleRows,
  slicePage,
  totalPages,
  type HistoryRow,
} from '@client/src/pages/Report/history-query-helpers';

const TRIGGER_CLS: string =
  'min-h-[44px] rounded-md border border-rk-line bg-white px-3 text-sm flex items-center gap-2 text-rk-ink';

const MAX_QUERY_VARS: number = 5;

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

const HistoryQuerySection: React.FC<HistoryQuerySectionProps> = ({ variables }) => {
  const [start, setStart] = useState<dayjs.Dayjs>(dayjs().subtract(29, 'day'));
  const [end, setEnd] = useState<dayjs.Dayjs>(dayjs());
  const [selected, setSelected] = useState<string[]>([]);
  const [varsOpen, setVarsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [queriedVars, setQueriedVars] = useState<string[]>([]);
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    setSelected((prev: string[]) =>
      prev.length === 0 && variables.length > 0
        ? variables.slice(0, MAX_QUERY_VARS)
        : prev,
    );
  }, [variables]);

  const handleQuery = async (): Promise<void> => {
    if (loading) return;
    if (selected.length === 0) {
      setError('请至少选择一个变量');
      return;
    }
    if (selected.length > MAX_QUERY_VARS) {
      setError(`最多同时查询 ${MAX_QUERY_VARS} 个变量`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resp = await sensorDataApi.querySensorSeries(
        start.format('YYYY-MM-DDT00:00:00+08:00'),
        end.format('YYYY-MM-DDT23:59:59+08:00'),
        selected,
      );
      setRows(mergeSeries(resp.series, selected));
      setQueriedVars([...selected]);
      setPage(1);
    } catch (e) {
      logger.error('历史数据查询失败', e);
      const backendMessage: unknown = (e as { response?: { data?: { message?: unknown } } })
        ?.response?.data?.message;
      setError(
        typeof backendMessage === 'string' && backendMessage.trim() !== ''
          ? backendMessage
          : '查询失败，请稍后重试',
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleVar = (v: string, checked: boolean): void => {
    setSelected((prev: string[]) => {
      if (checked) {
        if (prev.length >= MAX_QUERY_VARS) return prev;
        return [...prev, v];
      }
      return prev.filter((x: string) => x !== v);
    });
  };

  const handleExport = (): void => {
    if (!rows) return;
    const headers: string[] = ['时间', ...queriedVars];
    const csvRows: (string | number | null)[][] = rows.map((r: HistoryRow) => [
      formatTs(r.ts, 'YYYY-MM-DD HH:mm'),
      ...r.values,
    ]);
    downloadCsv(
      `历史数据_${start.format('YYYY-MM-DD')}_${end.format('YYYY-MM-DD')}.csv`,
      buildCsv(headers, csvRows),
    );
  };

  const chartConfig = useMemo<ChartConfiguration<'line', (number | null)[], string> | null>(() => {
    if (!rows || rows.length === 0) return null;
    const isMobile: boolean = isMobileViewport();
    const sampled: HistoryRow[] = sampleRows(rows);
    const datasets = queriedVars.map((v: string, i: number) => {
      const color: string = CHART_SERIES.multiLine[i % CHART_SERIES.multiLine.length];
      return {
        label: v,
        data: sampled.map((r: HistoryRow) => r.values[i]),
        borderColor: color,
        backgroundColor: color,
        borderWidth: 1.5,
        pointRadius: 0,
        spanGaps: false,
        tension: 0.3,
      };
    });
    return {
      type: 'line',
      data: {
        labels: sampled.map((r: HistoryRow) =>
          formatTs(r.ts, isMobile ? 'MM-DD' : 'MM-DD HH:mm'),
        ),
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 16, left: 4 } },
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: (item: TooltipItem<'line'>): string =>
                `${item.dataset.label ?? ''}: ${item.formattedValue}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              autoSkip: true,
              maxTicksLimit: isMobile ? 6 : 10,
              maxRotation: 0,
              minRotation: 0,
              color: '#64748B',
              font: { size: 11 },
            },
          },
          y: {
            grid: { color: '#E6EAF1' },
            ticks: {
              color: '#64748B',
              callback: (v: string | number): string =>
                shortNumberLabel(Number(v)),
            },
          },
        },
      },
    };
  }, [rows, queriedVars]);

  const pages: number = rows ? totalPages(rows.length) : 1;
  const pageRows: HistoryRow[] = rows ? slicePage(rows, page) : [];

  return (
    <SectionCard no="07" icon={<Search className="h-4 w-4" />} title="历史数据查询">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
        <div className="grid grid-cols-2 gap-3 md:flex md:gap-4">
          <DatePick label="起始日期" value={start} onChange={setStart} />
          <DatePick label="结束日期" value={end} onChange={setEnd} />
        </div>
        <div className="flex gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => setVarsOpen((v: boolean) => !v)}
            className={`${TRIGGER_CLS} min-w-0 flex-1 justify-between md:flex-none`}
            aria-expanded={varsOpen}
          >
            <span className="truncate">
              选择变量
              <span className="text-rk-ink-soft">（已选 {selected.length}）</span>
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-rk-ink-soft transition-transform ${varsOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <Button onClick={handleQuery} disabled={loading} className="min-h-[44px]">
            {loading ? '查询中…' : '查询'}
          </Button>
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${varsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <div className="mt-3 rounded-[10px] border border-rk-line bg-rk-bg-faint p-3 md:p-4">
            <div className="mb-2 flex items-center gap-3">
              <button
                type="button"
                className="min-h-[44px] px-1 text-xs text-rk-brand"
                onClick={() => setSelected(variables.slice(0, MAX_QUERY_VARS))}
              >
                选前5个
              </button>
              <button
                type="button"
                className="min-h-[44px] px-1 text-xs text-rk-ink-soft"
                onClick={() => setSelected([])}
              >
                清空
              </button>
              <span className="ml-auto text-xs text-rk-ink-soft">
                最多同时选 {MAX_QUERY_VARS} 个
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {variables.map((v: string) => {
                const isChecked: boolean = selected.includes(v);
                const isDisabled: boolean =
                  !isChecked && selected.length >= MAX_QUERY_VARS;
                return (
                  <label
                    key={v}
                    className={`flex min-h-[44px] items-center gap-2 rounded-md px-2 text-sm text-rk-ink ${isDisabled ? 'opacity-40' : ''}`}
                  >
                    <Checkbox
                      checked={isChecked}
                      disabled={isDisabled}
                      onCheckedChange={(checked: boolean | 'indeterminate') => toggleVar(v, checked === true)}
                    />
                    <span className="truncate">{v}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {error !== null ? <p className="mt-3 text-sm text-rk-danger">{error}</p> : null}
      {rows === null && error === null ? (
        <p className="mt-3 text-sm text-rk-ink-soft">请选择时间范围与变量后点击查询</p>
      ) : null}
      {rows !== null && rows.length === 0 ? (
        <p className="mt-3 text-sm text-rk-ink-soft">所选条件下暂无数据</p>
      ) : null}

      {chartConfig !== null ? (
        <div className="mt-4">
          <ChartCanvas config={chartConfig} />
        </div>
      ) : null}

      {rows !== null && rows.length > 0 ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-rk-ink">查询结果（共 {rows.length} 条）</span>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] gap-1 md:min-h-0"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" />
              导出 CSV
            </Button>
          </div>
          <div className="overflow-x-auto rounded-[10px] border border-rk-line">
            <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="bg-rk-table-head text-xs text-white">
                    <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">时间</th>
                    {queriedVars.map((v: string) => (
                      <th key={v} className="whitespace-nowrap px-4 py-2.5 text-left font-medium">
                        {v}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row: HistoryRow) => (
                    <tr key={row.ts} className="odd:bg-rk-bg-faint">
                      <td className="whitespace-nowrap px-4 py-2.5 text-sm tabular-nums text-rk-ink">
                        {formatTs(row.ts, 'YYYY-MM-DD HH:mm')}
                      </td>
                      {row.values.map((v: number | null, i: number) => (
                        <td
                          key={`${row.ts}-${queriedVars[i]}`}
                          className="px-4 py-2.5 text-sm tabular-nums text-rk-ink"
                        >
                          {v === null ? '-' : v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
          <p className="text-xs text-rk-ink-faint md:hidden">← 左右滑动查看完整表格 →</p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-rk-ink-soft">
            <span className="tabular-nums">共 {rows.length} 条 · 第 {page}/{pages} 页</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="min-h-[44px] md:min-h-0"
                disabled={page <= 1}
                onClick={() => setPage((p: number) => p - 1)}
              >
                上一页
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="min-h-[44px] md:min-h-0"
                disabled={page >= pages}
                onClick={() => setPage((p: number) => p + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
};

export default HistoryQuerySection;
