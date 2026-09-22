import React from 'react';
import { Card } from '@client/src/components/ui/card';
import { Skeleton } from '@client/src/components/ui/skeleton';
import type { CopSummary } from '@shared/api.interface';
import CopPreciseValue from '@client/src/components/report-kit/CopPreciseValue';

interface CopSummaryCardsProps {
  summary: CopSummary;
  loading: boolean;
}

interface SummaryCardProps {
  label: string;
  value: string;
  unit: string;
  precise?: string | null;
  loading: boolean;
}

/** 千分位展示；数值 ≥ 1 万时换算为万 kWh */
function formatKwh(value: number): { text: string; unit: string } {
  if (Math.abs(value) >= 10000) {
    return { text: (value / 10000).toFixed(1), unit: '万kWh' };
  }
  return {
    text: value.toLocaleString('zh-CN', { maximumFractionDigits: 1 }),
    unit: 'kWh',
  };
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  unit,
  precise = null,
  loading,
}) => (
  <Card className="p-6">
    <div className="text-sm text-muted-foreground">{label}</div>
    {loading ? (
      <Skeleton className="mt-2 h-9 w-32" />
    ) : (
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold">
          {precise !== null && !loading ? (
            <CopPreciseValue display={value} precise={precise} />
          ) : (
            value
          )}
        </span>
        {unit !== '' && (
          <span className="text-sm text-muted-foreground">{unit}</span>
        )}
      </div>
    )}
  </Card>
);

function CopSummaryCards({ summary, loading }: CopSummaryCardsProps) {
  const cool = formatKwh(summary.yearCoolKwh);
  const elec = formatKwh(summary.yearElecKwh);
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      data-ai-section-type="card-stat"
    >
      <SummaryCard
        label="全年累计冷量"
        value={cool.text}
        unit={cool.unit}
        loading={loading}
      />
      <SummaryCard
        label="全年累计用电量"
        value={elec.text}
        unit={elec.unit}
        loading={loading}
      />
      <SummaryCard
        label="年平均COP"
        value={summary.yearAvgCop.toFixed(1)}
        precise={summary.yearAvgCop.toFixed(3)}
        unit=""
        loading={loading}
      />
    </div>
  );
}

export { CopSummaryCards };
