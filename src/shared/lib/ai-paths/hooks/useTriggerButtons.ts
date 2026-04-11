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
import {
  clearTriggerButtonRunFeedback,
  isTriggerButtonRunFeedbackTerminal,
  persistTriggerButtonRunFeedback,
  readTriggerButtonRunFeedback,
  type TriggerButtonRunFeedbackSnapshot,
} from '@/shared/lib/ai-paths/trigger-button-run-feedback';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { useAiPathsTriggerButtonsQuery } from './useAiPathQueries';
import { useAiPathTriggerEvent } from './useAiPathTriggerEvent';


const TOGGLE_STORAGE_KEY = 'aiPathsTriggerButtonToggles';
const SUCCESS_STORAGE_KEY = 'aiPathsTriggerButtonSuccess';
const EMPTY_TRIGGER_BUTTONS: AiTriggerButtonRecord[] = [];

type TriggerRunState = {
  status: 'idle' | 'running' | 'success' | 'error';
  progress: number;
};

export type TriggerButtonLastRun = TriggerButtonRunFeedbackSnapshot;

const areTriggerButtonLastRunsEqual = (
  left: TriggerButtonLastRun | undefined,
  right: TriggerButtonLastRun | undefined
): boolean => {
  if (left === right) return true;
  if (!left || !right) return false;
  return (
    left.runId === right.runId &&
    left.status === right.status &&
    left.updatedAt === right.updatedAt &&
    left.finishedAt === right.finishedAt &&
    left.errorMessage === right.errorMessage
  );
};

const areTriggerButtonLastRunMapsEqual = (
  left: Record<string, TriggerButtonLastRun>,
  right: Record<string, TriggerButtonLastRun>
): boolean => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;

  return leftKeys.every((key) => areTriggerButtonLastRunsEqual(left[key], right[key]));
};

const toTrackedRunInitialSnapshot = (
  lastRun: TriggerButtonLastRun,
  context: {
    entityId: string | null;
    entityType: 'product' | 'note' | 'custom';
  }
): Partial<TrackedAiPathRunSnapshot> | undefined => {
  if (lastRun.status === 'waiting') return undefined;
  return {
    runId: lastRun.runId,
    status: lastRun.status,
    updatedAt: lastRun.updatedAt,
    finishedAt: lastRun.finishedAt,
    errorMessage: lastRun.errorMessage,
    entityId: context.entityId,
    entityType: context.entityType,
  };
};

const readMapFromStorage = (key: string): Record<string, boolean> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, boolean>;
  } catch (error) {
    logClientCatch(error, {
      source: 'useTriggerButtons',
      action: 'readMapFromStorage',
      storageKey: key,
    });
    return {};
  }
};

const writeMapToStorage = (key: string, value: Record<string, boolean>): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    logClientCatch(error, {
      source: 'useTriggerButtons',
      action: 'writeMapToStorage',
      storageKey: key,
      entryCount: Object.keys(value).length,
    });

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

const resolveFeedbackAliasButtonIds = (
  button: AiTriggerButtonRecord,
  allButtons: AiTriggerButtonRecord[]
): string[] => {
  const buttonId = normalizeOptionalEntityId(button.id);
  if (!buttonId) return [];

  const pathId = normalizeOptionalEntityId(button.pathId);
  if (!pathId) return [buttonId];

  const aliases = new Set<string>();
  allButtons.forEach((candidate: AiTriggerButtonRecord) => {
    const candidateId = normalizeOptionalEntityId(candidate.id);
    if (!candidateId) return;
    if (normalizeOptionalEntityId(candidate.pathId) !== pathId) return;
    aliases.add(candidateId);
  });
  aliases.add(buttonId);
  return Array.from(aliases);
};

