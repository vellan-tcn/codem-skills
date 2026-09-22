import { useEffect, useMemo, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { sensorDataApi } from '@client/src/api';
import type { DailySeries } from '@client/src/pages/Report/report-types';
import {
  aggregateDaily,
  mean,
  mergeDaily,
  monthBounds,
  pickVariable,
} from '@client/src/pages/Report/report-utils';

export interface MonthDetail {
  scopVar: string | null;
  tempVar: string | null;
  scopAvg: number | null;
  daily: DailySeries | null;
  monthLoading: boolean;
}

export function useMonthDetail(
  variables: string[],
  selectedMonth: string | null,
): MonthDetail {
  const [scopAvg, setScopAvg] = useState<number | null>(null);
  const [daily, setDaily] = useState<DailySeries | null>(null);
  const [monthLoading, setMonthLoading] = useState<boolean>(false);

  const scopVar: string | null = useMemo(
    () =>
      pickVariable(variables, ['实时', 'SCOP']) ??
      pickVariable(variables, ['SCOP'], ['月平均']) ??
      pickVariable(variables, ['SCOP']),
    [variables],
  );
  const tempVar: string | null = useMemo(
    () =>
      pickVariable(variables, ['室外温度']) ?? pickVariable(variables, ['温度']),
    [variables],
  );

  useEffect(() => {
    if (!selectedMonth || (!scopVar && !tempVar)) {
      setScopAvg(null);
      setDaily(null);
      return;
    }
    let cancelled: boolean = false;
    setMonthLoading(true);
    const { start, end } = monthBounds(selectedMonth);
    const names: string[] = [scopVar, tempVar].filter(
      (n): n is string => n !== null,
    );
    sensorDataApi
      .querySensorSeries(start, end, names)
      .then((res) => {
        if (cancelled) return;
        const scopPoints =
          res.series.find((s) => s.varname === scopVar)?.points ?? [];
        const tempPoints =
          res.series.find((s) => s.varname === tempVar)?.points ?? [];
        setScopAvg(mean(scopPoints.map((p) => p.value)));
        setDaily(
          mergeDaily(
            tempVar ? aggregateDaily(tempPoints) : null,
            scopVar ? aggregateDaily(scopPoints) : null,
          ),
        );
      })
      .catch((e) => {
        logger.error('加载月度明细失败', String(e));
      })
      .finally(() => {
        if (!cancelled) setMonthLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMonth, scopVar, tempVar]);

  return { scopVar, tempVar, scopAvg, daily, monthLoading };
}
