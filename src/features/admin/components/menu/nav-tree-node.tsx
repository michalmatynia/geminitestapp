'use client';

import React, { memo, useCallback, useMemo } from 'react';

import { Tooltip } from '@/shared/ui/primitives.public';

import { isActiveHref, type NavItem } from './admin-menu-utils';
import { type NavTreeNodeProps, useNavTree } from './nav-tree-context';
import {
  NavTreeCollapsedRoot,
  NavTreePrimaryRow,
  NavTreeRowLabel,
} from './nav-tree-node-content';
import {
  buildNavContextItems,
  getSectionStyle,
  getTreeRowClassName,
  hasText,
} from './nav-tree-node-utils';

type NavTreeNodeState = {
  active: boolean;
  childItems: NavItem[];
  hasChildren: boolean;
  href: string | null;
  isOpen: boolean;
  rowClassName: string;
  rowStyle: React.CSSProperties | undefined;
  sectionStyle: ReturnType<typeof getSectionStyle>;
};

type NavTreeNodeHandlers = {
  handleButtonClick: () => void;
  handleLinkClick: React.MouseEventHandler<HTMLAnchorElement>;
  handleLinkIntent: () => void;
};

const getNavTreeNodeHref = (item: NavItem): string | null =>
  hasText(item.href) ? item.href : null;

const getNavTreeNodeActive = ({
  hasChildren,
  href,
  item,
  pathname,
  pendingHref,
}: {
  hasChildren: boolean;
  href: string | null;
  item: NavItem;
  pathname: string;
  pendingHref?: string | null | undefined;
}): boolean => {
  const activePathname = pendingHref ?? pathname;
  return !hasChildren && href !== null ? isActiveHref(activePathname, href, item.exact) : false;
};

const getNavTreeNodeOpenState = ({
  hasChildren,
  isMenuCollapsed,
  itemId,
  openIds,
}: {
  hasChildren: boolean;
  isMenuCollapsed: boolean;
  itemId: string;
  openIds: Set<string>;
}): boolean => !isMenuCollapsed && hasChildren && openIds.has(itemId);

function getNavTreeNodeState({
  depth,
  isMenuCollapsed,
  item,
  openIds,
  pathname,
  pendingHref,
}: {
  depth: number;
  isMenuCollapsed: boolean;
  item: NavItem;
  openIds: Set<string>;
  pathname: string;
  pendingHref?: string | null | undefined;
}): NavTreeNodeState {
  const href = getNavTreeNodeHref(item);
  const childItems = item.children ?? [];
  const hasChildren = childItems.length > 0;
  const isOpen = getNavTreeNodeOpenState({
    hasChildren,
    isMenuCollapsed,
    itemId: item.id,
    openIds,
  });
  const active = getNavTreeNodeActive({ hasChildren, href, item, pathname, pendingHref });
  const sectionStyle = getSectionStyle(item.sectionColor);

  return {
    active,
    childItems,
    hasChildren,
    href,
    isOpen,
    rowClassName: getTreeRowClassName(active, sectionStyle),
    rowStyle: isMenuCollapsed ? undefined : { paddingLeft: 10 + depth * 14 },
    sectionStyle,
  };
}

function useNavTreeNodeHandlers({
  hasChildren,
  href,
  item,
  onPrefetchHref,
  onSetPendingHref,
  onToggleOpen,
}: {
  hasChildren: boolean;
  href: string | null;
  item: NavItem;
  onPrefetchHref: (href: string) => void;
  onSetPendingHref?: ((href: string) => void) | undefined;
  onToggleOpen: (id: string) => void;
}): NavTreeNodeHandlers {
  const handleButtonClick = useCallback((): void => {
    if (item.action !== undefined) {
      item.action();
    }
    if (href === null && hasChildren) {
      onToggleOpen(item.id);
    }
  }, [hasChildren, href, item, onToggleOpen]);

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

  return { handleButtonClick, handleLinkClick, handleLinkIntent };
}

function NavTreeNodeChildren({
  childItems,
  depth,
  nodeId,
}: {
  childItems: NavItem[];
  depth: number;
  nodeId: string;
}): React.JSX.Element {
  return (
    <div className='mt-1 space-y-1' id={`${nodeId}-children`}>
      {childItems.map((childItem: NavItem) => (
        <NavTreeNode key={childItem.id} item={childItem} depth={depth + 1} />
      ))}
    </div>
  );
}

function NavTreeNodeRowContent({
  depth,
  item,
  state,
  contextItems,
  handlers,
}: {
  depth: number;
  item: NavItem;
  state: NavTreeNodeState;
  contextItems: ReturnType<typeof buildNavContextItems>;
  handlers: NavTreeNodeHandlers;
}): React.JSX.Element {
  const rowLabel = <NavTreeRowLabel depth={depth} item={item} sectionStyle={state.sectionStyle} />;
  if (depth === 0 && state.rowStyle === undefined) {
    return (
      <Tooltip content={item.label} side='right'>
        <span className='block'>
          <NavTreeCollapsedRoot
            active={state.active}
            contextItems={contextItems}
            href={state.href}
            item={item}
            onButtonClick={handlers.handleButtonClick}
            onLinkClick={handlers.handleLinkClick}
            onLinkIntent={handlers.handleLinkIntent}
            sectionStyle={state.sectionStyle}
          />
        </span>
      </Tooltip>
    );
  }

  return (
    <NavTreePrimaryRow
      contextItems={contextItems}
      hasChildren={state.hasChildren}
      href={state.href}
      isOpen={state.isOpen}
      item={item}
      onButtonClick={handlers.handleButtonClick}
      onLinkClick={handlers.handleLinkClick}
      onLinkIntent={handlers.handleLinkIntent}
      rowClassName={state.rowClassName}
      rowLabel={rowLabel}
      rowStyle={state.rowStyle}
    />
  );
}

function NavTreeNodeImpl({ item, depth }: NavTreeNodeProps): React.JSX.Element {
  const navTree = useNavTree();
  const state = getNavTreeNodeState({ depth, item, ...navTree });
  const handlers = useNavTreeNodeHandlers({
    hasChildren: state.hasChildren,
    href: state.href,
    item,
    onPrefetchHref: navTree.onPrefetchHref,
    onSetPendingHref: navTree.onSetPendingHref,
    onToggleOpen: navTree.onToggleOpen,
  });
  const contextItems = useMemo(
    () =>
      buildNavContextItems({
        hasChildren: state.hasChildren,
        isOpen: state.isOpen,
        item,
        onNavigateHref: navTree.onNavigateHref,
        onToggleOpen: navTree.onToggleOpen,
      }),
    [item, navTree.onNavigateHref, navTree.onToggleOpen, state.hasChildren, state.isOpen]
  );

  return (
    <div>
      <NavTreeNodeRowContent
        depth={depth}
        item={item}
        state={state}
        contextItems={contextItems}
        handlers={handlers}
      />
      {state.isOpen ? (
        <NavTreeNodeChildren childItems={state.childItems} depth={depth} nodeId={item.id} />
      ) : null}
    </div>
  );
}

export const NavTreeNode = memo(
  NavTreeNodeImpl,
  (prev: NavTreeNodeProps, next: NavTreeNodeProps): boolean =>
    prev.item === next.item && prev.depth === next.depth
);
