import { useEffect, useMemo, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { CopOverviewResponse } from '@shared/api.interface';
import { copOverviewApi, sensorDataApi } from '@client/src/api';
import type { RawWorkshop } from '@client/src/api/raw-data';
import type { MonthChip } from '@client/src/pages/Report/report-types';
import { buildMonthChips } from '@client/src/pages/Report/report-utils';

export interface ReportBase {
  loading: boolean;
  error: string | null;
  variables: string[];
  overviews: Record<number, CopOverviewResponse>;
  monthChips: MonthChip[];
}

export function useReportBase(
  workshop: RawWorkshop = 'pei',
  excludeKinds: string = '',
): ReportBase {
  const [variables, setVariables] = useState<string[]>([]);
  const [overviews, setOverviews] = useState<Record<number, CopOverviewResponse>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled: boolean = false;
    const load = async (): Promise<void> => {
      try {
        const currentYear: number = new Date().getFullYear();
        const [vars, first] = await Promise.all([
          sensorDataApi.getSensorVariables(),
          copOverviewApi.getCopOverview(currentYear, workshop, excludeKinds),
        ]);
        const restYears: number[] = first.availableYears.filter(
          (y: number) => y !== currentYear,
        );
        const rest: CopOverviewResponse[] = await Promise.all(
          restYears.map((y: number) => copOverviewApi.getCopOverview(y, workshop, excludeKinds)),
        );
        if (cancelled) return;
        const map: Record<number, CopOverviewResponse> = { [currentYear]: first };
        rest.forEach((r: CopOverviewResponse, i: number) => {
          map[restYears[i]] = r;
        });
        setVariables(vars);
        setOverviews(map);
      } catch (e) {
        logger.error('加载报告数据失败', String(e));
        setError('数据加载失败，请刷新重试');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [workshop, excludeKinds]);

  const monthChips: MonthChip[] = useMemo(() => {
    const months: string[] = Object.values(overviews).flatMap(
      (r: CopOverviewResponse) => r.monthly.map((m) => m.month),
    );
    return buildMonthChips(months);
  }, [overviews]);

  return { loading, error, variables, overviews, monthChips };
}
