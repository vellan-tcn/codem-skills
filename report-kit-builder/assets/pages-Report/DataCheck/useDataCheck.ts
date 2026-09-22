import { useCallback, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { CheckGranularity, DataCheckRow } from '@shared/api.interface';
import { dataCheckApi } from '@client/src/api';

export interface DataCheckState {
  granularity: CheckGranularity;
  setGranularity: (g: CheckGranularity) => void;
  start: dayjs.Dayjs;
  setStart: (d: dayjs.Dayjs) => void;
  end: dayjs.Dayjs;
  setEnd: (d: dayjs.Dayjs) => void;
  loading: boolean;
  error: string | null;
  rows: DataCheckRow[] | null;
  query: () => Promise<void>;
}

export function useDataCheck(): DataCheckState {
  const [granularity, setGranularity] = useState<CheckGranularity>('day');
  const [start, setStart] = useState<dayjs.Dayjs>(dayjs().subtract(6, 'day'));
  const [end, setEnd] = useState<dayjs.Dayjs>(dayjs());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DataCheckRow[] | null>(null);

  const query = useCallback(async (): Promise<void> => {
    if (loading) return;
    if (start.isAfter(end)) {
      setError('起始日期不能晚于结束日期');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resp = await dataCheckApi.queryDataCheck(
        granularity,
        start.format('YYYY-MM-DD'),
        end.format('YYYY-MM-DD'),
      );
      setRows(resp.rows);
    } catch (e) {
      logger.error('数据核对查询失败', String(e));
      setError('查询失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [granularity, start, end, loading]);

  const initRef = useRef<boolean>(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    void query();
  }, [query]);

  return {
    granularity,
    setGranularity,
    start,
    setStart,
    end,
    setEnd,
    loading,
    error,
    rows,
    query,
  };
}
