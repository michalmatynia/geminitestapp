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
  Redo2,
  RotateCcw,
  Sparkles,
  Trash2,
  Unlink,
} from 'lucide-react';
import React from 'react';

import { Button, Tooltip } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useOptionalVectorDrawing } from '../context/VectorDrawingContext';

import type { VectorToolMode } from '../types';

export type VectorDrawingToolbarVariant = 'full' | 'min';

export interface VectorDrawingToolbarProps {
  tool?: VectorToolMode;
  onSelectTool?: (tool: VectorToolMode) => void;
  onUndo?: (() => void) | undefined;
  onRedo?: (() => void) | undefined;
  onClose?: (() => void) | undefined;
  onDetach?: (() => void) | undefined;
  onClear?: (() => void) | undefined;
  onSmooth?: (() => void) | undefined;
  onSimplify?: (() => void) | undefined;
  disableUndo?: boolean | undefined;
  disableRedo?: boolean | undefined;
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
  { key: 'select', label: 'Select (V)', icon: <MousePointer2 className='size-4' /> },
  { key: 'polygon', label: 'Polygon (P)', icon: <Pentagon className='size-4' /> },
  { key: 'lasso', label: 'Lasso (L)', icon: <Lasso className='size-4' /> },
  { key: 'rect', label: 'Rectangle (R)', icon: <RectangleHorizontal className='size-4' /> },
  { key: 'ellipse', label: 'Ellipse (E)', icon: <Circle className='size-4' /> },
  { key: 'brush', label: 'Brush (B)', icon: <Brush className='size-4' /> },
];

const MIN_TOOLS: ToolOption[] = [
  { key: 'select', label: 'Edit', icon: <MousePointer2 className='size-4' /> },
  { key: 'polygon', label: 'Pen', icon: <Pentagon className='size-4' /> },
];

export function VectorDrawingToolbar({
  tool: propTool,
  onSelectTool: propOnSelectTool,
  onUndo: propOnUndo,
  onRedo: propOnRedo,
  onClose: propOnClose,
  onDetach: propOnDetach,
  onClear: propOnClear,
  onSmooth: propOnSmooth,
  onSimplify: propOnSimplify,
  disableUndo: propDisableUndo,
  disableRedo: propDisableRedo,
  disableClose: propDisableClose,
  disableDetach: propDisableDetach,
  disableClear: propDisableClear,
  disableSmooth: propDisableSmooth,
  disableSimplify: propDisableSimplify,
  className,
  variant = 'full',
}: VectorDrawingToolbarProps): React.JSX.Element {
  const context = useOptionalVectorDrawing();

  const tool = propTool ?? context?.tool;
  const onSelectTool = propOnSelectTool ?? context?.setTool;
  const onSmooth = propOnSmooth ?? context?.onSmooth;
  const onSimplify = propOnSimplify ?? context?.onSimplify;
  const onUndo = propOnUndo ?? context?.onUndo;
  const onRedo = propOnRedo ?? context?.onRedo;
  const onClear = propOnClear ?? context?.onClear;
  const onClose = propOnClose ?? context?.onCloseShape;
  const onDetach = propOnDetach ?? context?.onDetach;
  const disableUndo = propDisableUndo ?? context?.disableUndo;
  const disableRedo = propDisableRedo ?? context?.disableRedo;
  const disableClear = propDisableClear ?? context?.disableClear;
  const disableClose = propDisableClose ?? context?.disableClose;
  const disableDetach = propDisableDetach ?? context?.disableDetach;
  const disableSmooth = propDisableSmooth ?? context?.disableSmooth;
  const disableSimplify = propDisableSimplify ?? context?.disableSimplify;

  if (tool === undefined || !onSelectTool) {
    return <div />;
  }

  const toolOptions = variant === 'min' ? MIN_TOOLS : FULL_TOOLS;
  const hasActions = Boolean(onUndo || onRedo || onClose || onDetach || onClear || onSmooth || onSimplify);

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
            type='button'
            variant={tool === option.key ? 'secondary' : 'outline'}
            size='icon'
            onClick={() => onSelectTool(option.key)}
          >
            {option.icon}
          </Button>
        </Tooltip>
      ))}
      {hasActions ? <div className='mx-1 h-6 w-px bg-border' /> : null}
      {onUndo ? (
        <Tooltip content='Undo (Ctrl+Z)'>
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
      {onRedo ? (
        <Tooltip content='Redo (Ctrl+Shift+Z)'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={onRedo}
            disabled={disableRedo}
          >
            <Redo2 className='size-4' />
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
      {onSmooth ? (
        <Tooltip content='Smooth path'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={onSmooth}
            disabled={disableSmooth}
          >
            <Sparkles className='size-4' />
          </Button>
        </Tooltip>
      ) : null}
      {onSimplify ? (
        <Tooltip content='Simplify path'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={onSimplify}
            disabled={disableSimplify}
          >
            <Filter className='size-4' />
          </Button>
        </Tooltip>
      ) : null}
    </div>
  );
}
