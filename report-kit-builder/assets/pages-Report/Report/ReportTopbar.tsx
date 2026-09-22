import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, Snowflake } from 'lucide-react';
import type { ReportTopbarProps } from '@client/src/pages/Report/report-types';
import type { RawWorkshop } from '@client/src/api/raw-data';

const ReportTopbar: React.FC<ReportTopbarProps> = ({
  freshness,
  workshop = 'pei',
  onWorkshopChange,
}) => {
  const navigate = useNavigate();
  const handlePrint = (): void => {
    navigate(`/print-report?workshop=${workshop}`);
  };

  return (
    <header
      className="w-full"
      style={{
        backgroundImage:
          'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), ' +
          'linear-gradient(135deg, #081B31 0%, #123353 100%)',
        backgroundSize: '22px 22px',
      }}
    >
      <div className="relative mx-auto flex max-w-[1240px] flex-wrap items-center gap-2 px-3 py-1.5 md:gap-3 md:px-6 md:py-1">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-rk-teal to-rk-brand md:h-8 md:w-8 md:rounded-[10px]">
          <Snowflake className="h-5 w-5 text-white md:h-6 md:w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[13px] font-semibold text-white md:text-lg">
            {workshop === 'mfg' ? '示例食品厂·制造车间冷站运营报告' : '示例食品厂·配料车间冷站运营报告'}
          </h1>

        </div>
        <div className="ml-auto flex items-center gap-2 md:gap-3">
            <span className="flex items-center gap-1.5">
              {(['pei', 'mfg'] as RawWorkshop[]).map((w: RawWorkshop) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => onWorkshopChange(w)}
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] transition-colors md:px-2.5 ${
                    workshop === w
                      ? 'border-rk-teal bg-rk-teal/20 font-medium text-white'
                      : 'border-white/25 text-white/70 hover:text-white'
                  }`}
                >
                  {w === 'pei' ? (
                    <>
                      <span className="md:hidden">配料</span>
                      <span className="hidden md:inline">配料车间</span>
                    </>
                  ) : (
                    <>
                      <span className="md:hidden">制造</span>
                      <span className="hidden md:inline">制造车间</span>
                    </>
                  )}
                </button>
              ))}
            </span>
          <span className="hidden items-center gap-2 sm:flex">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-rk-teal" />
            <span className="whitespace-nowrap text-xs text-white/85">
              {freshness ?? '数据加载中'}
            </span>
          </span>
          <button
            type="button"
            onClick={handlePrint}
            className="hidden min-h-[36px] min-w-[36px] shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/20 px-2 text-xs text-white hover:bg-white/10 md:flex md:min-h-0 md:min-w-0 md:px-3 md:py-1"
            aria-label="打印"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden md:inline">打印</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default ReportTopbar;
