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

type MenuHeaderProps = {
  isAnyFolderOpen: boolean;
  normalizedQuery: string;
  onQueryChange: (value: string) => void;
  onToggleAllFolders: () => void;
  query: string;
};

function MenuHeader({
  isAnyFolderOpen,
  normalizedQuery,
  onQueryChange,
  onToggleAllFolders,
  query,
}: MenuHeaderProps): React.ReactNode {
  return (
    <TreeHeader>
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
        <Button
          variant='outline'
          size='sm'
          className='h-9 shrink-0'
          disabled={normalizedQuery !== ''}
          onClick={onToggleAllFolders}
          title={normalizedQuery !== '' ? 'Clear search to toggle all folders' : undefined}
        >
          {isAnyFolderOpen === true ? 'Collapse all' : 'Expand all'}
        </Button>
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
};

function CollapsedMenuToggle({
  isAnyFolderOpen,
  normalizedQuery,
  onToggleAllFolders,
}: CollapsedMenuToggleProps): React.ReactNode {
  return (
    <Tooltip
      content={isAnyFolderOpen === true ? 'Collapse all folders' : 'Expand all folders'}
      side='right'
    >
      <div>
        <Button
          variant='outline'
          size='sm'
          className='h-9 w-full'
          disabled={normalizedQuery !== ''}
          onClick={onToggleAllFolders}
        >
          {isAnyFolderOpen === true ? 'Collapse' : 'Expand'}
        </Button>
      </div>
    </Tooltip>
  );
}

function addFavoritesIcon(item: AdminNavItem): AdminNavItem {
  if (item.id === 'favorites') {
    return { ...item, icon: <StarIcon className='size-4' /> };
  }
  return item;
}

const MenuComponent = (): React.ReactNode => {
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
        />
      ) : (
        <CollapsedMenuToggle
          isAnyFolderOpen={isAnyFolderOpen}
          normalizedQuery={normalizedQuery}
          onToggleAllFolders={handleToggleAllFolders}
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
