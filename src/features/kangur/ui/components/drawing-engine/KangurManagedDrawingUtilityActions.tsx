'use client';

import {
  KangurDrawingUtilityActions,
  type KangurDrawingUtilityActionsProps,
} from '@/features/kangur/ui/components/drawing-engine/KangurDrawingUtilityActions';

type KangurDrawingUtilityLayoutPreset =
  | 'footer'
  | 'practice-board'
  | 'inline-board';

type KangurManagedDrawingUtilityActionsProps = Omit<
  KangurDrawingUtilityActionsProps,
  'exportDisabled' | 'redoDisabled' | 'undoDisabled'
> & {
  canExport?: boolean;
  canRedo?: boolean;
  canUndo?: boolean;
  exportLocked?: boolean;
  historyLocked?: boolean;
  layoutPreset?: KangurDrawingUtilityLayoutPreset;
};

const getPresetProps = (
  layoutPreset: KangurDrawingUtilityLayoutPreset | undefined,
  isCoarsePointer: boolean
): Partial<KangurDrawingUtilityActionsProps> => {
  if (layoutPreset === 'footer') {
    return {
      exportButtonClassName: isCoarsePointer ? 'px-4' : undefined,
      historyButtonClassName: isCoarsePointer ? 'px-4' : undefined,
      size: 'sm',
    };
  }

  if (layoutPreset === 'practice-board') {
    return {
      exportButtonClassName: 'w-full',
      exportClassName: 'w-full sm:flex-1',
      historyButtonClassName: 'w-full sm:flex-1',
      historyClassName: 'w-full sm:flex-1',
    };
  }

  if (layoutPreset === 'inline-board') {
    return {
      exportButtonClassName: 'w-full sm:flex-1',
      historyButtonClassName: 'w-full sm:flex-1',
    };
  }

  return {};
};

export function KangurManagedDrawingUtilityActions({
  canExport = true,
  canRedo = true,
  canUndo = true,
  exportLocked = false,
  historyLocked = false,
  layoutPreset,
  ...props
}: KangurManagedDrawingUtilityActionsProps): React.JSX.Element {
  const presetProps = getPresetProps(layoutPreset, props.isCoarsePointer ?? false);

  return (
    <KangurDrawingUtilityActions
      {...presetProps}
      {...props}
      exportDisabled={exportLocked || !canExport}
      redoDisabled={historyLocked || !canRedo}
      undoDisabled={historyLocked || !canUndo}
    />
  );
}
