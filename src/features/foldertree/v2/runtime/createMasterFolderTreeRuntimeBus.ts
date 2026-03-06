'use client';

import type { FolderTreeRuntimeBus, FolderTreeRuntimeInstanceInfo } from './types';

export type MasterFolderTreeRuntimeBusWithDispose = FolderTreeRuntimeBus & {
  dispose: () => void;
};

export type CreateMasterFolderTreeRuntimeBusOptions = {
  bindWindowKeydown?: boolean | undefined;
  windowTarget?: Window | null | undefined;
};

const isInputFieldTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

export const createMasterFolderTreeRuntimeBus = (
  options?: CreateMasterFolderTreeRuntimeBusOptions | undefined
): MasterFolderTreeRuntimeBusWithDispose => {
  const instances = new Map<string, FolderTreeRuntimeInstanceInfo>();
  const searchCache = new Map<string, string[]>();
  const keyboardHandlers = new Map<string, (event: KeyboardEvent) => void>();
  const metrics: Record<string, number> = {};

  let focusedInstanceId: string | null = null;

  const resolvedWindowTarget =
    options?.windowTarget !== undefined
      ? options.windowTarget
      : typeof window !== 'undefined'
        ? window
        : null;
  const bindWindowKeydown = options?.bindWindowKeydown ?? true;
  let keydownBound = false;

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented) return;

    const isInputField = isInputFieldTarget(event.target);
    const isUndoShortcut =
      (event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'z';

    if (isUndoShortcut && !isInputField) {
      const focusedId = focusedInstanceId;
      if (!focusedId) return;
      const instance = instances.get(focusedId);
      if (!instance?.undo) return;
      if (instance.canUndo && !instance.canUndo()) return;
      event.preventDefault();
      void instance.undo();
      return;
    }

    if (!isInputField) {
      const focusedId = focusedInstanceId;
      if (!focusedId) return;
      const handler = keyboardHandlers.get(focusedId);
      handler?.(event);
    }
  };

  const bindKeydown = (): void => {
    if (!bindWindowKeydown || !resolvedWindowTarget || keydownBound) return;
    resolvedWindowTarget.addEventListener('keydown', handleKeyDown);
    keydownBound = true;
  };

  const unbindKeydown = (): void => {
    if (!resolvedWindowTarget || !keydownBound) return;
    resolvedWindowTarget.removeEventListener('keydown', handleKeyDown);
    keydownBound = false;
  };

  bindKeydown();

  return {
    registerInstance: (instance: FolderTreeRuntimeInstanceInfo): (() => void) => {
      instances.set(instance.id, instance);
      return (): void => {
        instances.delete(instance.id);
        searchCache.delete(instance.id);
        keyboardHandlers.delete(instance.id);
        if (focusedInstanceId === instance.id) {
          focusedInstanceId = null;
        }
      };
    },
    setFocusedInstance: (instanceId: string | null): void => {
      focusedInstanceId = instanceId;
    },
    getFocusedInstance: (): string | null => focusedInstanceId,
    getInstanceIds: (): string[] => Array.from(instances.keys()),
    getCachedSearchIndex: (instanceId: string): string[] | null =>
      searchCache.get(instanceId) ?? null,
    setCachedSearchIndex: (instanceId: string, nodeIds: string[]): void => {
      searchCache.set(instanceId, [...nodeIds]);
    },
    registerKeyboardHandler: (
      instanceId: string,
      handler: (event: KeyboardEvent) => void
    ): (() => void) => {
      keyboardHandlers.set(instanceId, handler);
      return (): void => {
        keyboardHandlers.delete(instanceId);
      };
    },
    recordMetric: (metric, value = 1): void => {
      metrics[metric] = (metrics[metric] ?? 0) + value;
    },
    getMetricsSnapshot: (): Record<string, number> => ({ ...metrics }),
    dispose: (): void => {
      unbindKeydown();
      instances.clear();
      searchCache.clear();
      keyboardHandlers.clear();
      focusedInstanceId = null;
    },
  };
};
