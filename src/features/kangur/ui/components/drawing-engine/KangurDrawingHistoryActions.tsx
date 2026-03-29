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

type ResolvedKangurDrawingHistoryActionsProps = Omit<
  KangurDrawingHistoryActionsProps,
  'display' | 'iconClassName' | 'isCoarsePointer' | 'redoDisabled' | 'size' | 'undoDisabled' | 'variant'
> & {
  display: 'icon' | 'label';
  iconClassName: string;
  isCoarsePointer: boolean;
  redoDisabled: boolean;
  size: 'lg' | 'sm';
  undoDisabled: boolean;
  variant: KangurButtonProps['variant'];
};

const resolveKangurDrawingHistoryActionsProps = (
  props: KangurDrawingHistoryActionsProps
): ResolvedKangurDrawingHistoryActionsProps => ({
  ...props,
  display: props.display ?? 'label',
  iconClassName: props.iconClassName ?? 'h-4 w-4',
  isCoarsePointer: props.isCoarsePointer ?? false,
  redoDisabled: props.redoDisabled ?? false,
  size: props.size ?? 'lg',
  undoDisabled: props.undoDisabled ?? false,
  variant: props.variant ?? 'surface',
});

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

const renderKangurDrawingHistoryButtonLabel = (
  display: 'icon' | 'label',
  label: string
): React.ReactNode =>
  display === 'icon' ? <span className='sr-only'>{label}</span> : label;

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
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {renderKangurDrawingHistoryButton({
        ariaLabel: undoLabel,
        buttonClassName: resolvedButtonClassName,
        children: (
          <>
            <RotateCcw aria-hidden='true' className={iconClassName} />
            {renderKangurDrawingHistoryButtonLabel(display, undoLabel)}
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
            {renderKangurDrawingHistoryButtonLabel(display, redoLabel)}
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
  ...props
}: KangurDrawingHistoryActionsProps): React.JSX.Element {
  const resolvedProps = resolveKangurDrawingHistoryActionsProps(props);
  const resolvedButtonClassName = cn(
    resolvedProps.buttonClassName,
    resolvedProps.isCoarsePointer && 'min-h-11'
  );
  return renderKangurDrawingHistoryActions({
    className: resolvedProps.className,
    display: resolvedProps.display,
    iconClassName: resolvedProps.iconClassName,
    onRedo: resolvedProps.onRedo,
    onUndo: resolvedProps.onUndo,
    redoDisabled: resolvedProps.redoDisabled,
    redoLabel: resolvedProps.redoLabel,
    redoTestId: resolvedProps.redoTestId,
    resolvedButtonClassName,
    size: resolvedProps.size,
    undoDisabled: resolvedProps.undoDisabled,
    undoLabel: resolvedProps.undoLabel,
    undoTestId: resolvedProps.undoTestId,
    variant: resolvedProps.variant,
  });
}
