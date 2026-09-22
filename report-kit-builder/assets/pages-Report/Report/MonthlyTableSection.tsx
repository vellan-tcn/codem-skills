import React from 'react';
import { Table2 } from 'lucide-react';
import type { MonthlyCopItem } from '@shared/api.interface';
import type { MonthlyTableSectionProps } from '@client/src/pages/Report/report-types';
import SectionCard from '@client/src/components/report-kit/SectionCard';
import { formatThousands } from '@client/src/pages/Report/report-utils';

interface RowData {
  label: string;
  month: string;
  item: MonthlyCopItem | null;
}

interface TagDef {
  text: string;
  cls: string;
}

const ARCHIVE_START: string = '2025-11';
const ARCHIVE_END: string = '2026-06';
const HEADERS: string[] = ['月份', '冷量(kWh)', '电量(kWh)', 'COP', '数据完整度'];

function completenessTag(month: string, hasData: boolean): TagDef {
  if (month >= ARCHIVE_START && month <= ARCHIVE_END) {
    return { text: '归档缺失', cls: 'bg-[#FDF0D5] text-[#B45309]' };
  }
  if (hasData) {
    return { text: '完整', cls: 'bg-[#E3F6EF] text-rk-success' };
  }
  return { text: '无数据', cls: 'bg-rk-bg-soft text-rk-ink-faint' };
}

const MonthlyTableSection: React.FC<MonthlyTableSectionProps> = ({ year, monthly }) => {
  const rows: RowData[] = Array.from(
    { length: 12 },
    (_: unknown, i: number): RowData => {
      const month: string = `${year}-${String(i + 1).padStart(2, '0')}`;
      const item: MonthlyCopItem | null =
        monthly.find((m: MonthlyCopItem) => m.month === month) ?? null;
      return { label: `${i + 1}月`, month, item };
    },
  );

  return (
    <SectionCard
      no="06"
      icon={<Table2 className="h-4 w-4" />}
      title="月度汇总表"
      subtitle={`${year} 年`}
    >
      <div className="overflow-x-auto rounded-[10px] border border-rk-line">
        <table className="w-full border-collapse">
            <thead>
              <tr className="bg-rk-table-head text-xs text-white">
                {HEADERS.map((h: string) => (
                  <th key={h} className="whitespace-nowrap px-2 py-1.5 text-[11px] text-left font-medium md:px-4 md:py-2.5 md:text-xs">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row: RowData, idx: number) => {
                const tag: TagDef = completenessTag(row.month, row.item !== null);
                return (
                  <tr
                    key={row.month}
                    className={idx % 2 === 0 ? 'bg-rk-bg-faint' : 'bg-white'}
                  >
                    <td className="whitespace-nowrap px-2 py-1.5 text-[11px] text-rk-ink md:px-4 md:py-2.5 md:text-xs md:text-sm">{row.label}</td>
                    {row.item !== null ? (
                      <>
                        <td className="whitespace-nowrap px-2 py-1.5 text-[11px] tabular-nums text-rk-ink md:px-4 md:py-2.5 md:text-xs md:text-sm">
                          {formatThousands(row.item.coolKwh)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-[11px] tabular-nums text-rk-ink md:px-4 md:py-2.5 md:text-xs md:text-sm">
                          {formatThousands(row.item.elecKwh)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-[11px] tabular-nums text-rk-ink md:px-4 md:py-2.5 md:text-xs md:text-sm">
                          {row.item.cop.toFixed(1)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-1.5 text-[11px] text-rk-ink-faint md:px-4 md:py-2.5 md:text-xs md:text-sm">无数据</td>
                        <td className="px-2 py-1.5 text-[11px] text-rk-ink-faint md:px-4 md:py-2.5 md:text-xs md:text-sm">无数据</td>
                        <td className="px-2 py-1.5 text-[11px] text-rk-ink-faint md:px-4 md:py-2.5 md:text-xs md:text-sm">无数据</td>
                      </>
                    )}
                    <td className="px-2 py-1.5 md:px-4 md:py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${tag.cls}`}
                      >
                        {tag.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
      </div>
      <p className="mt-2 hidden text-xs text-rk-ink-faint md:hidden">← 左右滑动查看完整表格 →</p>
    </SectionCard>
  );
};

export default MonthlyTableSection;
