"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

export interface PersistenceState {
  // Loading state
  loading: boolean;
  loadNonce: number;

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
}

// ---------------------------------------------------------------------------
// Contexts (split for re-render optimization)
// ---------------------------------------------------------------------------

const PersistenceStateContext = createContext<PersistenceState | null>(null);
const PersistenceActionsContext = createContext<PersistenceActions | null>(null);

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

  // Saving state
  const [saving, setSavingInternal] = useState(false);
  const [autoSaveStatus, setAutoSaveStatusInternal] = useState<AutoSaveStatus>("idle");
  const [autoSaveAt, setAutoSaveAtInternal] = useState<string | null>(null);

  // Dirty tracking
  const [isDirty, setIsDirtyInternal] = useState(false);

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
    setAutoSaveStatusInternal("saving");
  }, []);

  const finishSaving = useCallback((success: boolean) => {
    setSavingInternal(false);
    if (success) {
      setAutoSaveStatusInternal("saved");
      setAutoSaveAtInternal(new Date().toISOString());
      setIsDirtyInternal(false);
    } else {
      setAutoSaveStatusInternal("error");
    }
  }, []);

  const startLoading = useCallback(() => {
    setLoadingInternal(true);
  }, []);

  const finishLoading = useCallback(() => {
    setLoadingInternal(false);
  }, []);

  // Actions are stable
  const actions = useMemo<PersistenceActions>(
    () => ({
      // Loading actions
      setLoading: setLoadingInternal,
      incrementLoadNonce,
      setLoadNonce: setLoadNonceInternal,

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
    }),
    [incrementLoadNonce, markDirty, markClean, startSaving, finishSaving, startLoading, finishLoading]
  );

  const state = useMemo<PersistenceState>(
    () => ({
      loading,
      loadNonce,
      saving,
      autoSaveStatus,
      autoSaveAt,
      isDirty,
    }),
    [loading, loadNonce, saving, autoSaveStatus, autoSaveAt, isDirty]
  );

  return (
    <PersistenceActionsContext.Provider value={actions}>
      <PersistenceStateContext.Provider value={state}>
        {children}
      </PersistenceStateContext.Provider>
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
    throw new Error("usePersistenceState must be used within a PersistenceProvider");
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
    throw new Error("usePersistenceActions must be used within a PersistenceProvider");
  }
  return context;
}

/**
 * Combined hook for components that need both state and actions.
 */
export function usePersistence(): PersistenceState & PersistenceActions {
  const state = usePersistenceState();
  const actions = usePersistenceActions();
  return { ...state, ...actions };
}
