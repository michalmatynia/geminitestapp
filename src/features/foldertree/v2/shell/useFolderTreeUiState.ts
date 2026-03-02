'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useUpdateSetting, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  FOLDER_TREE_PROFILES_V2_SETTING_KEY,
  type FolderTreeInstance,
} from '@/shared/utils/folder-tree-profiles-v2';
import {
  FOLDER_TREE_UI_STATE_V1_SETTING_KEY,
  parseFolderTreeUiStateV1,
} from '@/shared/utils/folder-tree-ui-state-v1';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  buildFolderTreeV2MigrationPayload,
  FOLDER_TREE_V2_MIGRATION_MARKER_KEY,
  getFolderTreeUiStateV2Key,
  parseFolderTreeUiStateV2Entry,
  serializeFolderTreeUiStateV2Entry,
  type FolderTreeUiStateV2Entry,
} from '../settings';
import { useMasterFolderTreeRuntime } from '../runtime/MasterFolderTreeRuntimeProvider';

const EXPANDED_STATE_PERSIST_DEBOUNCE_MS = 300;

const normalizeNodeIds = (
  values: ReadonlyArray<string> | Set<string> | null | undefined
): string[] => {
  if (!values) return [];
  return Array.from(
    new Set(
      Array.from(values)
        .map((id) => id.trim())
        .filter(Boolean)
    )
  );
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

export type FolderTreePanelState = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  hasPersistedState: boolean;
};

export type FolderTreeUiState = {
  panel: FolderTreePanelState;
  hasPersistedState: boolean;
  resolvedInitialExpandedNodeIds: string[] | undefined;
  resolvedExpandedNodeIds: string[] | undefined;
  isExpandedNodeIdsControlled: boolean;
  isSettingsReady: boolean;
  persistExpandedNodeIds: (expandedNodeIds: ReadonlyArray<string> | Set<string>) => void;
};

export function useFolderTreeUiState(
  instance: FolderTreeInstance,
  controlledExpandedNodeIds?: ReadonlyArray<string> | undefined,
  initiallyExpandedNodeIds?: ReadonlyArray<string> | undefined
): FolderTreeUiState {
  const runtime = useMasterFolderTreeRuntime();
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
            source: 'useFolderTreeUiState',
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
  const hasPersistedState = hasPersistedUiStateV2 || hasPersistedUiStateLegacy;
  const isExpandedNodeIdsControlled = controlledExpandedNodeIds !== undefined;
  const persistedExpandedNodeIds = hasPersistedUiStateV2
    ? uiEntry.expandedNodeIds
    : uiEntry.expandedNodeIds.length > 0
      ? uiEntry.expandedNodeIds
      : undefined;
  const resolvedExpandedNodeIds = persistedExpandedNodeIds ?? controlledExpandedNodeIds;
  const resolvedInitialExpandedNodeIds =
    persistedExpandedNodeIds !== undefined
      ? persistedExpandedNodeIds
      : (initiallyExpandedNodeIds ?? controlledExpandedNodeIds);

  const queuePersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedUiPayloadRef = useRef<string>(serializeFolderTreeUiStateV2Entry(uiEntry));

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
                source: 'useFolderTreeUiState',
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

  const setCollapsed = useCallback(
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

  const persistExpandedNodeIds = useCallback(
    (expandedNodeIds: ReadonlyArray<string> | Set<string>): void => {
      const normalizedExpandedNodeIds = normalizeNodeIds(expandedNodeIds);
      if (areNodeListsEqual(normalizedExpandedNodeIds, uiEntry.expandedNodeIds)) return;
      queuePersistUiEntry({
        ...uiEntry,
        expandedNodeIds: normalizedExpandedNodeIds,
      });
    },
    [queuePersistUiEntry, uiEntry]
  );

  return {
    panel: {
      collapsed: uiEntry.panelCollapsed,
      setCollapsed,
      hasPersistedState,
    },
    hasPersistedState,
    resolvedInitialExpandedNodeIds: resolvedInitialExpandedNodeIds as string[] | undefined,
    resolvedExpandedNodeIds: resolvedExpandedNodeIds as string[] | undefined,
    isExpandedNodeIdsControlled,
    isSettingsReady: !settingsStore.isLoading && !settingsStore.isFetching,
    persistExpandedNodeIds,
  };
}
