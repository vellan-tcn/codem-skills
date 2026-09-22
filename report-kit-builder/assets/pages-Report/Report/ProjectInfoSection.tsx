import React from 'react';
import { Info } from 'lucide-react';
import SectionCard from '@client/src/components/report-kit/SectionCard';
import type { ProjectInfoSectionProps } from '@client/src/pages/Report/report-types';

interface InfoItem {
  label: string;
  value: string;
  nowrap?: boolean;
}

const ProjectInfoSection: React.FC<ProjectInfoSectionProps> = ({
  variableCount,
  dataRange,
  workshop = 'pei',
}) => {
  const items: InfoItem[] = [
    {
      label: '项目名称',
      value: workshop === 'mfg' ? '示例食品厂 · 制造车间冷站' : '示例食品厂 · 配料车间冷站',
    },
    {
      label: '数据范围',
      value: dataRange
        ? `${dataRange.minMonth} ~ ${dataRange.maxMonth}`
        : '暂无数据',
      nowrap: true,
    },
  ];

  return (
    <SectionCard no="01" icon={<Info className="h-4 w-4" />} title="项目信息">
      <div className="grid flex-1 grid-cols-1 auto-rows-fr gap-2 sm:grid-cols-2 md:grid-cols-2">
        {items.map((item: InfoItem) => (
          <div key={item.label} className="flex min-w-0 flex-col justify-center rounded-[10px] bg-rk-bg-soft px-3 py-2.5 md:py-2">
            <div className="text-xs text-rk-ink-soft">{item.label}</div>
            <div
              className={`mt-1 text-sm font-medium text-rk-ink ${
                item.nowrap ? 'whitespace-nowrap' : 'break-words'
              }`}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
};

export default ProjectInfoSection;
