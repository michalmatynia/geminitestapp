'use client';

import {
  type KangurDrawingUtilityActionsProps,
} from '@/features/kangur/ui/components/drawing-engine/KangurDrawingUtilityActions';
import { KangurDrawingHistoryActions } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingHistoryActions';
import { KangurDrawingSnapshotActions } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingSnapshotActions';

type KangurDrawingUtilityLayoutPreset =
  | 'footer'
  | 'freeform-toolbar'
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

type ResolvedKangurManagedDrawingUtilityActionsProps = Omit<
  KangurManagedDrawingUtilityActionsProps,
  'canExport' | 'canRedo' | 'canUndo' | 'exportLocked' | 'historyLocked'
> & {
  canExport: boolean;
  canRedo: boolean;
  canUndo: boolean;
  exportLocked: boolean;
  historyLocked: boolean;
};

const resolveManagedDrawingUtilityActionProps = (
  props: KangurManagedDrawingUtilityActionsProps
): ResolvedKangurManagedDrawingUtilityActionsProps => ({
  ...props,
  canExport: props.canExport ?? true,
  canRedo: props.canRedo ?? true,
  canUndo: props.canUndo ?? true,
  exportLocked: props.exportLocked ?? false,
  historyLocked: props.historyLocked ?? false,
});

const resolveFooterPresetProps = (
  isCoarsePointer: boolean
): Partial<KangurDrawingUtilityActionsProps> => ({
  exportButtonClassName: isCoarsePointer ? 'px-4' : undefined,
  historyButtonClassName: isCoarsePointer ? 'px-4' : undefined,
  size: 'sm',
});

const resolveFreeformToolbarPresetProps = (
  isCoarsePointer: boolean
): Partial<KangurDrawingUtilityActionsProps> => {
  const buttonClassName = [
    '!min-w-0 !gap-0 rounded-full',
    '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]',
    'hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))]',
    'hover:[color:var(--kangur-chat-panel-text,var(--kangur-page-text))]',
    isCoarsePointer ? 'h-11 w-11' : 'h-6 w-6',
  ].join(' ');

  return {
    display: 'icon',
    exportButtonClassName: buttonClassName,
    exportClassName: 'flex items-center',
    historyButtonClassName: buttonClassName,
    historyClassName: 'flex items-center gap-1',
    iconClassName: 'h-3 w-3',
    size: 'sm',
    variant: 'ghost',
  };
};

const PRESET_PROP_RESOLVERS: Record<
  KangurDrawingUtilityLayoutPreset,
  (isCoarsePointer: boolean) => Partial<KangurDrawingUtilityActionsProps>
> = {
  footer: resolveFooterPresetProps,
  'freeform-toolbar': resolveFreeformToolbarPresetProps,
  'practice-board': () => ({
    exportButtonClassName: 'w-full',
    exportClassName: 'w-full sm:flex-1',
    historyButtonClassName: 'w-full sm:flex-1',
    historyClassName: 'w-full sm:flex-1',
  }),
  'inline-board': () => ({
    exportButtonClassName: 'w-full sm:flex-1',
    historyButtonClassName: 'w-full sm:flex-1',
  }),
};

const getPresetProps = (
  layoutPreset: KangurDrawingUtilityLayoutPreset | undefined,
  isCoarsePointer: boolean
): Partial<KangurDrawingUtilityActionsProps> =>
  layoutPreset ? PRESET_PROP_RESOLVERS[layoutPreset](isCoarsePointer) : {};

export function KangurManagedDrawingUtilityActions(
  props: KangurManagedDrawingUtilityActionsProps
): React.JSX.Element {
  const resolvedManagedProps = resolveManagedDrawingUtilityActionProps(props);
  const presetProps = getPresetProps(
    resolvedManagedProps.layoutPreset,
    resolvedManagedProps.isCoarsePointer ?? false
  );
  const resolvedProps: KangurDrawingUtilityActionsProps = {
    ...presetProps,
    ...resolvedManagedProps,
    exportDisabled: resolvedManagedProps.exportLocked || !resolvedManagedProps.canExport,
    redoDisabled: resolvedManagedProps.historyLocked || !resolvedManagedProps.canRedo,
    undoDisabled: resolvedManagedProps.historyLocked || !resolvedManagedProps.canUndo,
  };

  return (
    <>
      <KangurDrawingHistoryActions
        buttonClassName={resolvedProps.historyButtonClassName}
        className={resolvedProps.historyClassName}
        display={resolvedProps.display}
        iconClassName={resolvedProps.iconClassName}
        isCoarsePointer={resolvedProps.isCoarsePointer}
        onRedo={resolvedProps.onRedo}
        onUndo={resolvedProps.onUndo}
        redoDisabled={resolvedProps.redoDisabled}
        redoLabel={resolvedProps.redoLabel}
        redoTestId={resolvedProps.redoTestId}
        size={resolvedProps.size}
        undoDisabled={resolvedProps.undoDisabled}
        undoLabel={resolvedProps.undoLabel}
        undoTestId={resolvedProps.undoTestId}
        variant={resolvedProps.variant}
      />
      <KangurDrawingSnapshotActions
        buttonClassName={resolvedProps.exportButtonClassName}
        className={resolvedProps.exportClassName}
        display={resolvedProps.display}
        exportDisabled={resolvedProps.exportDisabled}
        exportLabel={resolvedProps.exportLabel}
        exportTestId={resolvedProps.exportTestId}
        iconClassName={resolvedProps.iconClassName}
        isCoarsePointer={resolvedProps.isCoarsePointer}
        onExport={resolvedProps.onExport}
        size={resolvedProps.size}
        variant={resolvedProps.variant}
      />
    </>
  );
}
