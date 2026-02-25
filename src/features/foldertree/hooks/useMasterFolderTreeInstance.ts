'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

import type {
  FolderTreeIconSlot,
  FolderTreeProfileV2,
  MasterFolderTreeController,
} from '@/shared/contracts/master-folder-tree';
import { useUpdateSetting, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui/toast';
import type { FolderTreePlaceholderClassSet } from '@/shared/utils/folder-tree-profiles-v2';
import { FOLDER_TREE_PROFILES_V2_SETTING_KEY } from '@/shared/utils/folder-tree-profiles-v2';
import {
  FOLDER_TREE_UI_STATE_V1_SETTING_KEY,
  parseFolderTreeUiStateV1,
  type FolderTreeInstance,
} from '@/shared/utils/folder-tree-ui-state-v1';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  buildFolderTreeV2MigrationPayload,
  FOLDER_TREE_V2_MIGRATION_MARKER_KEY,
  getFolderTreeUiStateV2Key,
  parseFolderTreeUiStateV2Entry,
  serializeFolderTreeUiStateV2Entry,
  type FolderTreeUiStateV2Entry,
} from '../v2/settings';
import {
  useFolderTreeInstanceV2,
  type UseFolderTreeInstanceV2Options,
} from '../v2/hooks/useFolderTreeInstanceV2';
import { useMasterFolderTreeRuntime } from '../v2/runtime/MasterFolderTreeRuntimeProvider';
import { useMasterFolderTreeConfig } from './useMasterFolderTreeConfig';

import type { LucideIcon } from 'lucide-react';

export type UseMasterFolderTreeInstanceOptions = Omit<
  UseFolderTreeInstanceV2Options,
  'profile' | 'instanceId' | 'initialNodes' | 'initialSelectedNodeId' | 'initiallyExpandedNodeIds'
> & {
  instance: FolderTreeInstance;
  nodes: UseFolderTreeInstanceV2Options['initialNodes'];
  selectedNodeId?: UseFolderTreeInstanceV2Options['initialSelectedNodeId'];
  expandedNodeIds?: UseFolderTreeInstanceV2Options['initiallyExpandedNodeIds'];
  initiallyExpandedNodeIds?: UseFolderTreeInstanceV2Options['initiallyExpandedNodeIds'];
};

type ResolveMasterFolderTreeIconInput = {
  slot: FolderTreeIconSlot;
  kind?: string | null;
  fallback: LucideIcon;
  fallbackId?: string | null;
};

type MasterFolderTreeRootDropUi = {
  label: string;
  idleClassName: string;
  activeClassName: string;
};

const EXPANDED_STATE_PERSIST_DEBOUNCE_MS = 300;

const normalizeNodeIds = (
  values: ReadonlyArray<string> | Set<string> | null | undefined
): string[] => {
  if (!values) return [];
  return Array.from(new Set(Array.from(values).map((id) => id.trim()).filter(Boolean)));
};

const areNodeListsEqual = (
  left: ReadonlyArray<string> | Set<string> | null | undefined,
  right: ReadonlyArray<string> | Set<string> | null | undefined
): boolean => {
  const normalizedLeft = normalizeNodeIds(left);
  const normalizedRight = normalizeNodeIds(right);
  if (normalizedLeft.length !== normalizedRight.length) return false;
  for (let index = 0; index < normalizedLeft.length; index += 1) {
    if (normalizedLeft[index] !== normalizedRight[index]) return false;
  }
  return true;
};

const shouldNotifyPersistSuccessByInstance: Record<FolderTreeInstance, boolean> = {
  notes: false,
  image_studio: false,
  product_categories: true,
  cms_page_builder: true,
  case_resolver: true,
  case_resolver_cases: true,
};

const shouldNotifyPersistErrorByInstance: Record<FolderTreeInstance, boolean> = {
  notes: true,
  image_studio: true,
  product_categories: true,
  cms_page_builder: true,
  case_resolver: true,
  case_resolver_cases: true,
};

const persistSuccessMessageByInstance: Record<FolderTreeInstance, string> = {
  notes: 'Folder tree updated.',
  image_studio: 'Folder tree updated.',
  product_categories: 'Category tree updated.',
  cms_page_builder: 'Component tree updated.',
  case_resolver: 'Case resolver tree updated.',
  case_resolver_cases: 'Case hierarchy updated.',
};

