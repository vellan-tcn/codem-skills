import React, { useState } from 'react';
import { Database, Download } from 'lucide-react';
import type { MonthlyPeriodRow, RawDataPoint } from '@shared/api.interface';
import { useRawData } from '@client/src/pages/RawData/useRawData';
import RawDataFilters from '@client/src/components/report-kit/RawDataFilters';
import RawDataTable from '@client/src/pages/RawData/RawDataTable';
import { useMonthlyData } from '@client/src/pages/RawData/useMonthlyData';
import MonthlyFilters from '@client/src/components/report-kit/MonthlyFilters';
import MonthlyTable from '@client/src/components/report-kit/MonthlyTable';
import RawDataErrorBoundary from '@client/src/pages/RawData/RawDataErrorBoundary';
import { Button } from '@client/src/components/ui/button';
import { buildCsv, downloadCsv } from '@client/src/pages/Report/report-utils';
import type { RawWorkshop } from '@client/src/api/raw-data';

type TabKey = 'report' | 'monthly';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'monthly', label: '月度报表' },
  { key: 'report', label: '报表查询' },
];

const CARD_CLS: string =
  'flex min-h-0 flex-1 flex-col rounded-[12px] bg-white p-1.5 md:min-h-0 md:flex-1 md:rounded-[10px] md:p-2';
const BAR_CLS: string =
  'mt-1 flex shrink-0 flex-wrap items-center justify-between gap-1.5 border-t border-rk-line pt-1 max-md:hidden md:mt-1 md:pt-1.5';
const EXPORT_BTN_CLS: string =
  'min-h-[28px] gap-1 self-center text-[11px] md:min-h-0 md:h-7 md:px-2 md:text-xs';

