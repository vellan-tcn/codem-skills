import { useCallback, useEffect, useState } from 'react';
import { getCopOverview } from '@client/src/api/cop-overview';
import type {
  CopOverviewResponse,
  CopSummary,
  MonthlyCopItem,
} from '@shared/api.interface';
import type { MonthRange } from '@client/src/pages/Report/report-types';

interface YixingReportState {
  loading: boolean;
  error: string | null;
  selectedYear: number | null;
  setSelectedYear: (year: number) => void;
  availableYears: number[];
  yearSummary: CopSummary | null;
  yearMonthly: MonthlyCopItem[];
  dataRange: MonthRange | null;
}

export function useYixingReport(): YixingReportState {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYearState] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [yearSummary, setYearSummary] = useState<CopSummary | null>(null);
  const [yearMonthly, setYearMonthly] = useState<MonthlyCopItem[]>([]);
  const [dataRange, setDataRange] = useState<MonthRange | null>(null);

  const load = useCallback(async (year: number | null): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const resp: CopOverviewResponse = await getCopOverview(year ?? undefined);
      const monthly: MonthlyCopItem[] = resp.monthly ?? [];
      setAvailableYears(resp.availableYears ?? []);
      setYearSummary(resp.summary ?? null);
      setYearMonthly(monthly);
      setDataRange(
        monthly.length > 0
          ? {
              minMonth: monthly[0].month,
              maxMonth: monthly[monthly.length - 1].month,
            }
          : null,
      );
      const fallbackYear: number = resp.availableYears?.[0] ?? new Date().getFullYear();
      setSelectedYearState((prev: number | null) =>
        prev !== null && (resp.availableYears ?? []).includes(prev) ? prev : fallbackYear,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '数据加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(selectedYear);
  }, [load, selectedYear]);

  const setSelectedYear = useCallback((year: number): void => {
    setSelectedYearState(year);
  }, []);

  return {
    loading,
    error,
    selectedYear,
    setSelectedYear,
    availableYears,
    yearSummary,
    yearMonthly,
    dataRange,
  };
}
