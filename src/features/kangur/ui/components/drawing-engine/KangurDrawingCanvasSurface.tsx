'use client';

import type {
  AriaRole,
  CSSProperties,
  KeyboardEventHandler,
  PointerEventHandler,
  ReactNode,
  RefObject,
} from 'react';

import { cn } from '@/features/kangur/shared/utils';

type KangurDrawingCanvasSurfaceProps = {
  afterCanvas?: ReactNode;
  ariaDescribedBy?: string;
  ariaKeyShortcuts?: string;
  ariaLabel: string;
  beforeCanvas?: ReactNode;
  canvasClassName?: string;
  canvasDataTestId?: string;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  canvasStyle?: CSSProperties;
  height: number;
  isPointerDrawing: boolean;
  onKeyDown?: KeyboardEventHandler<HTMLCanvasElement>;
  onPointerCancel?: PointerEventHandler<HTMLCanvasElement>;
  onPointerDown: PointerEventHandler<HTMLCanvasElement>;
  onPointerLeave?: PointerEventHandler<HTMLCanvasElement>;
  onPointerMove: PointerEventHandler<HTMLCanvasElement>;
  onPointerUp: PointerEventHandler<HTMLCanvasElement>;
  role?: AriaRole;
  shellClassName?: string;
  shellDataTestId?: string;
  shellStyle?: CSSProperties;
  tabIndex?: number;
  width: number;
};

export function KangurDrawingCanvasSurface({
  afterCanvas,
  ariaDescribedBy,
  ariaKeyShortcuts,
  ariaLabel,
  beforeCanvas,
  canvasClassName,
  canvasDataTestId,
  canvasRef,
  canvasStyle,
  height,
  isPointerDrawing,
  onKeyDown,
  onPointerCancel,
  onPointerDown,
  onPointerLeave,
  onPointerMove,
  onPointerUp,
  role,
  shellClassName,
  shellDataTestId,
  shellStyle,
  tabIndex,
  width,
}: KangurDrawingCanvasSurfaceProps): React.JSX.Element {
  return (
    <div
      className={cn(shellClassName)}
      data-testid={shellDataTestId}
      style={shellStyle}
    >
      {beforeCanvas}
      <canvas
        aria-describedby={ariaDescribedBy}
        aria-keyshortcuts={ariaKeyShortcuts}
        aria-label={ariaLabel}
        className={cn('kangur-drawing-canvas touch-none', canvasClassName)}
        data-drawing-active={isPointerDrawing ? 'true' : 'false'}
        data-testid={canvasDataTestId}
        height={height}
        onKeyDown={onKeyDown}
        onPointerCancel={onPointerCancel}
        onPointerDown={onPointerDown}
        onPointerLeave={onPointerLeave}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        ref={canvasRef}
        role={role}
        style={canvasStyle}
        tabIndex={tabIndex}
        width={width}
      />
      {afterCanvas}
    </div>
  );
}
