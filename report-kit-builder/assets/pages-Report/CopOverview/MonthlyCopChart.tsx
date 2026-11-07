import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type {
  CallbackDataParams,
  TopLevelFormatterParams,
} from 'echarts/types/dist/shared';
import { Card } from '@client/src/components/ui/card';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@client/src/components/ui/empty';
import { COP_BAR_COLOR } from '@client/src/theme/charts';
import type { CopDataSource, MonthlyCopItem } from '@shared/api.interface';

const MONTH_LABELS: string[] = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
];

const BAR_COLOR = '#2e6ff2';

interface MonthlyCopChartProps {
  monthly: MonthlyCopItem[];
  source: CopDataSource;
  loading: boolean;
}

function MonthlyCopChart({ monthly, source, loading }: MonthlyCopChartProps) {
  const byIndex = useMemo(() => {
    const map = new Map<number, MonthlyCopItem>();
    monthly.forEach((item: MonthlyCopItem) => {
      const m: number = Number(item.month.slice(5, 7));
      if (m >= 1 && m <= 12) map.set(m - 1, item);
    });
    return map;
  }, [monthly]);

  const option: EChartsOption = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        formatter: (params: TopLevelFormatterParams): string => {
          const single: CallbackDataParams | undefined = Array.isArray(params)
            ? (params[0] as CallbackDataParams)
            : (params as CallbackDataParams);
          const idx: number = Number(single?.dataIndex ?? -1);
          if (idx < 0 || idx >= 12) return '';
          const item = byIndex.get(idx);
          const label = MONTH_LABELS[idx];
          if (!item) return `${label}<br/>暂无数据`;
          const coolWan = (item.coolKwh / 10000).toFixed(1);
          const elecWan = (item.elecKwh / 10000).toFixed(1);
          return [
            label,
            `冷量：${coolWan} 万kWh`,
            `电量：${elecWan} 万kWh`,
            `COP：${item.cop.toFixed(1)}`,
          ].join('<br/>');
        },
      },
      grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: MONTH_LABELS,
        boundaryGap: true,
      },
      yAxis: { type: 'value', name: 'COP' },
      series: [
        {
          type: 'bar',
          name: 'COP',
          data: MONTH_LABELS.map(
            (_label: string, idx: number): number | null =>
              byIndex.get(idx)?.cop ?? null,
          ),
          barMaxWidth: 40,
          itemStyle: { color: BAR_COLOR, borderRadius: [4, 4, 0, 0] },
        },
      ],
    }),
    [byIndex],
  );

  return (
    <Card className="p-6">
      <h2 className="text-base font-medium">月度 COP</h2>
      {source === 'sensor_data' && (
        <p className="mt-1 text-xs text-muted-foreground">
          当前数据由冷冻累计冷量/总累计用电量增量计算
        </p>
      )}
      <div className="mt-4">
        {loading ? (
          <Skeleton className="h-[360px] w-full" />
        ) : monthly.length === 0 ? (
          <div className="flex h-[360px] items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>暂无 COP 数据</EmptyTitle>
                <EmptyDescription>
                  请先导入月度汇总或时序数据
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <ReactECharts
            option={option}
            theme="ud"
            style={{ height: 360 }}
            notMerge
          />
        )}
      </div>
    </Card>
  );
}

export { MonthlyCopChart };
