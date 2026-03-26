'use client';

import type {
  CSSProperties,
  PointerEventHandler,
  ReactNode,
  RefObject,
} from 'react';

import { KangurDrawingCanvasSurface } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingCanvasSurface';
import { KangurInfoCard } from '@/features/kangur/ui/design/primitives';
import { cn } from '@/features/kangur/shared/utils';

type KangurTracingBoardProps = {
  boardOverlay?: ReactNode;
  canvasAriaLabel: string;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  footerHint: string;
  footerPointsLabel: string;
  guideSurface: ReactNode;
  height: number;
  isCoarsePointer: boolean;
  isPointerDrawing: boolean;
  onPointerCancel?: PointerEventHandler<HTMLCanvasElement>;
  onPointerDown: PointerEventHandler<HTMLCanvasElement>;
  onPointerLeave?: PointerEventHandler<HTMLCanvasElement>;
  onPointerMove: PointerEventHandler<HTMLCanvasElement>;
  onPointerUp: PointerEventHandler<HTMLCanvasElement>;
  shellDataTestId: string;
  shellStyle: CSSProperties;
  touchHint: string;
  touchHintTestId: string;
  width: number;
};

export function KangurTracingBoard({
  boardOverlay,
  canvasAriaLabel,
  canvasRef,
  footerHint,
  footerPointsLabel,
  guideSurface,
  height,
  isCoarsePointer,
  isPointerDrawing,
  onPointerCancel,
  onPointerDown,
  onPointerLeave,
  onPointerMove,
  onPointerUp,
  shellDataTestId,
  shellStyle,
  touchHint,
  touchHintTestId,
  width,
}: KangurTracingBoardProps): React.JSX.Element {
  return (
    <>
      {isCoarsePointer ? (
        <KangurInfoCard accent='sky' className='w-full rounded-[20px] text-sm' padding='sm' tone='neutral'>
          <p
            aria-live='polite'
            className='font-semibold text-slate-600'
            data-testid={touchHintTestId}
            role='status'
          >
            {touchHint}
          </p>
        </KangurInfoCard>
      ) : null}

      <div
        className={cn(
          'relative w-full overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/80 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.45)]',
          isPointerDrawing && 'ring-2 ring-sky-300/70 ring-offset-2 ring-offset-white'
        )}
        data-testid={shellDataTestId}
        style={shellStyle}
      >
        {guideSurface}
        {boardOverlay}
        <KangurDrawingCanvasSurface
          ariaLabel={canvasAriaLabel}
          canvasClassName='relative z-10 h-full w-full'
          canvasRef={canvasRef}
          height={height}
          isPointerDrawing={isPointerDrawing}
          onPointerCancel={onPointerCancel}
          onPointerDown={onPointerDown}
          onPointerLeave={onPointerLeave}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          width={width}
        />
      </div>

      <div className='flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600'>
        <span>{footerHint}</span>
        <span>{footerPointsLabel}</span>
      </div>
    </>
  );
}
