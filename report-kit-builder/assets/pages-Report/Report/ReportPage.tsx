import React, { useState } from 'react';
import { useReportData } from '@client/src/hooks/useReportData';
import ReportTopbar from '@client/src/pages/Report/ReportTopbar';
import CopKpiSection from '@client/src/pages/Report/CopKpiSection';
import MonthlyCopTrendSection from '@client/src/pages/Report/MonthlyCopTrendSection';
import OperationAnalysisSection from '@client/src/pages/Report/OperationAnalysisSection';
import type { RawWorkshop } from '@client/src/api/raw-data';

const ReportPage: React.FC = () => {
  const [workshop, setWorkshop] = useState<RawWorkshop>('pei');
  const report = useReportData(workshop, '');
  const freshness: string | null = report.loading
    ? null
    : report.dataRange
      ? `数据更新至 ${report.dataRange.maxMonth}`
      : null;
  const displayYear: number = report.selectedYear ?? new Date().getFullYear();

  return (
    <div className="flex h-[calc(100vh-2.3125rem)] flex-col overflow-hidden bg-rk-bg-soft text-sm text-rk-ink">
      <ReportTopbar
        freshness={freshness}
        workshop={workshop}
        onWorkshopChange={setWorkshop}
      />
            <main className="mx-auto flex w-full min-w-0 max-w-[1240px] flex-1 flex-col gap-1.5 overflow-y-auto px-2 pt-1 pb-2 md:gap-[7px] md:overflow-hidden md:px-6 md:pt-2 md:pb-8">
        {report.error ? (
          <div className="rounded-[14px] border border-rk-danger/30 bg-rk-danger/5 p-4 text-sm text-rk-danger">
            {report.error}
          </div>
        ) : null}
        {report.loading ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            {[0, 1].map((i: number) => (
              <div
                key={i}
                className="rounded-[14px] border border-rk-line bg-white p-4 md:p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 animate-pulse rounded-full bg-rk-bg-brand-soft" />
                  <div className="h-4 w-32 animate-pulse rounded bg-rk-bg-brand-soft" />
                </div>
                <div className="mt-4 h-[120px] animate-pulse rounded-[10px] bg-rk-bg-soft md:h-[200px]" />
              </div>
            ))}
            <p className="text-center text-sm text-rk-ink-soft">报告数据加载中，请稍候…</p>
          </div>
        ) : (
          <>
            {/* 桌面端：区块按比例分摊屏幕高度，竖向铺满；移动端自然高度滚动 */}
              <div className="flex shrink-0 flex-col md:flex-[0.95_1_0]">
              <CopKpiSection
              year={report.selectedYear}
            availableYears={report.availableYears}
            onYearChange={report.setSelectedYear}
            summary={report.yearSummary}
          monthly={report.yearMonthly}
              />
            </div>
            <div className="flex min-h-0 flex-1 flex-col md:flex-[4.5_1_0]">
              <MonthlyCopTrendSection year={displayYear} monthly={report.yearMonthly} workshop={workshop} />
            </div>
            <div className="flex shrink-0 flex-col md:flex-[0.3_1_0]">
              <OperationAnalysisSection workshop={workshop} />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ReportPage;
