import { useCallback, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  RawDataQueryResponse,
  RawGranularityParam,
  RawStepUnit,
} from '@shared/api.interface';
import { rawDataApi } from '@client/src/api';
import type { RawWorkshop } from '@client/src/api/raw-data';

export interface RawDataQueryOverride {
  start: dayjs.Dayjs;
  end: dayjs.Dayjs;
}

export interface RawDataState {
  startDate: dayjs.Dayjs;
  setStartDate: (d: dayjs.Dayjs) => void;
  endDate: dayjs.Dayjs;
  setEndDate: (d: dayjs.Dayjs) => void;
  startTime: string;
  setStartTime: (t: string) => void;
  endTime: string;
  setEndTime: (t: string) => void;
  granularity: RawGranularityParam;
  setGranularity: (g: RawGranularityParam) => void;
  customValue: string;
  setCustomValue: (v: string) => void;
  customUnit: RawStepUnit;
  setCustomUnit: (u: RawStepUnit) => void;
  granularityError: string | null;
  loading: boolean;
  error: string | null;
  result: RawDataQueryResponse | null;
  query: (override?: RawDataQueryOverride) => Promise<void>;
}

export function useRawData(workshop: RawWorkshop = 'pei'): RawDataState {
  const [startDate, setStartDate] = useState<dayjs.Dayjs>(dayjs().subtract(1, 'day'));
  const [endDate, setEndDate] = useState<dayjs.Dayjs>(dayjs());
  const [startTime, setStartTime] = useState<string>('00:00');
  const [endTime, setEndTime] = useState<string>('00:00');
  const [granularity, setGranularity] = useState<RawGranularityParam>('raw');
  const [customValue, setCustomValue] = useState<string>('15');
  const [customUnit, setCustomUnit] = useState<RawStepUnit>('minute');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RawDataQueryResponse | null>(null);

  const parsedStep: number = Number(customValue);
  const granularityError: string | null =
    granularity !== 'custom' ||
    (customValue.trim() !== '' && Number.isInteger(parsedStep) && parsedStep >= 1)
      ? null
      : '自定义粒度必须是正整数（最小 1）';

  const query = useCallback(async (override?: RawDataQueryOverride): Promise<void> => {
    if (loading) return;
    const sd: dayjs.Dayjs = override?.start ?? startDate;
    const ed: dayjs.Dayjs = override?.end ?? endDate;
    const start: string = `${sd.format('YYYY-MM-DD')}T${startTime}:00`;
    const end: string = `${ed.format('YYYY-MM-DD')}T${endTime}:00`;
    if (start >= end) {
      setError('起始时间必须早于结束时间');
      return;
    }
    if (granularity === 'custom') {
      const step: number = Number(customValue);
      if (!Number.isInteger(step) || step < 1) {
        setError('自定义粒度必须是正整数（最小 1），请检查数值输入');
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      const res: RawDataQueryResponse = await rawDataApi.queryRawData(
        granularity === 'custom'
          ? { start, end, granularity, step: Number(customValue), unit: customUnit, workshop }
          : { start, end, granularity, workshop },
      );
      setResult({
        granularity: res?.granularity ?? granularity,
        points: res && Array.isArray(res.points) ? res.points : [],
        truncated: res?.truncated === true,
      });
    } catch (e) {
      logger.error('原始数据查询失败', String(e));
      const backendMessage: unknown = (e as { response?: { data?: { message?: unknown } } })
        ?.response?.data?.message;
      setError(
        typeof backendMessage === 'string' && backendMessage.trim() !== ''
          ? backendMessage
          : '查询失败，请稍后重试或缩小时间范围',
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, startTime, endTime, granularity, customValue, customUnit, loading, workshop]);

  const initRef = useRef<boolean>(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    void (async () => {
      try {
        const latest = await rawDataApi.getRawLatest(workshop);
        if (latest.latest !== null && latest.latest !== '') {
          const day: dayjs.Dayjs = dayjs(latest.latest.slice(0, 10));
          if (day.isValid()) {
            const nextEnd: dayjs.Dayjs = day.add(1, 'day');
            setStartDate(day);
            setEndDate(nextEnd);
            void query({ start: day, end: nextEnd });
            return;
          }
        }
      } catch {
        // 拉取最新归档时间失败时回退到默认日期查询
      }
      void query();
    })();
  }, [query]);

  return {
    startDate, setStartDate, endDate, setEndDate,
    startTime, setStartTime, endTime, setEndTime, granularity, setGranularity,
    customValue, setCustomValue, customUnit, setCustomUnit, granularityError,
    loading, error, result, query,
  };
}
