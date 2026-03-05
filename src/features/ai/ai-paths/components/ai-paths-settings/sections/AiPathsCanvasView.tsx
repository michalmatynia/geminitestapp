'use client';

import React from 'react';
import { createPortal } from 'react-dom';

import {
  AI_PATHS_RUNTIME_KERNEL_MODE_KEY,
  AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY,
  AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY,
  AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_KEY,
} from '@/shared/lib/ai-paths';
import {
  fetchAiPathsSettingsByKeysCached,
  invalidateAiPathsSettingsCache,
  updateAiPathsSettingsBulk,
} from '@/shared/lib/ai-paths/settings-store-client';
import { Button, StatusBadge, SelectSimple } from '@/shared/ui';
import { useAiPathsSettingsPageContext } from '../AiPathsSettingsPageContext';
import { useGraphActions, useSelectionActions, useSelectionState } from '../../../context';
import { CanvasBoard } from '../../canvas-board';
import { CanvasSidebar } from '../../canvas-sidebar';
import { ClusterPresetsPanel } from '../../cluster-presets-panel';
import { GraphModelDebugPanel } from '../../graph-model-debug-panel';
import { RunHistoryPanel } from '../../run-history-panel';
import { RuntimeEventLogPanel } from '../../runtime-event-log-panel';
import { AiPathsRuntimeAnalysis } from '../panels/AiPathsRuntimeAnalysis';
import { AiPathsLiveLog } from './AiPathsLiveLog';

const normalizeRuntimeKernelPilotNodeTypeToken = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, '_');

const normalizeRuntimeKernelResolverIdToken = (value: string): string => value.trim();

const parseRuntimeKernelListValue = ({
  value,
  normalizeToken,
}: {
  value: unknown;
  normalizeToken: (token: string) => string;
}): string[] => {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .filter((entry): entry is string => typeof entry === 'string')
          .map((entry: string): string => normalizeToken(entry))
          .filter(Boolean)
      )
    );
  }
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return Array.from(
          new Set(
            parsed
              .filter((entry): entry is string => typeof entry === 'string')
              .map((entry: string): string => normalizeToken(entry))
              .filter(Boolean)
          )
        );
      }
    } catch {
      // Fall through to tokenized parsing.
    }
  }
  return Array.from(
    new Set(
      trimmed
        .split(/[,\n]/g)
        .map((entry: string): string => normalizeToken(entry))
        .filter(Boolean)
    )
  );
};

const parseRuntimeKernelPilotNodeTypes = (value: unknown): string[] =>
  parseRuntimeKernelListValue({
    value,
    normalizeToken: normalizeRuntimeKernelPilotNodeTypeToken,
  });

const parseRuntimeKernelCodeObjectResolverIds = (value: unknown): string[] =>
  parseRuntimeKernelListValue({
    value,
    normalizeToken: normalizeRuntimeKernelResolverIdToken,
  });

type PathRuntimeKernelModeDraft = 'inherit' | 'auto';
type RuntimeKernelStrictDraft = 'default' | 'true' | 'false';
type PathRuntimeKernelStrictDraft = 'inherit' | 'true' | 'false';

const parseRuntimeKernelModeValue = (value: unknown): 'auto' | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  return normalized === 'auto' || normalized === 'legacy_only' ? 'auto' : undefined;
};

const parseRuntimeKernelStrictNativeRegistryValue = (
  value: unknown
): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on')
    return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off')
    return false;
  return undefined;
};

const parsePathRuntimeKernelMode = (value: unknown): PathRuntimeKernelModeDraft =>
  parseRuntimeKernelModeValue(value) === 'auto' ? 'auto' : 'inherit';

const PATH_RUNTIME_KERNEL_MODE_OPTIONS = [
  {
    value: 'inherit',
    label: 'Inherit Global',
  },
  {
    value: 'auto',
    label: 'Auto',
  },
] as const;

const RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_OPTIONS = [
  {
    value: 'default',
    label: 'Default (Off)',
  },
  {
    value: 'true',
    label: 'Strict On',
  },
  {
    value: 'false',
    label: 'Strict Off',
  },
] as const;

