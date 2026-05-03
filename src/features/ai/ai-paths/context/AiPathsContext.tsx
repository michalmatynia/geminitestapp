'use client';

import {
  useState,
  useEffect,
  useMemo,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
  useCallback,
} from 'react';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
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

const {
  Context: AiPathsStateContext,
  useStrictContext: useAiPathsState,
} = createStrictContext<AiPathsStateContextValue>({
  hookName: 'useAiPathsState',
  providerName: 'an AiPathsWorkspaceProvider',
  errorFactory: internalError,
});

const {
  Context: AiPathsActionsContext,
  useStrictContext: useAiPathsActions,
} = createStrictContext<AiPathsActionsContextValue>({
  hookName: 'useAiPathsActions',
  providerName: 'an AiPathsWorkspaceProvider',
  errorFactory: internalError,
});

export { useAiPathsState, useAiPathsActions };

export function AiPathsWorkspaceProvider({ children }: { children: ReactNode }): React.JSX.Element {
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

export function useAiPaths(): AiPathsStateContextValue & AiPathsActionsContextValue {
  const state = useAiPathsState();
  const actions = useAiPathsActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
