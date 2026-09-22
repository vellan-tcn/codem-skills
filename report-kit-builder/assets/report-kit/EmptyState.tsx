import React from 'react';

export interface EmptyStateProps {
  /** 主提示文案，如「暂无数据」 */
  title?: string;
  /** 次级说明，如「请选择月份后再查询」 */
  description?: string;
}

/** 空数据占位：查询无结果/未选条件时使用，不显示 0（原始数据红线） */
const EmptyState: React.FC<EmptyStateProps> = ({
  title = '暂无数据',
  description,
}) => (
  <div className="flex min-h-[160px] flex-1 flex-col items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-rk-line bg-white px-4 py-8">
    <svg
      viewBox="0 0 48 48"
      className="h-9 w-9 text-rk-ink-soft/50"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="7" y="13" width="34" height="24" rx="3" />
      <path d="M7 21h34M17 13v-3a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3" />
    </svg>
    <p className="text-[13px] font-medium text-rk-ink-soft md:text-sm">{title}</p>
    {description ? (
      <p className="text-xs text-rk-ink-soft/70 md:text-[13px]">{description}</p>
    ) : null}
  </div>
);

export default EmptyState;
