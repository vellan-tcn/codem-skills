import React, { useCallback, useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@client/src/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { getCopOverview } from '@client/src/api/cop-overview';
import type { CopOverviewResponse, CopSummary } from '@shared/api.interface';
import { CopSummaryCards } from './CopSummaryCards';
import { MonthlyCopChart } from './MonthlyCopChart';

const EMPTY_SUMMARY: CopSummary = {
  yearCoolKwh: 0,
  yearElecKwh: 0,
  yearAvgCop: 0,
};

const CopOverviewPage: React.FC = () => {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [data, setData] = useState<CopOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (y: number): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const resp: CopOverviewResponse = await getCopOverview(y);
      setData(resp);
    } catch (err) {
      const message: string =
        err instanceof Error ? err.message : '请求 COP 总览数据失败';
      setError(message);
      logger.error(`获取 COP 总览数据失败: ${message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData(year);
  }, [year, fetchData]);

  // 当前年份在数据中不存在时，自动切到数据里最新的年份
  useEffect(() => {
    if (
      data &&
      data.availableYears.length > 0 &&
      !data.availableYears.includes(year)
    ) {
      setYear(data.availableYears[0]);
    }
  }, [data, year]);

  const yearOptions: number[] =
    data && data.availableYears.length > 0 ? data.availableYears : [year];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">COP 总览</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            查看月度 COP 变化趋势与全年关键指标
          </p>
        </div>
        <Select
          value={String(year)}
          onValueChange={(value: string) => setYear(Number(value))}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="选择年份" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y: number) => (
              <SelectItem key={y} value={String(y)}>
                {`${y} 年`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>数据加载失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <>
          <CopSummaryCards
            summary={data?.summary ?? EMPTY_SUMMARY}
            loading={loading}
          />
          <MonthlyCopChart
            monthly={data?.monthly ?? []}
            source={data?.source ?? 'none'}
            loading={loading}
          />
        </>
      )}
    </div>
  );
};

export default CopOverviewPage;