const PATH_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_OPTIONS = [
  {
    value: 'inherit',
    label: 'Inherit Global',
  },
  {
    value: 'true',
    label: 'Strict On',
  },
  {
    value: 'false',
    label: 'Strict Off',
  },
] as const;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export function AiPathsCanvasView(): React.JSX.Element | null {
  const {
    activeTab,
    isFocusMode,
    onFocusModeChange,
    renderActions,
    confirmNodeSwitch,
    savePathConfig,
    saving,
    setPathSettingsModalOpen,
    activePathId,
    nodeValidationEnabled: nodeValidationEnabledFromContext,
    updateAiPathsValidation,
    validationPreflightReport,
    handleOpenNodeValidator,
    docsTooltipsEnabled,
    setDocsTooltipsEnabled,
    handleTogglePathLock,
    isPathLocked,
    handleRunNodeValidationCheck,
    toast,
    autoSaveLabel,
    autoSaveVariant,
    lastRunAt,
    isPathNameEditing,
    renameDraft,
    setRenameDraft,
    commitPathNameEdit,
    cancelPathNameEdit,
    startPathNameEdit,
    pathName,
    pathSwitchOptions,
    handleSwitchPath,
    isPathSwitching,
    lastError,
    persistLastError,
    incrementLoadNonce,
    handleClearConnectorData,
    handleClearHistory,
    handleDeleteSelectedNode,
    isPathActive,
    handleTogglePathActive,
    hasHistory,
    selectionScopeMode,
    setSelectionScopeMode,
    dataContractReport,
    setDataContractInspectorNodeId,
    paths,
    pathConfigs,
    persistPathSettings,
  } = useAiPathsSettingsPageContext();
  const canvasContainerRef = React.useRef<HTMLDivElement | null>(null);
  const isRightSidebarCollapsed = false;
  const setIsFocusMode = onFocusModeChange ?? (() => undefined);

  const {
    selectionToolMode,
    nodeConfigDirty: nodeConfigDirtySelection,
    selectedNodeIds: selectedNodeIdsCtx,
    selectedEdgeId: selectedEdgeIdCtx,
  } = useSelectionState();
  const { setSelectionToolMode } = useSelectionActions();
  const { setPathConfigs, setPaths } = useGraphActions();

  const notify = toast ?? (() => undefined);
  const savePath = savePathConfig ?? (async (): Promise<boolean> => false);
  const openPathSettings = setPathSettingsModalOpen ?? (() => undefined);
  const toggleDocsTooltips = setDocsTooltipsEnabled ?? (() => undefined);
  const togglePathLock = handleTogglePathLock ?? (() => undefined);
  const runNodeValidationCheck = handleRunNodeValidationCheck ?? (() => undefined);
  const openNodeValidator = handleOpenNodeValidator ?? (() => undefined);
  const patchAiPathsValidation = updateAiPathsValidation ?? (() => undefined);
  const clearConnectorData = handleClearConnectorData ?? (async (): Promise<void> => undefined);
  const clearHistory = handleClearHistory ?? (async (): Promise<void> => undefined);
  const togglePathActive = handleTogglePathActive ?? (() => undefined);
  const persistLastErrorSafe = persistLastError ?? (async (): Promise<void> => undefined);
  const bumpLoadNonce = incrementLoadNonce ?? (() => undefined);
  const confirmNodeSwitchSafe = confirmNodeSwitch ?? (async (): Promise<boolean> => true);
  const nodeValidationEnabled = nodeValidationEnabledFromContext !== false;
  const validationBlocked = Boolean(validationPreflightReport?.blocked);
  const validationWarn = Boolean(validationPreflightReport?.shouldWarn);
  const validationScore = validationPreflightReport?.score ?? 0;
  const validationFailedRules = validationPreflightReport?.failedRules ?? 0;
  const selectedCount = selectedNodeIdsCtx.length;
  const removeSelection = handleDeleteSelectedNode ?? (() => undefined);
  const canDeleteSelection = !isPathSwitching && (selectedCount > 0 || Boolean(selectedEdgeIdCtx));
  const scopeMode = selectionScopeMode === 'wiring' ? 'wiring' : 'portion';
  const setScopeMode = setSelectionScopeMode ?? (() => undefined);
  const docsTooltipsOn = Boolean(docsTooltipsEnabled);
  const activePath = activePathId ?? null;
  const switchPath = handleSwitchPath ?? (() => undefined);
  const pathOptions = Array.isArray(pathSwitchOptions) ? pathSwitchOptions : [];
  const nodeDiagnosticsById = dataContractReport?.byNodeId ?? {};
  const focusDataContractNode = setDataContractInspectorNodeId ?? (() => undefined);
  const [runtimeKernelPilotNodeTypesDraft, setRuntimeKernelPilotNodeTypesDraft] =
    React.useState<string>('');
  const [runtimeKernelPersistedPilotNodeTypes, setRuntimeKernelPersistedPilotNodeTypes] =
    React.useState<string[]>([]);
  const [runtimeKernelResolverIdsDraft, setRuntimeKernelResolverIdsDraft] =
    React.useState<string>('');
  const [runtimeKernelPersistedMode, setRuntimeKernelPersistedMode] = React.useState<
    'auto' | undefined
  >(undefined);
  const [runtimeKernelPersistedResolverIds, setRuntimeKernelPersistedResolverIds] =
    React.useState<string[]>([]);
  const [runtimeKernelStrictNativeRegistryDraft, setRuntimeKernelStrictNativeRegistryDraft] =
    React.useState<RuntimeKernelStrictDraft>('default');
  const [runtimeKernelPersistedStrictNativeRegistry, setRuntimeKernelPersistedStrictNativeRegistry] =
    React.useState<boolean | undefined>(undefined);
  const [runtimeKernelLoading, setRuntimeKernelLoading] = React.useState(true);
  const [runtimeKernelSaving, setRuntimeKernelSaving] = React.useState(false);
  const [pathRuntimeKernelPilotNodeTypesDraft, setPathRuntimeKernelPilotNodeTypesDraft] =
    React.useState<string>('');
  const [pathRuntimeKernelPersistedPilotNodeTypes, setPathRuntimeKernelPersistedPilotNodeTypes] =
    React.useState<string[]>([]);
  const [pathRuntimeKernelModeDraft, setPathRuntimeKernelModeDraft] =
    React.useState<PathRuntimeKernelModeDraft>('inherit');
  const [pathRuntimeKernelPersistedMode, setPathRuntimeKernelPersistedMode] =
    React.useState<PathRuntimeKernelModeDraft>('inherit');
  const [pathRuntimeKernelResolverIdsDraft, setPathRuntimeKernelResolverIdsDraft] =
    React.useState<string>('');
  const [pathRuntimeKernelPersistedResolverIds, setPathRuntimeKernelPersistedResolverIds] =
    React.useState<string[]>([]);
  const [pathRuntimeKernelStrictNativeRegistryDraft, setPathRuntimeKernelStrictNativeRegistryDraft] =
    React.useState<PathRuntimeKernelStrictDraft>('inherit');
  const [pathRuntimeKernelPersistedStrictNativeRegistry, setPathRuntimeKernelPersistedStrictNativeRegistry] =
    React.useState<PathRuntimeKernelStrictDraft>('inherit');
  const [pathRuntimeKernelSaving, setPathRuntimeKernelSaving] = React.useState(false);

  const loadRuntimeKernelSettings = React.useCallback(async (): Promise<void> => {
    setRuntimeKernelLoading(true);
    try {
      const records = await fetchAiPathsSettingsByKeysCached(
        [
          AI_PATHS_RUNTIME_KERNEL_MODE_KEY,
          AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY,
          AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY,
          AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_KEY,
        ],
        { timeoutMs: 8_000, bypassCache: true }
      );
      const settingsMap = new Map(records.map((record) => [record.key, record.value]));
      const mode = parseRuntimeKernelModeValue(settingsMap.get(AI_PATHS_RUNTIME_KERNEL_MODE_KEY));
      const pilotNodeTypes = parseRuntimeKernelPilotNodeTypes(
        settingsMap.get(AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY)
      );
      const resolverIds = parseRuntimeKernelCodeObjectResolverIds(
        settingsMap.get(AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY)
      );
      const strictNativeRegistry = parseRuntimeKernelStrictNativeRegistryValue(
        settingsMap.get(AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_KEY)
      );
      setRuntimeKernelPersistedMode(mode);
      setRuntimeKernelPersistedPilotNodeTypes(pilotNodeTypes);
      setRuntimeKernelPilotNodeTypesDraft(pilotNodeTypes.join(', '));
      setRuntimeKernelPersistedResolverIds(resolverIds);
      setRuntimeKernelResolverIdsDraft(resolverIds.join(', '));
      setRuntimeKernelPersistedStrictNativeRegistry(strictNativeRegistry);
      setRuntimeKernelStrictNativeRegistryDraft(
        strictNativeRegistry === undefined ? 'default' : strictNativeRegistry ? 'true' : 'false'
      );
    } catch {
      // Non-fatal: keep defaults and let run-time env/settings resolver stay authoritative.
    } finally {
      setRuntimeKernelLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadRuntimeKernelSettings();
  }, [loadRuntimeKernelSettings]);

  const runtimeKernelDraftPilotNodeTypes = React.useMemo(
    () => parseRuntimeKernelPilotNodeTypes(runtimeKernelPilotNodeTypesDraft),
    [runtimeKernelPilotNodeTypesDraft]
  );
  const runtimeKernelDraftResolverIds = React.useMemo(
    () => parseRuntimeKernelCodeObjectResolverIds(runtimeKernelResolverIdsDraft),
    [runtimeKernelResolverIdsDraft]
  );
  const runtimeKernelSettingsDirty =
    runtimeKernelDraftPilotNodeTypes.join(',') !== runtimeKernelPersistedPilotNodeTypes.join(',') ||
    runtimeKernelDraftResolverIds.join(',') !== runtimeKernelPersistedResolverIds.join(',');
  React.useEffect(() => {
    if (!activePath) {
      setPathRuntimeKernelPersistedMode('inherit');
      setPathRuntimeKernelModeDraft('inherit');
      setPathRuntimeKernelPersistedPilotNodeTypes([]);
      setPathRuntimeKernelPilotNodeTypesDraft('');
      setPathRuntimeKernelPersistedResolverIds([]);
      setPathRuntimeKernelResolverIdsDraft('');
      setPathRuntimeKernelPersistedStrictNativeRegistry('inherit');
      setPathRuntimeKernelStrictNativeRegistryDraft('inherit');
      return;
    }
    const activeConfig = pathConfigs[activePath];
    const extensionsRecord = asRecord(activeConfig?.extensions);
    const runtimeKernelRecord = asRecord(extensionsRecord?.['runtimeKernel']);
    const mode = parsePathRuntimeKernelMode(runtimeKernelRecord?.['mode']);
    const pilotNodeTypes = parseRuntimeKernelPilotNodeTypes(runtimeKernelRecord?.['pilotNodeTypes']);
    const resolverIds = parseRuntimeKernelCodeObjectResolverIds(
      runtimeKernelRecord?.['codeObjectResolverIds'] ?? runtimeKernelRecord?.['resolverIds']
    );
    const strictNativeRegistry = parseRuntimeKernelStrictNativeRegistryValue(
      runtimeKernelRecord?.['strictNativeRegistry']
    );
    const strictNativeRegistryDraft: PathRuntimeKernelStrictDraft =
      strictNativeRegistry === undefined ? 'inherit' : strictNativeRegistry ? 'true' : 'false';
    setPathRuntimeKernelPersistedMode(mode);
    setPathRuntimeKernelModeDraft(mode);
    setPathRuntimeKernelPersistedPilotNodeTypes(pilotNodeTypes);
    setPathRuntimeKernelPilotNodeTypesDraft(pilotNodeTypes.join(', '));
    setPathRuntimeKernelPersistedResolverIds(resolverIds);
    setPathRuntimeKernelResolverIdsDraft(resolverIds.join(', '));
    setPathRuntimeKernelPersistedStrictNativeRegistry(strictNativeRegistryDraft);
    setPathRuntimeKernelStrictNativeRegistryDraft(strictNativeRegistryDraft);
  }, [activePath, pathConfigs]);
  const pathRuntimeKernelDraftPilotNodeTypes = React.useMemo(
    () => parseRuntimeKernelPilotNodeTypes(pathRuntimeKernelPilotNodeTypesDraft),
    [pathRuntimeKernelPilotNodeTypesDraft]
  );
  const pathRuntimeKernelDraftResolverIds = React.useMemo(
    () => parseRuntimeKernelCodeObjectResolverIds(pathRuntimeKernelResolverIdsDraft),
    [pathRuntimeKernelResolverIdsDraft]
  );
  const pathRuntimeKernelSettingsDirty =
    pathRuntimeKernelModeDraft !== pathRuntimeKernelPersistedMode ||
    pathRuntimeKernelDraftPilotNodeTypes.join(',') !==
    pathRuntimeKernelPersistedPilotNodeTypes.join(',') ||
    pathRuntimeKernelDraftResolverIds.join(',') !== pathRuntimeKernelPersistedResolverIds.join(',') ||
    pathRuntimeKernelStrictNativeRegistryDraft !== pathRuntimeKernelPersistedStrictNativeRegistry;
  const runtimeKernelStrictNativeRegistryDirty =
    runtimeKernelStrictNativeRegistryDraft !==
    (runtimeKernelPersistedStrictNativeRegistry === undefined
      ? 'default'
      : runtimeKernelPersistedStrictNativeRegistry
        ? 'true'
        : 'false');
  const pathRuntimeKernelEffectiveModeSource: 'path' | 'settings' | 'default' =
    pathRuntimeKernelModeDraft === 'auto'
      ? 'path'
      : runtimeKernelPersistedMode === 'auto'
        ? 'settings'
        : 'default';
  const pathRuntimeKernelEffectiveStrictNativeRegistrySource: 'path' | 'settings' | 'default' =
    pathRuntimeKernelStrictNativeRegistryDraft === 'true' ||
    pathRuntimeKernelStrictNativeRegistryDraft === 'false'
      ? 'path'
      : runtimeKernelPersistedStrictNativeRegistry !== undefined
        ? 'settings'
        : 'default';
  const pathRuntimeKernelEffectiveStrictNativeRegistry =
    pathRuntimeKernelStrictNativeRegistryDraft === 'true'
      ? true
      : pathRuntimeKernelStrictNativeRegistryDraft === 'false'
        ? false
        : runtimeKernelPersistedStrictNativeRegistry ?? false;
  const pathRuntimeKernelEffectiveModeVariant =
    pathRuntimeKernelEffectiveModeSource === 'path'
      ? 'success'
      : pathRuntimeKernelEffectiveModeSource === 'settings'
        ? 'active'
        : 'neutral';
  const pathRuntimeKernelEffectiveStrictVariant =
    pathRuntimeKernelEffectiveStrictNativeRegistrySource === 'path'
      ? 'success'
      : pathRuntimeKernelEffectiveStrictNativeRegistrySource === 'settings'
        ? 'active'
        : 'neutral';

  const saveRuntimeKernelSettings = React.useCallback(async (): Promise<void> => {
    if ((!runtimeKernelSettingsDirty && !runtimeKernelStrictNativeRegistryDirty) || runtimeKernelSaving)
      return;
    setRuntimeKernelSaving(true);
    try {
      await updateAiPathsSettingsBulk([
        {
          key: AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY,
          value:
            runtimeKernelDraftPilotNodeTypes.length > 0
              ? JSON.stringify(runtimeKernelDraftPilotNodeTypes)
              : '',
        },
        {
          key: AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY,
          value:
            runtimeKernelDraftResolverIds.length > 0
              ? JSON.stringify(runtimeKernelDraftResolverIds)
              : '',
        },
        {
          key: AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_KEY,
          value:
            runtimeKernelStrictNativeRegistryDraft === 'default'
              ? ''
              : runtimeKernelStrictNativeRegistryDraft === 'true'
                ? 'true'
                : 'false',
        },
      ]);
      invalidateAiPathsSettingsCache();
      setRuntimeKernelPersistedPilotNodeTypes(runtimeKernelDraftPilotNodeTypes);
      setRuntimeKernelPilotNodeTypesDraft(runtimeKernelDraftPilotNodeTypes.join(', '));
      setRuntimeKernelPersistedResolverIds(runtimeKernelDraftResolverIds);
      setRuntimeKernelResolverIdsDraft(runtimeKernelDraftResolverIds.join(', '));
      const strictNativeRegistry =
        runtimeKernelStrictNativeRegistryDraft === 'default'
          ? undefined
          : runtimeKernelStrictNativeRegistryDraft === 'true';
      setRuntimeKernelPersistedStrictNativeRegistry(strictNativeRegistry);
      setRuntimeKernelStrictNativeRegistryDraft(
        strictNativeRegistry === undefined ? 'default' : strictNativeRegistry ? 'true' : 'false'
      );
      notify('Runtime kernel settings saved.', { variant: 'success' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save runtime kernel settings.';
      notify(message, { variant: 'error' });
    } finally {
      setRuntimeKernelSaving(false);
    }
  }, [
    notify,
    runtimeKernelDraftResolverIds,
    runtimeKernelDraftPilotNodeTypes,
    runtimeKernelPersistedResolverIds,
    runtimeKernelStrictNativeRegistryDirty,
    runtimeKernelStrictNativeRegistryDraft,
    runtimeKernelSaving,
    runtimeKernelSettingsDirty,
  ]);
  const savePathRuntimeKernelSettings = React.useCallback(async (): Promise<void> => {
    if (!activePath || !pathRuntimeKernelSettingsDirty || pathRuntimeKernelSaving) return;
    const activeConfig = pathConfigs[activePath];
    if (!activeConfig) return;
    setPathRuntimeKernelSaving(true);
    try {
      const updatedAt = new Date().toISOString();
      const pathMode = pathRuntimeKernelModeDraft === 'auto' ? 'auto' : null;
      const nextRuntimeKernelConfig =
        pathMode !== null ||
        pathRuntimeKernelDraftPilotNodeTypes.length > 0 ||
        pathRuntimeKernelDraftResolverIds.length > 0 ||
        pathRuntimeKernelStrictNativeRegistryDraft !== 'inherit'
          ? {
            ...(pathMode !== null ? { mode: pathMode } : {}),
            ...(pathRuntimeKernelDraftPilotNodeTypes.length > 0
              ? { pilotNodeTypes: pathRuntimeKernelDraftPilotNodeTypes }
              : {}),
            ...(pathRuntimeKernelDraftResolverIds.length > 0
              ? { codeObjectResolverIds: pathRuntimeKernelDraftResolverIds }
              : {}),
            ...(pathRuntimeKernelStrictNativeRegistryDraft !== 'inherit'
              ? {
                strictNativeRegistry: pathRuntimeKernelStrictNativeRegistryDraft === 'true',
              }
              : {}),
          }
          : null;
      const nextExtensions = {
        ...(asRecord(activeConfig.extensions) ?? {}),
      };
      if (nextRuntimeKernelConfig) {
        nextExtensions['runtimeKernel'] = nextRuntimeKernelConfig;
      } else {
        delete nextExtensions['runtimeKernel'];
      }
      const hasExtensions = Object.keys(nextExtensions).length > 0;
      const nextConfig = {
        ...activeConfig,
        updatedAt,
        ...(hasExtensions ? { extensions: nextExtensions } : { extensions: undefined }),
      };
      const nextPaths = paths.map((path) =>
        path.id === activePath ? { ...path, updatedAt } : path
      );
      setPaths(nextPaths);
      setPathConfigs((prev) => ({
        ...prev,
        [activePath]: nextConfig,
      }));
      await persistPathSettings(nextPaths, activePath, nextConfig);
      setPathRuntimeKernelPersistedMode(pathRuntimeKernelModeDraft);
      setPathRuntimeKernelModeDraft(pathRuntimeKernelModeDraft);
      setPathRuntimeKernelPersistedPilotNodeTypes(pathRuntimeKernelDraftPilotNodeTypes);
      setPathRuntimeKernelPilotNodeTypesDraft(pathRuntimeKernelDraftPilotNodeTypes.join(', '));
      setPathRuntimeKernelPersistedResolverIds(pathRuntimeKernelDraftResolverIds);
      setPathRuntimeKernelResolverIdsDraft(pathRuntimeKernelDraftResolverIds.join(', '));
      setPathRuntimeKernelPersistedStrictNativeRegistry(pathRuntimeKernelStrictNativeRegistryDraft);
      setPathRuntimeKernelStrictNativeRegistryDraft(pathRuntimeKernelStrictNativeRegistryDraft);
      notify('Path runtime-kernel settings saved.', { variant: 'success' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save path runtime-kernel settings.';
      notify(message, { variant: 'error' });
    } finally {
      setPathRuntimeKernelSaving(false);
    }
  }, [
    activePath,
    notify,
    pathConfigs,
    pathRuntimeKernelDraftPilotNodeTypes,
    pathRuntimeKernelDraftResolverIds,
    pathRuntimeKernelModeDraft,
    pathRuntimeKernelPersistedMode,
    pathRuntimeKernelStrictNativeRegistryDraft,
    pathRuntimeKernelSaving,
    pathRuntimeKernelSettingsDirty,
    paths,
    persistPathSettings,
    setPathConfigs,
    setPaths,
  ]);

  if (activeTab !== 'canvas') return null;

  return (
    <div className={isFocusMode ? 'h-full space-y-0' : 'space-y-6'}>
      {!isFocusMode && typeof document !== 'undefined' && renderActions
        ? createPortal(
          renderActions(
            <div className='flex w-full items-start'>
              <div className='flex flex-col items-start gap-2'>
                <div className='flex flex-wrap items-center gap-3'>
                  <Button
                    data-doc-id='canvas_save_path'
                    className='rounded-md border text-sm text-white hover:bg-muted/60'
                    onClick={() => {
                      if (nodeConfigDirtySelection) {
                        notify(
                          'Unsaved node-config dialog changes are not included. Click "Update Node" first, then "Save Path".',
                          { variant: 'info' }
                        );
                      }
                      void savePath();
                    }}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Path'}
                  </Button>
                  <Button
                    data-doc-id='canvas_paths_settings'
                    type='button'
                    className='rounded-md border border-border text-sm text-gray-200 hover:bg-card/60'
                    onClick={() => {
                      openPathSettings(true);
                    }}
                    disabled={!activePath}
                  >
                      Paths Settings
                  </Button>
                  <Button
                    data-doc-id='canvas_enable_node_validation'
                    type='button'
                    variant={!nodeValidationEnabled ? 'warning' : 'success'}
                    className='rounded-md text-sm'
                    onClick={() => {
                      const nextEnabled = !nodeValidationEnabled;
                      patchAiPathsValidation({ enabled: nextEnabled });
                      notify(
                        nextEnabled
                          ? 'AI Paths node validation enabled.'
                          : 'AI Paths node validation disabled.',
                        {
                          variant: nextEnabled ? 'success' : 'info',
                        }
                      );
                    }}
                    disabled={!activePath || isPathLocked}
                    title={
                      !nodeValidationEnabled
                        ? 'Enable AI Paths node validation'
                        : 'Disable AI Paths node validation'
                    }
                  >
                    {!nodeValidationEnabled
                      ? 'Enable Node Validation'
                      : 'Disable Node Validation'}
                  </Button>
                  <Button
                    data-doc-id='canvas_validate_nodes'
                    type='button'
                    variant='info'
                    className='rounded-md text-sm'
                    onClick={runNodeValidationCheck}
                    disabled={!activePath || !nodeValidationEnabled}
                    title='Run node validation check now'
                  >
                      Validate Nodes
                  </Button>
                  <Button
                    data-doc-id='canvas_open_node_validator'
                    type='button'
                    variant='secondary'
                    className='rounded-md text-sm border-indigo-500/40 text-indigo-200 hover:bg-indigo-500/10'
                    onClick={openNodeValidator}
                    disabled={!activePath}
                    title='Open AI-Paths Node Validator patterns and sequences'
                  >
                      Node Validator
                  </Button>
                  <StatusBadge
                    status={
                      !nodeValidationEnabled
                        ? 'Validation: off'
                        : validationBlocked
                          ? 'Validation: blocked'
                          : validationWarn
                            ? 'Validation: warning'
                            : 'Validation: ready'
                    }
                    variant={
                      !nodeValidationEnabled
                        ? 'neutral'
                        : validationBlocked
                          ? 'error'
                          : validationWarn
                            ? 'warning'
                            : 'success'
                    }
                    size='sm'
                    className='font-medium'
                  />
                  <StatusBadge
                    status={`Validation score: ${validationScore}`}
                    variant='neutral'
                    size='sm'
                    className='font-medium'
                  />
                  <StatusBadge
                    status={`Failed rules: ${validationFailedRules}`}
                    variant={validationFailedRules > 0 ? 'warning' : 'success'}
                    size='sm'
                    className='font-medium'
                  />
                  <Button
                    data-doc-id='docs_tooltips_toggle'
                    type='button'
                    className='rounded-md border border-violet-500/40 text-sm text-violet-200 hover:bg-violet-500/10'
                    onClick={() => toggleDocsTooltips(!docsTooltipsOn)}
                  >
                    {docsTooltipsOn ? 'Docs Tooltips: On' : 'Docs Tooltips: Off'}
                  </Button>
                  <Button
                    data-doc-id='canvas_toggle_path_lock'
                    type='button'
                    className='rounded-md border border-border text-sm text-gray-300 hover:bg-card/60'
                    onClick={togglePathLock}
                    disabled={!activePath}
                    title={
                      isPathLocked
                        ? 'Unlock to edit nodes and connections'
                        : 'Lock to prevent edits'
                    }
                  >
                    {isPathLocked ? 'Unlock Path' : 'Lock Path'}
                  </Button>
                  <div className='flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 py-1'>
                    <span className='text-[10px] uppercase tracking-wide text-cyan-100'>
                      Runtime Kernel Global
                    </span>
                    <StatusBadge
                      status={`Mode: Auto (${runtimeKernelPersistedMode === 'auto' ? 'settings' : 'default'})`}
                      variant='neutral'
                      size='sm'
                      className='h-8 border border-cyan-500/50 bg-card/60 px-2 text-[11px] text-cyan-100'
                    />
                    <div className='w-[160px]'>
                      <SelectSimple
                        dataDocId='canvas_runtime_kernel_strict_native_registry'
                        size='sm'
                        value={runtimeKernelStrictNativeRegistryDraft}
                        onValueChange={(value: string) => {
                          if (value === 'default' || value === 'true' || value === 'false') {
                            setRuntimeKernelStrictNativeRegistryDraft(value);
                          }
                        }}
                        options={[...RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_OPTIONS]}
                        disabled={runtimeKernelLoading || runtimeKernelSaving}
                        triggerClassName='h-8 border-cyan-500/40 bg-card/60 text-[11px] text-cyan-100'
                        contentClassName='border-cyan-500/30'
                        ariaLabel='Global runtime kernel strict native registry mode'
                      />
                    </div>
                    <StatusBadge
                      status={`Strict Native: ${runtimeKernelStrictNativeRegistryDraft === 'true' ? 'On' : 'Off'} (${runtimeKernelPersistedStrictNativeRegistry !== undefined ? 'settings' : 'default'})`}
                      variant='neutral'
                      size='sm'
                      className='h-8 border border-cyan-500/50 bg-card/60 px-2 text-[11px] text-cyan-100'
                    />
                    <input
                      data-doc-id='canvas_runtime_kernel_pilot_nodes'
                      type='text'
                      value={runtimeKernelPilotNodeTypesDraft}
                      onChange={(event) => {
                        setRuntimeKernelPilotNodeTypesDraft(event.target.value);
                      }}
                      placeholder='pilot nodes: constant, math'
                      disabled={runtimeKernelLoading || runtimeKernelSaving}
                      className='h-8 w-[220px] rounded-md border border-cyan-500/40 bg-card/60 px-2 text-[11px] text-cyan-50 outline-none ring-offset-background placeholder:text-cyan-200/50 focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2'
                    />
                    <input
                      data-doc-id='canvas_runtime_kernel_resolver_ids'
                      type='text'
                      value={runtimeKernelResolverIdsDraft}
                      onChange={(event) => {
                        setRuntimeKernelResolverIdsDraft(event.target.value);
                      }}
                      placeholder='resolvers: kernel.primary, kernel.fallback'
                      disabled={runtimeKernelLoading || runtimeKernelSaving}
                      className='h-8 w-[260px] rounded-md border border-cyan-500/40 bg-card/60 px-2 text-[11px] text-cyan-50 outline-none ring-offset-background placeholder:text-cyan-200/50 focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2'
                    />
                    <Button
                      data-doc-id='canvas_runtime_kernel_apply'
                      type='button'
                      className='h-8 rounded-md border border-cyan-400/50 px-2 text-[11px] text-cyan-100 hover:bg-cyan-500/20'
                      onClick={() => {
                        void saveRuntimeKernelSettings();
                      }}
                      disabled={
                        runtimeKernelLoading ||
                        runtimeKernelSaving ||
                        (!runtimeKernelSettingsDirty && !runtimeKernelStrictNativeRegistryDirty)
                      }
                    >
                      {runtimeKernelSaving ? 'Saving...' : 'Apply'}
                    </Button>
                  </div>
                  <div className='flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1'>
                    <span className='text-[10px] uppercase tracking-wide text-emerald-100'>
                      Runtime Kernel Path
                    </span>
                    <div className='w-[170px]'>
                      <SelectSimple
                        dataDocId='canvas_path_runtime_kernel_mode'
                        size='sm'
                        value={pathRuntimeKernelModeDraft}
                        onValueChange={(value: string) => {
                          if (value === 'inherit' || value === 'auto') {
                            setPathRuntimeKernelModeDraft(value);
                          }
                        }}
                        options={[...PATH_RUNTIME_KERNEL_MODE_OPTIONS]}
                        disabled={!activePath || pathRuntimeKernelSaving}
                        triggerClassName='h-8 border-emerald-500/40 bg-card/60 text-[11px] text-emerald-100'
                        contentClassName='border-emerald-500/30'
                        ariaLabel='Path runtime kernel mode'
                      />
                    </div>
                    <div className='w-[170px]'>
                      <SelectSimple
                        dataDocId='canvas_path_runtime_kernel_strict_native_registry'
                        size='sm'
                        value={pathRuntimeKernelStrictNativeRegistryDraft}
                        onValueChange={(value: string) => {
                          if (value === 'inherit' || value === 'true' || value === 'false') {
                            setPathRuntimeKernelStrictNativeRegistryDraft(value);
                          }
                        }}
                        options={[...PATH_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_OPTIONS]}
                        disabled={!activePath || pathRuntimeKernelSaving}
                        triggerClassName='h-8 border-emerald-500/40 bg-card/60 text-[11px] text-emerald-100'
                        contentClassName='border-emerald-500/30'
                        ariaLabel='Path runtime kernel strict native registry mode'
                      />
                    </div>
                    <StatusBadge
                      status={activePath ? 'Scope: Active Path' : 'Scope: None'}
                      variant='neutral'
                      size='sm'
                      className='h-8 border border-emerald-500/50 bg-card/60 px-2 text-[11px] text-emerald-100'
                    />
                    <StatusBadge
                      status={`Effective: Auto (${pathRuntimeKernelEffectiveModeSource})`}
                      variant={pathRuntimeKernelEffectiveModeVariant}
                      size='sm'
                      className='h-8 border border-emerald-500/50 bg-card/60 px-2 text-[11px] text-emerald-100'
                    />
                    <StatusBadge
                      status={`Strict Native: ${pathRuntimeKernelEffectiveStrictNativeRegistry ? 'On' : 'Off'} (${pathRuntimeKernelEffectiveStrictNativeRegistrySource})`}
                      variant={pathRuntimeKernelEffectiveStrictVariant}
                      size='sm'
                      className='h-8 border border-emerald-500/50 bg-card/60 px-2 text-[11px] text-emerald-100'
                    />
                    <input
                      data-doc-id='canvas_path_runtime_kernel_pilot_nodes'
                      type='text'
                      value={pathRuntimeKernelPilotNodeTypesDraft}
                      onChange={(event) => {
                        setPathRuntimeKernelPilotNodeTypesDraft(event.target.value);
                      }}
                      placeholder='path pilot nodes: template, parser'
                      disabled={!activePath || pathRuntimeKernelSaving}
                      className='h-8 w-[220px] rounded-md border border-emerald-500/40 bg-card/60 px-2 text-[11px] text-emerald-50 outline-none ring-offset-background placeholder:text-emerald-200/50 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2'
                    />
                    <input
                      data-doc-id='canvas_path_runtime_kernel_resolver_ids'
                      type='text'
                      value={pathRuntimeKernelResolverIdsDraft}
                      onChange={(event) => {
                        setPathRuntimeKernelResolverIdsDraft(event.target.value);
                      }}
                      placeholder='path resolvers: resolver.path'
                      disabled={!activePath || pathRuntimeKernelSaving}
                      className='h-8 w-[240px] rounded-md border border-emerald-500/40 bg-card/60 px-2 text-[11px] text-emerald-50 outline-none ring-offset-background placeholder:text-emerald-200/50 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2'
                    />
                    <Button
                      data-doc-id='canvas_path_runtime_kernel_apply'
                      type='button'
                      className='h-8 rounded-md border border-emerald-400/50 px-2 text-[11px] text-emerald-100 hover:bg-emerald-500/20'
                      onClick={() => {
                        void savePathRuntimeKernelSettings();
                      }}
                      disabled={
                        !activePath ||
                        pathRuntimeKernelSaving ||
                        !pathRuntimeKernelSettingsDirty
                      }
                    >
                      {pathRuntimeKernelSaving ? 'Saving...' : 'Apply to Path'}
                    </Button>
                  </div>
                  <div className='flex items-center rounded-md border border-border/60 bg-card/40 p-0.5'>
                    <Button
                      type='button'
                      className={`h-8 rounded-md px-2 text-xs ${
                        selectionToolMode === 'pan'
                          ? 'bg-sky-500/20 text-sky-200'
                          : 'text-gray-300 hover:bg-card/60'
                      }`}
                      onClick={() => setSelectionToolMode('pan')}
                      title='Pan canvas'
                    >
                        Pan
                    </Button>
                    <Button
                      type='button'
                      className={`h-8 rounded-md px-2 text-xs ${
                        selectionToolMode === 'select'
                          ? 'bg-sky-500/20 text-sky-200'
                          : 'text-gray-300 hover:bg-card/60'
                      }`}
                      onClick={() => setSelectionToolMode('select')}
                      title='Rectangle selection tool'
                    >
                        Select
                    </Button>
                  </div>
                  {selectionToolMode === 'select' ? (
                    <div className='flex items-center rounded-md border border-border/60 bg-card/40 p-0.5'>
                      <Button
                        type='button'
                        className={`h-8 rounded-md px-2 text-xs ${
                          scopeMode === 'portion'
                            ? 'bg-sky-500/20 text-sky-200'
                            : 'text-gray-300 hover:bg-card/60'
                        }`}
                        onClick={() => setScopeMode('portion')}
                        title='Select only nodes inside the rectangle'
                      >
                          Portion
                      </Button>
                      <Button
                        type='button'
                        className={`h-8 rounded-md px-2 text-xs ${
                          scopeMode === 'wiring'
                            ? 'bg-sky-500/20 text-sky-200'
                            : 'text-gray-300 hover:bg-card/60'
                        }`}
                        onClick={() => setScopeMode('wiring')}
                        title='Expand marquee selection to connected wiring'
                      >
                          With Wiring
                      </Button>
                    </div>
                  ) : null}
                  <StatusBadge
                    status={`Selected: ${selectedCount}`}
                    variant='neutral'
                    size='sm'
                    className='font-medium'
                    title='Selected nodes count'
                  />
                  {isPathSwitching ? (
                    <StatusBadge
                      status='Switching path...'
                      variant='processing'
                      size='sm'
                      className='font-medium'
                    />
                  ) : null}
                  <Button
                    data-doc-id='canvas_remove_selected'
                    type='button'
                    variant='destructive'
                    className='rounded-md text-sm'
                    onClick={removeSelection}
                    disabled={!canDeleteSelection}
                    title={
                      isPathSwitching
                        ? 'Delete is temporarily disabled while switching paths'
                        : canDeleteSelection
                          ? 'Delete selected nodes or selected edge'
                          : 'Select at least one node or edge to delete'
                    }
                  >
                    Remove Selected
                  </Button>
                  {selectionToolMode === 'select' ? (
                    <div className='text-[11px] text-gray-400'>
                      {scopeMode === 'wiring'
                        ? 'Drag to select connected subgraphs. Shift add, Alt subtract.'
                        : 'Drag to select node portions only. Shift add, Alt subtract.'}
                    </div>
                  ) : null}
                  <Button
                    data-doc-id='canvas_clear_connector_data'
                    className='rounded-md border border-amber-500/40 text-sm text-amber-200 hover:bg-amber-500/10'
                    onClick={() => {
                      void clearConnectorData();
                    }}
                    type='button'
                    disabled={!activePath}
                  >
                    Clear Connector Data
                  </Button>
                  <Button
                    data-doc-id='canvas_toggle_path_active'
                    type='button'
                    className={`rounded-md border text-sm ${isPathActive ? 'border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10' : 'border-rose-500/40 text-rose-200 hover:bg-rose-500/10'}`}
                    onClick={togglePathActive}
                    disabled={!activePath}
                    title={isPathActive ? 'Deactivate to stop runs' : 'Activate to allow runs'}
                  >
                    {isPathActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    data-doc-id='canvas_clear_history'
                    className='rounded-md border border-sky-500/40 text-sm text-sky-200 hover:bg-sky-500/10'
                    onClick={() => {
                      void clearHistory();
                    }}
                    type='button'
                    disabled={!activePath}
                    title={
                      hasHistory
                        ? 'Clear history for all nodes in this path'
                        : 'No history recorded yet'
                    }
                  >
                      Clear History
                  </Button>
                </div>
                {lastError && (
                  <div className='flex items-center gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-200'>
                    <span className='max-w-[220px] truncate'>
                        Last error: {lastError.message}
                    </span>
                    <Button
                      type='button'
                      className='rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20'
                      onClick={() => {
                        void persistLastErrorSafe(null);
                      }}
                    >
                        Clear
                    </Button>
                    {lastError.message.startsWith('Failed to load AI Paths settings') && (
                      <Button
                        type='button'
                        className='rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20'
                        onClick={() => {
                          void persistLastErrorSafe(null);
                          bumpLoadNonce();
                        }}
                      >
                          Retry
                      </Button>
                    )}
                    <Button
                      type='button'
                      className='rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20'
                      onClick={(): void =>
                        window.location.assign(
                          `/admin/system/logs?level=error&source=client&query=${encodeURIComponent(
                            'AI Paths'
                          )}`
                        )
                      }
                    >
                        View logs
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ),
          document.getElementById('ai-paths-actions') ?? document.body
        )
        : null}

      {!isFocusMode && typeof document !== 'undefined'
        ? createPortal(
          <div className='flex items-center justify-end gap-2'>
            {autoSaveLabel ? (
              <StatusBadge
                status={autoSaveLabel}
                variant={autoSaveVariant}
                size='sm'
                className='font-medium'
              />
            ) : null}
            {lastRunAt && (
              <StatusBadge
                status={'Last run: ' + new Date(lastRunAt).toLocaleTimeString()}
                variant='active'
                size='sm'
                className='font-medium'
              />
            )}
            <div className='flex items-center gap-2'>
              {isPathNameEditing ? (
                <input
                  data-doc-id='canvas_path_name_field'
                  type='text'
                  value={renameDraft}
                  onChange={(event) => {
                    setRenameDraft(event.target.value);
                  }}
                  onBlur={commitPathNameEdit}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      event.currentTarget.blur();
                      return;
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      cancelPathNameEdit();
                    }
                  }}
                  autoFocus
                  className='h-9 w-[320px] rounded-md border border-border bg-card/60 px-3 text-sm text-white outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  placeholder='Path name'
                  disabled={!activePath}
                />
              ) : (
                <button
                  data-doc-id='canvas_path_name_field'
                  type='button'
                  className='h-9 w-[320px] rounded-md border border-border bg-card/60 px-3 text-left text-sm text-gray-200 hover:bg-card/70 disabled:cursor-not-allowed disabled:opacity-60'
                  onDoubleClick={startPathNameEdit}
                  disabled={!activePath}
                  title={
                    activePath ? 'Double-click to rename this path' : 'No active path selected'
                  }
                >
                  <span className='block truncate'>{pathName || 'Untitled path'}</span>
                </button>
              )}
              <SelectSimple
                dataDocId='canvas_path_selector'
                size='sm'
                value={activePath ?? undefined}
                onValueChange={(value: string): void => {
                  if (value !== activePath) {
                    switchPath(value);
                  }
                }}
                options={pathOptions}
                placeholder='Select path'
                className='w-[240px]'
                triggerClassName='h-9 border-border bg-card/60 px-3 text-xs text-white'
                disabled={pathOptions.length === 0}
              />
            </div>
          </div>,
          document.getElementById('ai-paths-name') ?? document.body
        )
        : null}

      <div
        className={`flex overflow-hidden rounded-xl border border-border/60 bg-card/25 shadow-2xl ${
          isFocusMode ? 'h-[calc(100vh-140px)]' : 'h-[800px]'
        }`}
      >
        <div className='relative flex flex-1 flex-col overflow-hidden'>
          <div ref={canvasContainerRef} className='flex-1'>
            <CanvasBoard
              confirmNodeSwitch={confirmNodeSwitchSafe}
              nodeDiagnosticsById={nodeDiagnosticsById}
              onFocusNodeDiagnostics={(nodeId: string): void => {
                focusDataContractNode(nodeId);
                openPathSettings(true);
              }}
            />
          </div>
          {isFocusMode && (
            <div className='absolute bottom-4 right-4 flex items-center gap-2'>
              <Button
                type='button'
                variant='secondary'
                size='sm'
                className='h-8 bg-black/60 text-xs backdrop-blur-md'
                onClick={() => setIsFocusMode(false)}
              >
                Exit Focus Mode
              </Button>
            </div>
          )}
        </div>

        {!isRightSidebarCollapsed && (
          <div className='w-[400px] flex-shrink-0 border-l border-border/60'>
            <div className='h-full space-y-4 overflow-y-auto p-4'>
              <CanvasSidebar />
              <ClusterPresetsPanel />
              <GraphModelDebugPanel />
              <RunHistoryPanel />
            </div>
          </div>
        )}
      </div>

      {!isFocusMode && <RuntimeEventLogPanel />}
      {!isFocusMode && (
        <div className='grid gap-4 lg:grid-cols-2'>
          <AiPathsRuntimeAnalysis />
          <AiPathsLiveLog />
        </div>
      )}
    </div>
  );
}
