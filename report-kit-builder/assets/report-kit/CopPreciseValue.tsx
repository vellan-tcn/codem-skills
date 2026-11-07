import React, { useEffect, useRef, useState } from 'react';

interface CopPreciseValueProps {
  /** 卡片正常显示的值（如 5.1） */
  display: string;
  /** 悬浮/点按显示的精确值（如 5.108）；null 时纯展示、不启用交互 */
  precise: string | null;
}

const TOOLTIP_CLASS: string =
  'pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-rk-ink/95 px-2.5 py-1 text-xs font-normal normal-case text-white shadow-lg transition-opacity duration-150';

/** COP 数值精确值提示：PC 悬停 / 移动端点按弹出深色气泡（自定义 tooltip，非原生 title） */
export const CopPreciseValue: React.FC<CopPreciseValueProps> = ({
  display,
  precise,
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const anchorRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent): void => {
      if (
        anchorRef.current !== null &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);

  if (precise === null) return <>{display}</>;

  return (
    <span
      ref={anchorRef}
      className="group relative inline-block"
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((prev: boolean) => !prev)}
        className="cursor-pointer border-b border-dashed border-rk-ink-faint pb-px font-[inherit] hover:border-rk-blue"
      >
        {display}
      </button>
      <div
        role="tooltip"
        className={`${TOOLTIP_CLASS} ${
          open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-rk-ink/95" />
        精确值&nbsp;{precise}
      </div>
    </span>
  );
};

export default CopPreciseValue;
