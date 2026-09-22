import React, { useEffect, useState } from 'react';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';

export const PAGE_SIZE_OPTIONS: number[] = [10, 20, 50, 100];

export type PageItem = number | 'prev-gap' | 'next-gap';

export function buildPageItems(current: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_: unknown, i: number) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, 6, 'next-gap', totalPages];
  }
  if (current >= totalPages - 3) {
    return [
      1,
      'prev-gap',
      totalPages - 5,
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }
  return [
    1,
    'prev-gap',
    current - 2,
    current - 1,
    current,
    current + 1,
    current + 2,
    'next-gap',
    totalPages,
  ];
}

const BAR_CLS: string =
  'mt-2 flex shrink-0 flex-nowrap items-center justify-end gap-1.5 overflow-x-auto md:mt-2 md:gap-2';
const NAV_BTN_CLS: string =
  'flex h-8 items-center justify-center rounded-md border border-rk-line bg-white px-2 text-xs text-rk-ink transition-colors hover:border-rk-blue disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-rk-line md:text-sm';
const PAGE_BTN_CLS: string =
  'flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm tabular-nums transition-colors md:h-8 md:min-w-8 md:px-1.5';
const PAGE_BTN_IDLE: string =
  'border-rk-line bg-white text-rk-ink hover:border-rk-blue hover:bg-rk-bg-soft';
const PAGE_BTN_ACTIVE: string = 'border-rk-table-head bg-rk-table-head text-white';

export interface PaginationBarProps {
  total: number;
  page: number;
  pageSize: number;
  onChange: (page: number, pageSize: number) => void;
}

const PaginationBar: React.FC<PaginationBarProps> = ({
  total,
  page,
  pageSize,
  onChange,
}) => {
  const totalPages: number = Math.max(1, Math.ceil(total / pageSize));
  const current: number = Math.min(Math.max(1, page), totalPages);
  const [jumpText, setJumpText] = useState<string>(String(current));
  const items: PageItem[] = buildPageItems(current, totalPages);

  useEffect(() => {
    setJumpText(String(current));
  }, [current]);

  const applyJump = (): void => {
    const target: number = Number(jumpText);
    if (
      jumpText.trim() !== '' &&
      Number.isInteger(target) &&
      target >= 1 &&
      target <= totalPages
    ) {
      setJumpText(String(target));
      onChange(target, pageSize);
    } else {
      setJumpText(String(current));
    }
  };

  return (
    <div className={BAR_CLS}>
      <span className="shrink-0 text-xs tabular-nums text-rk-ink-soft">
        共 {total} 条
      </span>
      <Select
        value={String(pageSize)}
        onValueChange={(v: string) => onChange(1, Number(v))}
      >
        <SelectTrigger className="h-8 w-auto shrink-0 gap-1 text-xs md:h-8 md:w-[104px] md:text-sm">
          <SelectValue placeholder="每页条数" />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZE_OPTIONS.map((size: number) => (
            <SelectItem key={size} value={String(size)}>
              {size}条/页
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        type="button"
        className={NAV_BTN_CLS}
        onClick={() => onChange(Math.max(1, current - 1), pageSize)}
        disabled={current <= 1}
        aria-label="上一页"
      >
        上一页
      </button>
      <span className="shrink-0 text-xs tabular-nums text-rk-ink-soft md:hidden">
        第 {current}/{totalPages} 页
      </span>
      <div className="hidden items-center gap-1 md:flex md:gap-0.5">
        {items.map((item: PageItem) => {
          if (item === 'prev-gap' || item === 'next-gap') {
            const isPrev: boolean = item === 'prev-gap';
            const target: number = isPrev
              ? Math.max(1, current - 5)
              : Math.min(totalPages, current + 5);
            return (
              <button
                key={item}
                type="button"
                onClick={() => onChange(target, pageSize)}
                aria-label={isPrev ? '向前跳5页' : '向后跳5页'}
                className="group flex h-9 min-w-9 items-center justify-center rounded-md text-sm text-rk-ink-faint transition-colors hover:bg-rk-bg-soft hover:text-rk-ink md:h-8 md:min-w-8"
              >
                <span className="group-hover:hidden">...</span>
                {isPrev ? (
                  <ChevronsLeft className="hidden h-4 w-4 group-hover:block" />
                ) : (
                  <ChevronsRight className="hidden h-4 w-4 group-hover:block" />
                )}
              </button>
            );
          }
          return (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item, pageSize)}
              className={`${PAGE_BTN_CLS} ${
                item === current ? PAGE_BTN_ACTIVE : PAGE_BTN_IDLE
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className={NAV_BTN_CLS}
        onClick={() => onChange(Math.min(totalPages, current + 1), pageSize)}
        disabled={current >= totalPages}
        aria-label="下一页"
      >
        下一页
      </button>
      <div className="hidden shrink-0 items-center gap-1 text-xs text-rk-ink-soft md:flex md:ml-1">
        <span>前往</span>
        <input
          type="text"
          inputMode="numeric"
          value={jumpText}
          aria-label="跳转页码"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setJumpText(e.target.value)
          }
          onFocus={(e: React.FocusEvent<HTMLInputElement>) =>
            e.target.select()
          }
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') applyJump();
          }}
          onBlur={applyJump}
          className="h-9 w-12 rounded-md border border-rk-line bg-white px-1 text-center text-sm tabular-nums text-rk-ink outline-none focus:border-rk-blue md:h-8"
        />
        <span>页</span>
      </div>
    </div>
  );
};

export default PaginationBar;
