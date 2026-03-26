'use client';

import { Eraser, Pen, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { KANGUR_WRAP_CENTER_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';

import { KangurManagedDrawingUtilityActions } from './KangurManagedDrawingUtilityActions';
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

function ToolbarIconButton({
  active = false,
  activeClassName,
  children,
  className,
  disabled = false,
  inactiveClassName,
  isCoarsePointer = false,
  label,
  onClick,
}: ToolbarIconButtonProps): React.JSX.Element {
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
}

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

  return (
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

      <ToolbarIconButton
        active={!isEraser}
        activeClassName='[background:var(--kangur-chat-control-background,color-mix(in_srgb,var(--kangur-soft-card-background)_82%,#fef3c7))] [color:var(--kangur-chat-control-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'
        inactiveClassName='[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))]'
        isCoarsePointer={isCoarsePointer}
        label={penLabel}
        onClick={selectPen}
      >
        <Pen aria-hidden='true' className='h-3 w-3' />
      </ToolbarIconButton>
      <ToolbarIconButton
        active={isEraser}
        activeClassName='[background:var(--kangur-chat-control-background,color-mix(in_srgb,var(--kangur-soft-card-background)_82%,#fef3c7))] [color:var(--kangur-chat-control-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'
        inactiveClassName='[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))]'
        isCoarsePointer={isCoarsePointer}
        label={eraserLabel}
        onClick={selectEraser}
      >
        <Eraser aria-hidden='true' className='h-3 w-3' />
      </ToolbarIconButton>

      <div className='mx-1 h-4 w-px [background:var(--kangur-soft-card-border)]' />

      <KangurManagedDrawingUtilityActions
        canExport={canExport}
        canRedo={canRedo}
        canUndo={canUndo}
        exportLabel={exportLabel}
        isCoarsePointer={isCoarsePointer}
        layoutPreset='freeform-toolbar'
        onExport={onExport}
        onRedo={onRedo}
        onUndo={onUndo}
        redoLabel={redoLabel}
        undoLabel={undoLabel}
      />

      <ToolbarIconButton
        activeClassName='[background:var(--kangur-chat-danger-background,#fff1f2)] [color:var(--kangur-chat-danger-text,#ef4444)]'
        disabled={clearDisabled}
        inactiveClassName='[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] hover:[background:var(--kangur-chat-danger-background,#fff1f2)] hover:[color:var(--kangur-chat-danger-text,#ef4444)]'
        isCoarsePointer={isCoarsePointer}
        label={clearLabel}
        onClick={onClear}
      >
        <Trash2 aria-hidden='true' className='h-3 w-3' />
      </ToolbarIconButton>
    </div>
  );
}
