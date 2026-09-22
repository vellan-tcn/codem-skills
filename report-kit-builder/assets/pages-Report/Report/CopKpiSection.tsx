import React from 'react';
import { Gauge } from 'lucide-react';
import SectionCard from '@client/src/components/report-kit/SectionCard';
import CopPreciseValue from '@client/src/components/report-kit/CopPreciseValue';
import { REPORT_COLORS } from '@client/src/pages/Report/report-constants';
import { formatThousands } from '@client/src/pages/Report/report-utils';
import type { CopKpiSectionProps } from '@client/src/pages/Report/report-types';

interface YearKpiCard {
  label: string;
  color: string;
  value: string | null;
  unit: string;
}

const CopKpiSection: React.FC<CopKpiSectionProps> = ({
  year,
  availableYears,
  onYearChange,
  summary,
  monthly,
}) => {
  const cool = summary !== null ? formatThousands(Math.round(summary.yearCoolKwh)) : null;
  const elec = summary !== null ? formatThousands(Math.round(summary.yearElecKwh)) : null;
  const hasData: boolean = summary !== null && summary.yearElecKwh > 0;
  const copPrecise: string | null = hasData ? summary.yearAvgCop.toFixed(3) : null;

  const cards: YearKpiCard[] = [
    {
      label: '全年冷量',
      color: REPORT_COLORS.blue600,
      value: hasData && cool !== null ? cool : null,
      unit: hasData && cool !== null ? 'kW·h' : '',
    },
    {
      label: '全年电量',
      color: REPORT_COLORS.green500,
      value: hasData && elec !== null ? elec : null,
      unit: hasData && elec !== null ? 'kW·h' : '',
    },
    {
      label: '全年COP',
      color: REPORT_COLORS.green600,
      value: hasData ? summary.yearAvgCop.toFixed(1) : null,
      unit: '',
    },
  ];


  return (
    <SectionCard
      no="01"
      icon={<Gauge className="h-4 w-4" />}
      title="COP 总览"
      subtitle={year !== null ? `${year} 年` : undefined}
      headerExtra={
        availableYears.length > 0 ? (
          <div className="flex gap-1.5" role="group" aria-label="切换年份">
            {availableYears.map((y: number) => (
              <button
                key={y}
                type="button"
                onClick={() => onYearChange(y)}
                className={`flex min-h-[22px] items-center rounded-full border px-2.5 text-[11px] tabular-nums transition-colors ${
                  y === year
                    ? 'border-rk-table-head bg-rk-table-head text-white'
                    : 'border-rk-line bg-white text-rk-ink'
                }`}
              >
                {y}年
              </button>
            ))}
          </div>
        ) : undefined
      }
    >
      {availableYears.length > 0 ? (
        <div className="hidden md:mb-3 md:flex md:gap-3" role="group" aria-label="切换年份">
          {availableYears.map((y: number) => {
            const isActive: boolean = y === year;
            return (
              <button
                key={y}
                type="button"
                onClick={() => onYearChange(y)}
                className={`flex min-h-[26px] items-center rounded-full border px-3 text-xs tabular-nums transition-colors md:min-h-0 md:py-2 ${
                  isActive
                    ? 'border-rk-table-head bg-rk-table-head text-white'
                    : 'border-rk-line bg-white text-rk-ink hover:border-rk-blue'
                }`}
              >
                {y}年
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="grid flex-1 grid-cols-3 gap-1.5 md:gap-4">
        {cards.map((card: YearKpiCard) => (
          <div
            key={card.label}
            className="flex rounded-[10px] border border-rk-line bg-white"
          >
            <div
              className="w-[3px] shrink-0 rounded-l-[10px]"
              style={{ backgroundColor: card.color }}
            />
            <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-2 py-2 text-center md:px-3 md:py-1.5">
              <div className="text-[11px] text-rk-ink-soft md:text-sm">{card.label}</div>
              {card.value === null ? (
                <div className="mt-1 text-xl font-medium text-rk-ink-faint">
                  无数据
                </div>
              ) : (
                <div className="mt-1 flex items-baseline justify-center gap-1">
                  <span className="break-all text-[16px] font-bold leading-none text-rk-brand tabular-nums md:text-[28px]">
                    {card.label === '全年COP' && copPrecise !== null && card.value !== null ? (
                      <CopPreciseValue display={card.value} precise={copPrecise} />
                    ) : (
                      card.value
                    )}
                  </span>
                  {card.unit ? (
                    <span className="text-[8.5px] text-rk-ink-soft md:text-sm">{card.unit}</span>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
};

export default CopKpiSection;
