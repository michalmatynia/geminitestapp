'use client';

/**
 * Admin Layout Provider
 * 
 * Manages the global layout state for admin interfaces including:
 * - Sidebar visibility and collapse state
 * - Panel management (left/right panels)
 * - Navigation state persistence
 * - Responsive layout behavior
 * 
 * Uses split context pattern for performance optimization,
 * separating state and actions to prevent unnecessary re-renders.
 */

import { useMemo, useState, type ReactNode } from 'react';

import type { AdminLayoutActions, AdminLayoutState } from '@/shared/contracts/admin';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

export type { AdminLayoutActions, AdminLayoutState };

// State context for layout data (sidebar state, panel visibility, etc.)
const {
  Context: StateContext,
  useStrictContext: useAdminLayoutState,
} = createStrictContext<AdminLayoutState>({
  hookName: 'useAdminLayoutState',
  providerName: 'AdminLayoutProvider',
  displayName: 'AdminLayoutStateContext',
});

// Actions context for layout manipulation functions
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
