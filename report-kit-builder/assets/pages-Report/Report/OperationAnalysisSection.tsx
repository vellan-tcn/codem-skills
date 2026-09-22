import React, { useState } from 'react';
import { ChevronRight, LineChart } from 'lucide-react';
import type { RawWorkshop } from '@client/src/api/raw-data';

/** 运行分析入口：分析报告制作中，点击提示等待 */
const OperationAnalysisSection: React.FC<{ workshop: RawWorkshop }> = () => {
  const [notified, setNotified] = useState(false);

  const handleClick = (): void => {
    setNotified(true);
    window.setTimeout(() => setNotified(false), 3000);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-rk-brand px-4 py-2 text-white shadow-[0_2px_6px_rgba(31,111,235,0.3)] transition-colors md:h-full md:justify-start md:gap-3 md:rounded-[14px] md:border md:border-rk-line md:bg-white md:px-4 md:py-1 md:text-rk-ink md:shadow-none md:hover:border-rk-blue"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-rk-warn to-[#EF4444] md:h-7 md:w-7">
        <LineChart className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        {notified ? (
          <p className="text-[13px] font-semibold text-rk-warn md:text-sm md:font-medium">
            分析报告正在加急制作，请耐心等待
          </p>
        ) : (
          <>
            <p className="text-[13px] font-semibold text-white md:text-sm md:font-medium md:text-rk-ink">
              运行分析 · 查看分析报告
            </p>
            <p className="hidden truncate text-xs text-rk-ink-soft md:block">
              点击进入运行分析：月度报表、示数明细与异常数据剔除
            </p>
          </>
        )}
      </div>
      <ChevronRight
        className={`h-4 w-4 shrink-0 text-white/80 md:text-rk-ink-faint ${notified ? 'md:text-rk-warn' : ''}`}
      />
    </button>
  );
};

export default OperationAnalysisSection;
