import dayjs from 'dayjs';
import type { SensorSeries } from '@shared/api.interface';

export interface HistoryRow {
  /** 原始 ISO 时间戳 */
  ts: string;
  /** 与查询变量顺序对齐的取值，缺失为 null */
  values: (number | null)[];
}

export const PAGE_SIZE: number = 50;
export const CHART_MAX_ROWS: number = 1500;

/** 合并多变量序列为按时间升序的行 */
export function mergeSeries(
  series: SensorSeries[],
  varnames: string[],
): HistoryRow[] {
  const map: Map<string, (number | null)[]> = new Map();
  for (const s of series) {
    const idx: number = varnames.indexOf(s.varname);
    if (idx < 0) continue;
    for (const p of s.points) {
      const row: (number | null)[] = map.get(p.ts) ?? varnames.map(() => null);
      row[idx] = p.value;
      map.set(p.ts, row);
    }
  }
  return [...map.entries()]
    .sort((a: [string, (number | null)[]], b: [string, (number | null)[]]) =>
      a[0].localeCompare(b[0]),
    )
    .map(
      ([ts, values]: [string, (number | null)[]]): HistoryRow => ({ ts, values }),
    );
}

export function formatTs(ts: string, pattern: string): string {
  return dayjs(ts).format(pattern);
}

export function totalPages(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

/** 分页切片（page 从 1 开始） */
export function slicePage(rows: HistoryRow[], page: number): HistoryRow[] {
  const start: number = (page - 1) * PAGE_SIZE;
  return rows.slice(start, start + PAGE_SIZE);
}

/** 图表用抽样：行数超限时按步长取样 */
export function sampleRows(
  rows: HistoryRow[],
  max: number = CHART_MAX_ROWS,
): HistoryRow[] {
  if (rows.length <= max) return rows;
  const step: number = Math.ceil(rows.length / max);
  return rows.filter((_: HistoryRow, i: number) => i % step === 0);
}
