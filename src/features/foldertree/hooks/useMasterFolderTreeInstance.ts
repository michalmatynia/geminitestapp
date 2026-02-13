'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useConfiguredMasterFolderTree } from '@/features/foldertree/master/useConfiguredMasterFolderTree';
import type { UseConfiguredMasterFolderTreeOptions } from '@/features/foldertree/master/useConfiguredMasterFolderTree';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';
import {
  FOLDER_TREE_UI_STATE_V1_SETTING_KEY,
  parseFolderTreeUiStateV1,
  serializeFolderTreeUiStateV1,
  type FolderTreeInstance,
  type FolderTreeUiStateV1Map,
} from '@/shared/utils/folder-tree-ui-state-v1';
import type { MasterTreeId } from '@/shared/utils/master-folder-tree-contract';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { useMasterFolderTreeConfig } from './useMasterFolderTreeConfig';

export type UseMasterFolderTreeInstanceOptions = Omit<
  UseConfiguredMasterFolderTreeOptions,
  'profile'
> & {
  instance: FolderTreeInstance;
};

const EXPANDED_STATE_PERSIST_DEBOUNCE_MS = 220;

const masterTreePersistSuccessMessageByInstance: Record<FolderTreeInstance, string> = {
  notes: 'Folder tree changes saved.',
  image_studio: 'Image Studio tree changes saved.',
  product_categories: 'Category tree changes saved.',
  cms_page_builder: 'Page builder tree changes saved.',
  case_resolver: 'Case Resolver tree changes saved.',
};

const shouldNotifyMasterTreePersistByInstance: Record<FolderTreeInstance, boolean> = {
  notes: false,
  image_studio: true,
  product_categories: false,
  cms_page_builder: true,
  case_resolver: false,
};

const normalizeExpandedNodeIds = (values: Iterable<MasterTreeId>): MasterTreeId[] => {
  const normalized = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    normalized.add(trimmed);
  }
  return Array.from(normalized).sort((left: string, right: string) => left.localeCompare(right));
};

const areNodeIdListsEqual = (left: MasterTreeId[], right: MasterTreeId[]): boolean => {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
};

