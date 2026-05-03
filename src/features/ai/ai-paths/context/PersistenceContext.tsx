'use client';

import {
  useState,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import type { PathConfig, PathMeta } from '@/shared/contracts/ai-paths';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { type AutoSaveStatus } from '@/shared/contracts/ui/base';

import type { PathSaveOptions as SavePathConfigOptions } from '../components/ai-paths-settings/useAiPathsPersistence.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { AutoSaveStatus, SavePathConfigOptions };

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

const {
  Context: PersistenceStateContext,
  useStrictContext: usePersistenceState,
} = createStrictContext<PersistenceState>({
  hookName: 'usePersistenceState',
  providerName: 'a PersistenceProvider',
  errorFactory: internalError,
});

const {
  Context: PersistenceActionsContext,
  useStrictContext: usePersistenceActions,
} = createStrictContext<PersistenceActions>({
  hookName: 'usePersistenceActions',
  providerName: 'a PersistenceProvider',
  errorFactory: internalError,
});

export { usePersistenceState, usePersistenceActions };
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
  const [loading, setLoadingInternal] = useState(initialLoading);
  const [loadNonce, setLoadNonceInternal] = useState(0);
  const [isPathSwitching, setIsPathSwitchingInternal] = useState(false);
  const [saving, setSavingInternal] = useState(false);
  const [autoSaveStatus, setAutoSaveStatusInternal] = useState<AutoSaveStatus>('idle');
  const [autoSaveAt, setAutoSaveAtInternal] = useState<string | null>(null);
  const [isDirty, setIsDirtyInternal] = useState(false);
  const operationHandlersRef = useRef<PersistenceOperationHandlers>({});

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

  const actions = usePersistenceActionsValue({
    setLoadingInternal,
    setLoadNonceInternal,
    setIsPathSwitchingInternal,
    setSavingInternal,
    setAutoSaveStatusInternal,
    setAutoSaveAtInternal,
    setIsDirtyInternal,
    operationHandlersRef,
  });

  return (
    <PersistenceActionsContext.Provider value={actions}>
      <PersistenceStateContext.Provider value={state}>{children}</PersistenceStateContext.Provider>
    </PersistenceActionsContext.Provider>
  );
}

function usePersistenceActionsValue(args: {
  setLoadingInternal: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadNonceInternal: React.Dispatch<React.SetStateAction<number>>;
  setIsPathSwitchingInternal: React.Dispatch<React.SetStateAction<boolean>>;
  setSavingInternal: React.Dispatch<React.SetStateAction<boolean>>;
  setAutoSaveStatusInternal: React.Dispatch<React.SetStateAction<AutoSaveStatus>>;
  setAutoSaveAtInternal: React.Dispatch<React.SetStateAction<string | null>>;
  setIsDirtyInternal: React.Dispatch<React.SetStateAction<boolean>>;
  operationHandlersRef: React.MutableRefObject<PersistenceOperationHandlers>;
}): PersistenceActions {
  const uiActions = usePersistenceUiActions(args);
  const saveActions = usePersistenceSaveActions(args);
  const operationActions = usePersistenceOperationActions(args);

  return useMemo<PersistenceActions>(
    () => ({
      ...uiActions,
      ...saveActions,
      ...operationActions,
    }),
    [uiActions, saveActions, operationActions]
  );
}

