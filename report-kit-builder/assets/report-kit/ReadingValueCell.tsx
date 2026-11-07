import React, { useEffect, useRef, useState } from 'react';

interface ReadingValueProps {
  value: number | null;
  ts: string | null;
  formatter: (v: number) => string;
}

const TOOLTIP_CLASS: string =
  'pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-rk-ink/95 px-2.5 py-1 text-xs font-normal normal-case text-white shadow-lg transition-opacity duration-150';

export const ReadingValue: React.FC<ReadingValueProps> = ({
  value,
  ts,
  formatter,
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

  if (value === null) return <>-</>;
  if (ts === null) return <>{formatter(value)}</>;

  return (
    <span
      ref={anchorRef}
      className="group relative inline-block"
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((prev: boolean) => !prev)}
        className="cursor-pointer border-b border-dashed border-rk-ink-faint pb-px hover:border-rk-blue hover:text-rk-brand"
      >
        {formatter(value)}
      </button>
      <div
        role="tooltip"
        className={`${TOOLTIP_CLASS} ${
          open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-rk-ink/95" />
        {ts}
      </div>
    </span>
  );
};

interface ReadingValueCellProps extends ReadingValueProps {
  tdClass: string;
}

const ReadingValueCell: React.FC<ReadingValueCellProps> = ({
  tdClass,
  value,
  ts,
  formatter,
}) => (
  <td className={tdClass}>
    <ReadingValue value={value} ts={ts} formatter={formatter} />
  </td>
);

export default ReadingValueCell;
