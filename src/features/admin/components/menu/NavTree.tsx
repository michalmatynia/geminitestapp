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

function useNavTreeHandlers({
  onNavigateHref: onNavigateHrefProp,
  onPrefetchHref: onPrefetchHrefProp,
  onSetPendingHref: onSetPendingHrefProp,
}: Pick<
  NavTreeProps,
  'onNavigateHref' | 'onPrefetchHref' | 'onSetPendingHref'
>): Pick<NavTreeContextValue, 'onNavigateHref' | 'onPrefetchHref'> {
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

  return {
    onNavigateHref: onNavigateHrefProp ?? handleNavigateHrefLocal,
    onPrefetchHref: onPrefetchHrefProp ?? handlePrefetchHrefLocal,
  };
}

function useNavTreeContextValue({
  isMenuCollapsed,
  pathname,
  openIds,
  onToggleOpen,
  pendingHref,
  onSetPendingHref: onSetPendingHrefProp,
  ...rest
}: NavTreeProps): NavTreeContextValue {
  const handlers = useNavTreeHandlers(rest);

  return useMemo<NavTreeContextValue>(
    () => ({
      isMenuCollapsed,
      pathname,
      openIds,
      onToggleOpen,
      onNavigateHref: handlers.onNavigateHref,
      onPrefetchHref: handlers.onPrefetchHref,
      pendingHref,
      onSetPendingHref: onSetPendingHrefProp,
    }),
    [
      handlers,
      isMenuCollapsed,
      onSetPendingHrefProp,
      onToggleOpen,
      openIds,
      pathname,
      pendingHref,
    ]
  );
}

function NavTreeImpl(props: NavTreeProps): React.ReactNode {
  const { items, depth } = props;
  const contextValue = useNavTreeContextValue(props);
  return (
    <NavTreeContext.Provider value={contextValue}>
      <NavTreeList depth={depth} items={items} />
    </NavTreeContext.Provider>
  );
}

export const NavTree = memo(NavTreeImpl);
