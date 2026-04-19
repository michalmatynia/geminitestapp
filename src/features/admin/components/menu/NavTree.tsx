'use client';

import { useRouter } from 'nextjs-toploader/app';
import React, { memo, startTransition, useCallback, useMemo, useRef } from 'react';

import { cn } from '@/shared/utils/ui-utils';

import { useAdminDataPrefetch } from '../../hooks/useAdminDataPrefetch';

import type { NavItem } from './admin-menu-utils';
import { NavTreeContext, type NavTreeContextValue, type NavTreeProps } from './nav-tree-context';
import { NavTreeNode } from './nav-tree-node';

function NavTreeList({
  depth,
  items,
}: Pick<NavTreeProps, 'depth' | 'items'>): React.JSX.Element {
  return (
    <div className={cn(depth === 0 ? 'space-y-1.5' : 'space-y-1')}>
      {items.map((item: NavItem) => (
        <NavTreeNode key={item.id} item={item} depth={depth} />
      ))}
    </div>
  );
}

function NavTreeImpl({
  items,
  depth,
  isMenuCollapsed,
  pathname,
  openIds,
  onToggleOpen,
  onNavigateHref: onNavigateHrefProp,
  onPrefetchHref: onPrefetchHrefProp,
  pendingHref,
  onSetPendingHref: onSetPendingHrefProp,
}: NavTreeProps): React.ReactNode {
  const router = useRouter();
  const prefetchedHrefSetRef = useRef<Set<string>>(new Set());
  const { prefetchByHref } = useAdminDataPrefetch();

  const handleNavigateHrefLocal = useCallback(
    (href: string): void => {
      if (onSetPendingHrefProp !== undefined) {
        onSetPendingHrefProp(href);
      }
      startTransition(() => {
        router.push(href);
      });
    },
    [onSetPendingHrefProp, router]
  );

  const handlePrefetchHrefLocal = useCallback(
    (href: string): void => {
      if (prefetchedHrefSetRef.current.has(href)) {
        return;
      }

      prefetchedHrefSetRef.current.add(href);
      router.prefetch(href);
      prefetchByHref(href);
    },
    [prefetchByHref, router]
  );

  const contextValue = useMemo<NavTreeContextValue>(
    () => ({
      isMenuCollapsed,
      pathname,
      openIds,
      onToggleOpen,
      onNavigateHref: onNavigateHrefProp ?? handleNavigateHrefLocal,
      onPrefetchHref: onPrefetchHrefProp ?? handlePrefetchHrefLocal,
      pendingHref,
      onSetPendingHref: onSetPendingHrefProp,
    }),
    [
      handleNavigateHrefLocal,
      handlePrefetchHrefLocal,
      isMenuCollapsed,
      onNavigateHrefProp,
      onPrefetchHrefProp,
      onSetPendingHrefProp,
      onToggleOpen,
      openIds,
      pathname,
      pendingHref,
    ]
  );

  return (
    <NavTreeContext.Provider value={contextValue}>
      <NavTreeList depth={depth} items={items} />
    </NavTreeContext.Provider>
  );
}

export const NavTree = memo(NavTreeImpl);
