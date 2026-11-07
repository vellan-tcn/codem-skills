import React from 'react';
import type { SectionCardProps } from '@client/src/pages/Report/report-types';

const SectionCard: React.FC<SectionCardProps> = ({
  no,
  icon,
  title,
  subtitle,
  headerExtra,
  children,
}) => (
  <section className="flex min-h-0 flex-1 flex-col rounded-[14px] border border-rk-line bg-white shadow-[0_2px_12px_rgba(8_27_49_0.05)] md:h-full">
    <div className="flex min-h-[28px] w-full shrink-0 items-center gap-2 px-2.5 py-1 md:min-h-[40px] md:gap-2.5 md:px-4 md:py-1.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rk-bg-brand-soft text-[10px] font-semibold text-rk-brand md:h-7 md:w-7 md:text-xs">
        {no}
      </span>
      <span className="text-rk-brand">{icon}</span>
      <span className="text-[13px] font-medium text-rk-ink md:text-base">{title}</span>
      {subtitle ? (
        <span className="hidden text-xs text-rk-ink-soft sm:inline">
          {subtitle}
        </span>
      ) : null}
    {headerExtra ? (
        <div className="ml-auto shrink-0 md:hidden">{headerExtra}</div>
      ) : null}
    </div>
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col px-2.5 pb-2 md:px-4 md:pb-3.5">
        {children}
      </div>
    </div>
  </section>
);

export default SectionCard;
