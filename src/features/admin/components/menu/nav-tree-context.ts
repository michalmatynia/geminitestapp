import React from 'react';

import type { NavItem } from './admin-menu-utils';

export type NavTreeProps = {
  items: NavItem[];
  depth: number;
  isMenuCollapsed: boolean;
  pathname: string;
  openIds: Set<string>;
  onToggleOpen: (id: string) => void;
  onNavigateHref?: ((href: string) => void) | undefined;
  onPrefetchHref?: ((href: string) => void) | undefined;
  pendingHref?: string | null | undefined;
  onSetPendingHref?: ((href: string) => void) | undefined;
};

export type NavTreeContextValue = {
  isMenuCollapsed: boolean;
  pathname: string;
  openIds: Set<string>;
  onToggleOpen: (id: string) => void;
  onNavigateHref: (href: string) => void;
  onPrefetchHref: (href: string) => void;
  pendingHref?: string | null | undefined;
  onSetPendingHref?: ((href: string) => void) | undefined;
};

export type NavTreeNodeProps = {
  item: NavItem;
  depth: number;
};

export const NavTreeContext = React.createContext<NavTreeContextValue | null>(null);

export function useNavTree(): NavTreeContextValue {
  const context = React.useContext(NavTreeContext);
  if (context === null) {
    throw new Error('useNavTree must be used within a NavTreeProvider');
  }

  return context;
}
