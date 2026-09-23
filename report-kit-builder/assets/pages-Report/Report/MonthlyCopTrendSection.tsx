import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
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
import { formatThousands, isMobileViewport } from '@client/src/pages/Report/report-utils';
import type { MonthlyCopTrendSectionProps } from '@client/src/pages/Report/report-types';

const MONTH_LABELS: string[] = Array.from(
  { length: 12 },
  (_v: unknown, i: number) => `${i + 1}月`,
);

const pad = (n: number): string => String(n).padStart(2, '0');

const HEADERS: string[] = ['月份', '冷量(kW·h)', '电量(kW·h)', 'COP'];

const MonthlyCopTrendSection: React.FC<MonthlyCopTrendSectionProps> = ({
  year,
  monthly,
}) => {
  const byMonth: Map<string, MonthlyCopItem> = useMemo(() => {
    const map: Map<string, MonthlyCopItem> = new Map();
    for (const item of monthly) {
      map.set(item.month, item);
    }
    return map;
  }, [monthly]);

  const coolValues: (number | null)[] = MONTH_LABELS.map(
    (_label: string, i: number) => {
      const item: MonthlyCopItem | undefined = byMonth.get(
        `${year}-${pad(i + 1)}`,
      );
      return item ? item.coolKwh : null;
    },
  );

  const elecValues: (number | null)[] = MONTH_LABELS.map(
    (_label: string, i: number) => {
      const item: MonthlyCopItem | undefined = byMonth.get(
        `${year}-${pad(i + 1)}`,
      );
      return item ? item.elecKwh : null;
    },
  );

  const copValues: (number | null)[] = MONTH_LABELS.map(
    (_label: string, i: number) => {
      const item: MonthlyCopItem | undefined = byMonth.get(
        `${year}-${pad(i + 1)}`,
      );
      return item ? item.cop : null;
    },
  );

  const lastDataIdx: number = Math.max(
    -1,
    ...MONTH_LABELS.map(
      (_label: string, i: number): number =>
        coolValues[i] !== null || elecValues[i] !== null || copValues[i] !== null
          ? i
          : -1,
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
            yAxisID: 'yEnergy',
          },
          {
            label: '电量',
            data: elecValues,
            backgroundColor: CHART_SERIES.elec,
            borderRadius: 4,
            barPercentage: 0.45,
            yAxisID: 'yEnergy',
          },
          {
            type: 'line',
            label: 'COP',
            data: copValues,
            borderColor: CHART_SERIES.temp,
            backgroundColor: CHART_SERIES.temp,
            pointRadius: 3,
            tension: 0.3,
            spanGaps: false,
            yAxisID: 'yCop',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 16, left: 4 } },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: { family: CHART_FONT_FAMILY, size: 10 },
              boxWidth: 10,
              boxHeight: 8,
              padding: 6,
            },
          },
          tooltip: {
            callbacks: {
              label: (
                ctx: TooltipItem<keyof ChartTypeRegistry>,
              ): string => {
                if (ctx.dataset.label === 'COP') {
                  return `COP：${(ctx.parsed.y ?? 0).toFixed(1)}`;
                }
                return `${ctx.dataset.label ?? ''}：${Math.round(ctx.parsed.y ?? 0).toLocaleString('zh-CN')} kWh`;
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
          yEnergy: {
            position: 'left',
            title: { display: false },
            grid: { color: REPORT_COLORS.line },
            ticks: {
              font: { family: CHART_FONT_FAMILY, size: isMobile ? 9 : 12 },
              color: REPORT_COLORS.ink500,
              callback: (v: number | string): string => Number(v).toLocaleString('zh-CN'),
            },
          },
          yCop: {
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
  }, [chartLabels, coolValues, elecValues, copValues]);

  return (
    <SectionCard
      no="02"
      icon={<TrendingUp className="h-4 w-4" />}
      title="月度汇总与趋势"
      subtitle={`${year} 年`}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-2.5">
        <div className="min-w-0 shrink-0 overflow-x-auto rounded-[10px] border border-rk-line md:shrink-0">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-rk-table-head text-xs text-white">
                {HEADERS.map((h: string) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-2 py-[3px] text-[11.5px] text-center font-medium md:px-3 md:py-1.5 md:text-base"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MONTH_LABELS.map((label: string, idx: number) => {
                const i: number = idx;
                const month: string = `${year}-${pad(i + 1)}`;
                const item: MonthlyCopItem | undefined = byMonth.get(month);
                const rowBg: string = i % 2 === 0 ? 'bg-rk-bg-faint' : 'bg-white';
                if (item === undefined) {
                  return (
                    <tr key={month} className={rowBg}>
                      <td className="whitespace-nowrap px-2 py-[3px] text-[11.5px] text-center text-rk-ink md:px-3 md:py-1.5 md:text-base">
                        {label}
                      </td>
                      <td className="whitespace-nowrap px-2 py-[3px] text-[11.5px] text-center tabular-nums text-rk-ink md:px-3 md:py-1.5 md:text-base" colSpan={3} />
                    </tr>
                  );
                }
                return (
                  <tr key={month} className={rowBg}>
                    <td className="whitespace-nowrap px-2 py-[3px] text-[11.5px] text-center text-rk-ink md:px-3 md:py-1.5 md:text-base">
                      {label}
                    </td>
                    <td className="whitespace-nowrap px-2 py-[3px] text-[11.5px] text-center tabular-nums text-rk-ink md:px-3 md:py-1.5 md:text-base">
                      {item.coolKwh <= 0 ? (
                        <span className="text-rk-ink-faint">停机</span>
                      ) : (
                        formatThousands(item.coolKwh)
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-[3px] text-[11.5px] text-center tabular-nums text-rk-ink md:px-3 md:py-1.5 md:text-base">
                      {formatThousands(item.elecKwh)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-[3px] text-[11.5px] text-center tabular-nums text-rk-ink md:px-3 md:py-1.5 md:text-base">
                      {item.cop.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 hidden text-xs text-rk-ink-faint md:hidden">
          ← 左右滑动查看完整表格 →
        </p>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:gap-1">
          {monthly.length === 0 ? (
            <div className="py-10 text-center text-sm text-rk-ink-faint">
              暂无月度数据
            </div>
          ) : (
            <>
              <ChartCanvas config={config} className="min-h-[64px] w-full flex-1 overflow-visible md:h-full md:min-h-[110px]" />
              <p className="mt-0.5 shrink-0 text-[9px] text-rk-ink-soft md:text-xs">
                左轴：冷量/电量（kWh） · 右轴：COP · 横轴：月份
              </p>
            </>
          )}
        </div>
      </div>
    </SectionCard>
  );
};

export default MonthlyCopTrendSection;
