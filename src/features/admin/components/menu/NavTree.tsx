'use client';

import { AppWindow, ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import React, { memo, useCallback, useMemo, useRef, startTransition } from 'react';

import { Tooltip, Button } from '@/shared/ui/primitives.public';
import { useAdminDataPrefetch } from '../../hooks/useAdminDataPrefetch';
import { TreeContextMenu } from '@/shared/ui/data-display.public';
import { cn } from '@/shared/utils/ui-utils';

import { type NavItem, isActiveHref } from './admin-menu-utils';
import { ADMIN_MENU_COLOR_MAP } from '../Menu';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type NavTreeProps = {
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

type NavTreeContextValue = {
  isMenuCollapsed: boolean;
  pathname: string;
  openIds: Set<string>;
  onToggleOpen: (id: string) => void;
  onNavigateHref: (href: string) => void;
  onPrefetchHref: (href: string) => void;
  pendingHref?: string | null | undefined;
  onSetPendingHref?: ((href: string) => void) | undefined;
};

const NavTreeContext = React.createContext<NavTreeContextValue | null>(null);

function useNavTree(): NavTreeContextValue {
  const context = React.useContext(NavTreeContext);
  if (!context) {
    throw new Error('useNavTree must be used within a NavTreeProvider');
  }
  return context;
}

type NavTreeNodeProps = {
  item: NavItem;
  depth: number;
};

const FOCUS_RING_CLASS_NAME =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

const copyToClipboard = async (value: string): Promise<void> => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch (error) {
    logClientError(error);

    // ignore
  }
};

const buildNavContextItems = (
  item: NavItem,
  isOpen: boolean,
  hasChildren: boolean,
  onToggleOpen: (id: string) => void,
  onNavigateHref: (href: string) => void
): Array<{
  id: string;
  label?: string;
  onSelect?: () => void;
  separator?: boolean;
}> => {
  const items: Array<{
    id: string;
    label?: string;
    onSelect?: () => void;
    separator?: boolean;
  }> = [];

  if (item.action) {
    items.push({ id: 'run-action', label: 'Run action', onSelect: () => item.action?.() });
  }
  if (hasChildren) {
    items.push({
      id: 'toggle-children',
      label: isOpen ? 'Collapse' : 'Expand',
      onSelect: () => onToggleOpen(item.id),
    });
    items.push({ id: 'separator-1', separator: true });
  }
  const itemHref = item.href;
  if (itemHref) {
    items.push({
      id: 'open',
      label: 'Open',
      onSelect: () => {
        onNavigateHref(itemHref);
      },
    });
    items.push({
      id: 'open-new',
      label: 'Open in new tab',
      onSelect: () => {
        if (typeof window !== 'undefined') window.open(itemHref, '_blank', 'noopener,noreferrer');
      },
    });
    items.push({
      id: 'copy-link',
      label: 'Copy link',
      onSelect: () => {
        void copyToClipboard(itemHref);
      },
    });
  }

  return items;
};

const NavTreeNode = memo(
  function NavTreeNode({
    item,
    depth,
  }: NavTreeNodeProps): React.ReactNode {
    const {
      isMenuCollapsed,
      pathname,
      openIds,
      pendingHref,
      onToggleOpen,
      onNavigateHref,
      onPrefetchHref,
      onSetPendingHref,
    } = useNavTree();

    const hasChildren = !!item.children?.length;
    const effectivePathname = pendingHref ?? pathname;
    const active = !hasChildren && item.href ? isActiveHref(effectivePathname, item.href, item.exact) : false;
    const isOpen = !isMenuCollapsed && hasChildren && openIds.has(item.id);

    const contextItems = useMemo(
      () => buildNavContextItems(item, isOpen, hasChildren, onToggleOpen, onNavigateHref),
      [hasChildren, isOpen, item, onNavigateHref, onToggleOpen]
    );
    const sectionStyle = item.sectionColor ? ADMIN_MENU_COLOR_MAP[item.sectionColor] : null;
    const rowStyle: React.CSSProperties | undefined = isMenuCollapsed
      ? undefined
      : { paddingLeft: 10 + depth * 14 };
    const rowClassName = cn(
      'group flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition cursor-pointer border-l-2 h-auto font-normal',
      FOCUS_RING_CLASS_NAME,
      sectionStyle ? sectionStyle.border : 'border-transparent',
      active ? 'bg-gray-700/60 text-white' : 'text-gray-200 hover:bg-gray-700/40'
    );

    const rowLabel = (
      <div className='flex min-w-0 items-center gap-2'>
        {depth === 0 && item.icon ? (
          <>
            {sectionStyle ? <span className={cn('h-2 w-2 rounded-full', sectionStyle.dot)} /> : null}
            <span className='shrink-0 text-gray-200'>{item.icon}</span>
          </>
        ) : depth > 0 ? (
          sectionStyle ? (
            <span className={cn('h-1.5 w-1.5 rounded-full', sectionStyle.dot)} />
          ) : (
            <span className='shrink-0 text-gray-600'>•</span>
          )
        ) : null}
        <span className='min-w-0 truncate text-left'>{item.label}</span>
      </div>
    );

    const handleCollapsedButtonClick = useCallback((): void => {
      if (item.action) item.action();
      if (!item.href && hasChildren) onToggleOpen(item.id);
    }, [hasChildren, item, onToggleOpen]);

    const handleActionButtonClick = useCallback((): void => {
      if (item.action) item.action();
    }, [item]);

    const handleLinkIntent = useCallback((): void => {
      if (!item.href) return;
      onPrefetchHref(item.href);
    }, [item.href, onPrefetchHref]);

    const handleGroupToggleClick = useCallback((): void => {
      if (item.action) {
        item.action();
        return;
      }
      onToggleOpen(item.id);
    }, [item, onToggleOpen]);

    let collapsedRootContent = (
      <TreeContextMenu items={contextItems} className='cursor-pointer'>
        <Button
          variant='ghost'
          onClick={handleCollapsedButtonClick}
          className={cn(
            'flex w-full items-center justify-center rounded-md px-2 py-2 transition border-l-2 cursor-pointer h-auto',
            FOCUS_RING_CLASS_NAME,
            sectionStyle ? sectionStyle.border : 'border-transparent',
            active ? 'bg-gray-700/60 text-white' : 'text-gray-200 hover:bg-gray-700/40'
          )}
        >
          <span className='relative text-gray-200'>
            {item.icon ?? <AppWindow className='size-4' />}
            {sectionStyle ? (
              <span
                className={cn('absolute -right-1 -top-1 h-2 w-2 rounded-full', sectionStyle.dot)}
              />
            ) : null}
          </span>
          <span className='sr-only'>{item.label}</span>
        </Button>
      </TreeContextMenu>
    );

    if (item.href) {
      collapsedRootContent = (
        <TreeContextMenu items={contextItems} className='cursor-pointer'>
          <Link
            href={item.href}
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
              onSetPendingHref?.(item.href!);
              item.onClick?.(e);
            }}
            onMouseEnter={handleLinkIntent}
            onFocus={handleLinkIntent}
            className={cn(
              'flex items-center justify-center rounded-md px-2 py-2 transition border-l-2 cursor-pointer',
              FOCUS_RING_CLASS_NAME,
              sectionStyle ? sectionStyle.border : 'border-transparent',
              active ? 'bg-gray-700/60 text-white' : 'text-gray-200 hover:bg-gray-700/40'
            )}
          >
            <span className='relative text-gray-200'>
              {item.icon ?? <AppWindow className='size-4' />}
              {sectionStyle ? (
                <span
                  className={cn(
                    'absolute -right-1 -top-1 h-2 w-2 rounded-full',
                    sectionStyle.dot
                  )}
                />
              ) : null}
            </span>
            <span className='sr-only'>{item.label}</span>
          </Link>
        </TreeContextMenu>
      );
    }

    let primaryRowContent = (
      <TreeContextMenu items={contextItems} className='cursor-pointer'>
        <Button
          variant='ghost'
          onClick={handleActionButtonClick}
          className={rowClassName}
          style={rowStyle}
        >
          {rowLabel}
        </Button>
      </TreeContextMenu>
    );

    if (hasChildren) {
      primaryRowContent = (
        <TreeContextMenu items={contextItems} className='cursor-pointer'>
          <Button
            variant='ghost'
            onClick={handleGroupToggleClick}
            className={rowClassName}
            style={rowStyle}
            aria-expanded={isOpen}
            aria-controls={`${item.id}-children`}
          >
            {rowLabel}
            <ChevronRightIcon
              className={cn(
                'size-4 shrink-0 text-gray-400 transition-transform duration-200',
                isOpen ? 'rotate-90' : ''
              )}
              aria-hidden='true'
            />
          </Button>
        </TreeContextMenu>
      );
    } else if (item.href) {
      primaryRowContent = (
        <TreeContextMenu items={contextItems} className='cursor-pointer'>
          <Link
            href={item.href}
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
              onSetPendingHref?.(item.href!);
              item.onClick?.(e);
            }}
            onMouseEnter={handleLinkIntent}
            onFocus={handleLinkIntent}
            className={rowClassName}
            style={rowStyle}
          >
            {rowLabel}
          </Link>
        </TreeContextMenu>
      );
    }

    return (
      <div>
        <div>
          {isMenuCollapsed && depth === 0 ? (
            <Tooltip content={item.label} side='right'>
              <span className='block'>
                {collapsedRootContent}
              </span>
            </Tooltip>
          ) : (
            primaryRowContent
          )}
        </div>

        {hasChildren && isOpen ? (
          <div className='mt-1 space-y-1' id={`${item.id}-children`}>
            {item.children!.map((childItem: NavItem) => (
              <NavTreeNode
                key={childItem.id}
                item={childItem}
                depth={depth + 1}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  },
  function navTreeNodePropsAreEqual(prev: NavTreeNodeProps, next: NavTreeNodeProps): boolean {
    return prev.item === next.item && prev.depth === next.depth;
  }
);

export const NavTree = memo(function NavTree({
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
  const handleNavigateHrefLocal = useCallback(
    (href: string): void => {
      onSetPendingHrefProp?.(href);
      startTransition(() => {
        router.push(href);
      });
    },
    [router, onSetPendingHrefProp]
  );
  const { prefetchByHref } = useAdminDataPrefetch();
  const handlePrefetchHrefLocal = useCallback(
    (href: string): void => {
      if (prefetchedHrefSetRef.current.has(href)) return;
      prefetchedHrefSetRef.current.add(href);
      router.prefetch(href);
      prefetchByHref(href);
    },
    [router, prefetchByHref]
  );
  const handleNavigateHref = onNavigateHrefProp ?? handleNavigateHrefLocal;
  const handlePrefetchHref = onPrefetchHrefProp ?? handlePrefetchHrefLocal;

  const contextValue = useMemo<NavTreeContextValue>(
    () => ({
      isMenuCollapsed,
      pathname,
      openIds,
      onToggleOpen,
      onNavigateHref: handleNavigateHref,
      onPrefetchHref: handlePrefetchHref,
      pendingHref,
      onSetPendingHref: onSetPendingHrefProp,
    }),
    [
      isMenuCollapsed,
      pathname,
      openIds,
      onToggleOpen,
      handleNavigateHref,
      handlePrefetchHref,
      pendingHref,
      onSetPendingHrefProp,
    ]
  );

  return (
    <NavTreeContext.Provider value={contextValue}>
      <div className={cn(depth === 0 ? 'space-y-1.5' : 'space-y-1')}>
        {items.map((item: NavItem) => (
          <NavTreeNode
            key={item.id}
            item={item}
            depth={depth}
          />
        ))}
      </div>
    </NavTreeContext.Provider>
  );
  });
