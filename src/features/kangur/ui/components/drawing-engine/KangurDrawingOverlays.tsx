import type { ReactNode } from 'react';

import { cn } from '@/features/kangur/shared/utils';
import type { Point2d } from '@/shared/contracts/geometry';

type KangurDrawingKeyboardCursorOverlayProps = {
  accentClassName: string;
  cursor: Point2d;
  height: number;
  isCoarsePointer: boolean;
  isDrawing: boolean;
  width: number;
};

export function KangurDrawingKeyboardCursorOverlay({
  accentClassName,
  cursor,
  height,
  isCoarsePointer,
  isDrawing,
  width,
}: KangurDrawingKeyboardCursorOverlayProps): React.JSX.Element {
  return (
    <div
      aria-hidden='true'
      className={cn(
        'pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border transition-transform duration-75',
        accentClassName,
        isCoarsePointer ? 'h-5 w-5' : 'h-4 w-4',
        isDrawing ? 'scale-110' : 'scale-100'
      )}
      style={{
        left: `${(cursor.x / width) * 100}%`,
        top: `${(cursor.y / height) * 100}%`,
      }}
    />
  );
}

type KangurDrawingEmptyStateOverlayProps = {
  children: ReactNode;
};

export function KangurDrawingEmptyStateOverlay({
  children,
}: KangurDrawingEmptyStateOverlayProps): React.JSX.Element {
  return (
    <div className='pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold [color:var(--kangur-page-muted-text)]'>
      {children}
    </div>
  );
}