interface UseTriggerButtonsOptions {
  location: AiTriggerButtonLocation;
  entityType: 'product' | 'note' | 'custom';
  entityId?: string | null | undefined;
  getEntityJson?: (() => Record<string, unknown> | null) | undefined;
  getTriggerExtras?: (() => Record<string, unknown> | null) | undefined;
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
  getTriggerExtras,
  onRunQueued,
}: UseTriggerButtonsOptions) {
  const { toast } = useToast();
  const { fireAiPathTriggerEvent } = useAiPathTriggerEvent();
  const feedbackEntityId = useMemo(
    () => resolveTriggerEntityId(entityId, getEntityJson),
    [entityId, getEntityJson]
  );
  const feedbackScopeKey = `${entityType}::${feedbackEntityId ?? '__none__'}`;

  const [toggleMap, setToggleMap] = useState<Record<string, boolean>>(() =>
    readMapFromStorage(TOGGLE_STORAGE_KEY)
  );
  const [successMap, setSuccessMap] = useState<Record<string, boolean>>(() =>
    readMapFromStorage(SUCCESS_STORAGE_KEY)
  );
  const [runStates, setRunStates] = useState<Record<string, TriggerRunState>>({});
  const [lastRuns, setLastRuns] = useState<Record<string, TriggerButtonLastRun>>({});
  const runSubscriptionsRef = useRef<Map<string, () => void>>(new Map());
  const previousFeedbackScopeKeyRef = useRef<string | null>(null);

  const triggerButtonsQuery = useAiPathsTriggerButtonsQuery();
  const allButtons = triggerButtonsQuery.data ?? EMPTY_TRIGGER_BUTTONS;

  const buttons = useMemo(() => {
    const seen = new Set<string>();
    const sourceIndexById = new Map<string, number>();
    allButtons.forEach((button: AiTriggerButtonRecord, index: number) => {
      if (!button.id || sourceIndexById.has(button.id)) return;
      sourceIndexById.set(button.id, index);
    });

    return allButtons
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
  }, [allButtons, location]);

  const feedbackAliasButtonIdsById = useMemo(() => {
    const next = new Map<string, string[]>();
    buttons.forEach((button: AiTriggerButtonRecord) => {
      if (!button.id) return;
      next.set(button.id, resolveFeedbackAliasButtonIds(button, allButtons));
    });
    return next;
  }, [allButtons, buttons]);

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
      options: {
        entityId: string | null;
        entityType: 'product' | 'note' | 'custom';
        pathId?: string | null | undefined;
        legacyButtonIds?: readonly string[] | undefined;
        initialSnapshot?: Partial<TrackedAiPathRunSnapshot> | undefined;
      }
    ): void => {
      stopRunSubscription(buttonId);
      let didStop = false;
      const unsubscribe = subscribeToTrackedAiPathRun(
        runId,
        (snapshot: TrackedAiPathRunSnapshot): void => {
          const nextLastRun: TriggerButtonLastRun = {
            runId: snapshot.runId,
            status: snapshot.status,
            updatedAt: snapshot.updatedAt,
            finishedAt: snapshot.finishedAt,
            errorMessage: snapshot.errorMessage,
          };
          setLastRuns((prev) => ({
            ...prev,
            [buttonId]: nextLastRun,
          }));
          persistTriggerButtonRunFeedback({
            buttonId,
            pathId: options.pathId,
            legacyButtonIds: options.legacyButtonIds,
            location,
            entityId: options.entityId ?? snapshot.entityId ?? null,
            entityType: options.entityType,
            run: nextLastRun,
          });

          if (snapshot.trackingState !== 'stopped' || didStop) return;
          didStop = true;
          stopRunSubscription(buttonId);
        },
        options.initialSnapshot ? { initialSnapshot: options.initialSnapshot } : undefined
      );
      runSubscriptionsRef.current.set(buttonId, unsubscribe);
    },
    [location, stopRunSubscription]
  );

  useEffect(() => {
    const currentButtonIds = new Set<string>(
      buttons
        .map((button: AiTriggerButtonRecord) => button.id)
        .filter((buttonId): buttonId is string => typeof buttonId === 'string' && buttonId.length > 0)
    );
    const scopeChanged = previousFeedbackScopeKeyRef.current !== feedbackScopeKey;
    previousFeedbackScopeKeyRef.current = feedbackScopeKey;

    Array.from(runSubscriptionsRef.current.keys()).forEach((buttonId: string) => {
      if (scopeChanged || !currentButtonIds.has(buttonId)) {
        stopRunSubscription(buttonId);
      }
    });

    const restoredRuns: Record<string, TriggerButtonLastRun> = {};
    buttons.forEach((button: AiTriggerButtonRecord) => {
      if (!button.id) return;
      const feedbackAliasButtonIds = feedbackAliasButtonIdsById.get(button.id) ?? [button.id];
      const restoredRun = readTriggerButtonRunFeedback({
        buttonId: button.id,
        pathId: button.pathId ?? null,
        legacyButtonIds: feedbackAliasButtonIds,
        entityType,
        entityId: feedbackEntityId,
      });
      if (!restoredRun) return;
      restoredRuns[button.id] = restoredRun;
      if (
        !runSubscriptionsRef.current.has(button.id) &&
        !isTriggerButtonRunFeedbackTerminal(restoredRun.status)
      ) {
        const initialSnapshot = toTrackedRunInitialSnapshot(restoredRun, {
          entityId: feedbackEntityId,
          entityType,
        });
        startRunSubscription(button.id, restoredRun.runId, {
          entityId: feedbackEntityId,
          entityType,
          pathId: button.pathId ?? null,
          legacyButtonIds: feedbackAliasButtonIds,
          ...(initialSnapshot ? { initialSnapshot } : {}),
        });
      }
    });

    setLastRuns((prev) => {
      const source = scopeChanged ? {} : prev;
      const next: Record<string, TriggerButtonLastRun> = {};
      currentButtonIds.forEach((buttonId: string) => {
        const existing = source[buttonId];
        const restored = restoredRuns[buttonId];
        if (existing) {
          next[buttonId] = existing;
          return;
        }
        if (restored) {
          next[buttonId] = restored;
        }
      });
      return areTriggerButtonLastRunMapsEqual(prev, next) ? prev : next;
    });
  }, [
    buttons,
    entityType,
    feedbackAliasButtonIdsById,
    feedbackEntityId,
    feedbackScopeKey,
    startRunSubscription,
    stopRunSubscription,
  ]);

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
      const feedbackAliasButtonIds = feedbackAliasButtonIdsById.get(button.id) ?? [button.id];
      let customExtras: Record<string, unknown> | null = null;

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

      if (getTriggerExtras) {
        try {
          const resolvedTriggerExtras = getTriggerExtras();
          if (
            resolvedTriggerExtras &&
            typeof resolvedTriggerExtras === 'object' &&
            !Array.isArray(resolvedTriggerExtras)
          ) {
            customExtras = resolvedTriggerExtras;
          }
        } catch (error) {
          logClientCatch(error, {
            source: 'useTriggerButtons',
            action: 'getTriggerExtras',
            buttonId: button.id,
            pathId: button.pathId,
            location,
            entityType,
          });
          toast('Could not build trigger context for this AI Path trigger.', {
            variant: 'error',
          });
          setRunStates((prev) => ({ ...prev, [button.id]: { status: 'idle', progress: 0 } }));
          return;
        }
      }

      try {
        const waitingRun: TriggerButtonLastRun = {
          runId: `waiting:${button.id}:${Date.now()}`,
          status: 'waiting',
          updatedAt: new Date().toISOString(),
          finishedAt: null,
          errorMessage: null,
        };
        setLastRuns((prev) => ({
          ...prev,
          [button.id]: waitingRun,
        }));
        clearTriggerButtonRunFeedback({
          buttonId: button.id,
          pathId: button.pathId ?? null,
          legacyButtonIds: feedbackAliasButtonIds,
          location,
          entityId: resolvedEntityId,
          entityType,
        });

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
            ...(customExtras ?? {}),
            mode: options.mode,
            ...(options.mode === 'toggle' ? { checked: options.checked } : {}),
          },
          onSuccess: (runId: string): void => {
            const queuedRun = {
              runId,
              status: 'queued',
              updatedAt: new Date().toISOString(),
              finishedAt: null,
              errorMessage: null,
            } satisfies TriggerButtonLastRun;
            persistTriggerButtonRunFeedback({
              buttonId: button.id,
              pathId: button.pathId ?? null,
              legacyButtonIds: feedbackAliasButtonIds,
              location,
              entityId: resolvedEntityId,
              entityType,
              run: queuedRun,
            });
            setLastRuns((prev) => ({
              ...prev,
              [button.id]: queuedRun,
            }));
            const initialSnapshot = toTrackedRunInitialSnapshot(queuedRun, {
              entityId: resolvedEntityId,
              entityType,
            });
            startRunSubscription(button.id, runId, {
              entityId: resolvedEntityId,
              entityType,
              pathId: button.pathId ?? null,
              legacyButtonIds: feedbackAliasButtonIds,
              ...(initialSnapshot ? { initialSnapshot } : {}),
            });
            onRunQueued?.({
              button,
              runId,
              entityId: resolvedEntityId,
              entityType,
            });
          },
          onError: (): void => {
            setLastRuns((prev) => {
              if (prev[button.id]?.status !== 'waiting') return prev;
              const next = { ...prev };
              delete next[button.id];
              return next;
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
        logClientCatch(error, {
          source: 'useTriggerButtons',
          action: 'handleTrigger',
          buttonId: button.id,
          pathId: button.pathId,
          location,
          entityType,
        });
        const message = error instanceof Error ? error.message : 'Unknown error';
        setLastRuns((prev) => {
          if (prev[button.id]?.status !== 'waiting') return prev;
          const next = { ...prev };
          delete next[button.id];
          return next;
        });
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
      feedbackAliasButtonIdsById,
      getEntityJson,
      getTriggerExtras,
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
