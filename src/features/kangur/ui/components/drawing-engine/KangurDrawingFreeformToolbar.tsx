'use client';

import { Eraser, Pen, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { KANGUR_WRAP_CENTER_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';

import { KangurDrawingHistoryActions } from './KangurDrawingHistoryActions';
import { KangurDrawingSnapshotActions } from './KangurDrawingSnapshotActions';
import type { UseKangurFreeformDrawingToolsResult } from './useKangurFreeformDrawingTools';

type KangurFreeformToolbarToolState = Pick<
  UseKangurFreeformDrawingToolsResult,
  'colors' | 'isEraser' | 'selectedColor' | 'selectedWidth' | 'strokeWidths'
>;

type KangurFreeformToolbarToolActions = Pick<
  UseKangurFreeformDrawingToolsResult,
  'selectColor' | 'selectEraser' | 'selectPen' | 'selectWidth'
>;

type KangurDrawingFreeformToolbarProps = {
  canExport: boolean;
  canRedo: boolean;
  canUndo: boolean;
  className?: string;
  clearDisabled?: boolean;
  clearLabel: string;
  colorLabel?: (color: string) => string;
  eraserLabel: string;
  exportLabel: string;
  isCoarsePointer?: boolean;
  onClear: () => void;
  onExport: () => void;
  onRedo: () => void;
  onUndo: () => void;
  penLabel: string;
  redoLabel: string;
  toolActions: KangurFreeformToolbarToolActions;
  toolState: KangurFreeformToolbarToolState;
  undoLabel: string;
  widthLabel?: (width: number) => string;
};

type ToolbarIconButtonProps = {
  active?: boolean;
  activeClassName: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  inactiveClassName: string;
  isCoarsePointer?: boolean;
  label: string;
  onClick: () => void;
};

const renderToolbarIconButton = ({
  active = false,
  activeClassName,
  children,
  className,
  disabled = false,
  inactiveClassName,
  isCoarsePointer = false,
  label,
  onClick,
}: ToolbarIconButtonProps): React.JSX.Element => {
  return (
    <button
      type='button'
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'flex cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white disabled:opacity-30',
        isCoarsePointer ? 'h-11 w-11 touch-manipulation active:scale-95' : 'h-6 w-6',
        active ? activeClassName : inactiveClassName,
        className
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
    >
      {children}
    </button>
  );
};

const renderKangurDrawingFreeformToolbar = ({
  canExport,
  canRedo,
  canUndo,
  className,
  clearDisabled,
  clearLabel,
  colorLabel,
  compactActionButtonClassName,
  eraserLabel,
  exportLabel,
  isCoarsePointer,
  onClear,
  onExport,
  onRedo,
  onUndo,
  penLabel,
  redoLabel,
  selectColor,
  selectEraser,
  selectedColor,
  selectedWidth,
  selectPen,
  selectWidth,
  strokeWidths,
  colors,
  isEraser,
  undoLabel,
  widthLabel,
}: {
  canExport: boolean;
  canRedo: boolean;
  canUndo: boolean;
  className?: string;
  clearDisabled: boolean;
  clearLabel: string;
  colorLabel: (color: string) => string;
  colors: readonly string[];
  compactActionButtonClassName: string;
  eraserLabel: string;
  exportLabel: string;
  isCoarsePointer: boolean;
  isEraser: boolean;
  onClear: () => void;
  onExport: () => void;
  onRedo: () => void;
  onUndo: () => void;
  penLabel: string;
  redoLabel: string;
  selectColor: (color: string) => void;
  selectEraser: () => void;
  selectPen: () => void;
  selectedColor: string;
  selectedWidth: number;
  selectWidth: (width: number) => void;
  strokeWidths: readonly number[];
  undoLabel: string;
  widthLabel: (width: number) => string;
}): React.JSX.Element => (
  <div
    className={cn(
      KANGUR_WRAP_CENTER_ROW_CLASSNAME,
      'border-t kangur-chat-divider kangur-chat-padding-sm',
      className
    )}
  >
    <div className='flex items-center gap-1'>
      {colors.map((color) => (
        <button
          key={color}
          type='button'
          aria-label={colorLabel(color)}
          aria-pressed={selectedColor === color && !isEraser}
          className={cn(
            'cursor-pointer rounded-full border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white',
            isCoarsePointer ? 'h-11 w-11 touch-manipulation active:scale-95' : 'h-5 w-5',
            selectedColor === color && !isEraser
              ? 'scale-110 kangur-chat-accent-border'
              : '[border-color:var(--kangur-soft-card-border)] hover:scale-105'
          )}
          style={{ backgroundColor: color }}
          onClick={() => selectColor(color)}
        />
      ))}
    </div>

    <div className='mx-1 h-4 w-px [background:var(--kangur-soft-card-border)]' />

    <div className='flex items-center gap-1'>
      {strokeWidths.map((width) => (
        <button
          key={width}
          type='button'
          aria-label={widthLabel(width)}
          aria-pressed={selectedWidth === width && !isEraser}
          className={cn(
            'flex cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white',
            isCoarsePointer ? 'h-11 w-11 touch-manipulation active:scale-95' : 'h-6 w-6',
            selectedWidth === width && !isEraser
              ? '[background:var(--kangur-chat-control-background,color-mix(in_srgb,var(--kangur-soft-card-background)_82%,#fef3c7))] [color:var(--kangur-chat-control-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'
              : '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))]'
          )}
          onClick={() => selectWidth(width)}
        >
          <span className='rounded-full bg-current' style={{ width: width + 2, height: width + 2 }} />
        </button>
      ))}
    </div>

    <div className='mx-1 h-4 w-px [background:var(--kangur-soft-card-border)]' />

    {renderToolbarIconButton({
      active: !isEraser,
      activeClassName:
        '[background:var(--kangur-chat-control-background,color-mix(in_srgb,var(--kangur-soft-card-background)_82%,#fef3c7))] [color:var(--kangur-chat-control-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]',
      children: <Pen aria-hidden='true' className='h-3 w-3' />,
      inactiveClassName:
        '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))]',
      isCoarsePointer,
      label: penLabel,
      onClick: selectPen,
    })}
    {renderToolbarIconButton({
      active: isEraser,
      activeClassName:
        '[background:var(--kangur-chat-control-background,color-mix(in_srgb,var(--kangur-soft-card-background)_82%,#fef3c7))] [color:var(--kangur-chat-control-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]',
      children: <Eraser aria-hidden='true' className='h-3 w-3' />,
      inactiveClassName:
        '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))]',
      isCoarsePointer,
      label: eraserLabel,
      onClick: selectEraser,
    })}

    <div className='mx-1 h-4 w-px [background:var(--kangur-soft-card-border)]' />

    <KangurDrawingHistoryActions
      buttonClassName={compactActionButtonClassName}
      className='flex items-center gap-1'
      display='icon'
      iconClassName='h-3 w-3'
      isCoarsePointer={isCoarsePointer}
      onRedo={onRedo}
      onUndo={onUndo}
      redoDisabled={!canRedo}
      redoLabel={redoLabel}
      size='sm'
      undoDisabled={!canUndo}
      undoLabel={undoLabel}
      variant='ghost'
    />
    <KangurDrawingSnapshotActions
      buttonClassName={compactActionButtonClassName}
      className='flex items-center'
      display='icon'
      exportDisabled={!canExport}
      exportLabel={exportLabel}
      iconClassName='h-3 w-3'
      isCoarsePointer={isCoarsePointer}
      onExport={onExport}
      size='sm'
      variant='ghost'
    />

    {renderToolbarIconButton({
      activeClassName:
        '[background:var(--kangur-chat-danger-background,#fff1f2)] [color:var(--kangur-chat-danger-text,#ef4444)]',
      children: <Trash2 aria-hidden='true' className='h-3 w-3' />,
      disabled: clearDisabled,
      inactiveClassName:
        '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] hover:[background:var(--kangur-chat-danger-background,#fff1f2)] hover:[color:var(--kangur-chat-danger-text,#ef4444)]',
      isCoarsePointer,
      label: clearLabel,
      onClick: onClear,
    })}
  </div>
);

export function KangurDrawingFreeformToolbar({
  canExport,
  canRedo,
  canUndo,
  className,
  clearDisabled = false,
  clearLabel,
  colorLabel = (color) => `Kolor ${color}`,
  eraserLabel,
  exportLabel,
  isCoarsePointer = false,
  onClear,
  onExport,
  onRedo,
  onUndo,
  penLabel,
  redoLabel,
  toolActions,
  toolState,
  undoLabel,
  widthLabel = (width) => `Grubość ${width}px`,
}: KangurDrawingFreeformToolbarProps): React.JSX.Element {
  const { colors, isEraser, selectedColor, selectedWidth, strokeWidths } = toolState;
  const { selectColor, selectEraser, selectPen, selectWidth } = toolActions;
  const compactActionButtonClassName = [
    '!min-w-0 !gap-0 rounded-full',
    '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]',
    'hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))]',
    'hover:[color:var(--kangur-chat-panel-text,var(--kangur-page-text))]',
    isCoarsePointer ? 'h-11 w-11' : 'h-6 w-6',
  ].join(' ');

  return renderKangurDrawingFreeformToolbar({
    canExport,
    canRedo,
    canUndo,
    className,
    clearDisabled,
    clearLabel,
    colorLabel,
    colors,
    compactActionButtonClassName,
    eraserLabel,
    exportLabel,
    isCoarsePointer,
    isEraser,
    onClear,
    onExport,
    onRedo,
    onUndo,
    penLabel,
    redoLabel,
    selectColor,
    selectEraser,
    selectedColor,
    selectedWidth,
    selectPen,
    selectWidth,
    strokeWidths,
    undoLabel,
    widthLabel,
  });
}
