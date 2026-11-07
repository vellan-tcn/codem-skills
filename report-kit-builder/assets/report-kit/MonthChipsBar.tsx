import React from 'react';
import type { MonthChipsBarProps, MonthChip } from '@client/src/pages/Report/report-types';

const MonthChipsBar: React.FC<MonthChipsBarProps> = ({
  chips,
  selected,
  onSelect,
}) => {
  if (chips.length === 0) return null;

  const chipClass = (chip: MonthChip, isSelected: boolean): string => {
    if (isSelected) return 'bg-rk-table-head text-white border-rk-table-head';
    if (!chip.enabled) {
      return 'bg-white text-[#C3CBD8] border-rk-line cursor-not-allowed';
    }
    return 'bg-white text-rk-ink border-rk-line hover:border-rk-blue';
  };

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 pt-2.5 md:px-6">
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip: MonthChip) => {
          const isSelected: boolean = chip.month === selected;
          return (
            <button
              key={chip.month}
              type="button"
              disabled={!chip.enabled}
              onClick={() => onSelect(chip.month)}
              className={`flex min-h-[34px] shrink-0 items-center rounded-full border px-3 text-[11px] tabular-nums transition-colors md:min-h-0 md:py-1.5 md:text-xs ${chipClass(chip, isSelected)}`}
            >
              {chip.month}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MonthChipsBar;
