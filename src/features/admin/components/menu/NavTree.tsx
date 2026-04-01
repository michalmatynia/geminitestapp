'use client';

import { AppWindow, ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { memo, useCallback, useMemo, useRef } from 'react';

import { Tooltip, TreeContextMenu, Button } from '@/shared/ui';
import { cn } from '@/shared/utils';

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

type NavTreeItemProps = {
  item: NavItem;
  depth: number;
  isMenuCollapsed: boolean;
  active: boolean;
  isOpen: boolean;
  onToggleOpen: (id: string) => void;
  onNavigateHref: (href: string) => void;
  onPrefetchHref: (href: string) => void;
  onSetPendingHref?: ((href: string) => void) | undefined;
};

type NavTreeNodeProps = {
  item: NavItem;
  depth: number;
  isMenuCollapsed: boolean;
  pathname: string;
  openIds: Set<string>;
  onToggleOpen: (id: string) => void;
  onNavigateHref: (href: string) => void;
  onPrefetchHref: (href: string) => void;
  pendingHref?: string | null | undefined;
  onSetPendingHref?: ((href: string) => void) | undefined;
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

const hasSubtreeOpenStateChanged = (
  prevOpenIds: Set<string>,
  nextOpenIds: Set<string>,
  item: NavItem
): boolean => {
  const children = item.children;
  if (!children || children.length === 0) return false;

  const stack = [...children];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node?.children || node.children.length === 0) continue;
    if (prevOpenIds.has(node.id) !== nextOpenIds.has(node.id)) {
      return true;
    }
    stack.push(...node.children);
  }

  return false;
};

const NavTreeItem = memo(
  function NavTreeItem({
    item,
    depth,
    isMenuCollapsed,
    active,
    isOpen,
    onToggleOpen,
    onNavigateHref,
    onPrefetchHref,
    onSetPendingHref,
  }: NavTreeItemProps): React.ReactNode {
    const hasChildren = !!item.children?.length;
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
        {isMenuCollapsed && depth === 0 ? (
          <Tooltip content={item.label} side='right'>
            <span tabIndex={0} role='button' className='block focus:outline-none'>
              {collapsedRootContent}
            </span>
          </Tooltip>
        ) : (
          primaryRowContent
        )}
      </div>
    );
  },
  function navTreeItemPropsAreEqual(prev: NavTreeItemProps, next: NavTreeItemProps): boolean {
    return (
      prev.item === next.item &&
      prev.depth === next.depth &&
      prev.isMenuCollapsed === next.isMenuCollapsed &&
      prev.active === next.active &&
      prev.isOpen === next.isOpen &&
      prev.onToggleOpen === next.onToggleOpen &&
      prev.onNavigateHref === next.onNavigateHref &&
      prev.onPrefetchHref === next.onPrefetchHref &&
      prev.onSetPendingHref === next.onSetPendingHref
    );
  }
);

const NavTreeNode = memo(
  function NavTreeNode({
    item,
    depth,
    isMenuCollapsed,
    pathname,
    openIds,
    onToggleOpen,
    onNavigateHref,
    onPrefetchHref,
    pendingHref,
    onSetPendingHref,
  }: NavTreeNodeProps): React.ReactNode {
    const hasChildren = !!item.children?.length;
    const effectivePathname = pendingHref ?? pathname;
    const active = !hasChildren && item.href ? isActiveHref(effectivePathname, item.href, item.exact) : false;
    const isOpen = !isMenuCollapsed && hasChildren && openIds.has(item.id);

    return (
      <div>
        <NavTreeItem
          item={item}
          depth={depth}
          isMenuCollapsed={isMenuCollapsed}
          active={active}
          isOpen={isOpen}
          onToggleOpen={onToggleOpen}
          onNavigateHref={onNavigateHref}
          onPrefetchHref={onPrefetchHref}
          onSetPendingHref={onSetPendingHref}
        />

        {hasChildren && isOpen ? (
          <div className='mt-1' id={`${item.id}-children`}>
            <NavTree
              items={item.children ?? []}
              depth={depth + 1}
              isMenuCollapsed={isMenuCollapsed}
              pathname={pathname}
              openIds={openIds}
              onToggleOpen={onToggleOpen}
              onNavigateHref={onNavigateHref}
              onPrefetchHref={onPrefetchHref}
              pendingHref={pendingHref}
              onSetPendingHref={onSetPendingHref}
            />
          </div>
        ) : null}
      </div>
    );
  },
  function navTreeNodePropsAreEqual(prev: NavTreeNodeProps, next: NavTreeNodeProps): boolean {
    if (
      prev.item !== next.item ||
      prev.depth !== next.depth ||
      prev.isMenuCollapsed !== next.isMenuCollapsed ||
      prev.pathname !== next.pathname ||
      prev.pendingHref !== next.pendingHref ||
      prev.onToggleOpen !== next.onToggleOpen ||
      prev.onNavigateHref !== next.onNavigateHref ||
      prev.onPrefetchHref !== next.onPrefetchHref ||
      prev.onSetPendingHref !== next.onSetPendingHref
    ) {
      return false;
    }

    const hasChildren = !!next.item.children?.length;
    if (!hasChildren) {
      return true;
    }

    const prevIsOpen = !prev.isMenuCollapsed && prev.openIds.has(prev.item.id);
    const nextIsOpen = !next.isMenuCollapsed && next.openIds.has(next.item.id);
    if (prevIsOpen !== nextIsOpen) {
      return false;
    }

    if (!nextIsOpen) {
      return true;
    }

    return !hasSubtreeOpenStateChanged(prev.openIds, next.openIds, next.item);
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
      router.push(href);
    },
    [router, onSetPendingHrefProp]
  );
  const handlePrefetchHrefLocal = useCallback(
    (href: string): void => {
      if (prefetchedHrefSetRef.current.has(href)) return;
      prefetchedHrefSetRef.current.add(href);
      router.prefetch(href);
    },
    [router]
  );
  const handleNavigateHref = onNavigateHrefProp ?? handleNavigateHrefLocal;
  const handlePrefetchHref = onPrefetchHrefProp ?? handlePrefetchHrefLocal;

  return (
    <div className={cn(depth === 0 ? 'space-y-1.5' : 'space-y-1')}>
      {items.map((item: NavItem) => (
        <NavTreeNode
          key={item.id}
          item={item}
          depth={depth}
          isMenuCollapsed={isMenuCollapsed}
          pathname={pathname}
          openIds={openIds}
          onToggleOpen={onToggleOpen}
          onNavigateHref={handleNavigateHref}
          onPrefetchHref={handlePrefetchHref}
          pendingHref={pendingHref}
          onSetPendingHref={onSetPendingHrefProp}
        />
      ))}
    </div>
  );
});
