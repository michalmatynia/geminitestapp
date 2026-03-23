'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
  Dispatch,
  SetStateAction,
  useCallback,
} from 'react';
import { internalError } from '@/shared/errors/app-error';
import { useAdminLayoutActions } from '@/shared/providers/AdminLayoutProvider';

export type AdminAiPathsWorkspaceTab = 'canvas' | 'paths' | 'docs';

type AiPathsStateContextValue = {
  activeTab: AdminAiPathsWorkspaceTab;
  isFocusMode: boolean;
  mounted: boolean;
};

type AiPathsActionsContextValue = {
  setActiveTab: Dispatch<SetStateAction<AdminAiPathsWorkspaceTab>>;
  setIsFocusMode: Dispatch<SetStateAction<boolean>>;
  onToggleFocusMode: () => void;
};

const AiPathsStateContext = createContext<AiPathsStateContextValue | null>(null);
const AiPathsActionsContext = createContext<AiPathsActionsContextValue | null>(null);

export function AiPathsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<AdminAiPathsWorkspaceTab>('canvas');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { setIsMenuHidden } = useAdminLayoutActions();

  const handleToggleFocusMode = useCallback(() => {
    setIsFocusMode((prev) => !prev);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const shouldHideAdminMenu = activeTab === 'canvas' && isFocusMode;
    setIsMenuHidden(shouldHideAdminMenu);
    return () => {
      setIsMenuHidden(false);
    };
  }, [activeTab, isFocusMode, setIsMenuHidden]);

  const stateValue = useMemo<AiPathsStateContextValue>(
    () => ({
      activeTab,
      isFocusMode,
      mounted,
    }),
    [activeTab, isFocusMode, mounted]
  );

  const actionsValue = useMemo<AiPathsActionsContextValue>(
    () => ({
      setActiveTab,
      setIsFocusMode,
      onToggleFocusMode: handleToggleFocusMode,
    }),
    [handleToggleFocusMode]
  );

  return (
    <AiPathsActionsContext.Provider value={actionsValue}>
      <AiPathsStateContext.Provider value={stateValue}>
        {children}
      </AiPathsStateContext.Provider>
    </AiPathsActionsContext.Provider>
  );
}

export function useAiPathsState() {
  const context = useContext(AiPathsStateContext);
  if (!context) {
    throw internalError('useAiPathsState must be used within an AiPathsProvider');
  }
  return context;
}

export function useAiPathsActions() {
  const context = useContext(AiPathsActionsContext);
  if (!context) {
    throw internalError('useAiPathsActions must be used within an AiPathsProvider');
  }
  return context;
}

export function useAiPaths(): AiPathsStateContextValue & AiPathsActionsContextValue {
  const state = useAiPathsState();
  const actions = useAiPathsActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
