import React, { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import type { RawDataPoint } from '@shared/api.interface';
import ChartCanvas from '@client/src/components/report-kit/ChartCanvas';
import { CHART_SERIES } from '@client/src/pages/Report/report-constants';
import {
  isMobileViewport,
  shortNumberLabel,
} from '@client/src/pages/Report/report-utils';

const CHART_MAX_ROWS = 600;
const SHOW_ALL_TICKS_LIMIT = 12;
const COOL_COLOR: string = CHART_SERIES.multiLine[0];
const ELEC_COLOR: string = CHART_SERIES.multiLine[1];

function samplePoints(points: RawDataPoint[]): RawDataPoint[] {
  if (points.length <= CHART_MAX_ROWS) return points;
  const step: number = Math.ceil(points.length / CHART_MAX_ROWS);
  return points.filter((_: RawDataPoint, i: number) => i % step === 0);
}

function tickLabel(ts: string): string {
  return ts.length >= 16 ? ts.slice(5, 16) : ts;
}

interface RawDataChartProps {
  points: RawDataPoint[];
}

const RawDataChart: React.FC<RawDataChartProps> = ({ points }) => {
  const config = useMemo<
    ChartConfiguration<'line', (number | null)[], string>
  >(() => {
    const isMobile: boolean = isMobileViewport();
    const sampled: RawDataPoint[] = samplePoints(points);
    const showAllTicks: boolean = sampled.length <= SHOW_ALL_TICKS_LIMIT;
    return {
      type: 'line',
      data: {
        labels: sampled.map((p: RawDataPoint) => tickLabel(p.ts)),
        datasets: [
          {
            label: '冷量示数值',
            data: sampled.map((p: RawDataPoint) => p.cool),
            borderColor: COOL_COLOR,
            backgroundColor: COOL_COLOR,
            borderWidth: 1.5,
            pointRadius: 0,
            spanGaps: false,
            tension: 0.3,
          },
          {
            label: '电量示数值',
            data: sampled.map((p: RawDataPoint) => p.elec),
            borderColor: ELEC_COLOR,
            backgroundColor: ELEC_COLOR,
            borderWidth: 1.5,
            pointRadius: 0,
            spanGaps: false,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 8, right: 16, left: 4 } },
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: (item): string =>
                `${item.dataset.label ?? ''}: ${item.formattedValue}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              autoSkip: !showAllTicks,
              maxTicksLimit: isMobile ? 6 : 10,
              maxRotation: 0,
              minRotation: 0,
              color: '#64748B',
              font: { size: 11 },
            },
          },
          y: {
            beginAtZero: true,
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
  }, [points]);

  return (
    <ChartCanvas
      config={config}
      className="relative mt-4 h-[300px] w-full overflow-visible md:mt-0 md:h-full md:min-h-0 md:flex-1"
    />
  );
};

export default RawDataChart;
