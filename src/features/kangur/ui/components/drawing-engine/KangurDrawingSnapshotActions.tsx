'use client';

import { Download } from 'lucide-react';

import { KangurButton, type KangurButtonProps } from '@/features/kangur/ui/design/primitives';
import { cn } from '@/features/kangur/shared/utils';

type KangurDrawingSnapshotActionsProps = {
  buttonClassName?: string;
  className?: string;
  display?: 'icon' | 'label';
  exportDisabled?: boolean;
  exportLabel: string;
  exportTestId?: string;
  iconClassName?: string;
  isCoarsePointer?: boolean;
  onExport: () => void;
  size?: 'lg' | 'sm';
  variant?: KangurButtonProps['variant'];
};

const renderKangurDrawingSnapshotActions = ({
  buttonClassName,
  className,
  display,
  exportDisabled,
  exportLabel,
  exportTestId,
  iconClassName,
  isCoarsePointer,
  onExport,
  size,
  variant,
}: KangurDrawingSnapshotActionsProps): React.JSX.Element => (
  <div className={cn('flex flex-wrap gap-2', className)}>
    <KangurButton
      aria-label={exportLabel}
      className={cn(buttonClassName, isCoarsePointer && 'min-h-11')}
      data-testid={exportTestId}
      disabled={exportDisabled}
      onClick={onExport}
      size={size}
      title={exportLabel}
      type='button'
      variant={variant}
    >
      <Download
        aria-hidden='true'
        className={cn(display === 'icon' ? 'h-3 w-3' : 'h-4 w-4', iconClassName)}
      />
      {display === 'label' ? exportLabel : null}
    </KangurButton>
  </div>
);

export function KangurDrawingSnapshotActions({
  buttonClassName,
  className,
  display = 'label',
  exportDisabled = false,
  exportLabel,
  exportTestId,
  iconClassName,
  isCoarsePointer = false,
  onExport,
  size = 'lg',
  variant = 'surface',
}: KangurDrawingSnapshotActionsProps): React.JSX.Element {
  return renderKangurDrawingSnapshotActions({
    buttonClassName,
    className,
    display,
    exportDisabled,
    exportLabel,
    exportTestId,
    iconClassName,
    isCoarsePointer,
    onExport,
    size,
    variant,
  });
}