const RawDataPage: React.FC<{ workshop?: RawWorkshop }> = ({ workshop = 'pei' }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('monthly');
  const report = useRawData(workshop);
    const [excludeMode, setExcludeMode] = useState<string>('none');
  const excludeKinds: string =
    {
      all: 'stopped,trial',
      none: '',
      stopped: 'stopped',
      trial: 'trial',
    }[excludeMode] ?? '';
  const monthly = useMonthlyData(workshop, excludeKinds);

  const reportPoints: RawDataPoint[] = report.result?.points ?? [];
  const monthlyRows: MonthlyPeriodRow[] = monthly.result?.rows ?? [];

  const handleExportReport = (): void => {
    if (reportPoints.length === 0) return;
    const csvRows: (string | number | null)[][] = reportPoints.map(
      (p: RawDataPoint) => [p.ts, p.cool, p.elec],
    );
    const range: string = `${report.startDate.format('YYYY-MM-DD')} ${report.startTime} ~ ${report.endDate.format('YYYY-MM-DD')} ${report.endTime}`;
    downloadCsv(`原始数据_${range}.csv`, buildCsv(['时间', '冷量示数值', '电量示数值'], csvRows));
  };

  const handleExportMonthly = (): void => {
    if (monthlyRows.length === 0) return;
    const mode: 'full-year' | 'month' = monthly.result?.mode ?? 'full-year';
    const headers: string[] = [
      mode === 'full-year' ? '月份' : '日期',
      '起始冷量示数',
      '结束冷量示数',
      '冷量用量',
      '起始电量示数',
      '结束电量示数',
      '电量用量',
      'COP',
    ];
    const csvRows: (string | number | null)[][] = monthlyRows.map(
      (r: MonthlyPeriodRow) => [
        r.label,
        r.coolStart,
        r.coolEnd,
        r.coolUsage,
        r.elecStart,
        r.elecEnd,
        r.elecUsage,
        r.cop,
      ],
    );
    const scope: string =
      monthly.month === null
        ? `${monthly.year}年全年`
        : `${monthly.year}年${monthly.month}月`;
    downloadCsv(`月度报表_${scope}.csv`, buildCsv(headers, csvRows));
  };

  return (
    <div className="flex h-[calc(100dvh_-_37px)] flex-col overflow-hidden md:h-[calc(100vh_-_37px)]">
      <header
        className="w-full"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), ' +
            'linear-gradient(135deg, #081B31 0%, #123353 100%)',
          backgroundSize: '22px 22px',
        }}
      >
          <div className="mx-auto flex w-full max-w-[1240px] shrink-0 items-center gap-2 px-4 py-2 md:gap-3 md:px-6 md:py-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-rk-teal to-rk-brand md:h-8 md:w-8 md:rounded-[10px]">
              <Database className="h-5 w-5 text-white md:h-6 md:w-6" />
            </div>
            <div className="min-w-0 flex-1 md:flex md:items-baseline md:gap-3">
              <h1 className="truncate text-base font-semibold text-white md:text-lg">
                数据查询
              </h1>
            </div>
          </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1240px] min-h-0 flex-1 flex-col gap-1.5 px-2 py-1 md:gap-2 md:px-6 md:py-2">
        <div className="flex shrink-0 items-center gap-2 md:gap-1.5">
          {TABS.map((tab: { key: TabKey; label: string }) => {
            const isActive: boolean = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex min-h-[38px] items-center rounded-[8px] border px-3 text-xs font-medium transition-colors md:min-h-0 md:rounded-md md:px-4 md:py-1.5 md:text-sm ${
                  isActive
                    ? 'border-rk-table-head bg-rk-table-head text-white'
                    : 'border-rk-line bg-white text-rk-ink hover:border-rk-blue'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
            <label
              className={`ml-auto flex min-w-0 items-center gap-1 md:gap-1.5 ${
                activeTab === 'monthly' ? '' : 'hidden'
              }`}
            >
              <span className="shrink-0 text-[11px] text-rk-ink md:text-xs">异常剔除</span>
              <select
                value={excludeMode}
                onChange={
                  (e: React.ChangeEvent<HTMLSelectElement>) =>
                    setExcludeMode(e.target.value)
                }
                className="max-w-[40vw] truncate rounded-[8px] border border-rk-line bg-white px-1.5 py-1 text-[11px] text-rk-ink outline-none focus:border-rk-blue md:max-w-none md:rounded-md md:px-2 md:text-xs"
              >
                  <option value="all">
                    {workshop === 'mfg'
                      ? '全部剔除（停机+试机/切机）'
                      : '全部剔除（停机+冷机未开+试机）'}
                  </option>
                  <option value="none">全部保留</option>
                  <option value="stopped">
                    {workshop === 'mfg'
                      ? '仅剔除停机'
                      : '仅剔除停机（含冷机未开）'}
                  </option>
                  <option value="trial">
                    {workshop === 'mfg' ? '仅剔除试机/切机' : '仅剔除试机'}
                  </option>
                </select>
            </label>
        </div>

        <RawDataErrorBoundary label="报表查询">
        <div
          className={`flex min-h-0 flex-1 flex-col gap-2 md:gap-2 ${
            activeTab === 'report' ? '' : 'hidden'
          }`}
        >
          <RawDataFilters
            startDate={report.startDate}
            onStartDateChange={report.setStartDate}
            endDate={report.endDate}
            onEndDateChange={report.setEndDate}
            startTime={report.startTime}
            onStartTimeChange={report.setStartTime}
            endTime={report.endTime}
            onEndTimeChange={report.setEndTime}
            granularity={report.granularity}
            onGranularityChange={report.setGranularity}
            customValue={report.customValue}
            onCustomValueChange={report.setCustomValue}
            customUnit={report.customUnit}
            onCustomUnitChange={report.setCustomUnit}
            granularityError={report.granularityError}
            loading={report.loading}
            onQuery={() => void report.query()}
          />

          <div className={CARD_CLS}>
            {report.error !== null ? (
              <div className="flex min-h-[120px] flex-1 items-center justify-center text-sm text-rk-danger">
                {report.error}
              </div>
            ) : reportPoints.length > 0 && report.result !== null ? (
              <>
                {report.result.truncated ? (
                  <p className="mb-2 shrink-0 rounded-md bg-[#FEF3C7] px-3 py-1.5 text-xs text-[#B45309] md:mb-1">
                    结果超过 5000 行已被截断，请缩小时间范围或改用更粗粒度查看完整数据
                  </p>
                ) : null}
                <RawDataTable points={reportPoints} />
              </>
            ) : (
              <div className="flex min-h-[120px] flex-1 items-center justify-center text-sm text-rk-ink-faint">
                {report.loading ? '查询中…' : report.result !== null ? '该时间段暂无归档数据，请调整时间范围' : '点击查询按钮获取数据'}
              </div>
            )}
            {reportPoints.length > 0 ? (
              <div className={BAR_CLS}>
                <span className="self-center text-[11px] text-rk-ink md:text-xs">
                  查询结果（共 {reportPoints.length} 行）
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className={EXPORT_BTN_CLS}
                  onClick={handleExportReport}
                >
                  <Download className="h-4 w-4" />
                  导出 CSV
                </Button>
              </div>
            ) : null}
          </div>
        </div>
        </RawDataErrorBoundary>

        <RawDataErrorBoundary label="月度报表">
        <div
          className={`flex min-h-0 flex-1 flex-col gap-2 md:gap-2 ${
            activeTab === 'monthly' ? '' : 'hidden'
          }`}
        >
          <MonthlyFilters
            years={monthly.years}
            year={monthly.year}
            onYearChange={monthly.setYear}
            month={monthly.month}
            onMonthChange={monthly.setMonth}
          />

          <div className={CARD_CLS}>
            {monthly.error !== null ? (
              <div className="flex min-h-[120px] flex-1 items-center justify-center text-sm text-rk-danger">
                {monthly.error}
              </div>
            ) : monthlyRows.length > 0 && monthly.result !== null ? (
              <MonthlyTable
                workshop={workshop}
                  mode={monthly.result.mode}
                rows={monthlyRows}
                  excludeKinds={excludeKinds}
                summary={
                  monthly.result.summary ?? {
                    coolUsage: null,
                    elecUsage: null,
                    cop: null,
                    totalDays: 0,
                  }
                }
              />
            ) : (
              <div className="flex min-h-[120px] flex-1 items-center justify-center text-sm text-rk-ink-faint">
                {monthly.loading ? '查询中…' : '所选条件下暂无数据'}
              </div>
            )}
            {monthlyRows.length > 0 ? (
              <div className={BAR_CLS}>
                <span className="self-center text-[11px] text-rk-ink md:text-xs">
                  查询结果（共 {monthlyRows.length} 行）
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className={EXPORT_BTN_CLS}
                  onClick={handleExportMonthly}
                >
                  <Download className="h-4 w-4" />
                  导出 CSV
                </Button>
              </div>
            ) : null}
          </div>
        </div>
        </RawDataErrorBoundary>
      </main>
    </div>
  );
};

export default RawDataPage;
