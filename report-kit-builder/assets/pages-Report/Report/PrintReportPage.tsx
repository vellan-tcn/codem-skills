import React, { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Printer, Snowflake } from 'lucide-react';
import { useReportData } from '@client/src/hooks/useReportData';
import { formatThousands } from '@client/src/pages/Report/report-utils';
import type { MonthlyCopItem } from '@shared/api.interface';
import type { RawWorkshop } from '@client/src/api/raw-data';

/* ===== 常量（版式几何，与数据无关） ===== */
const VIEW_W = 1120;
const VIEW_H = 412;
const BASE_Y = 380; // 横轴基线
const BAR_MAX_H = 310; // 柱区最大高度
const COP_SPAN = 330; // COP 折线纵向跨度
const MONTH_SLOTS = 12; // 12 个月固定占位（未运行月份预留）
/** 试机期月份（工况标注规则：该月含试机天） */
const TRIAL_MONTHS = ['2026-03'];

interface MonthSlot {
  month: string; // 'YYYY-MM'
  label: string; // '1月'...'12月'
  data: MonthlyCopItem | null;
}

interface ChartGeom {
  coolX: number;
  elecX: number;
  centerX: number;
  coolY: number;
  coolH: number;
  elecY: number;
  elecH: number;
  copY: number | null;
  coolLabelY: number;
  copLabelY: number | null;
}

function monthStatus(item: MonthlyCopItem | null): string {
  if (item === null) return '待运行';
  if (item.coolKwh <= 0) return '停机';
  if (item.coolKwh < 100) return '冷机未开';
  if (TRIAL_MONTHS.includes(item.month)) return '含试机期';
  return '正常';
}

const PrintReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const workshopParam = searchParams.get('workshop');
  const workshop: RawWorkshop = workshopParam === 'mfg' ? 'mfg' : 'pei';
  const yearParam = searchParams.get('year');

  const report = useReportData(workshop, '');
  const displayYear: number = report.selectedYear ?? new Date().getFullYear();

  // query 指定年份时切换
  useEffect(() => {
    if (yearParam !== null && report.availableYears.includes(Number(yearParam))) {
      report.setSelectedYear(Number(yearParam));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearParam, report.availableYears.length]);

  // ===== 12 个月固定占位（数据缺失月份保留位置） =====
  const slots: MonthSlot[] = useMemo(() => {
    const map = new Map<string, MonthlyCopItem>();
    for (const m of report.yearMonthly) map.set(m.month, m);
    return Array.from({ length: MONTH_SLOTS }, (_v: unknown, i: number) => {
      const month = `${displayYear}-${String(i + 1).padStart(2, '0')}`;
      return { month, label: `${i + 1}月`, data: map.get(month) ?? null };
    });
  }, [report.yearMonthly, displayYear]);

  // ===== 图表几何：全部由当月数据实时计算（数据更新即自动更新） =====
  const { geoms, baseline, refY } = useMemo(() => {
    const maxCool = Math.max(1, ...slots.map((s: MonthSlot) => s.data?.coolKwh ?? 0));
    const maxElec = Math.max(1, ...slots.map((s: MonthSlot) => s.data?.elecKwh ?? 0));
    const maxCop = Math.max(0, ...slots.map((s: MonthSlot) => s.data?.cop ?? 0));
    const copAxis = Math.max(6.5, maxCop * 1.15); // COP 轴上限随数据自动扩展
    const copBaseline: number = workshop === 'mfg' ? 5.2 : 5.0;
    const referenceY = BASE_Y - (copBaseline / copAxis) * COP_SPAN;

    const slotW = VIEW_W / MONTH_SLOTS;
    const geoms: ChartGeom[] = slots.map((s: MonthSlot, i: number) => {
      const cool = s.data?.coolKwh ?? 0;
      const elec = s.data?.elecKwh ?? 0;
      const cop = s.data?.cop ?? null;
      const gx = i * slotW;
      const coolH = (cool / maxCool) * BAR_MAX_H;
      const elecH = (elec / maxElec) * BAR_MAX_H;
      const coolY = BASE_Y - coolH;
      // 短柱（贴基线）标签上抬一层，避免压住基线
      const coolLabelY = coolY > BASE_Y - 14 ? BASE_Y - 28 : coolY - 10;
      const copY = cop !== null && cool > 0 ? BASE_Y - (cop / copAxis) * COP_SPAN : null;
      // COP 标签默认在点上方；与冷量标签纵向贴近时移到点下方错开
      let copLabelY: number | null = null;
      if (copY !== null) {
        copLabelY = copY - 16;
        if (Math.abs(copLabelY - coolLabelY) < 24) copLabelY = copY + 28;
      }
      return {
        coolX: gx + 6,
        elecX: gx + 49,
        centerX: gx + slotW / 2,
        coolY,
        coolH,
        elecY: BASE_Y - elecH,
        elecH,
        copY,
        coolLabelY,
        copLabelY,
      };
    });
    return { geoms, baseline: copBaseline, refY: referenceY };
  }, [slots, workshop]);

  const summary = report.yearSummary;
  const maxMonth: string = report.dataRange?.maxMonth ?? '';
  const kpiCool: string | null = summary ? formatThousands(Math.round(summary.yearCoolKwh)) : null;
  const kpiElec: string | null = summary ? formatThousands(Math.round(summary.yearElecKwh)) : null;
  const workshopName: string = workshop === 'mfg' ? '制造车间' : '配料车间';

  const switchWorkshop = (w: RawWorkshop): void => {
    setSearchParams((prev: URLSearchParams) => {
      const next = new URLSearchParams(prev);
      next.set('workshop', w);
      return next;
    });
  };

  return (
    <div className="print-stage min-h-screen bg-[#E8ECF2] pb-10">
      {/* 屏显工具条（打印时隐藏） */}
      <div className="print-toolbar mx-auto mb-4 flex max-w-[1240px] flex-wrap items-center gap-3 rounded-[12px] border border-rk-line bg-white px-5 py-3 shadow-sm" style={{ marginTop: 16 }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 rounded-full border border-rk-line px-3 py-1.5 text-xs text-rk-ink hover:border-rk-blue"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回主页
        </button>
        {(['pei', 'mfg'] as RawWorkshop[]).map((w: RawWorkshop) => (
          <button
            key={w}
            type="button"
            onClick={() => switchWorkshop(w)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              workshop === w
                ? 'border-rk-table-head bg-rk-table-head text-white'
                : 'border-rk-line bg-white text-rk-ink hover:border-rk-blue'
            }`}
          >
            {w === 'pei' ? '配料车间' : '制造车间'}
          </button>
        ))}
        {report.availableYears.map((y: number) => (
          <button
            key={y}
            type="button"
            onClick={() => report.setSelectedYear(y)}
            className={`rounded-full border px-3 py-1.5 text-xs tabular-nums transition-colors ${
              displayYear === y
                ? 'border-rk-table-head bg-rk-table-head text-white'
                : 'border-rk-line bg-white text-rk-ink hover:border-rk-blue'
            }`}
          >
            {y}年
          </button>
        ))}
        <button
          type="button"
          onClick={() => window.print()}
          className="ml-auto flex items-center gap-1.5 rounded-full bg-rk-brand px-4 py-1.5 text-xs font-medium text-white hover:bg-[#1C5FC4]"
          aria-label="打印报告"
        >
          <Printer className="h-3.5 w-3.5" />
          打印 / 导出 PDF
        </button>
      </div>

      {report.error ? (
        <div className="mx-auto max-w-[1240px] rounded-[14px] border border-rk-danger/30 bg-rk-danger/5 p-4 text-sm text-rk-danger">
          {report.error}
        </div>
      ) : report.loading ? (
        <div className="mx-auto flex max-w-[1240px] items-center justify-center rounded-[14px] border border-rk-line bg-white p-16 text-sm text-rk-ink-soft" aria-busy="true">
          报告数据加载中，请稍候…
        </div>
      ) : (
        <div className="a4 mx-auto flex w-[1240px] flex-col overflow-hidden bg-white shadow-[0_6px_30px_rgba(8,27,49,0.18)]" style={{ height: 1754 }}>
          {/* 报告头 */}
          <div
            className="flex shrink-0 items-center gap-[22px] px-[56px] text-white"
            style={{ height: 158, backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(135deg, #081B31 0%, #123353 100%)', backgroundSize: '22px 22px' }}
          >
            <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-rk-teal to-rk-brand">
              <Snowflake className="h-[42px] w-[42px]" />
            </div>
            <div>
              <h1 className="text-[40px] font-bold tracking-[1px]">示例食品厂 · {workshopName}冷站运营报告</h1>
              <div className="mt-[10px] text-[17px] tracking-[0.5px] text-white/80">制冷系统能效运营分析 · COP 能效评估</div>
            </div>
            <div className="ml-auto text-right text-[15px] leading-[1.65] text-white/85">
              报告期间：<b className="font-semibold text-white">{displayYear} 年</b>
              <br />
              数据更新至：<b className="font-semibold text-white">{maxMonth || '—'}</b>
              <br />
              生成日期：<b className="font-semibold text-white">{new Date().toISOString().slice(0, 10)}</b>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-[26px] px-[56px] pt-[34px]">
            {/* KPI 行（平台 summary 同源数据） */}
            <div className="flex shrink-0 gap-5" style={{ height: 150 }}>
              <div className="flex flex-1 flex-col justify-center rounded-[16px] border border-rk-line bg-white px-[26px] py-4 shadow-[0_2px_10px_rgba(8,27,49,0.05)]">
                <div className="text-[15px] text-rk-ink-soft">全年冷量</div>
                <div className="mt-[10px] text-[34px] font-bold tabular-nums text-rk-brand">
                  {kpiCool ?? '—'}<span className="ml-1 text-[18px] font-medium text-rk-ink-soft">kW·h</span>
                </div>
                <div className="mt-[8px] text-[13.5px] text-rk-teal">{displayYear} 年累计</div>
              </div>
              <div className="flex flex-1 flex-col justify-center rounded-[16px] border border-rk-line bg-white px-[26px] py-4 shadow-[0_2px_10px_rgba(8,27,49,0.05)]">
                <div className="text-[15px] text-rk-ink-soft">全年电量</div>
                <div className="mt-[10px] text-[34px] font-bold tabular-nums text-rk-ink">
                  {kpiElec ?? '—'}<span className="ml-1 text-[18px] font-medium text-rk-ink-soft">kW·h</span>
                </div>
                <div className="mt-[8px] text-[13.5px] text-rk-teal">{displayYear} 年累计</div>
              </div>
              <div className="flex flex-1 flex-col justify-center rounded-[16px] border border-rk-line bg-white px-[26px] py-4 shadow-[0_2px_10px_rgba(8,27,49,0.05)]">
                <div className="text-[15px] text-rk-ink-soft">全年 COP</div>
                <div className="mt-[10px] text-[42px] font-bold tabular-nums text-[#0CA678]">
                  {summary ? summary.yearAvgCop.toFixed(1) : '—'}
                </div>
                <div className="mt-[8px] text-[13.5px] text-rk-teal">累计比口径</div>
              </div>
              <div className="flex flex-1 flex-col justify-center rounded-[16px] border border-rk-line bg-white px-[26px] py-4 shadow-[0_2px_10px_rgba(8,27,49,0.05)]">
                <div className="text-[15px] text-rk-ink-soft">数据更新至</div>
                <div className="mt-[10px] text-[34px] font-bold tabular-nums text-rk-ink">{maxMonth || '—'}</div>
                <div className="mt-[8px] text-[13.5px] text-rk-teal">示数链连续</div>
              </div>
            </div>

            {/* 主图表：柱高 / 折线 / 参考线 / 标签全部由当月数据计算 */}
            <div className="flex min-h-0 flex-1 flex-col rounded-[16px] border border-rk-line bg-white px-[28px] pb-[14px] pt-[24px] shadow-[0_2px_10px_rgba(8,27,49,0.05)]">
              <div className="mb-[6px] flex items-center gap-3">
                <span className="h-[26px] w-2 rounded bg-gradient-to-b from-rk-brand to-rk-teal" />
                <h2 className="text-[24px] font-semibold">月度冷量 / 电量 / COP 趋势</h2>
                <span className="ml-auto text-[14.5px] text-rk-ink-soft">柱：冷量·电量（kWh）· 线：COP（右轴）· 柱顶数字为月冷量</span>
              </div>
              <div className="mb-[6px] flex gap-[26px] text-[14.5px] text-rk-ink-soft">
                <span><i className="mr-[6px] inline-block h-[14px] w-[14px] rounded-[3px] align-[-2px] bg-[#3B82F6]" />月供冷量</span>
                <span><i className="mr-[6px] inline-block h-[14px] w-[14px] rounded-[3px] align-[-2px] bg-[#94A3B8]" />月用电量</span>
                <span><i className="mr-[6px] inline-block h-[14px] w-[14px] rounded-[3px] align-[-2px] bg-[#F59E0B]" />COP</span>
              </div>
              <div className="min-h-0 flex-1">
                <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" className="h-full w-full">
                  {/* 网格 */}
                  <g stroke="#EDF1F7" strokeWidth={1}>
                    {[1, 2, 3, 4].map((k: number) => (
                      <line key={k} x1={0} y1={BASE_Y - (k * BAR_MAX_H) / 4} x2={VIEW_W} y2={BASE_Y - (k * BAR_MAX_H) / 4} />
                    ))}
                  </g>
                  {/* 横轴基线 */}
                  <line x1={0} y1={BASE_Y} x2={VIEW_W} y2={BASE_Y} stroke="#CBD5E1" strokeWidth={1.5} />
                  {geoms.map((g: ChartGeom, i: number) => {
                    const slot = slots[i];
                    const running = slot.data !== null;
                    return running ? (
                      <g key={slot.month}>
                        <rect x={g.coolX} y={g.coolY} width={38} height={Math.max(2, g.coolH)} rx={4} fill="#3B82F6" fillOpacity={0.9} />
                        <rect x={g.elecX} y={g.elecY} width={38} height={Math.max(2, g.elecH)} rx={4} fill="#94A3B8" fillOpacity={0.55} />
                      </g>
                    ) : (
                      <g key={slot.month}>
                        <rect x={g.coolX} y={BASE_Y - 2} width={38} height={2} rx={2} fill="#CBD5E1" />
                        <text x={g.centerX} y={BASE_Y - 30} fontSize={13} fill="#B9C3CF" textAnchor="middle" fontFamily="sans-serif">待运行</text>
                      </g>
                    );
                  })}
                  {/* COP 折线 */}
                  <polyline
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth={4}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={geoms
                      .filter((_g: ChartGeom, i: number) => slots[i].data !== null && geoms[i].copY !== null)
                      .map((g: ChartGeom) => `${g.centerX},${g.copY}`)
                      .join(' ')}
                  />
                  {/* 冷量数据标签（横排、白底衬、由数据生成） */}
                  {geoms.map((g: ChartGeom, i: number) =>
                    slots[i].data !== null ? (
                      <text
                        key={`cl-${slots[i].month}`}
                        x={g.coolX + 19}
                        y={g.coolLabelY}
                        fontSize={12.5}
                        fill="#2563EB"
                        textAnchor="middle"
                        fontFamily="sans-serif"
                        fontWeight={600}
                        stroke="#fff"
                        strokeWidth={4}
                        style={{ paintOrder: 'stroke' }}
                      >
                        {formatThousands(Math.round(slots[i].data?.coolKwh ?? 0))}
                      </text>
                    ) : null,
                  )}
                  {/* COP 数据标签（防重叠错位由数据计算） */}
                  {geoms.map((g: ChartGeom, i: number) =>
                    g.copLabelY !== null && slots[i].data !== null ? (
                      <text
                        key={`cop-${slots[i].month}`}
                        x={g.centerX}
                        y={g.copLabelY}
                        fontSize={14}
                        fill="#B45309"
                        textAnchor="middle"
                        fontFamily="sans-serif"
                        fontWeight={700}
                        stroke="#fff"
                        strokeWidth={4}
                        style={{ paintOrder: 'stroke' }}
                      >
                        {(slots[i].data?.cop ?? 0).toFixed(2)}
                      </text>
                    ) : null,
                  )}
                  {/* COP 折线数据点 */}
                  {geoms.map((g: ChartGeom, i: number) =>
                    g.copY !== null && slots[i].data !== null ? (
                      <circle key={`pt-${slots[i].month}`} cx={g.centerX} cy={g.copY} r={7} fill="#F59E0B" stroke="#fff" strokeWidth={2} />
                    ) : null,
                  )}
                  {/* COP 参考线（与平台同源：配料 5.3 / 制造 5.4） */}
                  <line x1={0} y1={refY} x2={VIEW_W} y2={refY} stroke="#12B886" strokeWidth={2} strokeDasharray="8 6" opacity={0.55} />
                  <text x={VIEW_W - 8} y={refY - 9} fontSize={14} fill="#0CA678" textAnchor="end" fontFamily="sans-serif">
                    COP {baseline} 参考线（{workshop === 'mfg' ? '制造' : '配料'}）
                  </text>
                  {/* 月份标签（横轴基线下方，12 个月完整占位） */}
                  <g fontSize={15} fill="#64748B" textAnchor="middle" fontFamily="sans-serif">
                    {slots.map((s: MonthSlot, i: number) => (
                      <text key={`m-${s.month}`} x={geoms[i].centerX} y={VIEW_H - 8} fill={s.data !== null ? '#64748B' : '#B9C3CF'}>
                        {s.label}
                      </text>
                    ))}
                  </g>
                </svg>
              </div>
            </div>

            {/* 月度明细表（12 行完整预留 + 汇总） */}
            <div className="shrink-0 overflow-hidden rounded-[16px] border border-rk-line shadow-[0_2px_10px_rgba(8,27,49,0.05)]">
              <table className="w-full border-collapse text-[16px]">
                <thead>
                  <tr className="bg-[#F1F5FB] text-[#40536B]">
                    <th className="border-b border-rk-line px-2.5 py-[15px] text-[16.5px] font-semibold" style={{ width: '11%' }}>月份</th>
                    <th className="border-b border-rk-line px-2.5 py-[15px] text-[16.5px] font-semibold">冷量(kWh)</th>
                    <th className="border-b border-rk-line px-2.5 py-[15px] text-[16.5px] font-semibold">电量(kWh)</th>
                    <th className="border-b border-rk-line px-2.5 py-[15px] text-[16.5px] font-semibold">COP</th>
                    <th className="border-b border-rk-line px-2.5 py-[15px] text-[16.5px] font-semibold" style={{ width: '16%' }}>工况</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((s: MonthSlot) => {
                    const status = monthStatus(s.data);
                    const ok = status === '正常';
                    return (
                      <tr key={s.month} className={`border-b border-[#F0F3F8] ${s.data ? '' : 'bg-[#FAFCFE]'}`}>
                        <td className="px-2.5 py-[13px] text-center font-semibold text-rk-ink">{s.label}</td>
                        <td className="px-2.5 py-[13px] text-center tabular-nums">{s.data ? formatThousands(Math.round(s.data.coolKwh)) : '—'}</td>
                        <td className="px-2.5 py-[13px] text-center tabular-nums">{s.data ? formatThousands(Math.round(s.data.elecKwh)) : '—'}</td>
                        <td className={`px-2.5 py-[13px] text-center font-bold tabular-nums ${s.data && s.data.coolKwh > 0 ? 'text-rk-brand' : ''}`}>
                          {s.data && s.data.coolKwh > 0 ? s.data.cop.toFixed(2) : '—'}
                        </td>
                        <td className="px-2.5 py-[13px] text-center">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[12.5px] ${
                              ok ? 'bg-[#E6F7F1] text-[#0CA678]' : 'bg-rk-bg-soft text-[#8A97A8]'
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-[#C9D8EA] bg-[#E7F0FA] text-[17.5px] font-bold">
                    <td className="px-2.5 py-4 text-center text-rk-ink">期间汇总</td>
                    <td className="px-2.5 py-4 text-center tabular-nums">{kpiCool ?? '—'}</td>
                    <td className="px-2.5 py-4 text-center tabular-nums">{kpiElec ?? '—'}</td>
                    <td className="px-2.5 py-4 text-center font-bold tabular-nums text-rk-brand">
                      {summary ? summary.yearAvgCop.toFixed(1) : '—'}
                    </td>
                    <td className="px-2.5 py-4 text-center text-[#8A97A8]">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 页脚 */}
          <div className="mt-[24px] flex shrink-0 items-center justify-between bg-[#F7F9FC] px-[64px] text-[13.5px] text-[#8A97A8]" style={{ height: 56, borderTop: '1px solid #E6EAF1' }}>
            <span>数据来源：WinCC 归档 + 有人云平台（累计表示数差值法核算）</span>
            <span>示例食品厂冷站能效运营报告 · 自动生成</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintReportPage;
