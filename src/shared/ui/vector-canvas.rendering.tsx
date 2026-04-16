/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
/* eslint-disable complexity */
/* eslint-disable no-nested-ternary */
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
import { cn } from '@/shared/utils/ui-utils';

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

function renderVectorToolbarToolButtons({
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

const renderVectorToolbarActionButtons = ({
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
>): JSX.Element => {
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
};

const renderVectorToolbarLayout = ({
  className,
  hasActions,
  ...props
}: VectorToolbarResolvedProps): JSX.Element => {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-2 shadow-lg',
        className
      )}
    >
      {renderVectorToolbarToolButtons({ tool: props.tool, onSelectTool: props.onSelectTool })}
      {hasActions ? <div className='mx-1 h-6 w-px bg-border' /> : null}
      {renderVectorToolbarActionButtons({
        onUndo: props.onUndo,
        disableUndo: props.disableUndo,
        onClose: props.onClose,
        disableClose: props.disableClose,
        onDetach: props.onDetach,
        disableDetach: props.disableDetach,
        onClear: props.onClear,
        disableClear: props.disableClear,
      })}
    </div>
  );
};

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
  return renderVectorToolbarLayout({
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
  });
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
        .filter((shape) => shape.visible === true)
        .map((shape: VectorShape) => {
          const path = vectorShapeToPath(shape, viewboxSize);
          if (path === null || path.length === 0) return null;
          const isActive = shape.id === activeShapeId;
          const isMaskEligible =
            (shape.type === 'polygon' || shape.type === 'lasso') &&
            shape.closed === true &&
            shape.points.length >= 3;
          const isNonMaskType =
            shape.type === 'rect' || shape.type === 'ellipse' || shape.type === 'brush';
            
          let stroke = '';
          if (isMaskEligible) {
            stroke = isActive ? 'rgba(16,185,129,0.95)' : 'rgba(56,189,248,0.95)';
          } else if (isNonMaskType) {
            stroke = isActive ? 'rgba(251,146,60,0.95)' : 'rgba(251,146,60,0.75)';
          } else {
            stroke = isActive ? 'rgba(34,211,238,0.98)' : 'rgba(56,189,248,0.9)';
          }
          
          let fill = 'transparent';
          if (shape.closed === true && shape.points.length >= 3) {
            fill = isMaskEligible ? 'rgba(56,189,248,0.14)' : 'rgba(251,146,60,0.08)';
          }
          
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
                  
                  let markerFill = 'rgba(56,189,248,0.98)';
                  if (selected) {
                    markerFill = 'rgba(251,191,36,0.98)';
                  } else if (isRectLike) {
                    markerFill = 'rgba(251,146,60,0.98)';
                  } else if (index === 0) {
                    markerFill = 'rgba(16,185,129,0.98)';
                  }

                  return (
                    <g key={`${shape.id}-${index.toString(36)}`}>
                      <circle cx={cx} cy={cy} r={haloRadius} fill='rgba(2,6,23,0.55)' />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={markerRadius}
                        fill={markerFill}
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
