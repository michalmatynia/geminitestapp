'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  AiTriggerButtonLocation,
  AiTriggerButtonRecord,
} from '@/shared/contracts/ai-trigger-buttons';
import {
  type TrackedAiPathRunSnapshot,
  subscribeToTrackedAiPathRun,
} from '@/shared/lib/ai-paths/client-run-tracker';
import { useToast } from '@/shared/ui';

import { useAiPathsTriggerButtonsQuery } from './useAiPathQueries';
import { useAiPathTriggerEvent } from './useAiPathTriggerEvent';

const TOGGLE_STORAGE_KEY = 'aiPathsTriggerButtonToggles';
const SUCCESS_STORAGE_KEY = 'aiPathsTriggerButtonSuccess';

type TriggerRunState = {
  status: 'idle' | 'running' | 'success' | 'error';
  progress: number;
};

export type TriggerButtonLastRun = Pick<
  TrackedAiPathRunSnapshot,
  'runId' | 'status' | 'updatedAt' | 'finishedAt' | 'errorMessage'
>;

const readMapFromStorage = (key: string): Record<string, boolean> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
};

const writeMapToStorage = (key: string, value: Record<string, boolean>): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

const normalizeOptionalEntityId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveTriggerEntityId = (
  explicitEntityId: string | null | undefined,
  getEntityJson?: (() => Record<string, unknown> | null) | undefined
): string | null => {
  const normalizedExplicitEntityId = normalizeOptionalEntityId(explicitEntityId);
  if (normalizedExplicitEntityId) return normalizedExplicitEntityId;
  if (!getEntityJson) return null;
  const entityJson = getEntityJson();
  if (!entityJson) return null;
  return (
    normalizeOptionalEntityId(entityJson['id']) ??
    normalizeOptionalEntityId(entityJson['_id']) ??
    normalizeOptionalEntityId(entityJson['productId']) ??
    null
  );
};

interface UseTriggerButtonsOptions {
  location: AiTriggerButtonLocation;
  entityType: 'product' | 'note' | 'custom';
  entityId?: string | null | undefined;
  getEntityJson?: (() => Record<string, unknown> | null) | undefined;
  onRunQueued?:
    | ((args: {
        button: AiTriggerButtonRecord;
        runId: string;
        entityId?: string | null | undefined;
        entityType: 'product' | 'note' | 'custom';
      }) => void)
    | undefined;
}

