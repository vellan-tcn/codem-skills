import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import type { DateRange } from 'react-day-picker';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Alert, AlertDescription } from '@client/src/components/ui/alert';
import {
  getSensorVariables,
  querySensorSeries,
} from '@client/src/api/sensor-data';
import type { SensorSeries } from '@shared/api.interface';
import HistoryFilterBar from './HistoryFilterBar';
import TrendChart, { type TrendChartStatus } from './TrendChart';

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const maybeResponse = (error as { response?: { data?: unknown } }).response;
    if (maybeResponse && maybeResponse.data) {
      const data: unknown = maybeResponse.data;
      if (typeof data === 'string' && data.length > 0) {
        return data;
      }
      if (typeof data === 'object') {
        const message: unknown = (data as { message?: unknown }).message;
        if (typeof message === 'string' && message.length > 0) {
          return message;
        }
      }
    }
    if (error instanceof Error && error.message) {
      return error.message;
    }
  }
  return '查询失败，请稍后重试';
}

const HistoryQueryPage: React.FC = () => {
  const [variables, setVariables] = useState<string[]>([]);
  const [variablesLoading, setVariablesLoading] = useState<boolean>(true);
  const [variablesError, setVariablesError] = useState<string>('');
  const [selected, setSelected] = useState<string[]>([]);
  const [range, setRange] = useState<DateRange>(() => ({
    from: dayjs().subtract(6, 'day').startOf('day').toDate(),
    to: dayjs().endOf('day').toDate(),
  }));
  const [chartStatus, setChartStatus] = useState<TrendChartStatus>('idle');
  const [series, setSeries] = useState<SensorSeries[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let cancelled: boolean = false;
    const loadVariables = async (): Promise<void> => {
      try {
        const list: string[] = await getSensorVariables();
        if (cancelled) return;
        setVariables(list);
        if (list.length > 0) {
          setSelected([list[0]]);
        }
      } catch (error: unknown) {
        logger.error('加载变量列表失败', error);
        if (!cancelled) {
          setVariablesError(extractErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setVariablesLoading(false);
        }
      }
    };
    void loadVariables();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleQuery = useCallback(async (): Promise<void> => {
    if (!range.from || !range.to) {
      setChartStatus('error');
      setErrorMessage('请先选择完整的时间范围');
      return;
    }
    if (selected.length === 0) {
      setChartStatus('error');
      setErrorMessage('请至少勾选一个变量');
      return;
    }
    setChartStatus('loading');
    setErrorMessage('');
    try {
      const startIso: string = dayjs(range.from).startOf('day').toISOString();
      const endIso: string = dayjs(range.to).endOf('day').toISOString();
      const result = await querySensorSeries(startIso, endIso, selected);
      setSeries(result.series);
      setChartStatus('success');
    } catch (error: unknown) {
      logger.error('查询时序数据失败', error);
      setErrorMessage(extractErrorMessage(error));
      setChartStatus('error');
    }
  }, [range, selected]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">历史数据查询</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          选择时间范围并勾选变量，查看冷站运行数据的时间序列曲线，数据缺口处折线断开显示空隙
        </p>
      </div>

      {variablesError !== '' && (
        <Alert variant="destructive">
          <AlertDescription>变量列表加载失败：{variablesError}</AlertDescription>
        </Alert>
      )}

      <HistoryFilterBar
        variables={variables}
        variablesLoading={variablesLoading}
        selected={selected}
        onSelectedChange={setSelected}
        range={range}
        onRangeChange={setRange}
        querying={chartStatus === 'loading'}
        onQuery={() => void handleQuery()}
      />

      <TrendChart
        status={chartStatus}
        series={series}
        errorMessage={errorMessage}
      />
    </div>
  );
};

export default HistoryQueryPage;
