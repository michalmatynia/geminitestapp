'use client';

import { KangurDrawingHistoryActions } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingHistoryActions';
import { KangurDrawingSnapshotActions } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingSnapshotActions';

type KangurDrawingUtilityActionsProps = {
  exportButtonClassName?: string;
  exportClassName?: string;
  exportDisabled?: boolean;
  exportLabel: string;
  exportTestId?: string;
  historyButtonClassName?: string;
  historyClassName?: string;
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
};

export function KangurDrawingUtilityActions({
  exportButtonClassName,
  exportClassName,
  exportDisabled = false,
  exportLabel,
  exportTestId,
  historyButtonClassName,
  historyClassName,
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
}: KangurDrawingUtilityActionsProps): React.JSX.Element {
  return (
    <>
      <KangurDrawingHistoryActions
        buttonClassName={historyButtonClassName}
        className={historyClassName}
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
      />
      <KangurDrawingSnapshotActions
        buttonClassName={exportButtonClassName}
        className={exportClassName}
        exportDisabled={exportDisabled}
        exportLabel={exportLabel}
        exportTestId={exportTestId}
        isCoarsePointer={isCoarsePointer}
        onExport={onExport}
        size={size}
      />
    </>
  );
}
