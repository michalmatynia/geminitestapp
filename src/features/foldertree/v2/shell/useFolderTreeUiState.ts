'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { type FolderTreeInstance } from '@/shared/utils/folder-tree-profiles-v2';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
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
  const rawUiStateV2 = settingsStore.get(getFolderTreeUiStateV2Key(instance));

  const uiEntry = useMemo<FolderTreeUiStateV2Entry>(() => {
    try {
      return parseFolderTreeUiStateV2Entry(rawUiStateV2);
    } catch (error) {
      runtime.recordMetric('migration_failure');
      logClientError(error, {
        context: {
          source: 'useFolderTreeUiState',
          action: 'parseFolderTreeUiStateV2',
          instance,
        },
      });
      throw error;
    }
  }, [instance, rawUiStateV2, runtime]);

  const hasPersistedState = rawUiStateV2 !== undefined;
  const isExpandedNodeIdsControlled = controlledExpandedNodeIds !== undefined;
  const persistedExpandedNodeIds =
    rawUiStateV2 !== undefined ? uiEntry.expandedNodeIds : undefined;
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