export function useMasterFolderTreeInstance({
  instance,
  ...controllerOptions
}: UseMasterFolderTreeInstanceOptions): {
  profile: FolderTreeProfileV2;
  appearance: {
    placeholderClasses: FolderTreePlaceholderClassSet;
    rootDropUi: MasterFolderTreeRootDropUi;
    resolveIcon: (input: ResolveMasterFolderTreeIconInput) => LucideIcon;
  };
  controller: MasterFolderTreeController;
  panelCollapsed: boolean;
  setPanelCollapsed: (collapsed: boolean) => void;
  hasPersistedUiState: boolean;
} {
  const { toast } = useToast();
  const runtime = useMasterFolderTreeRuntime();
  const {
    nodes,
    selectedNodeId,
    initiallyExpandedNodeIds: fallbackInitiallyExpandedNodeIds,
    expandedNodeIds: fallbackExpandedNodeIds,
    ...restControllerOptions
  } = controllerOptions;

  const { profile, appearance } = useMasterFolderTreeConfig(instance);
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const updateSettingsBulk = useUpdateSettingsBulk();

  const migrationMarker = settingsStore.get(FOLDER_TREE_V2_MIGRATION_MARKER_KEY);
  const shouldReadLegacyState = !migrationMarker;
  const rawUiStateV2 = settingsStore.get(getFolderTreeUiStateV2Key(instance));
  const rawUiStateV1 = shouldReadLegacyState
    ? settingsStore.get(FOLDER_TREE_UI_STATE_V1_SETTING_KEY)
    : undefined;
  const rawProfilesV2Legacy = shouldReadLegacyState
    ? settingsStore.get(FOLDER_TREE_PROFILES_V2_SETTING_KEY)
    : undefined;

  const migratedRef = useRef<boolean>(Boolean(migrationMarker));
  const migrationRequestedRef = useRef<boolean>(false);

  useEffect(() => {
    if (migratedRef.current) return;
    if (migrationRequestedRef.current) return;
    if (!shouldReadLegacyState) return;
    if (settingsStore.isLoading || settingsStore.isFetching) return;

    migrationRequestedRef.current = true;
    void updateSettingsBulk
      .mutateAsync(
        buildFolderTreeV2MigrationPayload({
          rawProfilesV2: rawProfilesV2Legacy,
          rawUiStateV1,
        })
      )
      .then(() => {
        runtime.recordMetric('migration_success');
        migratedRef.current = true;
      })
      .catch((error: unknown) => {
        runtime.recordMetric('migration_failure');
        migrationRequestedRef.current = false;
        logClientError(error, {
          context: {
            source: 'useMasterFolderTreeInstance',
            action: 'migrateFolderTreeV2Settings',
            instance,
          },
        });
      });
  }, [
    instance,
    rawProfilesV2Legacy,
    rawUiStateV1,
    settingsStore.isFetching,
    settingsStore.isLoading,
    shouldReadLegacyState,
    runtime,
    updateSettingsBulk,
  ]);

  const legacyUiEntry = useMemo(
    () => parseFolderTreeUiStateV1(rawUiStateV1)[instance],
    [instance, rawUiStateV1]
  );

  const uiEntry = useMemo<FolderTreeUiStateV2Entry>(() => {
    if (rawUiStateV2 !== undefined) {
      return parseFolderTreeUiStateV2Entry(rawUiStateV2);
    }
    if (migratedRef.current || migrationMarker) {
      return parseFolderTreeUiStateV2Entry(undefined);
    }
    return {
      expandedNodeIds: legacyUiEntry.expandedNodeIds,
      panelCollapsed: legacyUiEntry.panelCollapsed,
    };
  }, [legacyUiEntry.expandedNodeIds, legacyUiEntry.panelCollapsed, migrationMarker, rawUiStateV2]);

  const hasPersistedUiStateV2 = rawUiStateV2 !== undefined;
  const hasPersistedUiStateLegacy = shouldReadLegacyState && rawUiStateV1 !== undefined;
  const hasPersistedUiState = hasPersistedUiStateV2 || hasPersistedUiStateLegacy;
  const isExpandedNodeIdsControlled = fallbackExpandedNodeIds !== undefined;
  const persistedExpandedNodeIds =
    hasPersistedUiStateV2
      ? uiEntry.expandedNodeIds
      : uiEntry.expandedNodeIds.length > 0
        ? uiEntry.expandedNodeIds
        : undefined;
  const resolvedExpandedNodeIds =
    persistedExpandedNodeIds ?? fallbackExpandedNodeIds;
  const resolvedInitialExpandedNodeIds =
    persistedExpandedNodeIds !== undefined
      ? persistedExpandedNodeIds
      : fallbackInitiallyExpandedNodeIds ?? fallbackExpandedNodeIds;

  const panelCollapsed = uiEntry.panelCollapsed;

  const queuePersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedUiPayloadRef = useRef<string>(
    serializeFolderTreeUiStateV2Entry(uiEntry)
  );

  useEffect(() => {
    lastPersistedUiPayloadRef.current = serializeFolderTreeUiStateV2Entry(uiEntry);
  }, [uiEntry]);

  const queuePersistUiEntry = useCallback(
    (nextEntry: FolderTreeUiStateV2Entry, immediate: boolean = false): void => {
      const serialized = serializeFolderTreeUiStateV2Entry(nextEntry);
      if (serialized === lastPersistedUiPayloadRef.current) return;

      lastPersistedUiPayloadRef.current = serialized;

      if (queuePersistTimerRef.current !== null) {
        clearTimeout(queuePersistTimerRef.current);
        queuePersistTimerRef.current = null;
      }

      const persist = (): void => {
        void updateSetting
          .mutateAsync({
            key: getFolderTreeUiStateV2Key(instance),
            value: serialized,
          })
          .catch((error: unknown) => {
            logClientError(error, {
              context: {
                source: 'useMasterFolderTreeInstance',
                action: 'persistFolderTreeUiStateV2',
                instance,
              },
            });
            lastPersistedUiPayloadRef.current = '';
          });
      };

      if (immediate) {
        persist();
        return;
      }

      queuePersistTimerRef.current = setTimeout(persist, EXPANDED_STATE_PERSIST_DEBOUNCE_MS);
    },
    [instance, updateSetting]
  );

  useEffect(() => {
    return (): void => {
      if (queuePersistTimerRef.current !== null) {
        clearTimeout(queuePersistTimerRef.current);
        queuePersistTimerRef.current = null;
      }
    };
  }, []);

  const setPanelCollapsed = useCallback(
    (collapsed: boolean): void => {
      if (uiEntry.panelCollapsed === collapsed) return;
      queuePersistUiEntry(
        {
          ...uiEntry,
          panelCollapsed: collapsed,
        },
        true
      );
    },
    [queuePersistUiEntry, uiEntry]
  );

  const controller = useFolderTreeInstanceV2({
    ...restControllerOptions,
    initialNodes: nodes,
    ...(selectedNodeId !== undefined ? { initialSelectedNodeId: selectedNodeId } : {}),
    ...(resolvedInitialExpandedNodeIds !== undefined
      ? { initiallyExpandedNodeIds: resolvedInitialExpandedNodeIds }
      : {}),
    profile,
    instanceId: instance,
  });

  useEffect(() => {
    void controller.replaceNodes(nodes, 'external_sync');
  }, [controller.replaceNodes, nodes]);

  useEffect(() => {
    if (selectedNodeId === undefined) return;
    controller.selectNode(selectedNodeId ?? null);
  }, [controller.selectNode, selectedNodeId]);

  const hasHydratedExpandedStateRef = useRef<boolean>(false);
  useEffect(() => {
    hasHydratedExpandedStateRef.current = false;
  }, [instance]);

  useEffect(() => {
    if (isExpandedNodeIdsControlled) {
      if (resolvedExpandedNodeIds === undefined) return;
      controller.setExpandedNodeIds(resolvedExpandedNodeIds);
      return;
    }
    if (hasHydratedExpandedStateRef.current) return;
    if (settingsStore.isLoading || settingsStore.isFetching) return;
    if (resolvedExpandedNodeIds === undefined) return;
    hasHydratedExpandedStateRef.current = true;
    controller.setExpandedNodeIds(resolvedExpandedNodeIds);
  }, [
    controller.setExpandedNodeIds,
    isExpandedNodeIdsControlled,
    resolvedExpandedNodeIds,
    settingsStore.isFetching,
    settingsStore.isLoading,
  ]);

  const expandedNodeIds = useMemo(
    () => normalizeNodeIds(controller.expandedNodeIds),
    [controller.expandedNodeIds]
  );

  useEffect(() => {
    if (areNodeListsEqual(expandedNodeIds, uiEntry.expandedNodeIds)) return;
    queuePersistUiEntry({
      ...uiEntry,
      expandedNodeIds,
    });
  }, [expandedNodeIds, queuePersistUiEntry, uiEntry]);

  const previousApplyingRef = useRef<boolean>(false);
  const lastErrorAtRef = useRef<string | null>(null);
  useEffect(() => {
    const shouldNotifySuccess = shouldNotifyPersistSuccessByInstance[instance];
    const shouldNotifyError = shouldNotifyPersistErrorByInstance[instance];
    if (!shouldNotifySuccess && !shouldNotifyError) {
      previousApplyingRef.current = controller.isApplying;
      return;
    }

    const wasApplying = previousApplyingRef.current;
    const isApplying = controller.isApplying;
    const lastError = controller.lastError;

    if (shouldNotifyError && lastError && lastError.at !== lastErrorAtRef.current) {
      lastErrorAtRef.current = lastError.at;
      toast(lastError.message || 'Failed to persist folder tree changes.', {
        variant: 'error',
      });
    } else if (shouldNotifySuccess && wasApplying && !isApplying && !lastError) {
      toast(persistSuccessMessageByInstance[instance], {
        variant: 'success',
      });
    }

    previousApplyingRef.current = isApplying;
  }, [controller.isApplying, controller.lastError, instance, toast]);

  return {
    profile,
    appearance,
    controller,
    panelCollapsed,
    setPanelCollapsed,
    hasPersistedUiState,
  };
}
