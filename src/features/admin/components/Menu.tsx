'use client';

import { StarIcon } from 'lucide-react';
import React, { memo, useMemo } from 'react';

import { Button, Tooltip } from '@/shared/ui/primitives.public';
import { SearchInput } from '@/shared/ui/forms-and-actions.public';
import { TreeHeader } from '@/shared/ui/data-display.public';
import { cn } from '@/shared/utils/ui-utils';

import { useAdminMenuState } from '../hooks/useAdminMenuState';
import { NavTree } from './menu/NavTree';

type AdminNavItem = ReturnType<typeof useAdminMenuState>['filteredNav'][number];

type MenuProps = {
  sidebarCollapseControl?: React.ReactNode;
};

type MenuHeaderProps = {
  isAnyFolderOpen: boolean;
  normalizedQuery: string;
  onQueryChange: (value: string) => void;
  onToggleAllFolders: () => void;
  query: string;
  sidebarCollapseControl?: React.ReactNode;
};

function FolderToggleIcon({ isAnyFolderOpen }: { isAnyFolderOpen: boolean }): React.ReactNode {
  return (
    <svg
      aria-hidden='true'
      className='size-4'
      fill='none'
      stroke='currentColor'
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth='2'
      viewBox='0 0 24 24'
    >
      <path d='M5 6h14' />
      <path d='M5 12h14' />
      <path d='M5 18h14' />
      <path d={isAnyFolderOpen ? 'm9 10 3-3 3 3' : 'm9 8 3 3 3-3'} />
    </svg>
  );
}

function MenuHeader({
  isAnyFolderOpen,
  normalizedQuery,
  onQueryChange,
  onToggleAllFolders,
  query,
  sidebarCollapseControl,
}: MenuHeaderProps): React.ReactNode {
  const toggleAllFoldersLabel =
    isAnyFolderOpen === true ? 'Collapse all folders' : 'Expand all folders';

  return (
    <TreeHeader>
      <div className='flex flex-col gap-2'>
        <div className='flex items-center gap-2'>
          <SearchInput
            value={query}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              onQueryChange(event.target.value)
            }
            placeholder='Search admin pages…'
            className='h-9 flex-1 bg-gray-900/40'
            onClear={() => onQueryChange('')}
          />
          {sidebarCollapseControl !== null && sidebarCollapseControl !== undefined ? (
            <div className='shrink-0'>{sidebarCollapseControl}</div>
          ) : null}
        </div>
        <div className='flex justify-start'>
          <Tooltip content={toggleAllFoldersLabel} side='right'>
            <div>
              <Button
                variant='outline'
                size='sm'
                className='h-9 w-9 p-0'
                disabled={normalizedQuery !== ''}
                onClick={onToggleAllFolders}
                aria-label={toggleAllFoldersLabel}
                title={normalizedQuery !== '' ? 'Clear search to toggle all folders' : toggleAllFoldersLabel}
              >
                <FolderToggleIcon isAnyFolderOpen={isAnyFolderOpen} />
              </Button>
            </div>
          </Tooltip>
        </div>
      </div>
      {normalizedQuery !== '' ? (
        <div className='text-[11px] text-gray-500'>
          Filtering menu: <span className='text-gray-300'>{query.trim()}</span>
        </div>
      ) : null}
    </TreeHeader>
  );
}

type CollapsedMenuToggleProps = {
  isAnyFolderOpen: boolean;
  normalizedQuery: string;
  onToggleAllFolders: () => void;
  sidebarCollapseControl?: React.ReactNode;
};

function CollapsedMenuToggle({
  isAnyFolderOpen,
  normalizedQuery,
  onToggleAllFolders,
  sidebarCollapseControl,
}: CollapsedMenuToggleProps): React.ReactNode {
  const toggleAllFoldersLabel =
    isAnyFolderOpen === true ? 'Collapse all folders' : 'Expand all folders';

  return (
    <TreeHeader>
      <div className='flex flex-col gap-2'>
        <div className='flex h-9 items-center justify-end'>
          {sidebarCollapseControl ?? null}
        </div>
        <div className='flex justify-start'>
          <Button
            variant='outline'
            size='sm'
            className='h-9 w-9 p-0'
            disabled={normalizedQuery !== ''}
            onClick={onToggleAllFolders}
            aria-label={toggleAllFoldersLabel}
          >
            <FolderToggleIcon isAnyFolderOpen={isAnyFolderOpen} />
          </Button>
        </div>
      </div>
    </TreeHeader>
  );
}

function addFavoritesIcon(item: AdminNavItem): AdminNavItem {
  if (item.id === 'favorites') {
    return { ...item, icon: <StarIcon className='size-4' /> };
  }
  return item;
}

const MenuComponent = ({ sidebarCollapseControl }: MenuProps): React.ReactNode => {
  const {
    query,
    setQuery,
    isMenuCollapsed,
    pathname,
    pendingHref,
    setPendingHref,
    filteredNav,
    effectiveOpenIds,
    handleToggleOpen,
    normalizedQuery,
    handleToggleAllFolders,
    isAnyFolderOpen,
  } = useAdminMenuState();

  const navWithIcons = useMemo(
    () => filteredNav.map(addFavoritesIcon),
    [filteredNav]
  );

  return (
    <nav
      data-admin-menu
      aria-label='Admin menu'
      className={cn('flex flex-col gap-3', isMenuCollapsed ? 'items-stretch' : '')}
    >
      {!isMenuCollapsed ? (
        <MenuHeader
          isAnyFolderOpen={isAnyFolderOpen}
          normalizedQuery={normalizedQuery}
          onQueryChange={setQuery}
          onToggleAllFolders={handleToggleAllFolders}
          query={query}
          sidebarCollapseControl={sidebarCollapseControl}
        />
      ) : (
        <CollapsedMenuToggle
          isAnyFolderOpen={isAnyFolderOpen}
          normalizedQuery={normalizedQuery}
          onToggleAllFolders={handleToggleAllFolders}
          sidebarCollapseControl={sidebarCollapseControl}
        />
      )}

      <NavTree
        items={navWithIcons}
        depth={0}
        isMenuCollapsed={isMenuCollapsed}
        pathname={pathname}
        openIds={effectiveOpenIds}
        onToggleOpen={handleToggleOpen}
        pendingHref={pendingHref}
        onSetPendingHref={setPendingHref}
      />
    </nav>
  );
};

export default memo(MenuComponent);