export function useMasterFolderTreeInstance({
  instance,
  ...controllerOptions
}: UseMasterFolderTreeInstanceOptions): {
  profile: ReturnType<typeof useMasterFolderTreeConfig>['profile'];
  appearance: ReturnType<typeof useMasterFolderTreeConfig>['appearance'];
  controller: ReturnType<typeof useConfiguredMasterFolderTree>;
  panelCollapsed: boolean;
  setPanelCollapsed: (collapsed: boolean) => void;
} {
  const { toast } = useToast();
  const {
    initiallyExpandedNodeIds: fallbackInitiallyExpandedNodeIds,
    expandedNodeIds: fallbackExpandedNodeIds,
    ...restControllerOptions
  } = controllerOptions;
  const { profile, appearance } = useMasterFolderTreeConfig(instance);
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const rawUiState = settingsStore.get(FOLDER_TREE_UI_STATE_V1_SETTING_KEY);
  const parsedUiState = useMemo(
    () => parseFolderTreeUiStateV1(rawUiState),
    [rawUiState]
  );
  const persistedExpandedNodeIds = useMemo<MasterTreeId[] | undefined>(() => {
    if (rawUiState === undefined) return undefined;
    return parsedUiState[instance].expandedNodeIds;
  }, [instance, parsedUiState, rawUiState]);
  const normalizedPersistedExpandedNodeIds = useMemo(
    () =>
      persistedExpandedNodeIds === undefined
        ? undefined
        : normalizeExpandedNodeIds(persistedExpandedNodeIds),
    [persistedExpandedNodeIds]
  );
  const persistedExpandedFingerprint = useMemo(
    () =>
      normalizedPersistedExpandedNodeIds === undefined
        ? ''
        : normalizedPersistedExpandedNodeIds.join('\u0001'),
    [normalizedPersistedExpandedNodeIds]
  );
  const resolvedExpandedNodeIds =
    normalizedPersistedExpandedNodeIds ?? fallbackExpandedNodeIds;
  const resolvedInitialExpandedNodeIds =
    normalizedPersistedExpandedNodeIds ??
    fallbackInitiallyExpandedNodeIds ??
    fallbackExpandedNodeIds;
  const panelCollapsed = parsedUiState[instance].panelCollapsed;
  const uiStateRef = useRef<FolderTreeUiStateV1Map>(parsedUiState);
  const persistTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const lastQueuedPayloadRef = useRef<string>('');
  const expandedHydratedFromSettingsRef = useRef<boolean>(
    normalizedPersistedExpandedNodeIds === undefined
  );
  const previousApplyingRef = useRef<boolean>(false);
  const lastNotifiedErrorAtRef = useRef<string | null>(null);

  useEffect(() => {
    uiStateRef.current = parsedUiState;
    lastQueuedPayloadRef.current = serializeFolderTreeUiStateV1(parsedUiState);
  }, [parsedUiState]);

  useEffect(() => {
    expandedHydratedFromSettingsRef.current = normalizedPersistedExpandedNodeIds === undefined;
  }, [normalizedPersistedExpandedNodeIds, persistedExpandedFingerprint]);

  const queueUiStatePersist = useCallback(
    (nextState: FolderTreeUiStateV1Map, immediate: boolean = false): void => {
      const serialized = serializeFolderTreeUiStateV1(nextState);
      if (serialized === lastQueuedPayloadRef.current) return;

      uiStateRef.current = nextState;
      lastQueuedPayloadRef.current = serialized;

      if (persistTimerRef.current !== null) {
        globalThis.clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }

      const persist = (): void => {
        void updateSetting
          .mutateAsync({
            key: FOLDER_TREE_UI_STATE_V1_SETTING_KEY,
            value: serialized,
          })
          .catch((error: unknown) => {
            logClientError(error, {
              context: {
                source: 'useMasterFolderTreeInstance',
                action: 'persistFolderTreeUiStateV1',
                instance,
              },
            });
            lastQueuedPayloadRef.current = '';
          });
      };

      if (immediate) {
        persist();
        return;
      }
      persistTimerRef.current = globalThis.setTimeout(persist, EXPANDED_STATE_PERSIST_DEBOUNCE_MS);
    },
    [instance, updateSetting]
  );

  const setPanelCollapsed = useCallback(
    (collapsed: boolean): void => {
      const baseState = uiStateRef.current;
      const currentEntry = baseState[instance];
      if (currentEntry.panelCollapsed === collapsed) return;
      queueUiStatePersist(
        {
          ...baseState,
          [instance]: {
            ...currentEntry,
            panelCollapsed: collapsed,
          },
        },
        true
      );
    },
    [instance, queueUiStatePersist]
  );

  const controller = useConfiguredMasterFolderTree({
    ...restControllerOptions,
    ...(resolvedInitialExpandedNodeIds !== undefined
      ? { initiallyExpandedNodeIds: resolvedInitialExpandedNodeIds }
      : {}),
    ...(resolvedExpandedNodeIds !== undefined ? { expandedNodeIds: resolvedExpandedNodeIds } : {}),
    profile,
  });

  const expandedNodeIds = useMemo(
    () => normalizeExpandedNodeIds(controller.expandedNodeIds),
    [controller.expandedNodeIds]
  );

  useEffect(() => {
    if (settingsStore.isLoading) return;
    if (!expandedHydratedFromSettingsRef.current && normalizedPersistedExpandedNodeIds !== undefined) {
      if (!areNodeIdListsEqual(expandedNodeIds, normalizedPersistedExpandedNodeIds)) {
        return;
      }
      expandedHydratedFromSettingsRef.current = true;
    }

    const baseState = uiStateRef.current;
    const currentEntry = baseState[instance];
    if (areNodeIdListsEqual(currentEntry.expandedNodeIds, expandedNodeIds)) {
      return;
    }

    queueUiStatePersist({
      ...baseState,
      [instance]: {
        ...currentEntry,
        expandedNodeIds,
      },
    });
  }, [
    expandedNodeIds,
    instance,
    normalizedPersistedExpandedNodeIds,
    queueUiStatePersist,
    settingsStore.isLoading,
  ]);

  useEffect(() => {
    return (): void => {
      if (persistTimerRef.current !== null) {
        globalThis.clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!shouldNotifyMasterTreePersistByInstance[instance]) {
      previousApplyingRef.current = controller.isApplying;
      return;
    }

    const wasApplying = previousApplyingRef.current;
    const isApplying = controller.isApplying;
    const lastError = controller.lastError;

    if (lastError && lastError.at !== lastNotifiedErrorAtRef.current) {
      lastNotifiedErrorAtRef.current = lastError.at;
      toast(lastError.message || 'Failed to persist folder tree changes.', { variant: 'error' });
    } else if (wasApplying && !isApplying && !lastError) {
      toast(masterTreePersistSuccessMessageByInstance[instance], { variant: 'success' });
    }

    previousApplyingRef.current = isApplying;
  }, [controller.isApplying, controller.lastError, instance, toast]);

  return {
    profile,
    appearance,
    controller,
    panelCollapsed,
    setPanelCollapsed,
  };
}
