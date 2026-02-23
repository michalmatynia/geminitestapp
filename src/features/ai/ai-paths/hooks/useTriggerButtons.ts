'use client';

import { useCallback, useMemo, useState } from 'react';

import { useAiPathTriggerEvent } from '@/features/ai/ai-paths/hooks/useAiPathTriggerEvent';
import type { AiTriggerButtonLocation, AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import { useToast } from '@/shared/ui';

import { useAiPathsTriggerButtonsQuery } from './useAiPathQueries';

const TOGGLE_STORAGE_KEY = 'aiPathsTriggerButtonToggles';
const SUCCESS_STORAGE_KEY = 'aiPathsTriggerButtonSuccess';

type TriggerRunState = {
  status: 'idle' | 'running' | 'success' | 'error';
  progress: number;
};

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

interface UseTriggerButtonsOptions {
  location: AiTriggerButtonLocation;
  entityType: 'product' | 'note' | 'custom';
  entityId?: string | null | undefined;
  getEntityJson?: (() => Record<string, unknown> | null) | undefined;
}

export function useTriggerButtons({
  location,
  entityType,
  entityId,
  getEntityJson,
}: UseTriggerButtonsOptions) {
  const { toast } = useToast();
  const { fireAiPathTriggerEvent } = useAiPathTriggerEvent();
  
  const [toggleMap, setToggleMap] = useState<Record<string, boolean>>(() => readMapFromStorage(TOGGLE_STORAGE_KEY));
  const [successMap, setSuccessMap] = useState<Record<string, boolean>>(() => readMapFromStorage(SUCCESS_STORAGE_KEY));
  const [runStates, setRunStates] = useState<Record<string, TriggerRunState>>({});

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

  const handleTrigger = useCallback(async (button: AiTriggerButtonRecord, options: { mode: 'click' | 'toggle', checked?: boolean, event?: React.MouseEvent }) => {
    if (!button.id) {
      toast('Missing trigger id.', { variant: 'error' });
      return;
    }

    if (options.mode === 'toggle') {
      const nextToggleMap = { ...toggleMap, [button.id]: options.checked ?? false };
      setToggleMap(nextToggleMap);
      writeMapToStorage(TOGGLE_STORAGE_KEY, nextToggleMap);
    }

    let gotProgress = false;
    setRunStates((prev) => ({
      ...prev,
      [button.id]: { status: 'running', progress: 0 },
    }));

    try {
      await fireAiPathTriggerEvent({
        triggerEventId: button.id,
        triggerLabel: button.name,
        preferredPathId: button.pathId ?? null,
        entityType,
        entityId,
        ...(getEntityJson ? { getEntityJson } : {}),
        event: options.event,
        source: { tab: entityType, location },
        extras: { mode: options.mode, ...(options.mode === 'toggle' ? { checked: options.checked } : {}) },
        onProgress: (payload: { status: 'running' | 'success' | 'error'; progress: number }): void => {
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
  }, [entityId, entityType, fireAiPathTriggerEvent, getEntityJson, location, toast, toggleMap]);

  return {
    buttons,
    toggleMap,
    successMap,
    runStates,
    handleTrigger,
    isLoading: triggerButtonsQuery.isLoading,
  };
}
