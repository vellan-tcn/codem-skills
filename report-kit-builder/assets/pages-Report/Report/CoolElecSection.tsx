import React, { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import type {
  ChartConfiguration,
  ChartTypeRegistry,
  TooltipItem,
} from 'chart.js';
import type { MonthlyCopItem } from '@shared/api.interface';
import SectionCard from '@client/src/components/report-kit/SectionCard';
import ChartCanvas from '@client/src/components/report-kit/ChartCanvas';
import {
  CHART_FONT_FAMILY,
  CHART_SERIES,
  REPORT_COLORS,
} from '@client/src/pages/Report/report-constants';
import { isMobileViewport } from '@client/src/pages/Report/report-utils';
import type { CoolElecSectionProps } from '@client/src/pages/Report/report-types';

const MONTH_LABELS: string[] = Array.from(
  { length: 12 },
  (_v: unknown, i: number) => `${i + 1}月`,
);

const pad = (n: number): string => String(n).padStart(2, '0');

const CoolElecSection: React.FC<CoolElecSectionProps> = ({ year, monthly }) => {
  const byMonth: Map<string, MonthlyCopItem> = useMemo(() => {
    const map: Map<string, MonthlyCopItem> = new Map();
    for (const item of monthly) {
      map.set(item.month, item);
    }
    return map;
  }, [monthly]);

  const coolValues: (number | null)[] = useMemo(() => {
    return MONTH_LABELS.map((_label: string, i: number) => {
      const item: MonthlyCopItem | undefined = byMonth.get(
        `${year}-${pad(i + 1)}`,
      );
      return item ? Number((item.coolKwh / 10000).toFixed(1)) : null;
    });
  }, [byMonth, year]);

  const elecValues: (number | null)[] = useMemo(() => {
    return MONTH_LABELS.map((_label: string, i: number) => {
      const item: MonthlyCopItem | undefined = byMonth.get(
        `${year}-${pad(i + 1)}`,
      );
      return item ? Number((item.elecKwh / 10000).toFixed(1)) : null;
    });
  }, [byMonth, year]);

  const missingLabels: string[] = useMemo(() => {
    return MONTH_LABELS.filter(
      (_label: string, i: number) => coolValues[i] === null,
    );
  }, [coolValues]);

  const lastDataIdx: number = Math.max(
      -1,
      ...MONTH_LABELS.map(
        (_label: string, i: number): number =>
          coolValues[i] !== null || elecValues[i] !== null ? i : -1,
      ),
    );
    const chartLabels: string[] =
      lastDataIdx >= 0 && lastDataIdx < MONTH_LABELS.length - 1
        ? MONTH_LABELS.slice(0, lastDataIdx + 1)
        : MONTH_LABELS;

    const config: ChartConfiguration = useMemo(() => {
    const isMobile: boolean = isMobileViewport();
    return {
      type: 'bar',
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: '冷量',
            data: coolValues,
            backgroundColor: CHART_SERIES.cool,
            borderRadius: 4,
            barPercentage: 0.45,
            yAxisID: 'yCool',
          },
          {
            label: '电量',
            data: elecValues,
            backgroundColor: CHART_SERIES.elec,
            borderRadius: 4,
            barPercentage: 0.45,
            yAxisID: 'yElec',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 16, left: 4 } },
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { family: CHART_FONT_FAMILY } },
          },
          tooltip: {
            callbacks: {
              label: (
                ctx: TooltipItem<keyof ChartTypeRegistry>,
              ): string => {
                return `${ctx.dataset.label ?? ''}：${(ctx.parsed.y ?? 0).toFixed(1)} 万kWh`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              autoSkip: false,
              maxRotation: 0,
              minRotation: 0,
              callback: (_v: string | number, index: number): string =>
                isMobile ? `${index + 1}` : MONTH_LABELS[index],
              font: {
                family: CHART_FONT_FAMILY,
                size: isMobile ? 10 : 12,
              },
              color: REPORT_COLORS.ink500,
            },
          },
          yCool: {
            position: 'left',
            title: { display: false },
            grid: { color: REPORT_COLORS.line },
            ticks: {
              font: { family: CHART_FONT_FAMILY },
              color: REPORT_COLORS.ink500,
            },
          },
          yElec: {
            position: 'right',
            title: { display: false },
            grid: { drawOnChartArea: false },
            ticks: {
              font: { family: CHART_FONT_FAMILY },
              color: REPORT_COLORS.ink500,
            },
          },
        },
      },
    };
  }, [coolValues, elecValues]);

  return (
    <SectionCard
      no="04"
      icon={<BarChart3 className="h-4 w-4" />}
      title="冷量与电量月度对比"
      subtitle={`${year} 年`}
    >
      {monthly.length === 0 ? (
        <div className="py-10 text-center text-sm text-rk-ink-faint">
          暂无月度数据
        </div>
      ) : (
        <>
          <ChartCanvas config={config} />
          <p className="mt-2 text-xs text-rk-ink-soft">
            左轴：冷量（万kWh） · 右轴：电量（万kWh） · 横轴：月份
          </p>
          {missingLabels.length > 0 ? (
            <div className="mt-2 text-xs text-rk-warn">
              注：{missingLabels.join('、')}无数据，图中留空
            </div>
          ) : null}
        </>
      )}
    </SectionCard>
  );
};

export default CoolElecSection;
