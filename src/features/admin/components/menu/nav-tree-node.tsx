'use client';

import { AppWindow, ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import React, { memo, useCallback, useMemo } from 'react';

import type { AdminMenuColorOption } from '@/shared/contracts/admin';
import type { TreeContextMenuItem } from '@/shared/contracts/ui/menus';
import { TreeContextMenu } from '@/shared/ui/data-display.public';
import { Button, Tooltip } from '@/shared/ui/primitives.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { cn } from '@/shared/utils/ui-utils';

import { ADMIN_MENU_COLOR_MAP } from './admin-menu-constants';
import { type NavItem, isActiveHref } from './admin-menu-utils';
import { type NavTreeNodeProps, useNavTree } from './nav-tree-context';

const FOCUS_RING_CLASS_NAME =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

const hasText = (value: string | null | undefined): value is string =>
  value !== undefined && value !== null && value !== '';

const stopMouseEvent = (event: React.MouseEvent): void => event.stopPropagation();

const copyToClipboard = async (value: string): Promise<void> => {
  if (typeof navigator === 'undefined') {
    return;
  }

  await navigator.clipboard.writeText(value);
};

const copyLinkToClipboard = (value: string): void => {
  copyToClipboard(value).catch(logClientError);
};

const getSectionStyle = (sectionColor: string | undefined): AdminMenuColorOption | undefined => {
  if (!hasText(sectionColor)) {
    return undefined;
  }

  return ADMIN_MENU_COLOR_MAP[sectionColor];
};

const getTreeRowClassName = (
  active: boolean,
  sectionStyle: AdminMenuColorOption | undefined
): string =>
  cn(
    'group flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition cursor-pointer border-l-2 h-auto font-normal',
    FOCUS_RING_CLASS_NAME,
    sectionStyle !== undefined ? sectionStyle.border : 'border-transparent',
    active ? 'bg-gray-700/60 text-white' : 'text-gray-200 hover:bg-gray-700/40'
  );

const getCollapsedRootClassName = (
  active: boolean,
  sectionStyle: AdminMenuColorOption | undefined
): string =>
  cn(
    'flex w-full items-center justify-center rounded-md px-2 py-2 transition border-l-2 cursor-pointer h-auto',
    FOCUS_RING_CLASS_NAME,
    sectionStyle !== undefined ? sectionStyle.border : 'border-transparent',
    active ? 'bg-gray-700/60 text-white' : 'text-gray-200 hover:bg-gray-700/40'
  );

function NavTreeRowIndicator({
  depth,
  icon,
  sectionStyle,
}: {
  depth: number;
  icon: React.ReactNode | undefined;
  sectionStyle: AdminMenuColorOption | undefined;
}): React.JSX.Element | null {
  const hasIcon = icon !== undefined && icon !== null;
  if (depth === 0) {
    if (!hasIcon) {
      return null;
    }

    return (
      <>
        {sectionStyle !== undefined ? (
          <span className={cn('h-2 w-2 rounded-full', sectionStyle.dot)} />
        ) : null}
        <span className='shrink-0 text-gray-200'>{icon}</span>
      </>
    );
  }

  if (depth > 0) {
    return sectionStyle !== undefined ? (
      <span className={cn('h-1.5 w-1.5 rounded-full', sectionStyle.dot)} />
    ) : (
      <span className='shrink-0 text-gray-600'>•</span>
    );
  }

  return null;
}

function NavTreeRowLabel({
  depth,
  item,
  sectionStyle,
}: {
  depth: number;
  item: NavItem;
  sectionStyle: AdminMenuColorOption | undefined;
}): React.JSX.Element {
  return (
    <div className='flex min-w-0 items-center gap-2'>
      <NavTreeRowIndicator depth={depth} icon={item.icon} sectionStyle={sectionStyle} />
      <span className='min-w-0 truncate text-left'>{item.label}</span>
    </div>
  );
}

function NavTreeCollapsedRoot({
  active,
  contextItems,
  href,
  item,
  onButtonClick,
  onLinkClick,
  onLinkIntent,
  sectionStyle,
}: {
  active: boolean;
  contextItems: TreeContextMenuItem[];
  href: string | null;
  item: NavItem;
  onButtonClick: () => void;
  onLinkClick: React.MouseEventHandler<HTMLAnchorElement>;
  onLinkIntent: () => void;
  sectionStyle: AdminMenuColorOption | undefined;
}): React.JSX.Element {
  const icon = item.icon ?? <AppWindow className='size-4' />;
  const iconBadge =
    sectionStyle !== undefined ? (
      <span className={cn('absolute -right-1 -top-1 h-2 w-2 rounded-full', sectionStyle.dot)} />
    ) : null;

  if (href !== null) {
    return (
      <TreeContextMenu items={contextItems} className='cursor-pointer'>
        <Link
          href={href}
          onClick={onLinkClick}
          onMouseEnter={onLinkIntent}
          onFocus={onLinkIntent}
          className={getCollapsedRootClassName(active, sectionStyle)}
        >
          <span className='relative text-gray-200'>
            {icon}
            {iconBadge}
          </span>
          <span className='sr-only'>{item.label}</span>
        </Link>
      </TreeContextMenu>
    );
  }

  return (
    <TreeContextMenu items={contextItems} className='cursor-pointer'>
      <Button
        variant='ghost'
        onClick={onButtonClick}
        className={getCollapsedRootClassName(active, sectionStyle)}
      >
        <span className='relative text-gray-200'>
          {icon}
          {iconBadge}
        </span>
        <span className='sr-only'>{item.label}</span>
      </Button>
    </TreeContextMenu>
  );
}

function NavTreePrimaryRow({
  contextItems,
  hasChildren,
  href,
  isOpen,
  item,
  onActionClick,
  onGroupToggleClick,
  onLinkClick,
  onLinkIntent,
  rowClassName,
  rowLabel,
  rowStyle,
}: {
  contextItems: TreeContextMenuItem[];
  hasChildren: boolean;
  href: string | null;
  isOpen: boolean;
  item: NavItem;
  onActionClick: () => void;
  onGroupToggleClick: () => void;
  onLinkClick: React.MouseEventHandler<HTMLAnchorElement>;
  onLinkIntent: () => void;
  rowClassName: string;
  rowLabel: React.JSX.Element;
  rowStyle: React.CSSProperties | undefined;
}): React.JSX.Element {
  if (hasChildren) {
    return (
      <TreeContextMenu items={contextItems} className='cursor-pointer'>
        <Button
          variant='ghost'
          onClick={onGroupToggleClick}
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
  }

  if (href !== null) {
    return (
      <TreeContextMenu items={contextItems} className='cursor-pointer'>
        <Link
          href={href}
          onClick={onLinkClick}
          onMouseEnter={onLinkIntent}
          onFocus={onLinkIntent}
          className={rowClassName}
          style={rowStyle}
        >
          {rowLabel}
        </Link>
      </TreeContextMenu>
    );
  }

  return (
    <TreeContextMenu items={contextItems} className='cursor-pointer'>
      <Button variant='ghost' onClick={onActionClick} className={rowClassName} style={rowStyle}>
        {rowLabel}
      </Button>
    </TreeContextMenu>
  );
}

function NavTreeChildren({
  childItems,
  depth,
  isOpen,
  nodeId,
}: {
  childItems: NavItem[];
  depth: number;
  isOpen: boolean;
  nodeId: string;
}): React.JSX.Element | null {
  if (!isOpen || childItems.length === 0) {
    return null;
  }

  return (
    <div className='mt-1 space-y-1' id={`${nodeId}-children`}>
      {childItems.map((childItem: NavItem) => (
        <NavTreeNode key={childItem.id} item={childItem} depth={depth + 1} />
      ))}
    </div>
  );
}

const buildNavContextItems = ({
  hasChildren,
  isOpen,
  item,
  onNavigateHref,
  onToggleOpen,
}: {
  hasChildren: boolean;
  isOpen: boolean;
  item: NavItem;
  onNavigateHref: (href: string) => void;
  onToggleOpen: (id: string) => void;
}): TreeContextMenuItem[] => {
  const items: TreeContextMenuItem[] = [];
  if (item.action !== undefined) {
    items.push({ id: 'run-action', label: 'Run action', onSelect: item.action });
  }
  if (hasChildren) {
    items.push({
      id: 'toggle-children',
      label: isOpen ? 'Collapse' : 'Expand',
      onSelect: () => onToggleOpen(item.id),
    });
    items.push({ id: 'separator-1', separator: true });
  }

  const itemHref = hasText(item.href) ? item.href : null;
  if (itemHref !== null) {
    items.push({
      id: 'open',
      label: 'Open',
      onSelect: () => onNavigateHref(itemHref),
    });
    items.push({
      id: 'open-new',
      label: 'Open in new tab',
      onSelect: () => {
        if (typeof window !== 'undefined') {
          window.open(itemHref, '_blank', 'noopener,noreferrer');
        }
      },
    });
    items.push({
      id: 'copy-link',
      label: 'Copy link',
      onSelect: () => copyLinkToClipboard(itemHref),
    });
  }

  return items;
};

function NavTreeNodeImpl({ item, depth }: NavTreeNodeProps): React.JSX.Element {
  const {
    isMenuCollapsed,
    onNavigateHref,
    onPrefetchHref,
    onSetPendingHref,
    onToggleOpen,
    openIds,
    pathname,
    pendingHref,
  } = useNavTree();
  const href = hasText(item.href) ? item.href : null;
  const childItems = item.children ?? [];
  const hasChildren = childItems.length > 0;
  const effectivePathname = pendingHref ?? pathname;
  const active = !hasChildren && href !== null ? isActiveHref(effectivePathname, href, item.exact) : false;
  const isOpen = !isMenuCollapsed && hasChildren && openIds.has(item.id);
  const sectionStyle = getSectionStyle(item.sectionColor);
  const contextItems = useMemo(
    () => buildNavContextItems({ hasChildren, isOpen, item, onNavigateHref, onToggleOpen }),
    [hasChildren, isOpen, item, onNavigateHref, onToggleOpen]
  );
  const rowStyle = isMenuCollapsed ? undefined : { paddingLeft: 10 + depth * 14 };
  const rowLabel = <NavTreeRowLabel depth={depth} item={item} sectionStyle={sectionStyle} />;
  const rowClassName = getTreeRowClassName(active, sectionStyle);

  const handleCollapsedButtonClick = useCallback((): void => {
    if (item.action !== undefined) {
      item.action();
    }
    if (href === null && hasChildren) {
      onToggleOpen(item.id);
    }
  }, [hasChildren, href, item, onToggleOpen]);

  const handleActionButtonClick = useCallback((): void => {
    if (item.action !== undefined) {
      item.action();
    }
  }, [item]);

  const handleGroupToggleClick = useCallback((): void => {
    if (item.action !== undefined) {
      item.action();
      return;
    }

    onToggleOpen(item.id);
  }, [item, onToggleOpen]);

  const handleLinkIntent = useCallback((): void => {
    if (href !== null) {
      onPrefetchHref(href);
    }
  }, [href, onPrefetchHref]);

  const handleLinkClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>): void => {
      if (href === null) {
        return;
      }
      if (onSetPendingHref !== undefined) {
        onSetPendingHref(href);
      }
      if (item.onClick !== undefined) {
        item.onClick(event);
      }
    },
    [href, item, onSetPendingHref]
  );

  const rowContent =
    isMenuCollapsed && depth === 0 ? (
      <Tooltip content={item.label} side='right'>
        <span className='block'>
          <NavTreeCollapsedRoot
            active={active}
            contextItems={contextItems}
            href={href}
            item={item}
            onButtonClick={handleCollapsedButtonClick}
            onLinkClick={handleLinkClick}
            onLinkIntent={handleLinkIntent}
            sectionStyle={sectionStyle}
          />
        </span>
      </Tooltip>
    ) : (
      <NavTreePrimaryRow
        contextItems={contextItems}
        hasChildren={hasChildren}
        href={href}
        isOpen={isOpen}
        item={item}
        onActionClick={handleActionButtonClick}
        onGroupToggleClick={handleGroupToggleClick}
        onLinkClick={handleLinkClick}
        onLinkIntent={handleLinkIntent}
        rowClassName={rowClassName}
        rowLabel={rowLabel}
        rowStyle={rowStyle}
      />
    );

  return (
    <div>
      {rowContent}
      <NavTreeChildren childItems={childItems} depth={depth} isOpen={isOpen} nodeId={item.id} />
    </div>
  );
}

export const NavTreeNode = memo(
  NavTreeNodeImpl,
  (prev: NavTreeNodeProps, next: NavTreeNodeProps): boolean =>
    prev.item === next.item && prev.depth === next.depth
);
