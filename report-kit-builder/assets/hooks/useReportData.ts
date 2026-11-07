import { useEffect, useState } from 'react';
import type {
  CopOverviewResponse,
  CopSummary,
  MonthlyCopItem,
} from '@shared/api.interface';
import type { MonthChip, MonthRange } from '@client/src/pages/Report/report-types';
import { useReportBase } from '@client/src/hooks/useReportBase';
import type { RawWorkshop } from '@client/src/api/raw-data';
import { useMonthDetail, type MonthDetail } from '@client/src/hooks/useMonthDetail';

export interface ReportData extends MonthDetail {
  loading: boolean;
  error: string | null;
  variables: string[];
  monthChips: MonthChip[];
  dataRange: MonthRange | null;
  selectedMonth: string | null;
  setSelectedMonth: (month: string) => void;
  selectedYear: number | null;
  setSelectedYear: (year: number) => void;
  availableYears: number[];
  yearMonthly: MonthlyCopItem[];
  yearSummary: CopSummary | null;
  kpiRow: MonthlyCopItem | null;
}

export function useReportData(
  workshop: RawWorkshop = 'pei',
  excludeKinds: string = '',
): ReportData {
  const base = useReportBase(workshop, excludeKinds);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedYear, setSelectedYearState] = useState<number | null>(null);

  useEffect(() => {
    if (base.monthChips.length === 0) return;
    const enabled: MonthChip[] = base.monthChips.filter((c: MonthChip) => c.enabled);
    const lastEnabled: MonthChip | undefined = enabled[enabled.length - 1];
    setSelectedMonth((prev: string | null) => {
      if (prev !== null) return prev;
      return lastEnabled?.month ?? null;
    });
    setSelectedYearState((prev: number | null) => {
      if (prev !== null) return prev;
      const year: number = lastEnabled
        ? Number(lastEnabled.month.slice(0, 4))
        : new Date().getFullYear();
      return year;
    });
  }, [base.monthChips]);

  const handleSelectMonth = (month: string): void => {
    setSelectedMonth(month);
    const year: number = Number(month.slice(0, 4));
    setSelectedYearState((prev: number | null) => (prev === year ? prev : year));
  };

  const handleSelectYear = (year: number): void => {
    setSelectedYearState(year);
    const monthsInYear: string[] = base.monthChips
      .filter((c: MonthChip) => c.enabled && c.month.startsWith(String(year)))
      .map((c: MonthChip) => c.month);
    const lastMonth: string | null =
      monthsInYear[monthsInYear.length - 1] ?? null;
    setSelectedMonth((prev: string | null) => {
      if (lastMonth === null) return prev;
      return prev !== null && prev.startsWith(String(year)) ? prev : lastMonth;
    });
  };

  const detail: MonthDetail = useMonthDetail(base.variables, selectedMonth);

  const availableYears: number[] = Object.keys(base.overviews)
    .map((y: string) => Number(y))
    .sort((a: number, b: number) => a - b);
  const yearOverview: CopOverviewResponse | null =
    selectedYear !== null ? base.overviews[selectedYear] ?? null : null;
  const yearMonthly: MonthlyCopItem[] = yearOverview?.monthly ?? [];
  const yearSummary: CopSummary | null = yearOverview?.summary ?? null;
  const kpiRow: MonthlyCopItem | null =
    yearMonthly.find((m: MonthlyCopItem) => m.month === selectedMonth) ?? null;
  const dataRange: MonthRange | null =
    base.monthChips.length > 0
      ? {
          minMonth: base.monthChips[0].month,
          maxMonth: base.monthChips[base.monthChips.length - 1].month,
        }
      : null;

  return {
    loading: base.loading,
    error: base.error,
    variables: base.variables,
    monthChips: base.monthChips,
    dataRange,
    selectedMonth,
    setSelectedMonth: handleSelectMonth,
    selectedYear,
    setSelectedYear: handleSelectYear,
    availableYears,
    yearMonthly,
    yearSummary,
    kpiRow,
    ...detail,
  };
}
