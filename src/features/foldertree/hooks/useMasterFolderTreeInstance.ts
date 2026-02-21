'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useConfiguredMasterFolderTree } from '@/features/foldertree/master/useConfiguredMasterFolderTree';
import type { UseConfiguredMasterFolderTreeOptions } from '@/features/foldertree/master/useConfiguredMasterFolderTree';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui/toast';
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
import type { FolderTreeProfileV2, MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import type { FolderTreePlaceholderClassSet } from '@/shared/utils/folder-tree-profiles-v2';
import type { LucideIcon } from 'lucide-react';

export type UseMasterFolderTreeInstanceOptions = Omit<
  UseConfiguredMasterFolderTreeOptions,
  'profile'
> & {
  instance: FolderTreeInstance;
};

type ResolveMasterFolderTreeIconInput = {
  slot: any;
  kind?: string | null;
  fallback: LucideIcon;
  fallbackId?: string | null;
};

type MasterFolderTreeRootDropUi = {
  label: string;
  idleClassName: string;
  activeClassName: string;
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
  const lastStableTreeFingerprintRef = useRef<string>('');
  const applyingStartTreeFingerprintRef = useRef<string | null>(null);

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
    const shouldNotifySuccess = shouldNotifyMasterTreePersistSuccessByInstance[instance];
    const shouldNotifyError = shouldNotifyMasterTreePersistErrorByInstance[instance];
    if (!shouldNotifySuccess && !shouldNotifyError) {
      previousApplyingRef.current = controller.isApplying;
      return;
    }

    const wasApplying = previousApplyingRef.current;
    const isApplying = controller.isApplying;
    const lastError = controller.lastError;
    const currentTreeFingerprint = getMasterTreeStructureFingerprint(controller.nodes);

    if (!isApplying) {
      if (!lastStableTreeFingerprintRef.current) {
        lastStableTreeFingerprintRef.current = currentTreeFingerprint;
      }
    } else if (!wasApplying) {
      applyingStartTreeFingerprintRef.current =
        lastStableTreeFingerprintRef.current || currentTreeFingerprint;
    }

    if (shouldNotifyError && lastError && lastError.at !== lastNotifiedErrorAtRef.current) {
      lastNotifiedErrorAtRef.current = lastError.at;
      toast(lastError.message || 'Failed to persist folder tree changes.', { variant: 'error' });
    } else if (shouldNotifySuccess && wasApplying && !isApplying && !lastError) {
      const applyingStartTreeFingerprint = applyingStartTreeFingerprintRef.current;
      if (
        applyingStartTreeFingerprint &&
        applyingStartTreeFingerprint !== currentTreeFingerprint
      ) {
        toast(masterTreePersistSuccessMessageByInstance[instance], { variant: 'success' });
      }
    }

    if (!isApplying) {
      lastStableTreeFingerprintRef.current = currentTreeFingerprint;
      applyingStartTreeFingerprintRef.current = null;
    }
    previousApplyingRef.current = isApplying;
  }, [controller.isApplying, controller.lastError, controller.nodes, instance, toast]);

  // ─── Instance-level guardrails (dev-only) ──────────────────────────

  // Guardrail: warn if isApplying stays true for too long (stalled adapter).
  const applyingStallTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  useEffect(() => {
    if (!DEV) return;
    if (controller.isApplying) {
      if (applyingStallTimerRef.current === null) {
        applyingStallTimerRef.current = globalThis.setTimeout(() => {
          if (controller.isApplying) {
            console.warn(
              `[MasterFolderTree:${instance}] isApplying has been true for ${APPLYING_STALL_WARN_MS}ms. ` +
              'The adapter may be stalled or an error was swallowed.'
            );
          }
          applyingStallTimerRef.current = null;
        }, APPLYING_STALL_WARN_MS);
      }
    } else {
      if (applyingStallTimerRef.current !== null) {
        globalThis.clearTimeout(applyingStallTimerRef.current);
        applyingStallTimerRef.current = null;
      }
    }
    return (): void => {
      if (applyingStallTimerRef.current !== null) {
        globalThis.clearTimeout(applyingStallTimerRef.current);
        applyingStallTimerRef.current = null;
      }
    };
  }, [controller.isApplying, instance]);

  // Guardrail: detect external sync thrashing (too many node replacements).
  const externalSyncTimestampsRef = useRef<number[]>([]);
  const prevNodeCountRef = useRef<number>(controller.nodes.length);
  useEffect(() => {
    if (!DEV) return;
    const now = Date.now();
    const timestamps = externalSyncTimestampsRef.current;
    timestamps.push(now);
    // Trim timestamps outside the window.
    const cutoff = now - EXTERNAL_SYNC_THRASH_WINDOW_MS;
    while (timestamps.length > 0 && (timestamps[0] ?? 0) < cutoff) {
      timestamps.shift();
    }
    if (timestamps.length > EXTERNAL_SYNC_THRASH_LIMIT) {
      console.warn(
        `[MasterFolderTree:${instance}] External sync thrashing detected: ` +
        `${timestamps.length} node updates in ${EXTERNAL_SYNC_THRASH_WINDOW_MS}ms. ` +
        'Check that the nodes prop has a stable reference when data has not changed.'
      );
      // Reset to avoid spamming.
      externalSyncTimestampsRef.current = [];
    }
    prevNodeCountRef.current = controller.nodes.length;
  }, [controller.nodes, instance]);

  // Guardrail: warn if node count drops to 0 unexpectedly after having data.
  useEffect(() => {
    if (!DEV) return;
    if (controller.nodes.length === 0 && prevNodeCountRef.current > 0) {
      console.warn(
        `[MasterFolderTree:${instance}] Node count dropped to 0 from ${prevNodeCountRef.current}. ` +
        'This may indicate a data loading issue or accidental state wipe.'
      );
    }
  }, [controller.nodes.length, instance]);

  // Guardrail: warn if adapter reference is unstable (changes every render).
  const adapterRef = useRef(restControllerOptions.adapter);
  const adapterChangeCountRef = useRef(0);
  useEffect(() => {
    if (!DEV) return;
    if (restControllerOptions.adapter !== adapterRef.current) {
      adapterRef.current = restControllerOptions.adapter;
      adapterChangeCountRef.current += 1;
      if (adapterChangeCountRef.current > 5) {
        console.warn(
          `[MasterFolderTree:${instance}] Adapter reference changed ${adapterChangeCountRef.current} times. ` +
          'Consider memoizing the adapter with useMemo to prevent unnecessary tree reinitialization.'
        );
        adapterChangeCountRef.current = 0;
      }
    }
  }, [instance, restControllerOptions.adapter]);

  // ─── End instance guardrails ───────────────────────────────────────

  return {
    profile,
    appearance,
    controller,
    panelCollapsed,
    setPanelCollapsed,
  };
}