export function useTriggerButtons({
  location,
  entityType,
  entityId,
  getEntityJson,
  onRunQueued,
}: UseTriggerButtonsOptions) {
  const { toast } = useToast();
  const { fireAiPathTriggerEvent } = useAiPathTriggerEvent();

  const [toggleMap, setToggleMap] = useState<Record<string, boolean>>(() =>
    readMapFromStorage(TOGGLE_STORAGE_KEY)
  );
  const [successMap, setSuccessMap] = useState<Record<string, boolean>>(() =>
    readMapFromStorage(SUCCESS_STORAGE_KEY)
  );
  const [runStates, setRunStates] = useState<Record<string, TriggerRunState>>({});
  const [lastRuns, setLastRuns] = useState<Record<string, TriggerButtonLastRun>>({});
  const runSubscriptionsRef = useRef<Map<string, () => void>>(new Map());

  const triggerButtonsQuery = useAiPathsTriggerButtonsQuery();

  const buttons = useMemo(() => {
    const all = triggerButtonsQuery.data ?? [];
    const seen = new Set<string>();
    const sourceIndexById = new Map<string, number>();
    all.forEach((button: AiTriggerButtonRecord, index: number) => {
      if (!button.id || sourceIndexById.has(button.id)) return;
      sourceIndexById.set(button.id, index);
    });

    return all
      .filter((button: AiTriggerButtonRecord) => {
        if (button.enabled === false) return false;
        if (!(button.locations ?? []).includes(location)) return false;
        if (!button.id || seen.has(button.id)) return false;
        seen.add(button.id);
        return true;
      })
      .sort((a: AiTriggerButtonRecord, b: AiTriggerButtonRecord) => {
        const left = sourceIndexById.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const right = sourceIndexById.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        return left - right;
      });
  }, [triggerButtonsQuery.data, location]);

  const stopRunSubscription = useCallback((buttonId: string): void => {
    const unsubscribe = runSubscriptionsRef.current.get(buttonId);
    if (!unsubscribe) return;
    runSubscriptionsRef.current.delete(buttonId);
    unsubscribe();
  }, []);

  const startRunSubscription = useCallback(
    (
      buttonId: string,
      runId: string,
      initialSnapshot?: Partial<TrackedAiPathRunSnapshot> | undefined
    ): void => {
      stopRunSubscription(buttonId);
      let didStop = false;
      const unsubscribe = subscribeToTrackedAiPathRun(
        runId,
        (snapshot: TrackedAiPathRunSnapshot): void => {
          setLastRuns((prev) => ({
            ...prev,
            [buttonId]: {
              runId: snapshot.runId,
              status: snapshot.status,
              updatedAt: snapshot.updatedAt,
              finishedAt: snapshot.finishedAt,
              errorMessage: snapshot.errorMessage,
            },
          }));

          if (snapshot.trackingState !== 'stopped' || didStop) return;
          didStop = true;
          stopRunSubscription(buttonId);
        },
        initialSnapshot ? { initialSnapshot } : undefined
      );
      runSubscriptionsRef.current.set(buttonId, unsubscribe);
    },
    [stopRunSubscription]
  );

  useEffect(() => {
    return () => {
      Array.from(runSubscriptionsRef.current.keys()).forEach((buttonId: string) => {
        stopRunSubscription(buttonId);
      });
    };
  }, [stopRunSubscription]);

  const handleTrigger = useCallback(
    async (
      button: AiTriggerButtonRecord,
      options: { mode: 'click' | 'toggle'; checked?: boolean; event?: React.MouseEvent }
    ) => {
      if (!button.id) {
        toast('Missing trigger id.', { variant: 'error' });
        return;
      }

      if (options.mode === 'toggle') {
        setToggleMap((prev) => {
          const nextToggleMap = { ...prev, [button.id]: options.checked ?? false };
          writeMapToStorage(TOGGLE_STORAGE_KEY, nextToggleMap);
          return nextToggleMap;
        });
      }

      let gotProgress = false;
      setRunStates((prev) => ({
        ...prev,
        [button.id]: { status: 'running', progress: 0 },
      }));
      const resolvedEntityId = resolveTriggerEntityId(entityId, getEntityJson);

      // Guard: if the caller signals an entity context (via explicit entityId prop or getEntityJson)
      // but resolution yields null, abort early rather than firing with no entity context.
      // 'custom' entityType is exempt — those triggers intentionally have no entity.
      if (
        resolvedEntityId === null &&
        entityType !== 'custom' &&
        (entityId !== undefined || getEntityJson !== undefined)
      ) {
        toast(
          'Could not resolve entity ID for this AI Path trigger. Ensure the product has a valid ID.',
          { variant: 'warning' }
        );
        setRunStates((prev) => ({ ...prev, [button.id]: { status: 'idle', progress: 0 } }));
        return;
      }

      try {
        await fireAiPathTriggerEvent({
          triggerEventId: button.id,
          triggerLabel: button.name,
          preferredPathId: button.pathId ?? null,
          entityType,
          entityId: resolvedEntityId,
          ...(getEntityJson ? { getEntityJson } : {}),
          event: options.event,
          source: { tab: entityType, location },
          extras: {
            mode: options.mode,
            ...(options.mode === 'toggle' ? { checked: options.checked } : {}),
          },
          onSuccess: (runId: string): void => {
            startRunSubscription(button.id, runId, {
              runId,
              status: 'queued',
              updatedAt: new Date().toISOString(),
              finishedAt: null,
              errorMessage: null,
              entityId: resolvedEntityId,
              entityType,
            });
            onRunQueued?.({
              button,
              runId,
              entityId: resolvedEntityId,
              entityType,
            });
          },
          onProgress: (payload: {
            status: 'running' | 'success' | 'error';
            progress: number;
          }): void => {
            const { status, progress } = payload;
            gotProgress = true;

            if (status === 'success') {
              setSuccessMap((prev) => {
                const nextMap = { ...prev, [button.id]: true };
                writeMapToStorage(SUCCESS_STORAGE_KEY, nextMap);
                return nextMap;
              });
              setRunStates((prev) => ({
                ...prev,
                [button.id]: { status: 'idle', progress: 0 },
              }));
              return;
            }

            if (status === 'error') {
              setRunStates((prev) => ({
                ...prev,
                [button.id]: { status: 'idle', progress: 0 },
              }));
              return;
            }

            setRunStates((prev) => ({
              ...prev,
              [button.id]: { status, progress },
            }));
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast(String(message), { variant: 'error' });
      } finally {
        if (!gotProgress) {
          setRunStates((prev) => ({
            ...prev,
            [button.id]: { status: 'idle', progress: 0 },
          }));
        } else {
          setRunStates((prev) => {
            const state = prev[button.id];
            if (state?.status !== 'running') return prev;
            return { ...prev, [button.id]: { status: 'idle', progress: 0 } };
          });
        }
      }
    },
    [
      entityId,
      entityType,
      fireAiPathTriggerEvent,
      getEntityJson,
      location,
      onRunQueued,
      startRunSubscription,
      toast,
    ]
  );

  return {
    buttons,
    toggleMap,
    successMap,
    runStates,
    lastRuns,
    handleTrigger,
    isLoading: triggerButtonsQuery.isLoading,
  };
}
