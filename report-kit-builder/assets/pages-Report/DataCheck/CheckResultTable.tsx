import React from 'react';
import type { CheckGranularity, DataCheckRow } from '@shared/api.interface';

const HEADERS: string[] = [
  '时间段',
  '表显冷量',
  'Excel冷量',
  '冷量差',
  '表显电量',
  'Excel电量',
  '电量差',
  '表显COP',
  'ExcelCOP',
];

export function formatCheckValue(v: number | null, digits: number): string {
  if (v === null) return '-';
  return v.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function diff(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null;
  return Number((a - b).toFixed(1));
}

export function checkRowToCsv(row: DataCheckRow): (string | number | null)[] {
  return [
    row.period,
    row.meterCool,
    row.excelCool,
    diff(row.meterCool, row.excelCool),
    row.meterElec,
    row.excelElec,
    diff(row.meterElec, row.excelElec),
    row.meterCop,
    row.excelCop,
  ];
}

export const CHECK_CSV_HEADERS: string[] = HEADERS;

interface CheckResultTableProps {
  granularity: CheckGranularity;
  rows: DataCheckRow[];
}

const CheckResultTable: React.FC<CheckResultTableProps> = ({
  granularity,
  rows,
}) => {
  return (
    <div>
      {granularity === 'minute' ? (
        <p className="mb-2 text-xs text-rk-ink-faint">
          分钟粒度展示 meter_reading 原始累计示数，无 COP 与 Excel 比对
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-[10px] border border-rk-line">
        <table className="w-full min-w-[960px] border-collapse">
          <thead>
            <tr className="bg-rk-table-head text-xs text-white">
              {HEADERS.map((h: string) => (
                <th
                  key={h}
                  className="whitespace-nowrap px-4 py-2.5 text-left font-medium"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: DataCheckRow) => {
              const coolDiff: number | null = diff(row.meterCool, row.excelCool);
              const elecDiff: number | null = diff(row.meterElec, row.excelElec);
              return (
                <tr key={row.period} className="odd:bg-rk-bg-faint">
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm text-rk-ink">
                    {row.period}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm tabular-nums text-rk-ink">
                    {formatCheckValue(row.meterCool, 1)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm tabular-nums text-rk-ink">
                    {formatCheckValue(row.excelCool, 1)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm tabular-nums text-rk-ink-soft">
                    {formatCheckValue(coolDiff, 1)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm tabular-nums text-rk-ink">
                    {formatCheckValue(row.meterElec, 1)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm tabular-nums text-rk-ink">
                    {formatCheckValue(row.excelElec, 1)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm tabular-nums text-rk-ink-soft">
                    {formatCheckValue(elecDiff, 1)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm tabular-nums text-rk-ink">
                    {formatCheckValue(row.meterCop, 2)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-sm tabular-nums text-rk-ink">
                    {formatCheckValue(row.excelCop, 2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-rk-ink-faint md:hidden">
        ← 左右滑动查看完整表格 →
      </p>
    </div>
  );
};

export default CheckResultTable;
