'use client';

import {
  KangurDrawingUtilityActions,
  type KangurDrawingUtilityActionsProps,
} from '@/features/kangur/ui/components/drawing-engine/KangurDrawingUtilityActions';

type KangurManagedDrawingUtilityActionsProps = Omit<
  KangurDrawingUtilityActionsProps,
  'exportDisabled' | 'redoDisabled' | 'undoDisabled'
> & {
  canExport?: boolean;
  canRedo?: boolean;
  canUndo?: boolean;
  exportLocked?: boolean;
  historyLocked?: boolean;
};

export function KangurManagedDrawingUtilityActions({
  canExport = true,
  canRedo = true,
  canUndo = true,
  exportLocked = false,
  historyLocked = false,
  ...props
}: KangurManagedDrawingUtilityActionsProps): React.JSX.Element {
  return (
    <KangurDrawingUtilityActions
      {...props}
      exportDisabled={exportLocked || !canExport}
      redoDisabled={historyLocked || !canRedo}
      undoDisabled={historyLocked || !canUndo}
    />
  );
}
