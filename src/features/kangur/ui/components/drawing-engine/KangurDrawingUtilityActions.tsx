import type { KangurButtonProps } from '@/features/kangur/ui/design/primitives';
import { KangurDrawingHistoryActions } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingHistoryActions';
import { KangurDrawingSnapshotActions } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingSnapshotActions';

export type KangurDrawingUtilityActionsProps = {
  display?: 'icon' | 'label';
  exportButtonClassName?: string;
  exportClassName?: string;
  exportDisabled?: boolean;
  exportLabel: string;
  exportTestId?: string;
  historyButtonClassName?: string;
  historyClassName?: string;
  iconClassName?: string;
  isCoarsePointer?: boolean;
  onExport: () => void;
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

const renderKangurDrawingUtilityActions = ({
  display,
  exportButtonClassName,
  exportClassName,
  exportDisabled,
  exportLabel,
  exportTestId,
  historyButtonClassName,
  historyClassName,
  iconClassName,
  isCoarsePointer,
  onExport,
  onRedo,
  onUndo,
  redoDisabled,
  redoLabel,
  redoTestId,
  size,
  undoDisabled,
  undoLabel,
  undoTestId,
  variant,
}: KangurDrawingUtilityActionsProps): React.JSX.Element => (
  <>
    <KangurDrawingHistoryActions
      buttonClassName={historyButtonClassName}
      className={historyClassName}
      display={display}
      iconClassName={iconClassName}
      isCoarsePointer={isCoarsePointer}
      onRedo={onRedo}
      onUndo={onUndo}
      redoDisabled={redoDisabled}
      redoLabel={redoLabel}
      redoTestId={redoTestId}
      size={size}
      undoDisabled={undoDisabled}
      undoLabel={undoLabel}
      undoTestId={undoTestId}
      variant={variant}
    />
    <KangurDrawingSnapshotActions
      buttonClassName={exportButtonClassName}
      className={exportClassName}
      display={display}
      exportDisabled={exportDisabled}
      exportLabel={exportLabel}
      exportTestId={exportTestId}
      iconClassName={iconClassName}
      isCoarsePointer={isCoarsePointer}
      onExport={onExport}
      size={size}
      variant={variant}
    />
  </>
);

export function KangurDrawingUtilityActions({
  display = 'label',
  exportButtonClassName,
  exportClassName,
  exportDisabled = false,
  exportLabel,
  exportTestId,
  historyButtonClassName,
  historyClassName,
  iconClassName,
  isCoarsePointer = false,
  onExport,
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
}: KangurDrawingUtilityActionsProps): React.JSX.Element {
  return renderKangurDrawingUtilityActions({
    display,
    exportButtonClassName,
    exportClassName,
    exportDisabled,
    exportLabel,
    exportTestId,
    historyButtonClassName,
    historyClassName,
    iconClassName,
    isCoarsePointer,
    onExport,
    onRedo,
    onUndo,
    redoDisabled,
    redoLabel,
    redoTestId,
    size,
    undoDisabled,
    undoLabel,
    undoTestId,
    variant,
  });
}
