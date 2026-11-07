import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { MonthlyReportResponse } from '@shared/api.interface';
import { rawDataApi } from '@client/src/api';
import type { RawWorkshop } from '@client/src/api/raw-data';

export interface MonthlyDataState {
  years: number[];
  year: number | null;
  setYear: (y: number) => void;
  month: number | null;
  setMonth: (m: number | null) => void;
  loading: boolean;
  error: string | null;
  result: MonthlyReportResponse | null;
}

export function useMonthlyData(
  workshop: RawWorkshop = 'pei',
  excludeKinds: string = '',
): MonthlyDataState {
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MonthlyReportResponse | null>(null);

  const initRef = useRef<boolean>(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    void (async (): Promise<void> => {
      try {
        const res = await rawDataApi.getRawYears(workshop);
        const yearList: number[] =
          res && Array.isArray(res.years) ? res.years : [];
        setYears(yearList);
        if (yearList.length > 0) {
          setYear(yearList[yearList.length - 1]);
        }
      } catch (e) {
        logger.error('年份列表加载失败', String(e));
        setError('年份列表加载失败，请刷新重试');
      }
    })();
  }, []);

  useEffect(() => {
    if (year === null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async (): Promise<void> => {
      try {
        const res: MonthlyReportResponse = await rawDataApi.queryRawReadings(
          month === null
              ? { year, workshop, exclude: excludeKinds }
              : { year, month, workshop, exclude: excludeKinds },
        );
        const safeRes: MonthlyReportResponse = {
          mode: res?.mode === 'month' ? 'month' : 'full-year',
          rows: res && Array.isArray(res.rows) ? res.rows : [],
          summary: {
            coolUsage: res?.summary?.coolUsage ?? null,
            elecUsage: res?.summary?.elecUsage ?? null,
            cop: res?.summary?.cop ?? null,
            totalDays: res?.summary?.totalDays ?? 0,
          },
        };
        if (!cancelled) setResult(safeRes);
      } catch (e) {
        logger.error('月度报表查询失败', String(e));
        if (!cancelled) setError('查询失败，请稍后重试');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return (): void => {
      cancelled = true;
    };
  }, [year, month, workshop, excludeKinds]);

  const handleSetYear = useCallback((y: number): void => {
    setYear(y);
  }, []);

  return {
    years,
    year,
    setYear: handleSetYear,
    month,
    setMonth,
    loading,
    error,
    result,
  };
}
