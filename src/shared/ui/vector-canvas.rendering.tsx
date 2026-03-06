'use client';

import { useMemo, type JSX } from 'react';
import {
  Brush,
  Check,
  Circle,
  Lasso,
  MousePointer2,
  Pentagon,
  RectangleHorizontal,
  RotateCcw,
  Trash2,
  Unlink,
} from 'lucide-react';
import { type VectorPoint, type VectorShape, type VectorToolMode } from '@/shared/contracts/vector';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { cn } from '@/shared/utils';
import { Button } from './button';
import { Tooltip } from './tooltip';
import { vectorShapeToPath } from './vector-canvas.geometry';
import { useOptionalVectorCanvasContext } from './vector-canvas/VectorCanvasContext';

export interface VectorToolbarProps {
  tool: VectorToolMode;
  onSelectTool: (tool: VectorToolMode) => void;
  onUndo?: () => void;
  onClose?: () => void;
  onDetach?: () => void;
  onClear?: () => void;
  disableUndo?: boolean;
  disableClose?: boolean;
  disableDetach?: boolean;
  disableClear?: boolean;
  className?: string;
}

type VectorToolbarRuntimeValue = {
  tool: VectorToolMode;
  onSelectTool: (tool: VectorToolMode) => void;
  onUndo?: () => void;
  onClose?: () => void;
  onDetach?: () => void;
  onClear?: () => void;
  disableUndo?: boolean;
  disableClose?: boolean;
  disableDetach?: boolean;
  disableClear?: boolean;
  className?: string;
  hasActions: boolean;
};

const { Context: VectorToolbarRuntimeContext, useStrictContext: useVectorToolbarRuntime } =
  createStrictContext<VectorToolbarRuntimeValue>({
    hookName: 'useVectorToolbarRuntime',
    providerName: 'VectorToolbarRuntimeProvider',
    displayName: 'VectorToolbarRuntimeContext',
  });

function VectorToolbarToolButtons(): JSX.Element {
  const { onSelectTool, tool } = useVectorToolbarRuntime();
  return (
    <>
      <Tooltip content='Select'>
        <Button
          type='button'
          variant={tool === 'select' ? 'secondary' : 'outline'}
          size='icon'
          onClick={() => onSelectTool('select')}
        >
          <MousePointer2 className='size-4' />
        </Button>
      </Tooltip>
      <Tooltip content='Polygon'>
        <Button
          type='button'
          variant={tool === 'polygon' ? 'secondary' : 'outline'}
          size='icon'
          onClick={() => onSelectTool('polygon')}
        >
          <Pentagon className='size-4' />
        </Button>
      </Tooltip>
      <Tooltip content='Lasso'>
        <Button
          type='button'
          variant={tool === 'lasso' ? 'secondary' : 'outline'}
          size='icon'
          onClick={() => onSelectTool('lasso')}
        >
          <Lasso className='size-4' />
        </Button>
      </Tooltip>
      <Tooltip content='Rectangle'>
        <Button
          type='button'
          variant={tool === 'rect' ? 'secondary' : 'outline'}
          size='icon'
          onClick={() => onSelectTool('rect')}
        >
          <RectangleHorizontal className='size-4' />
        </Button>
      </Tooltip>
      <Tooltip content='Ellipse'>
        <Button
          type='button'
          variant={tool === 'ellipse' ? 'secondary' : 'outline'}
          size='icon'
          onClick={() => onSelectTool('ellipse')}
        >
          <Circle className='size-4' />
        </Button>
      </Tooltip>
      <Tooltip content='Brush'>
        <Button
          type='button'
          variant={tool === 'brush' ? 'secondary' : 'outline'}
          size='icon'
          onClick={() => onSelectTool('brush')}
        >
          <Brush className='size-4' />
        </Button>
      </Tooltip>
    </>
  );
}

function VectorToolbarActionButtons(): JSX.Element {
  const {
    disableClear,
    disableClose,
    disableDetach,
    disableUndo,
    onClear,
    onClose,
    onDetach,
    onUndo,
  } = useVectorToolbarRuntime();
  return (
    <>
      {onUndo ? (
        <Tooltip content='Undo last point'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={onUndo}
            disabled={disableUndo}
          >
            <RotateCcw className='size-4' />
          </Button>
        </Tooltip>
      ) : null}
      {onClose ? (
        <Tooltip content='Close polygon'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={onClose}
            disabled={disableClose}
          >
            <Check className='size-4' />
          </Button>
        </Tooltip>
      ) : null}
      {onDetach ? (
        <Tooltip content='Detach polygon'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={onDetach}
            disabled={disableDetach}
          >
            <Unlink className='size-4' />
          </Button>
        </Tooltip>
      ) : null}
      {onClear ? (
        <Tooltip content='Clear shapes'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={onClear}
            disabled={disableClear}
          >
            <Trash2 className='size-4' />
          </Button>
        </Tooltip>
      ) : null}
    </>
  );
}

function VectorToolbarRuntime(): JSX.Element {
  const { className, hasActions } = useVectorToolbarRuntime();
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-2 shadow-lg',
        className
      )}
    >
      <VectorToolbarToolButtons />
      {hasActions ? <div className='mx-1 h-6 w-px bg-border' /> : null}
      <VectorToolbarActionButtons />
    </div>
  );
}

