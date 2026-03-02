'use client';

import { createContext, useContext, useState, ReactNode, useMemo } from 'react';

import { internalError } from '@/shared/errors/app-error';
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

// --- Legacy Aggregator ---

interface AdminLayoutContextType extends AdminLayoutState, AdminLayoutActions {}

const AdminLayoutContext = createContext<AdminLayoutContextType | undefined>(undefined);

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

  const aggregatedValue = useMemo<AdminLayoutContextType>(
    () => ({
      ...stateValue,
      ...actionsValue,
    }),
    [stateValue, actionsValue]
  );

  return (
    <StateContext.Provider value={stateValue}>
      <ActionsContext.Provider value={actionsValue}>
        <AdminLayoutContext.Provider value={aggregatedValue}>
          {children}
        </AdminLayoutContext.Provider>
      </ActionsContext.Provider>
    </StateContext.Provider>
  );
}

export function useAdminLayout(): AdminLayoutContextType {
  const context = useContext(AdminLayoutContext);
  if (context === undefined) {
    throw internalError('useAdminLayout must be used within an AdminLayoutProvider');
  }
  return context;
}