function usePersistenceUiActions(args: {
  setLoadingInternal: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadNonceInternal: React.Dispatch<React.SetStateAction<number>>;
  setIsPathSwitchingInternal: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { setLoadingInternal, setLoadNonceInternal, setIsPathSwitchingInternal } = args;

  const incrementLoadNonce = useCallback(() => {
    setLoadNonceInternal((prev) => prev + 1);
  }, [setLoadNonceInternal]);

  const startLoading = useCallback(() => {
    setLoadingInternal(true);
  }, [setLoadingInternal]);

  const finishLoading = useCallback(() => {
    setLoadingInternal(false);
  }, [setLoadingInternal]);

  return useMemo(
    () => ({
      setLoading: setLoadingInternal,
      incrementLoadNonce,
      setLoadNonce: setLoadNonceInternal,
      setIsPathSwitching: setIsPathSwitchingInternal,
      startLoading,
      finishLoading,
    }),
    [setLoadingInternal, incrementLoadNonce, setLoadNonceInternal, setIsPathSwitchingInternal, startLoading, finishLoading]
  );
}

function usePersistenceSaveActions(args: {
  setSavingInternal: React.Dispatch<React.SetStateAction<boolean>>;
  setAutoSaveStatusInternal: React.Dispatch<React.SetStateAction<AutoSaveStatus>>;
  setAutoSaveAtInternal: React.Dispatch<React.SetStateAction<string | null>>;
  setIsDirtyInternal: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const {
    setSavingInternal,
    setAutoSaveStatusInternal,
    setAutoSaveAtInternal,
    setIsDirtyInternal,
  } = args;

  const markDirty = useCallback(() => {
    setIsDirtyInternal(true);
  }, [setIsDirtyInternal]);

  const markClean = useCallback(() => {
    setIsDirtyInternal(false);
  }, [setIsDirtyInternal]);

  const startSaving = useCallback(() => {
    setSavingInternal(true);
    setAutoSaveStatusInternal('saving');
  }, [setSavingInternal, setAutoSaveStatusInternal]);

  const finishSaving = useCallback(
    (success: boolean) => {
      setSavingInternal(false);
      if (success) {
        setAutoSaveStatusInternal('saved');
        setAutoSaveAtInternal(new Date().toISOString());
        setIsDirtyInternal(false);
      } else {
        setAutoSaveStatusInternal('error');
      }
    },
    [setSavingInternal, setAutoSaveStatusInternal, setAutoSaveAtInternal, setIsDirtyInternal]
  );

  return useMemo(
    () => ({
      setSaving: setSavingInternal,
      setAutoSaveStatus: setAutoSaveStatusInternal,
      setAutoSaveAt: setAutoSaveAtInternal,
      setIsDirty: setIsDirtyInternal,
      markDirty,
      markClean,
      startSaving,
      finishSaving,
    }),
    [setSavingInternal, setAutoSaveStatusInternal, setAutoSaveAtInternal, setIsDirtyInternal, markDirty, markClean, startSaving, finishSaving]
  );
}

function usePersistenceOperationActions(args: {
  operationHandlersRef: React.MutableRefObject<PersistenceOperationHandlers>;
  setAutoSaveStatusInternal: React.Dispatch<React.SetStateAction<AutoSaveStatus>>;
  setSavingInternal: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { operationHandlersRef, setAutoSaveStatusInternal, setSavingInternal } = args;

  const setOperationHandlers = useCallback(
    (handlers: PersistenceOperationHandlers) => {
      operationHandlersRef.current = handlers;
    },
    [operationHandlersRef]
  );

  const savePathConfig = useCallback(
    async (options?: SavePathConfigOptions): Promise<boolean> => {
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
    },
    [operationHandlersRef, setAutoSaveStatusInternal, setSavingInternal]
  );

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
    [operationHandlersRef]
  );

  const persistSettingsBulk = useCallback(
    async (entries: Array<{ key: string; value: string }>): Promise<void> => {
      const handler = operationHandlersRef.current.persistSettingsBulk;
      if (!handler) return;
      await handler(entries);
    },
    [operationHandlersRef]
  );

  const persistActivePathPreference = useCallback(
    async (pathId: string | null): Promise<void> => {
      const handler = operationHandlersRef.current.persistActivePathPreference;
      if (!handler) return;
      await handler(pathId);
    },
    [operationHandlersRef]
  );

  const savePathIndex = useCallback(
    async (nextPaths: PathMeta[]): Promise<void> => {
      const handler = operationHandlersRef.current.savePathIndex;
      if (!handler) return;
      await handler(nextPaths);
    },
    [operationHandlersRef]
  );

  return useMemo(
    () => ({
      setOperationHandlers,
      savePathConfig,
      persistPathSettings,
      persistSettingsBulk,
      persistActivePathPreference,
      savePathIndex,
    }),
    [
      setOperationHandlers,
      savePathConfig,
      persistPathSettings,
      persistSettingsBulk,
      persistActivePathPreference,
      savePathIndex,
    ]
  );
}

// ---------------------------------------------------------------------------
// Consumer Hooks
// ---------------------------------------------------------------------------
