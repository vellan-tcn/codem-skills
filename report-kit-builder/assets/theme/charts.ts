/**
 * report-kit 图表统一配置（echarts）
 * =====================================
 * 复用说明：所有 echarts 图表必须经本文件封装创建/取默认配置，
 * 保证跨项目图形元素（色板、轴线、tooltip、日期时间戳小字）完全一致。
 * 色值与 theme/tokens.css 联动（改令牌时同步改这里）。
 *
 * 红线（保留清单）：
 *   - 报表查询图表数据点下方必须有「日期+时间」浅色小字标签（dateTickLabel）。
 */

/** 统一色板（与 tokens.css 的 rk-* 系列对应） */
export const CHART_PALETTE = {
  brand: '#1F6FEB', // rk-brand 主蓝
  blue: '#2F7FE0', // rk-blue 次蓝
  teal: '#12B886', // rk-teal 能效绿
  success: '#0E9F6E',
  warn: '#F59F0B',
  danger: '#DC2626',
  ink: '#15263B', // 主文字
  inkSoft: '#64748B', // 次级文字
  inkFaint: '#9AA5B5', // 时间戳浅色小字
  line: '#E6EAF1', // 分隔线
  splitLine: '#EDF1F4', // 网格线
  bgBrandSoft: '#E9F1FD', // 区域填充浅蓝
  tableHead: '#0B2440',
} as const;

/** 线/柱系列默认取色顺序 */
export const SERIES_COLORS = [
  CHART_PALETTE.brand,
  CHART_PALETTE.teal,
  CHART_PALETTE.warn,
  CHART_PALETTE.danger,
  CHART_PALETTE.blue,
] as const;

/**
 * 既有图表系列色（保持线上现有视觉，勿改动数值；
 * 新图表优先使用 SERIES_COLORS / CHART_PALETTE）
 */
export const COP_BAR_COLOR = '#2e6ff2'; // 月度 COP 柱状图
export const TREND_SERIES_COLORS = [
  '#3370ff',
  '#f5483b',
  '#ff8800',
  '#34c724',
  '#8d4eda',
] as const; // 趋势曲线多系列

/** 坐标轴默认样式（文字次级色、轴线浅、网格更浅） */
export const axisDefaults = {
  axisLine: { lineStyle: { color: CHART_PALETTE.line } },
  axisTick: { show: false },
  axisLabel: { color: CHART_PALETTE.inkSoft, fontSize: 11 },
  splitLine: { lineStyle: { color: CHART_PALETTE.splitLine } },
};

/** tooltip 默认样式（深色底白字，与本站气泡一致） */
export const tooltipDefaults = {
  backgroundColor: 'rgba(21, 38, 59, 0.95)',
  borderWidth: 0,
  textStyle: { color: '#fff', fontSize: 12 },
  extraCssText: 'border-radius: 6px; box-shadow: 0 4px 12px rgba(21,38,59,.2);',
};

/**
 * 数据点下方「日期+时间」浅色小字 label（保留清单第 1 条，任何改版不得丢失）。
 * 用法：series/axisLabel 处 spread 该对象，formatter 用 dateTickText()。
 */
export const dateTickLabel = {
  color: CHART_PALETTE.inkFaint,
  fontSize: 10,
  lineHeight: 14,
};

/** 时间戳格式化：MM-DD HH:mm（数据点下方小字） */
export const dateTickText = (iso: string | number | Date): string => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** 折线/柱图通用默认 option 片段（拼装用） */
export const baseGrid = { left: 8, right: 12, top: 24, bottom: 28, containLabel: true };
