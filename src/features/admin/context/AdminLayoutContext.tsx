'use client';

import { createContext, useContext, useState, ReactNode, useMemo } from 'react';

import type { AdminLayoutState, AdminLayoutActions } from '@/shared/contracts/admin';

export type { AdminLayoutState, AdminLayoutActions };

const StateContext = createContext<AdminLayoutState | null>(null);
export const useAdminLayoutState = () => {
  const context = useContext(StateContext);
  if (!context) throw new Error('useAdminLayoutState must be used within an AdminLayoutProvider');
  return context;
};

const ActionsContext = createContext<AdminLayoutActions | null>(null);
export const useAdminLayoutActions = () => {
  const context = useContext(ActionsContext);
  if (!context) throw new Error('useAdminLayoutActions must be used within an AdminLayoutProvider');
  return context;
};

export function AdminLayoutProvider({
  children,
  initialMenuCollapsed = false,
}: {
  children: ReactNode;
  initialMenuCollapsed?: boolean;
}): React.ReactNode {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(initialMenuCollapsed);
  const [isMenuHidden, setIsMenuHidden] = useState(false);
  const [isProgrammaticallyCollapsed, setIsProgrammaticallyCollapsed] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  const stateValue = useMemo<AdminLayoutState>(
    () => ({
      isMenuCollapsed,
      isMenuHidden,
      isProgrammaticallyCollapsed,
      aiDrawerOpen,
    }),
    [isMenuCollapsed, isMenuHidden, isProgrammaticallyCollapsed, aiDrawerOpen]
  );

  const actionsValue = useMemo<AdminLayoutActions>(
    () => ({
      setIsMenuCollapsed,
      setIsMenuHidden,
      setIsProgrammaticallyCollapsed,
      setAiDrawerOpen,
    }),
    []
  );

  return (
    <StateContext.Provider value={stateValue}>
      <ActionsContext.Provider value={actionsValue}>{children}</ActionsContext.Provider>
    </StateContext.Provider>
  );
}
