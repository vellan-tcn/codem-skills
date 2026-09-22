import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import type { RawVariableItem } from '@shared/api.interface';
import { Checkbox } from '@client/src/components/ui/checkbox';
import { Input } from '@client/src/components/ui/input';

const MAX_TAGS = 10;

function optionLabel(v: RawVariableItem): string {
  const name: string = v.nameCn ?? '';
  const grp: string = v.grp !== null && v.grp !== '' ? `（${v.grp}）` : '';
  return `${v.tag} ${name}${grp}`.trim();
}

interface VariableMultiSelectProps {
  options: RawVariableItem[];
  selected: string[];
  onChange: (tags: string[]) => void;
}

const VariableMultiSelect: React.FC<VariableMultiSelectProps> = ({
  options,
  selected,
  onChange,
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (rootRef.current !== null && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered: RawVariableItem[] = useMemo(() => {
    const kw: string = keyword.trim().toLowerCase();
    if (kw === '') return options;
    return options.filter((v: RawVariableItem) =>
      optionLabel(v).toLowerCase().includes(kw),
    );
  }, [options, keyword]);

  const toggle = (tag: string, checked: boolean): void => {
    if (checked) {
      if (selected.length >= MAX_TAGS || selected.includes(tag)) return;
      onChange([...selected, tag]);
      return;
    }
    onChange(selected.filter((t: string) => t !== tag));
  };

  const optionMap: Map<string, RawVariableItem> = useMemo(
    () => new Map(options.map((v: RawVariableItem): [string, RawVariableItem] => [v.tag, v])),
    [options],
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v: boolean) => !v)}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-md border border-rk-line bg-white px-3 text-sm text-rk-ink"
        aria-expanded={open}
      >
        <span className="truncate">
          {selected.length === 0
            ? '请选择变量'
            : `已选 ${selected.length} 个变量`}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-rk-ink-soft transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {selected.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((tag: string) => {
            const item: RawVariableItem | undefined = optionMap.get(tag);
            return (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-rk-bg-brand-soft px-2 py-0.5 text-xs text-rk-brand"
              >
                <span className="max-w-[180px] truncate">
                  {item !== undefined ? optionLabel(item) : tag}
                </span>
                <button
                  type="button"
                  aria-label={`移除 ${tag}`}
                  className="shrink-0"
                  onClick={() => toggle(tag, false)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      ) : null}

      {open ? (
        <div className="absolute z-20 mt-1 w-full rounded-[10px] border border-rk-line bg-white p-2 shadow-lg">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-rk-ink-faint" />
            <Input
              value={keyword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setKeyword(e.target.value)
              }
              placeholder="搜索 tag / 中文名 / 分组"
              className="pl-8"
            />
          </div>
          <p className="px-1 py-1.5 text-xs text-rk-ink-faint">
            最多同时选 {MAX_TAGS} 个
          </p>
          <div className="max-h-[280px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-sm text-rk-ink-soft">无匹配变量</p>
            ) : null}
            {filtered.map((v: RawVariableItem) => {
              const isChecked: boolean = selected.includes(v.tag);
              const isDisabled: boolean =
                !isChecked && selected.length >= MAX_TAGS;
              return (
                <label
                  key={v.tag}
                  className={`flex min-h-[40px] items-center gap-2 rounded-md px-2 text-sm text-rk-ink hover:bg-rk-bg-faint ${isDisabled ? 'opacity-40' : ''}`}
                >
                  <Checkbox
                    checked={isChecked}
                    disabled={isDisabled}
                    onCheckedChange={(checked: boolean | 'indeterminate') =>
                      toggle(v.tag, checked === true)
                    }
                  />
                  <span className="truncate">{optionLabel(v)}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default VariableMultiSelect;
