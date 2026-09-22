import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption, SeriesOption } from 'echarts';
import type {
  CallbackDataParams,
  TopLevelFormatterParams,
} from 'echarts/types/dist/shared';
import dayjs from 'dayjs';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@client/src/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@client/src/components/ui/empty';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { TREND_SERIES_COLORS } from '@client/src/theme/charts';
import type { SensorPoint, SensorSeries } from '@shared/api.interface';

export type TrendChartStatus = 'idle' | 'loading' | 'error' | 'success';

export interface TrendChartProps {
  status: TrendChartStatus;
  series: SensorSeries[];
  errorMessage: string;
}

/** 小时级数据，相邻点间隔超过 2 小时视为缺口 */
const GAP_THRESHOLD_MS: number = 2 * 60 * 60 * 1000;

const CHART_COLORS: string[] = [...TREND_SERIES_COLORS];

/**
 * 渲染前在缺口处插入空值中点，配合 connectNulls: false 使折线断开显示空隙
 */
function buildChartData(
  points: SensorPoint[],
): Array<[number, number | null]> {
  const result: Array<[number, number | null]> = [];
  let prevMs: number | null = null;
  points.forEach((point: SensorPoint) => {
    const currentMs: number = dayjs(point.ts).valueOf();
    if (prevMs !== null && currentMs - prevMs > GAP_THRESHOLD_MS) {
      result.push([(prevMs + currentMs) / 2, null]);
    }
    result.push([currentMs, point.value]);
    prevMs = currentMs;
  });
  return result;
}

const tooltipFormatter = (params: TopLevelFormatterParams): string => {
  const list: CallbackDataParams[] = Array.isArray(params)
    ? params
    : [params];
  if (list.length === 0) {
    return '';
  }
  const first: CallbackDataParams = list[0];
  const firstValue: unknown = first.value;
  const tsMs: number = Array.isArray(firstValue)
    ? Number(firstValue[0])
    : Number(first.name);
  const timeLabel: string = dayjs(tsMs).format('YYYY-MM-DD HH:mm');
  const rows: string = list
    .filter((item: CallbackDataParams) => {
      const value: unknown = Array.isArray(item.value)
        ? item.value[1]
        : item.value;
      return value !== null && value !== undefined;
    })
    .map((item: CallbackDataParams) => {
      const value: unknown = Array.isArray(item.value)
        ? item.value[1]
        : item.value;
      const text: string =
        typeof value === 'number' ? value.toFixed(2) : String(value);
      return `<div style="display:flex;align-items:center;gap:6px;">${item.marker ?? ''}<span>${item.seriesName ?? ''}</span><span style="margin-left:auto;font-weight:500;">${text}</span></div>`;
    })
    .join('');
  return `<div style="font-weight:500;margin-bottom:4px;">${timeLabel}</div>${rows}`;
};

const TrendChart: React.FC<TrendChartProps> = ({
  status,
  series,
  errorMessage,
}) => {
  const isEmpty: boolean =
    status === 'success' &&
    series.every(
      (item: SensorSeries) => item.points.length === 0,
    );

  const option: EChartsOption = useMemo(() => {
    const seriesOptions: SeriesOption[] = series.map(
      (item: SensorSeries, index: number) => ({
        name: item.varname,
        type: 'line',
        showSymbol: false,
        connectNulls: false,
        color: CHART_COLORS[index % CHART_COLORS.length],
        data: buildChartData(item.points),
      }),
    );
    return {
      color: CHART_COLORS,
      tooltip: {
        trigger: 'axis',
        formatter: tooltipFormatter,
      },
      legend: {
        type: 'scroll',
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '22%',
        containLabel: true,
      },
      xAxis: {
        type: 'time',
      },
      yAxis: {
        type: 'value',
      },
      dataZoom: [
        { type: 'inside' },
        { type: 'slider', bottom: 32 },
      ],
      series: seriesOptions,
    };
  }, [series]);

  const renderBody = (): React.ReactNode => {
    if (status === 'loading') {
      return <Skeleton className="h-[420px] w-full" />;
    }
    if (status === 'error') {
      return (
        <div className="flex h-[420px] flex-col items-center justify-center gap-2">
          <AlertTriangle className="size-6 text-destructive" />
          <p className="text-sm text-destructive">{errorMessage || '查询失败'}</p>
          <p className="text-sm text-muted-foreground">请检查查询条件后重试</p>
        </div>
      );
    }
    if (status === 'idle') {
      return (
        <div className="flex h-[420px] items-center justify-center">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>开始查询</EmptyTitle>
              <EmptyDescription>
                选择时间范围并勾选变量后，点击「查询」查看时序曲线
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      );
    }
    if (isEmpty) {
      return (
        <div className="flex h-[420px] items-center justify-center">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>所选条件下暂无数据</EmptyTitle>
              <EmptyDescription>
                请尝试扩大时间范围或选择其他变量
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      );
    }
    return (
      <ReactECharts
        theme="ud"
        option={option}
        notMerge
        className="h-[420px] w-full"
        style={{ height: '420px', width: '100%' }}
      />
    );
  };

  return (
    <Card className="p-6">
      <h2 className="text-base font-medium">趋势曲线</h2>
      <div className="mt-4">{renderBody()}</div>
    </Card>
  );
};

export default TrendChart;
