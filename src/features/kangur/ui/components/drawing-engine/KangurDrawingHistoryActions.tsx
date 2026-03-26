'use client';

import { Redo2, RotateCcw } from 'lucide-react';

import { KangurButton, type KangurButtonProps } from '@/features/kangur/ui/design/primitives';
import { cn } from '@/features/kangur/shared/utils';

type KangurDrawingHistoryActionsProps = {
  buttonClassName?: string;
  className?: string;
  display?: 'icon' | 'label';
  iconClassName?: string;
  isCoarsePointer?: boolean;
  onRedo: () => void;
  onUndo: () => void;
  redoDisabled?: boolean;
  redoLabel: string;
  redoTestId?: string;
  size?: 'lg' | 'sm';
  undoDisabled?: boolean;
  undoLabel: string;
  undoTestId?: string;
  variant?: KangurButtonProps['variant'];
};

export function KangurDrawingHistoryActions({
  buttonClassName,
  className,
  display = 'label',
  iconClassName = 'h-4 w-4',
  isCoarsePointer = false,
  onRedo,
  onUndo,
  redoDisabled = false,
  redoLabel,
  redoTestId,
  size = 'lg',
  undoDisabled = false,
  undoLabel,
  undoTestId,
  variant = 'surface',
}: KangurDrawingHistoryActionsProps): React.JSX.Element {
  const resolvedButtonClassName = cn(buttonClassName, isCoarsePointer && 'min-h-11');
  const isIconOnly = display === 'icon';

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <KangurButton
        aria-label={undoLabel}
        className={resolvedButtonClassName}
        data-testid={undoTestId}
        disabled={undoDisabled}
        onClick={onUndo}
        size={size}
        type='button'
        variant={variant}
      >
        <RotateCcw aria-hidden='true' className={iconClassName} />
        {isIconOnly ? <span className='sr-only'>{undoLabel}</span> : undoLabel}
      </KangurButton>
      <KangurButton
        aria-label={redoLabel}
        className={resolvedButtonClassName}
        data-testid={redoTestId}
        disabled={redoDisabled}
        onClick={onRedo}
        size={size}
        type='button'
        variant={variant}
      >
        <Redo2 aria-hidden='true' className={iconClassName} />
        {isIconOnly ? <span className='sr-only'>{redoLabel}</span> : redoLabel}
      </KangurButton>
    </div>
  );
}
