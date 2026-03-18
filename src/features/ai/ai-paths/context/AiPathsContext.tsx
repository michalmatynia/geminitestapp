'use client';

import { createContext, useContext, useState, useEffect, type ReactNode, Dispatch, SetStateAction } from 'react';
import { internalError } from '@/shared/errors/app-error';
import { useAdminLayoutActions } from '@/shared/providers/AdminLayoutProvider';

export type AdminAiPathsWorkspaceTab = 'canvas' | 'paths' | 'docs';

type AiPathsContextValue = {
  activeTab: AdminAiPathsWorkspaceTab;
  setActiveTab: Dispatch<SetStateAction<AdminAiPathsWorkspaceTab>>;
  isFocusMode: boolean;
  setIsFocusMode: Dispatch<SetStateAction<boolean>>;
  onToggleFocusMode: () => void;
  mounted: boolean;
};

const AiPathsContext = createContext<AiPathsContextValue | null>(null);

export function AiPathsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<AdminAiPathsWorkspaceTab>('canvas');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { setIsMenuHidden } = useAdminLayoutActions();

  const handleToggleFocusMode = () => {
    setIsFocusMode((prev) => !prev);
  };

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

  return (
    <AiPathsContext.Provider
      value={{
        activeTab,
        setActiveTab,
        isFocusMode,
        setIsFocusMode,
        onToggleFocusMode: handleToggleFocusMode,
        mounted,
      }}
    >
      {children}
    </AiPathsContext.Provider>
  );
}

export function useAiPaths() {
  const context = useContext(AiPathsContext);
  if (!context) {
    throw internalError('useAiPaths must be used within an AiPathsProvider');
  }
  return context;
}
