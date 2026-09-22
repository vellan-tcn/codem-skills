import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import { useDataCheck } from '@client/src/pages/DataCheck/useDataCheck';
import CheckFilters from '@client/src/pages/DataCheck/CheckFilters';
import CheckResultTable, {
  CHECK_CSV_HEADERS,
  checkRowToCsv,
} from '@client/src/pages/DataCheck/CheckResultTable';
import { buildCsv, downloadCsv } from '@client/src/pages/Report/report-utils';
import type { DataCheckRow } from '@shared/api.interface';

const GRANULARITY_LABEL: Record<string, string> = {
  minute: '分钟',
  hour: '小时',
  day: '日',
  month: '月',
  year: '年',
};

const DataCheckPage: React.FC = () => {
  const state = useDataCheck();

  const handleExport = (): void => {
    if (state.rows === null || state.rows.length === 0) return;
    const csvRows: (string | number | null)[][] = state.rows.map(
      (r: DataCheckRow) => checkRowToCsv(r),
    );
    downloadCsv(
      `数据核对_${GRANULARITY_LABEL[state.granularity]}_${state.start.format('YYYYMMDD')}_${state.end.format('YYYYMMDD')}.csv`,
      buildCsv(CHECK_CSV_HEADERS, csvRows),
    );
  };

  return (
    <div className="min-h-screen">
      <header
        className="w-full"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), ' +
            'linear-gradient(135deg, #081B31 0%, #123353 100%)',
          backgroundSize: '22px 22px',
        }}
      >
        <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-4 md:gap-4 md:px-6 md:py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-rk-teal to-rk-brand md:h-[52px] md:w-[52px] md:rounded-[14px]">
            <ClipboardCheck className="h-5 w-5 text-white md:h-6 md:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-white md:text-lg">
              数据核对查询
            </h1>
            <p className="truncate text-xs text-white/60">
              现场 Excel 日报与表计示数比对 · 配料车间冷站
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1240px] flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
        <CheckFilters
          granularity={state.granularity}
          onGranularityChange={state.setGranularity}
          start={state.start}
          onStartChange={state.setStart}
          end={state.end}
          onEndChange={state.setEnd}
          loading={state.loading}
          onQuery={() => void state.query()}
          onExport={handleExport}
          canExport={state.rows !== null && state.rows.length > 0}
        />

        <div className="rounded-[14px] bg-white p-4 md:p-6">
          {state.error !== null ? (
            <p className="text-sm text-rk-danger">{state.error}</p>
          ) : null}
          {state.rows === null && state.error === null && !state.loading ? (
            <p className="text-sm text-rk-ink-soft">
              请选择时间范围与粒度后点击查询
            </p>
          ) : null}
          {state.rows !== null && state.rows.length === 0 ? (
            <p className="text-sm text-rk-ink-soft">所选条件下暂无数据</p>
          ) : null}
          {state.rows !== null && state.rows.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-rk-ink">
                  核对结果（共 {state.rows.length} 条）
                </span>
                <span className="text-xs text-rk-ink-faint">
                  空值以 - 显示；表显为示数差值增量，Excel 为日报数值
                </span>
              </div>
              <CheckResultTable
                granularity={state.granularity}
                rows={state.rows}
              />
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default DataCheckPage;
