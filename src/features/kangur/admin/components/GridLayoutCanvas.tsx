import React from 'react';

import type { KangurLessonGridItem } from '@/shared/contracts/kangur';
import { cn } from '@/shared/utils';

// Distinct pastel colours for up to 8 items (cycles if more).
const ITEM_COLORS = [
  'bg-sky-400/30 border-sky-400/60 text-sky-200',
  'bg-violet-400/30 border-violet-400/60 text-violet-200',
  'bg-amber-400/30 border-amber-400/60 text-amber-200',
  'bg-emerald-400/30 border-emerald-400/60 text-emerald-200',
  'bg-rose-400/30 border-rose-400/60 text-rose-200',
  'bg-cyan-400/30 border-cyan-400/60 text-cyan-200',
  'bg-orange-400/30 border-orange-400/60 text-orange-200',
  'bg-indigo-400/30 border-indigo-400/60 text-indigo-200',
];

type Props = {
  columns: number;
  gap: number;
  rowHeight: number;
  denseFill: boolean;
  items: KangurLessonGridItem[];
  focusedItemId?: string | null;
  onFocusItem?: (itemId: string) => void;
};

export function GridLayoutCanvas({
  columns,
  items,
  focusedItemId,
  onFocusItem,
}: Props): React.JSX.Element {
  if (items.length === 0) {
    return (
      <div className='flex h-16 items-center justify-center rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground'>
        No items yet — add grid items below.
      </div>
    );
  }

  // Build a CSS-grid string representation using inline style.
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gap: '4px',
  };

  return (
    <div className='rounded-xl border border-border/60 bg-card/30 p-3'>
      <div className='mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
        Layout preview · {columns} column{columns !== 1 ? 's' : ''} · {items.length} item
        {items.length !== 1 ? 's' : ''}
      </div>
      <div style={gridStyle}>
        {items.map((item, index) => {
          const color = ITEM_COLORS[index % ITEM_COLORS.length] ?? ITEM_COLORS[0];
          const colSpan = Math.min(item.colSpan, columns);

          const itemStyle: React.CSSProperties = {
            gridColumn: item.columnStart
              ? `${item.columnStart} / span ${colSpan}`
              : `span ${colSpan}`,
            gridRow: item.rowStart
              ? `${item.rowStart} / span ${item.rowSpan}`
              : `span ${item.rowSpan}`,
            minHeight: '36px',
          };

          const isFocused = focusedItemId === item.id;

          return (
            <button
              key={item.id}
              type='button'
              style={itemStyle}
              onClick={(): void => onFocusItem?.(item.id)}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border px-2 py-1.5 text-center text-[10px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background',
                color,
                isFocused && 'ring-2 ring-white/60',
                onFocusItem ? 'cursor-pointer hover:brightness-110' : 'cursor-default'
              )}
              aria-label={`Grid item ${index + 1}: ${item.block.type}`}
            >
              <span className='font-semibold'>#{index + 1}</span>
              <span className='opacity-80'>{item.block.type}</span>
              {colSpan > 1 || item.rowSpan > 1 ? (
                <span className='mt-0.5 opacity-60'>
                  {colSpan}×{item.rowSpan}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
