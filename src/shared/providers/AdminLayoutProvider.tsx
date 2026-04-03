'use client';

import { useMemo, useState, type ReactNode } from 'react';

import type { AdminLayoutActions, AdminLayoutState } from '@/shared/contracts/admin';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

export type { AdminLayoutActions, AdminLayoutState };

const {
  Context: StateContext,
  useStrictContext: useAdminLayoutState,
} = createStrictContext<AdminLayoutState>({
  hookName: 'useAdminLayoutState',
  providerName: 'AdminLayoutProvider',
  displayName: 'AdminLayoutStateContext',
});

const {
  Context: ActionsContext,
  useStrictContext: useAdminLayoutActions,
} = createStrictContext<AdminLayoutActions>({
  hookName: 'useAdminLayoutActions',
  providerName: 'AdminLayoutProvider',
  displayName: 'AdminLayoutActionsContext',
});

export { useAdminLayoutState, useAdminLayoutActions };

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
