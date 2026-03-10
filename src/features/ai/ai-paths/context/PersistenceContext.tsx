'use client';

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

import { internalError } from '@/shared/errors/app-error';
import type { PathConfig, PathMeta } from '@/shared/lib/ai-paths';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type { PathSaveOptions as SavePathConfigOptions } from '../components/ai-paths-settings/useAiPathsPersistence.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type { SavePathConfigOptions };

export interface PersistenceOperationHandlers {
  savePathConfig?: (options?: SavePathConfigOptions) => Promise<boolean>;
  persistPathSettings?: (
    nextPaths: PathMeta[],
    configId: string,
    config: PathConfig
  ) => Promise<PathConfig | null>;
  persistSettingsBulk?: (entries: Array<{ key: string; value: string }>) => Promise<void>;
  persistActivePathPreference?: (pathId: string | null) => Promise<void>;
  savePathIndex?: (nextPaths: PathMeta[]) => Promise<void>;
}

export interface PersistenceState {
  // Loading state
  loading: boolean;
  loadNonce: number;
  isPathSwitching: boolean;

  // Saving state
  saving: boolean;
  autoSaveStatus: AutoSaveStatus;
  autoSaveAt: string | null;

  // Dirty tracking
  isDirty: boolean;
}

export interface PersistenceActions {
  // Loading actions
  setLoading: (loading: boolean) => void;
  incrementLoadNonce: () => void;
  setLoadNonce: (nonce: number) => void;
  setIsPathSwitching: (switching: boolean) => void;

  // Saving actions
  setSaving: (saving: boolean) => void;
  setAutoSaveStatus: (status: AutoSaveStatus) => void;
  setAutoSaveAt: (timestamp: string | null) => void;

  // Dirty tracking
  setIsDirty: (dirty: boolean) => void;
  markDirty: () => void;
  markClean: () => void;

  // Convenience actions
  startSaving: () => void;
  finishSaving: (success: boolean) => void;
  startLoading: () => void;
  finishLoading: () => void;

