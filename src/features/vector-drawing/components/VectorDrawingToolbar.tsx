'use client';

import {
  Brush,
  Check,
  Circle,
  Filter,
  Lasso,
  MousePointer2,
  Pentagon,
  RectangleHorizontal,
  RotateCcw,
  Sparkles,
  Trash2,
  Unlink,
} from 'lucide-react';
import React from 'react';

import { Button, Tooltip } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useVectorDrawing } from '../context/VectorDrawingContext';

import type { VectorToolMode } from '../types';

export type VectorDrawingToolbarVariant = 'full' | 'min';

export interface VectorDrawingToolbarProps {
  tool?: VectorToolMode;
  onSelectTool?: (tool: VectorToolMode) => void;
  onUndo?: (() => void) | undefined;
  onClose?: (() => void) | undefined;
  onDetach?: (() => void) | undefined;
  onClear?: (() => void) | undefined;
  onSmooth?: (() => void) | undefined;
  onSimplify?: (() => void) | undefined;
  disableUndo?: boolean | undefined;
  disableClose?: boolean | undefined;
  disableDetach?: boolean | undefined;
  disableClear?: boolean | undefined;
  disableSmooth?: boolean | undefined;
  disableSimplify?: boolean | undefined;
  className?: string | undefined;
  variant?: VectorDrawingToolbarVariant | undefined;
}

type ToolOption = {
  key: VectorToolMode;
  label: string;
  icon: React.ReactNode;
};

const FULL_TOOLS: ToolOption[] = [
  { key: 'select', label: 'Select', icon: <MousePointer2 className="size-4" /> },
  { key: 'polygon', label: 'Polygon', icon: <Pentagon className="size-4" /> },
  { key: 'lasso', label: 'Lasso', icon: <Lasso className="size-4" /> },
  { key: 'rect', label: 'Rectangle', icon: <RectangleHorizontal className="size-4" /> },
  { key: 'ellipse', label: 'Ellipse', icon: <Circle className="size-4" /> },
  { key: 'brush', label: 'Brush', icon: <Brush className="size-4" /> },
];

const MIN_TOOLS: ToolOption[] = [
  { key: 'select', label: 'Edit', icon: <MousePointer2 className="size-4" /> },
  { key: 'polygon', label: 'Pen', icon: <Pentagon className="size-4" /> },
];

export function VectorDrawingToolbar(props: VectorDrawingToolbarProps): React.JSX.Element {
  let contextValues: Partial<VectorDrawingToolbarProps> = {};
  
  try {
    const context = useVectorDrawing();
    contextValues = {
      tool: context.tool,
      onSelectTool: context.setTool,
      onSmooth: context.onSmooth,
      onSimplify: context.onSimplify,
      onUndo: context.onUndo,
      onClear: context.onClear,
      onClose: context.onCloseShape,
      onDetach: context.onDetach,
      disableUndo: context.disableUndo,
      disableClear: context.disableClear,
      disableClose: context.disableClose,
      disableDetach: context.disableDetach,
      disableSmooth: context.disableSmooth,
      disableSimplify: context.disableSimplify,
    };
  } catch {
    // Context not available
  }

  const merged = { ...contextValues, ...props };
  const {
    tool,
    onSelectTool,
    onUndo,
    onClose,
    onDetach,
    onClear,
    onSmooth,
    onSimplify,
    disableUndo,
    disableClose,
    disableDetach,
    disableClear,
    disableSmooth,
    disableSimplify,
    className,
    variant = 'full',
  } = merged;

  if (!tool || !onSelectTool) {
    return <div />;
  }

  const toolOptions = variant === 'min' ? MIN_TOOLS : FULL_TOOLS;
  const hasActions = Boolean(onUndo || onClose || onDetach || onClear || onSmooth || onSimplify);

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-2 shadow-lg',
        className
      )}
    >
      {toolOptions.map((option: ToolOption) => (
        <Tooltip key={option.key} content={option.label}>
          <Button
            type="button"
            variant={tool === option.key ? 'secondary' : 'outline'}
            size="icon"
            onClick={() => onSelectTool(option.key)}
          >
            {option.icon}
          </Button>
        </Tooltip>
      ))}
      {hasActions ? <div className="mx-1 h-6 w-px bg-border" /> : null}
      {onUndo ? (
        <Tooltip content="Undo last point">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onUndo}
            disabled={disableUndo}
          >
            <RotateCcw className="size-4" />
          </Button>
        </Tooltip>
      ) : null}
      {onClose ? (
        <Tooltip content="Close polygon">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClose}
            disabled={disableClose}
          >
            <Check className="size-4" />
          </Button>
        </Tooltip>
      ) : null}
      {onDetach ? (
        <Tooltip content="Detach polygon">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onDetach}
            disabled={disableDetach}
          >
            <Unlink className="size-4" />
          </Button>
        </Tooltip>
      ) : null}
      {onClear ? (
        <Tooltip content="Clear shapes">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClear}
            disabled={disableClear}
          >
            <Trash2 className="size-4" />
          </Button>
        </Tooltip>
      ) : null}
      {onSmooth ? (
        <Tooltip content="Smooth path">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onSmooth}
            disabled={disableSmooth}
          >
            <Sparkles className="size-4" />
          </Button>
        </Tooltip>
      ) : null}
      {onSimplify ? (
        <Tooltip content="Simplify path">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onSimplify}
            disabled={disableSimplify}
          >
            <Filter className="size-4" />
          </Button>
        </Tooltip>
      ) : null}
    </div>
  );
}
