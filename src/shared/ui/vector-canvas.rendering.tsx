'use client';

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
import { type JSX } from 'react';

import { type VectorPoint, type VectorShape, type VectorToolMode } from '@/shared/contracts/vector';
import { cn } from '@/shared/utils';

import { Button } from './button';
import { Tooltip } from './tooltip';
import { useOptionalVectorCanvasContext } from './vector-canvas/VectorCanvasContext';
import { vectorShapeToPath } from './vector-canvas.geometry';

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

type VectorToolbarResolvedProps = VectorToolbarProps & {
  hasActions: boolean;
};

function VectorToolbarToolButtons({
  onSelectTool,
  tool,
}: Pick<VectorToolbarResolvedProps, 'onSelectTool' | 'tool'>): JSX.Element {
  return (
    <>
      <Tooltip content='Select'>
        <Button
          type='button'
          variant={tool === 'select' ? 'secondary' : 'outline'}
          size='icon'
          aria-label='Select tool'
          aria-pressed={tool === 'select'}
          onClick={() => onSelectTool('select')}
          title={'Select tool'}>
          <MousePointer2 className='size-4' />
        </Button>
      </Tooltip>
      <Tooltip content='Polygon'>
        <Button
          type='button'
          variant={tool === 'polygon' ? 'secondary' : 'outline'}
          size='icon'
          aria-label='Polygon tool'
          aria-pressed={tool === 'polygon'}
          onClick={() => onSelectTool('polygon')}
          title={'Polygon tool'}>
          <Pentagon className='size-4' />
        </Button>
      </Tooltip>
      <Tooltip content='Lasso'>
        <Button
          type='button'
          variant={tool === 'lasso' ? 'secondary' : 'outline'}
          size='icon'
          aria-label='Lasso tool'
          aria-pressed={tool === 'lasso'}
          onClick={() => onSelectTool('lasso')}
          title={'Lasso tool'}>
          <Lasso className='size-4' />
        </Button>
      </Tooltip>
      <Tooltip content='Rectangle'>
        <Button
          type='button'
          variant={tool === 'rect' ? 'secondary' : 'outline'}
          size='icon'
          aria-label='Rectangle tool'
          aria-pressed={tool === 'rect'}
          onClick={() => onSelectTool('rect')}
          title={'Rectangle tool'}>
          <RectangleHorizontal className='size-4' />
        </Button>
      </Tooltip>
      <Tooltip content='Ellipse'>
        <Button
          type='button'
          variant={tool === 'ellipse' ? 'secondary' : 'outline'}
          size='icon'
          aria-label='Ellipse tool'
          aria-pressed={tool === 'ellipse'}
          onClick={() => onSelectTool('ellipse')}
          title={'Ellipse tool'}>
          <Circle className='size-4' />
        </Button>
      </Tooltip>
      <Tooltip content='Brush'>
        <Button
          type='button'
          variant={tool === 'brush' ? 'secondary' : 'outline'}
          size='icon'
          aria-label='Brush tool'
          aria-pressed={tool === 'brush'}
          onClick={() => onSelectTool('brush')}
          title={'Brush tool'}>
          <Brush className='size-4' />
        </Button>
      </Tooltip>
    </>
  );
}

function VectorToolbarActionButtons({
  disableClear,
  disableClose,
  disableDetach,
  disableUndo,
  onClear,
  onClose,
  onDetach,
  onUndo,
}: Pick<
  VectorToolbarResolvedProps,
  | 'disableClear'
  | 'disableClose'
  | 'disableDetach'
  | 'disableUndo'
  | 'onClear'
  | 'onClose'
  | 'onDetach'
  | 'onUndo'
>): JSX.Element {
  return (
    <>
      {onUndo ? (
        <Tooltip content='Undo last point'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            aria-label='Undo last point'
            onClick={onUndo}
            disabled={disableUndo}
            title={'Undo last point'}>
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
            aria-label='Close polygon'
            onClick={onClose}
            disabled={disableClose}
            title={'Close polygon'}>
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
            aria-label='Detach polygon'
            onClick={onDetach}
            disabled={disableDetach}
            title={'Detach polygon'}>
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
            aria-label='Clear shapes'
            onClick={onClear}
            disabled={disableClear}
            title={'Clear shapes'}>
            <Trash2 className='size-4' />
          </Button>
        </Tooltip>
      ) : null}
    </>
  );
}

function VectorToolbarLayout({
  className,
  hasActions,
  ...props
}: VectorToolbarResolvedProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-2 shadow-lg',
        className
      )}
    >
      <VectorToolbarToolButtons tool={props.tool} onSelectTool={props.onSelectTool} />
      {hasActions ? <div className='mx-1 h-6 w-px bg-border' /> : null}
      <VectorToolbarActionButtons
        onUndo={props.onUndo}
        onClose={props.onClose}
        onDetach={props.onDetach}
        onClear={props.onClear}
        disableUndo={props.disableUndo}
        disableClose={props.disableClose}
        disableDetach={props.disableDetach}
        disableClear={props.disableClear}
      />
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
  return (
    <VectorToolbarLayout
      tool={tool}
      onSelectTool={onSelectTool}
      onUndo={onUndo}
      onClose={onClose}
      onDetach={onDetach}
      onClear={onClear}
      disableUndo={disableUndo}
      disableClose={disableClose}
      disableDetach={disableDetach}
      disableClear={disableClear}
      className={className}
      hasActions={Boolean(onUndo || onClose || onDetach || onClear)}
    />
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