  // Operation handlers (injected by orchestrator/runtime layer)
  setOperationHandlers: (handlers: PersistenceOperationHandlers) => void;
  savePathConfig: (options?: SavePathConfigOptions) => Promise<boolean>;
  persistPathSettings: (
    nextPaths: PathMeta[],
    configId: string,
    config: PathConfig
  ) => Promise<PathConfig | null>;
  persistSettingsBulk: (entries: Array<{ key: string; value: string }>) => Promise<void>;
  persistActivePathPreference: (pathId: string | null) => Promise<void>;
  savePathIndex: (nextPaths: PathMeta[]) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Contexts (split for re-render optimization)
// ---------------------------------------------------------------------------

const PersistenceStateContext = createContext<PersistenceState | null>(null);
const PersistenceActionsContext = createContext<PersistenceActions | null>(null);
const MISSING_SAVE_HANDLER_MESSAGE =
  'AI Paths save handler is not initialized. Reload the page and try again.';

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface PersistenceProviderProps {
  children: ReactNode;
  initialLoading?: boolean | undefined;
}

export function PersistenceProvider({
  children,
  initialLoading = true,
}: PersistenceProviderProps): React.ReactNode {
  // Loading state
  const [loading, setLoadingInternal] = useState(initialLoading);
  const [loadNonce, setLoadNonceInternal] = useState(0);
  const [isPathSwitching, setIsPathSwitchingInternal] = useState(false);

  // Saving state
  const [saving, setSavingInternal] = useState(false);
  const [autoSaveStatus, setAutoSaveStatusInternal] = useState<AutoSaveStatus>('idle');
  const [autoSaveAt, setAutoSaveAtInternal] = useState<string | null>(null);

  // Dirty tracking
  const [isDirty, setIsDirtyInternal] = useState(false);
  const operationHandlersRef = useRef<PersistenceOperationHandlers>({});

  // Memoized actions
  const incrementLoadNonce = useCallback(() => {
    setLoadNonceInternal((prev) => prev + 1);
  }, []);

  const markDirty = useCallback(() => {
    setIsDirtyInternal(true);
  }, []);

  const markClean = useCallback(() => {
    setIsDirtyInternal(false);
  }, []);

  const startSaving = useCallback(() => {
    setSavingInternal(true);
    setAutoSaveStatusInternal('saving');
  }, []);

  const finishSaving = useCallback((success: boolean) => {
    setSavingInternal(false);
    if (success) {
      setAutoSaveStatusInternal('saved');
      setAutoSaveAtInternal(new Date().toISOString());
      setIsDirtyInternal(false);
    } else {
      setAutoSaveStatusInternal('error');
    }
  }, []);

  const startLoading = useCallback(() => {
    setLoadingInternal(true);
  }, []);

  const finishLoading = useCallback(() => {
    setLoadingInternal(false);
  }, []);

  const setOperationHandlers = useCallback((handlers: PersistenceOperationHandlers) => {
    operationHandlersRef.current = handlers;
  }, []);

  const savePathConfig = useCallback(async (options?: SavePathConfigOptions): Promise<boolean> => {
    const handler = operationHandlersRef.current.savePathConfig;
    if (!handler) {
      setAutoSaveStatusInternal('error');
      setSavingInternal(false);
      const error = new Error(MISSING_SAVE_HANDLER_MESSAGE);
      logClientError(error, {
        context: {
          source: 'ai-paths.persistence-context',
          action: 'savePathConfig',
          category: 'AI',
          level: 'error',
        },
      });
      return false;
    }
    return await handler(options);
  }, []);

  const persistPathSettings = useCallback(
    async (
      nextPaths: PathMeta[],
      configId: string,
      config: PathConfig
    ): Promise<PathConfig | null> => {
      const handler = operationHandlersRef.current.persistPathSettings;
      if (!handler) return null;
      return await handler(nextPaths, configId, config);
    },
    []
  );

  const persistSettingsBulk = useCallback(
    async (entries: Array<{ key: string; value: string }>): Promise<void> => {
      const handler = operationHandlersRef.current.persistSettingsBulk;
      if (!handler) return;
      await handler(entries);
    },
    []
  );

  const persistActivePathPreference = useCallback(
    async (pathId: string | null): Promise<void> => {
      const handler = operationHandlersRef.current.persistActivePathPreference;
      if (!handler) return;
      await handler(pathId);
    },
    []
  );

  const savePathIndex = useCallback(
    async (nextPaths: PathMeta[]): Promise<void> => {
      const handler = operationHandlersRef.current.savePathIndex;
      if (!handler) return;
      await handler(nextPaths);
    },
    []
  );

  // Actions are stable
  const actions = useMemo<PersistenceActions>(
    () => ({
      // Loading actions
      setLoading: setLoadingInternal,
      incrementLoadNonce,
      setLoadNonce: setLoadNonceInternal,
      setIsPathSwitching: setIsPathSwitchingInternal,

      // Saving actions
      setSaving: setSavingInternal,
      setAutoSaveStatus: setAutoSaveStatusInternal,
      setAutoSaveAt: setAutoSaveAtInternal,

      // Dirty tracking
      setIsDirty: setIsDirtyInternal,
      markDirty,
      markClean,

      // Convenience actions
      startSaving,
      finishSaving,
      startLoading,
      finishLoading,
      setOperationHandlers,
      savePathConfig,
      persistPathSettings,
      persistSettingsBulk,
      persistActivePathPreference,
      savePathIndex,
    }),
    [
      incrementLoadNonce,
      markDirty,
      markClean,
      startSaving,
      finishSaving,
      startLoading,
      finishLoading,
      setOperationHandlers,
      savePathConfig,
      persistPathSettings,
      persistSettingsBulk,
      persistActivePathPreference,
      savePathIndex,
    ]
  );

  const state = useMemo<PersistenceState>(
    () => ({
      loading,
      loadNonce,
      isPathSwitching,
      saving,
      autoSaveStatus,
      autoSaveAt,
      isDirty,
    }),
    [loading, loadNonce, isPathSwitching, saving, autoSaveStatus, autoSaveAt, isDirty]
  );

  return (
    <PersistenceActionsContext.Provider value={actions}>
      <PersistenceStateContext.Provider value={state}>{children}</PersistenceStateContext.Provider>
    </PersistenceActionsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Consumer Hooks
// ---------------------------------------------------------------------------

/**
 * Get the current persistence state.
 * Components using this will re-render when persistence state changes.
 */
export function usePersistenceState(): PersistenceState {
  const context = useContext(PersistenceStateContext);
  if (!context) {
    throw internalError('usePersistenceState must be used within a PersistenceProvider');
  }
  return context;
}

/**
 * Get persistence actions.
 * Components using this will NOT re-render when state changes.
 */
export function usePersistenceActions(): PersistenceActions {
  const context = useContext(PersistenceActionsContext);
  if (!context) {
    throw internalError('usePersistenceActions must be used within a PersistenceProvider');
  }
  return context;
}
