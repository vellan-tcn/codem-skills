import React, { useMemo } from 'react';
import { Thermometer } from 'lucide-react';
import type { ChartConfiguration, TooltipItem } from 'chart.js';
import type { TempScopSectionProps } from '@client/src/pages/Report/report-types';
import SectionCard from '@client/src/components/report-kit/SectionCard';
import ChartCanvas from '@client/src/components/report-kit/ChartCanvas';
import { CHART_SERIES, REPORT_COLORS } from '@client/src/pages/Report/report-constants';
import {
  isMobileViewport,
  shortDateLabel,
} from '@client/src/pages/Report/report-utils';

interface LineDatasetDef {
  label: string;
  data: (number | null)[];
  borderColor: string;
  backgroundColor: string;
  yAxisID: string;
  spanGaps: boolean;
  tension: number;
  pointRadius: number;
  borderWidth: number;
}

const TempScopSection: React.FC<TempScopSectionProps> = ({
  month,
  tempVar,
  scopVar,
  daily,
  loading,
}) => {
  const option = useMemo<ChartConfiguration<'line', (number | null)[], string>>(() => {
    const isMobile: boolean = isMobileViewport();
    const datasets: LineDatasetDef[] = [];
    if (tempVar !== null) {
      datasets.push({
        label: '室外温度',
        data: daily?.temp ?? [],
        borderColor: CHART_SERIES.temp,
        backgroundColor: CHART_SERIES.temp,
        yAxisID: 'yTemp',
        spanGaps: false,
        tension: 0.3,
        pointRadius: 2,
        borderWidth: 2,
      });
    }
    if (scopVar !== null) {
      datasets.push({
        label: 'SCOP',
        data: daily?.scop ?? [],
        borderColor: CHART_SERIES.scop,
        backgroundColor: CHART_SERIES.scop,
        yAxisID: 'yScop',
        spanGaps: false,
        tension: 0.3,
        pointRadius: 2,
        borderWidth: 2,
      });
    }
    return {
      type: 'line',
      data: {
        labels: (daily?.dates ?? []).map((d: string) =>
          isMobile ? shortDateLabel(d) : d,
        ),
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 16, left: 4 } },
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: (item: TooltipItem<'line'>): string => {
                const value: number = item.parsed.y;
                if (value === null || Number.isNaN(value)) return '';
                if (item.dataset.label === '室外温度') {
                  return `室外温度: ${value.toFixed(2)} °C`;
                }
                return `SCOP: ${value.toFixed(1)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              autoSkip: true,
              maxTicksLimit: isMobile ? 6 : 8,
              maxRotation: 0,
              minRotation: 0,
              color: REPORT_COLORS.ink500,
              font: { size: 11 },
            },
          },
          yTemp: {
            type: 'linear',
            position: 'left',
            title: { display: false },
            grid: { color: REPORT_COLORS.line },
            ticks: { color: REPORT_COLORS.ink500 },
          },
          yScop: {
            type: 'linear',
            position: 'right',
            title: { display: false },
            grid: { color: REPORT_COLORS.line },
            ticks: { color: REPORT_COLORS.ink500 },
          },
        },
      },
    };
  }, [daily, tempVar, scopVar]);

  const isEmpty: boolean = daily === null || daily.dates.length === 0;

  return (
    <SectionCard
      no="05"
      icon={<Thermometer className="h-4 w-4" />}
      title="室外温度与SCOP"
      subtitle={`${month ?? ''} 按日均值`}
    >
      {loading ? (
        <p className="py-8 text-center text-sm text-rk-ink-soft">加载中…</p>
      ) : isEmpty ? (
        <p className="py-8 text-center text-sm text-rk-ink-soft">当前月份暂无数据</p>
      ) : (
        <ChartCanvas config={option} />
      )}
      {!loading && !isEmpty ? (
        <p className="mt-2 text-xs text-rk-ink-soft">
          左轴：温度（°C） · 右轴：SCOP
        </p>
      ) : null}
    </SectionCard>
  );
};

export default TempScopSection;
