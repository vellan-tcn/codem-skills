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
    // ★布局自适应（规范 assets/docs/LAYOUT-CANVAS-ZOOM.md）：
    // 根容器 min-h = --stage-h（视口高-导航，由 Layout 下发）→ 竖向优先铺满；
    // 内容区 flex-1 吃掉工具条以下全部剩余；区块按比例 grow + 设计稿 min-h 兜底（矮屏改整页滚动，永不挤压）。
    <div className="flex w-full flex-col bg-rk-bg-soft text-sm text-rk-ink md:min-h-[var(--stage-h)]">
      <ReportTopbar
        freshness={freshness}
        workshop={workshop}
        onWorkshopChange={setWorkshop}
      />
            <main className="mx-auto flex w-full min-w-0 max-w-[1240px] flex-1 flex-col gap-1.5 px-2 pt-1 pb-2 md:gap-3 md:px-6 md:pt-3 md:pb-4">
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
            {/* 桌面端按 0.95 : 4.5 : 0.3 分摊可用高度，min-h 为设计稿高度兜底（矮屏不再压缩，改滚动） */}
              <div className="flex shrink-0 flex-col md:min-h-[220px] md:flex-[0.95_1_0]">
              <CopKpiSection
              year={report.selectedYear}
            availableYears={report.availableYears}
            onYearChange={report.setSelectedYear}
            summary={report.yearSummary}
          monthly={report.yearMonthly}
              />
            </div>
            <div className="flex min-h-0 flex-1 flex-col md:min-h-[760px] md:flex-[4.5_1_0]">
              <MonthlyCopTrendSection year={displayYear} monthly={report.yearMonthly} workshop={workshop} />
            </div>
            <div className="flex shrink-0 flex-col md:min-h-[64px] md:flex-[0.3_1_0]">
              <OperationAnalysisSection workshop={workshop} />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ReportPage;
