'use client';

import { AppWindow, ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import type { AdminMenuColorOption } from '@/shared/contracts/admin';
import type { TreeContextMenuItem } from '@/shared/contracts/ui/menus';
import { TreeContextMenu } from '@/shared/ui/data-display.public';
import { Button } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import type { NavItem } from './admin-menu-utils';
import { getCollapsedRootClassName } from './nav-tree-node-utils';

type NavTreeRowLabelProps = {
  depth: number;
  item: NavItem;
  sectionStyle: AdminMenuColorOption | undefined;
};

type NavTreeCollapsedRootProps = {
  active: boolean;
  contextItems: TreeContextMenuItem[];
  href: string | null;
  item: NavItem;
  onButtonClick: () => void;
  onLinkClick: React.MouseEventHandler<HTMLAnchorElement>;
  onLinkIntent: () => void;
  sectionStyle: AdminMenuColorOption | undefined;
};

type NavTreeRowBaseProps = {
  contextItems: TreeContextMenuItem[];
  rowClassName: string;
  rowLabel: React.JSX.Element;
  rowStyle: React.CSSProperties | undefined;
};

type NavTreeGroupRowProps = NavTreeRowBaseProps & {
  isOpen: boolean;
  item: NavItem;
  onButtonClick: () => void;
};

type NavTreeLinkRowProps = NavTreeRowBaseProps & {
  href: string;
  onLinkClick: React.MouseEventHandler<HTMLAnchorElement>;
  onLinkIntent: () => void;
};

type NavTreePrimaryRowProps = NavTreeRowBaseProps & {
  hasChildren: boolean;
  href: string | null;
  isOpen: boolean;
  item: NavItem;
  onButtonClick: () => void;
  onLinkClick: React.MouseEventHandler<HTMLAnchorElement>;
  onLinkIntent: () => void;
};

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

export function NavTreeRowLabel({
  depth,
  item,
  sectionStyle,
}: NavTreeRowLabelProps): React.JSX.Element {
  return (
    <div className='flex min-w-0 items-center gap-2'>
      <NavTreeRowIndicator depth={depth} icon={item.icon} sectionStyle={sectionStyle} />
      <span className='min-w-0 truncate text-left'>{item.label}</span>
    </div>
  );
}

export function NavTreeCollapsedRoot({
  active,
  contextItems,
  href,
  item,
  onButtonClick,
  onLinkClick,
  onLinkIntent,
  sectionStyle,
}: NavTreeCollapsedRootProps): React.JSX.Element {
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
          <span className='relative text-gray-200'>{icon}{iconBadge}</span>
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
        <span className='relative text-gray-200'>{icon}{iconBadge}</span>
        <span className='sr-only'>{item.label}</span>
      </Button>
    </TreeContextMenu>
  );
}

function NavTreeGroupRow({
  contextItems,
  isOpen,
  item,
  onButtonClick,
  rowClassName,
  rowLabel,
  rowStyle,
}: NavTreeGroupRowProps): React.JSX.Element {
  return (
    <TreeContextMenu items={contextItems} className='cursor-pointer'>
      <Button
        variant='ghost'
        onClick={onButtonClick}
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

function NavTreeLinkRow({
  contextItems,
  href,
  onLinkClick,
  onLinkIntent,
  rowClassName,
  rowLabel,
  rowStyle,
}: NavTreeLinkRowProps): React.JSX.Element {
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

function NavTreeActionRow({
  contextItems,
  onButtonClick,
  rowClassName,
  rowLabel,
  rowStyle,
}: NavTreeRowBaseProps & { onButtonClick: () => void }): React.JSX.Element {
  return (
    <TreeContextMenu items={contextItems} className='cursor-pointer'>
      <Button variant='ghost' onClick={onButtonClick} className={rowClassName} style={rowStyle}>
        {rowLabel}
      </Button>
    </TreeContextMenu>
  );
}

export function NavTreePrimaryRow({
  contextItems,
  hasChildren,
  href,
  isOpen,
  item,
  onButtonClick,
  onLinkClick,
  onLinkIntent,
  rowClassName,
  rowLabel,
  rowStyle,
}: NavTreePrimaryRowProps): React.JSX.Element {
  if (hasChildren) {
    return (
      <NavTreeGroupRow
        contextItems={contextItems}
        isOpen={isOpen}
        item={item}
        onButtonClick={onButtonClick}
        rowClassName={rowClassName}
        rowLabel={rowLabel}
        rowStyle={rowStyle}
      />
    );
  }

  if (href !== null) {
    return (
      <NavTreeLinkRow
        contextItems={contextItems}
        href={href}
        onLinkClick={onLinkClick}
        onLinkIntent={onLinkIntent}
        rowClassName={rowClassName}
        rowLabel={rowLabel}
        rowStyle={rowStyle}
      />
    );
  }

  return (
    <NavTreeActionRow
      contextItems={contextItems}
      onButtonClick={onButtonClick}
      rowClassName={rowClassName}
      rowLabel={rowLabel}
      rowStyle={rowStyle}
    />
  );
}