export function VectorToolbar({
  tool,
  onSelectTool,
  onUndo,
  onClose,
  onDetach,
  onClear,
  disableUndo,
  disableClose,
  disableDetach,
  disableClear,
  className,
}: VectorToolbarProps): JSX.Element {
  const runtimeValue = useMemo<VectorToolbarRuntimeValue>(
    () => ({
      tool,
      onSelectTool,
      onUndo,
      onClose,
      onDetach,
      onClear,
      disableUndo,
      disableClose,
      disableDetach,
      disableClear,
      className,
      hasActions: Boolean(onUndo || onClose || onDetach || onClear),
    }),
    [
      tool,
      onSelectTool,
      onUndo,
      onClose,
      onDetach,
      onClear,
      disableUndo,
      disableClose,
      disableDetach,
      disableClear,
      className,
    ]
  );

  return (
    <VectorToolbarRuntimeContext.Provider value={runtimeValue}>
      <VectorToolbarRuntime />
    </VectorToolbarRuntimeContext.Provider>
  );
}

export interface VectorShapeOverlayProps {
  shapes?: VectorShape[];
  activeShapeId?: string | null;
  selectedPointIndex?: number | null;
  viewboxSize?: number;
}

export function VectorShapeOverlay(props: VectorShapeOverlayProps): React.JSX.Element {
  const context = useOptionalVectorCanvasContext();

  const {
    shapes = props.shapes ?? context?.shapes ?? [],
    activeShapeId = props.activeShapeId ?? context?.activeShapeId ?? null,
    selectedPointIndex = props.selectedPointIndex ?? context?.selectedPointIndex ?? null,
    viewboxSize = props.viewboxSize ?? 1000,
  } = props;

  return (
    <svg
      className='pointer-events-none absolute left-1/2 top-0 z-[21] -translate-x-1/2 h-full w-full'
      viewBox={`0 0 ${viewboxSize} ${viewboxSize}`}
      preserveAspectRatio='none'
      aria-hidden='true'
    >
      {shapes
        .filter((shape) => shape.visible)
        .map((shape: VectorShape) => {
          const path = vectorShapeToPath(shape, viewboxSize);
          if (!path) return null;
          const isActive = shape.id === activeShapeId;
          const isMaskEligible =
            (shape.type === 'polygon' || shape.type === 'lasso') &&
            shape.closed &&
            shape.points.length >= 3;
          const isNonMaskType =
            shape.type === 'rect' || shape.type === 'ellipse' || shape.type === 'brush';
          const stroke = isMaskEligible
            ? isActive
              ? 'rgba(16,185,129,0.95)'
              : 'rgba(56,189,248,0.95)'
            : isNonMaskType
              ? isActive
                ? 'rgba(251,146,60,0.95)'
                : 'rgba(251,146,60,0.75)'
              : isActive
                ? 'rgba(34,211,238,0.98)'
                : 'rgba(56,189,248,0.9)';
          const fill =
            shape.closed && shape.points.length >= 3
              ? isMaskEligible
                ? 'rgba(56,189,248,0.14)'
                : 'rgba(251,146,60,0.08)'
              : 'transparent';
          const dash = isMaskEligible ? undefined : isNonMaskType ? '6 4' : '8 4';
          return (
            <g key={shape.id}>
              <path
                d={path}
                fill={fill}
                stroke={stroke}
                strokeWidth={isActive ? 2.5 : 2}
                strokeDasharray={dash}
                vectorEffect='non-scaling-stroke'
              />
              {shape.type === 'polygon' ||
              shape.type === 'lasso' ||
              shape.type === 'brush' ||
              shape.type === 'rect' ||
              shape.type === 'ellipse'
                ? (shape.type === 'rect' || shape.type === 'ellipse'
                    ? shape.points.slice(0, 2)
                    : shape.points
                  ).map((point: VectorPoint, index: number) => {
                    const cx = point.x * viewboxSize;
                    const cy = point.y * viewboxSize;
                    const selected = isActive && index === (selectedPointIndex ?? -1);
                    const isRectLike = shape.type === 'rect' || shape.type === 'ellipse';
                    const haloRadius = isRectLike ? 7.5 : index === 0 ? 7.5 : 6.5;
                    const markerRadius = isRectLike ? 5.5 : index === 0 ? 5.5 : 4.5;
                    return (
                      <g key={`${shape.id}-${index.toString(36)}`}>
                        <circle cx={cx} cy={cy} r={haloRadius} fill='rgba(2,6,23,0.55)' />
                        <circle
                          cx={cx}
                          cy={cy}
                          r={markerRadius}
                          fill={
                            selected
                              ? 'rgba(251,191,36,0.98)'
                              : isRectLike
                                ? 'rgba(251,146,60,0.98)'
                                : index === 0
                                  ? 'rgba(16,185,129,0.98)'
                                  : 'rgba(56,189,248,0.98)'
                          }
                          stroke='rgba(255,255,255,0.9)'
                          strokeWidth={1.5}
                          vectorEffect='non-scaling-stroke'
                        />
                      </g>
                    );
                  })
                : null}
            </g>
          );
        })}
    </svg>
  );
}
