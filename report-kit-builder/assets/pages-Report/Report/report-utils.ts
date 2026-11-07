import dayjs from 'dayjs';
import type { SensorPoint } from '@shared/api.interface';
import type { DailySeries, MonthChip } from '@client/src/pages/Report/report-types';

export function monthBounds(month: string): { start: string; end: string } {
  const [yearStr, monthStr] = month.split('-');
  const year: number = Number(yearStr);
  const monthIndex: number = Number(monthStr) - 1;
  const lastDay: number = new Date(year, monthIndex + 1, 0).getDate();
  return {
    start: `${month}-01T00:00:00+08:00`,
    end: `${month}-${String(lastDay).padStart(2, '0')}T23:59:59+08:00`,
  };
}

export function buildMonthChips(dataMonths: string[]): MonthChip[] {
  const sorted: string[] = [...dataMonths].sort();
  if (sorted.length === 0) return [];
  const set: Set<string> = new Set(sorted);
  const chips: MonthChip[] = [];
  let cursor: dayjs.Dayjs = dayjs(`${sorted[0]}-01`);
  const last: dayjs.Dayjs = dayjs(`${sorted[sorted.length - 1]}-01`);
  while (cursor.isBefore(last) || cursor.isSame(last, 'month')) {
    const key: string = cursor.format('YYYY-MM');
    chips.push({ month: key, enabled: set.has(key) });
    cursor = cursor.add(1, 'month');
  }
  return chips;
}

export function pickVariable(
  variables: string[],
  includes: string[],
  excludes: string[] = [],
): string | null {
  const found: string | undefined = variables.find(
    (name: string) =>
      includes.every((kw: string) => name.includes(kw)) &&
      excludes.every((kw: string) => !name.includes(kw)),
  );
  return found ?? null;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum: number = values.reduce((acc: number, v: number) => acc + v, 0);
  return sum / values.length;
}

export function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

export function shortDateLabel(date: string): string {
  const parts: string[] = date.split('-');
  if (parts.length !== 3) return date;
  return `${Number(parts[1])}/${Number(parts[2])}`;
}

export function shortNumberLabel(value: number): string {
  const abs: number = Math.abs(value);
  if (abs >= 1000000) return `${Number((value / 1000000).toFixed(1))}M`;
  if (abs >= 1000) return `${Number((value / 1000).toFixed(1))}k`;
  return `${value}`;
}

export function aggregateDaily(
  points: SensorPoint[],
): Map<string, number> {
  const bucket: Map<string, { sum: number; count: number }> = new Map();
  for (const point of points) {
    const date: string = dayjs(point.ts).format('YYYY-MM-DD');
    const current = bucket.get(date) ?? { sum: 0, count: 0 };
    current.sum += point.value;
    current.count += 1;
    bucket.set(date, current);
  }
  const result: Map<string, number> = new Map();
  bucket.forEach((v: { sum: number; count: number }, date: string) => {
    result.set(date, v.sum / v.count);
  });
  return result;
}

export function mergeDaily(
  tempDaily: Map<string, number> | null,
  scopDaily: Map<string, number> | null,
): DailySeries {
  const dates: Set<string> = new Set();
  tempDaily?.forEach((_v: number, d: string) => dates.add(d));
  scopDaily?.forEach((_v: number, d: string) => dates.add(d));
  const sorted: string[] = [...dates].sort();
  return {
    dates: sorted,
    temp: sorted.map((d: string) => tempDaily?.get(d) ?? null),
    scop: sorted.map((d: string) => scopDaily?.get(d) ?? null),
  };
}

export function formatThousands(value: number, digits: number = 0): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatEnergy(kwh: number): { text: string; unit: string } {
  if (Math.abs(kwh) >= 10000) {
    return { text: (kwh / 10000).toFixed(1), unit: '万kWh' };
  }
  return { text: formatThousands(kwh), unit: 'kWh' };
}

export function buildCsv(
  headers: string[],
  rows: (string | number | null)[][],
): string {
  const escape = (cell: string | number | null): string => {
    const text: string = cell === null ? '' : String(cell);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines: string[] = [headers.map(escape).join(',')];
  for (const row of rows) {
    lines.push(row.map(escape).join(','));
  }
  return `\uFEFF${lines.join('\n')}`;
}

export function downloadCsv(filename: string, content: string): void {
  const blob: Blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url: string = URL.createObjectURL(blob);
  const link: HTMLAnchorElement = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
