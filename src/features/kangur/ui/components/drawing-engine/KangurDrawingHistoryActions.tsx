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

const renderKangurDrawingHistoryButton = ({
  ariaLabel,
  buttonClassName,
  children,
  disabled,
  onClick,
  size,
  testId,
  variant,
}: {
  ariaLabel: string;
  buttonClassName: string;
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
  size: 'lg' | 'sm';
  testId?: string;
  variant: KangurButtonProps['variant'];
}): React.JSX.Element => (
  <KangurButton
    aria-label={ariaLabel}
    className={buttonClassName}
    data-testid={testId}
    disabled={disabled}
    onClick={onClick}
    size={size}
    type='button'
    variant={variant}
  >
    {children}
  </KangurButton>
);

const renderKangurDrawingHistoryActions = ({
  className,
  display,
  iconClassName,
  onRedo,
  onUndo,
  redoDisabled,
  redoLabel,
  redoTestId,
  resolvedButtonClassName,
  size,
  undoDisabled,
  undoLabel,
  undoTestId,
  variant,
}: {
  className?: string;
  display: 'icon' | 'label';
  iconClassName: string;
  onRedo: () => void;
  onUndo: () => void;
  redoDisabled: boolean;
  redoLabel: string;
  redoTestId?: string;
  resolvedButtonClassName: string;
  size: 'lg' | 'sm';
  undoDisabled: boolean;
  undoLabel: string;
  undoTestId?: string;
  variant: KangurButtonProps['variant'];
}): React.JSX.Element => {
  const isIconOnly = display === 'icon';

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {renderKangurDrawingHistoryButton({
        ariaLabel: undoLabel,
        buttonClassName: resolvedButtonClassName,
        children: (
          <>
            <RotateCcw aria-hidden='true' className={iconClassName} />
            {isIconOnly ? <span className='sr-only'>{undoLabel}</span> : undoLabel}
          </>
        ),
        disabled: undoDisabled,
        onClick: onUndo,
        size,
        testId: undoTestId,
        variant,
      })}
      {renderKangurDrawingHistoryButton({
        ariaLabel: redoLabel,
        buttonClassName: resolvedButtonClassName,
        children: (
          <>
            <Redo2 aria-hidden='true' className={iconClassName} />
            {isIconOnly ? <span className='sr-only'>{redoLabel}</span> : redoLabel}
          </>
        ),
        disabled: redoDisabled,
        onClick: onRedo,
        size,
        testId: redoTestId,
        variant,
      })}
    </div>
  );
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
  return renderKangurDrawingHistoryActions({
    className,
    display,
    iconClassName,
    onRedo,
    onUndo,
    redoDisabled,
    redoLabel,
    redoTestId,
    resolvedButtonClassName,
    size,
    undoDisabled,
    undoLabel,
    undoTestId,
    variant,
  });
}
