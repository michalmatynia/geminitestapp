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

import { DOCUMENTATION_MODULE_IDS } from '@/shared/lib/documentation';
import { getDocumentationTooltip } from '@/shared/lib/documentation';
import { Button, Tooltip } from '@/shared/ui';
import { cn } from '@/shared/utils';
import type { VectorToolMode } from '@/shared/contracts/vector';

import {
  useOptionalVectorDrawingActions,
  useOptionalVectorDrawingState,
} from '../context/VectorDrawingContext';

export type VectorDrawingToolbarVariant = 'full' | 'min';

export interface VectorDrawingToolbarProps {
  tool?: VectorToolMode;
  onSelectTool?: (tool: VectorToolMode) => void;
  showSelectTool?: boolean | undefined;
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

const VECTOR_TOOL_DOC_IDS: Partial<Record<VectorToolMode, string>> = {
  select: 'vector_toolbar_tool_select',
  polygon: 'vector_toolbar_tool_polygon',
  lasso: 'vector_toolbar_tool_lasso',
  rect: 'vector_toolbar_tool_rect',
  ellipse: 'vector_toolbar_tool_ellipse',
  brush: 'vector_toolbar_tool_brush',
};

export function VectorDrawingToolbar({
  tool: propTool,
  onSelectTool: propOnSelectTool,
  showSelectTool = true,
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
  const stateContext = useOptionalVectorDrawingState();
  const actionsContext = useOptionalVectorDrawingActions();

  const tool = propTool ?? stateContext?.tool;
  const onSelectTool = propOnSelectTool ?? actionsContext?.setTool;
  const onSmooth = propOnSmooth ?? actionsContext?.onSmooth;
  const onSimplify = propOnSimplify ?? actionsContext?.onSimplify;
  const onUndo = propOnUndo ?? actionsContext?.onUndo;
  const onRedo = propOnRedo ?? actionsContext?.onRedo;
  const onClear = propOnClear ?? actionsContext?.onClear;
  const onClose = propOnClose ?? actionsContext?.onCloseShape;
  const onDetach = propOnDetach ?? actionsContext?.onDetach;
  const disableUndo = propDisableUndo ?? stateContext?.disableUndo;
  const disableRedo = propDisableRedo ?? stateContext?.disableRedo;
  const disableClear = propDisableClear ?? stateContext?.disableClear;
  const disableClose = propDisableClose ?? stateContext?.disableClose;
  const disableDetach = propDisableDetach ?? stateContext?.disableDetach;
  const disableSmooth = propDisableSmooth ?? stateContext?.disableSmooth;
  const disableSimplify = propDisableSimplify ?? stateContext?.disableSimplify;

  if (tool === undefined || !onSelectTool) {
    return <div />;
  }

  const baseToolOptions = variant === 'min' ? MIN_TOOLS : FULL_TOOLS;
  const toolOptions = showSelectTool
    ? baseToolOptions
    : baseToolOptions.filter((option) => option.key !== 'select');
  const hasActions = Boolean(
    onUndo || onRedo || onClose || onDetach || onClear || onSmooth || onSimplify
  );
  const resolveTooltip = (docId: string, fallback: string): string =>
    getDocumentationTooltip(DOCUMENTATION_MODULE_IDS.vectorDrawing, docId) ?? fallback;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-2 shadow-lg',
        className
      )}
    >
      {toolOptions.map((option: ToolOption) => (
        <Tooltip
          key={option.key}
          content={resolveTooltip(VECTOR_TOOL_DOC_IDS[option.key] ?? '', option.label)}
        >
          <Button
            type='button'
            variant={tool === option.key ? 'default' : 'outline'}
            size='icon'
            aria-pressed={tool === option.key}
            aria-label={option.label}
            title={option.label}
            onClick={() => onSelectTool(option.key)}
            className={cn(
              tool === option.key
                ? 'border-cyan-400/70 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30'
                : 'text-foreground/70 hover:text-foreground'
            )}
          >
            {option.icon}
          </Button>
        </Tooltip>
      ))}
      {hasActions ? <div className='mx-1 h-6 w-px bg-border' /> : null}
      {onUndo ? (
        <Tooltip content={resolveTooltip('vector_toolbar_action_undo', 'Undo (Ctrl+Z)')}>
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={onUndo}
            disabled={disableUndo}
            aria-label='Undo'
            title='Undo'
          >
            <RotateCcw className='size-4' />
          </Button>
        </Tooltip>
      ) : null}
      {onRedo ? (
        <Tooltip content={resolveTooltip('vector_toolbar_action_redo', 'Redo (Ctrl+Shift+Z)')}>
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={onRedo}
            disabled={disableRedo}
            aria-label='Redo'
            title='Redo'
          >
            <Redo2 className='size-4' />
          </Button>
        </Tooltip>
      ) : null}
      {onClose ? (
        <Tooltip content={resolveTooltip('vector_toolbar_action_close_polygon', 'Close polygon')}>
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={onClose}
            disabled={disableClose}
            aria-label='Close polygon'
            title='Close polygon'
          >
            <Check className='size-4' />
          </Button>
        </Tooltip>
      ) : null}
      {onDetach ? (
        <Tooltip content={resolveTooltip('vector_toolbar_action_detach_polygon', 'Detach polygon')}>
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={onDetach}
            disabled={disableDetach}
            aria-label='Detach polygon'
            title='Detach polygon'
          >
            <Unlink className='size-4' />
          </Button>
        </Tooltip>
      ) : null}
      {onClear ? (
        <Tooltip content={resolveTooltip('vector_toolbar_action_clear_shapes', 'Clear shapes')}>
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={onClear}
            disabled={disableClear}
            aria-label='Clear shapes'
            title='Clear shapes'
          >
            <Trash2 className='size-4' />
          </Button>
        </Tooltip>
      ) : null}
      {onSmooth ? (
        <Tooltip content={resolveTooltip('vector_toolbar_action_smooth_path', 'Smooth path')}>
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={onSmooth}
            disabled={disableSmooth}
            aria-label='Smooth path'
            title='Smooth path'
          >
            <Sparkles className='size-4' />
          </Button>
        </Tooltip>
      ) : null}
      {onSimplify ? (
        <Tooltip content={resolveTooltip('vector_toolbar_action_simplify_path', 'Simplify path')}>
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={onSimplify}
            disabled={disableSimplify}
            aria-label='Simplify path'
            title='Simplify path'
          >
            <Filter className='size-4' />
          </Button>
        </Tooltip>
      ) : null}
    </div>
  );
}
