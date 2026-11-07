import React from 'react';
import { FileText } from 'lucide-react';
import type { DataNotesSectionProps } from '@client/src/pages/Report/report-types';
import SectionCard from '@client/src/components/report-kit/SectionCard';

interface NoteDef {
  color: string;
  text: string;
}

const NOTES: NoteDef[] = [
  {
    color: '#F59F0B',
    text: '数据缺口：2025-11 ~ 2026-01-10 部分电量数据存在；2026-01-11 ~ 2026-06-23 归档空窗，无任何数据。',
  },
  {
    color: '#1F6FEB',
    text: '数据为小时级聚合，来源 WinCC；不同变量覆盖时段不同，图中空隙为正常现象。',
  },
  {
    color: '#0E9F6E',
    text: '月度 COP = 当月冷冻累计冷量增量 ÷ 当月总累计用电量增量。',
  },
];

const DataNotesSection: React.FC<DataNotesSectionProps> = () => (
  <SectionCard no="08" icon={<FileText className="h-4 w-4" />} title="数据说明">
    <div className="rounded-[10px] bg-rk-bg-soft p-4 pb-6">
      <ul className="space-y-2 text-sm text-rk-ink">
        {NOTES.map((note: NoteDef) => (
          <li key={note.color} className="flex items-start gap-2">
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: note.color }}
            />
            <span>{note.text}</span>
          </li>
        ))}
      </ul>
    </div>
  </SectionCard>
);

export default DataNotesSection;
