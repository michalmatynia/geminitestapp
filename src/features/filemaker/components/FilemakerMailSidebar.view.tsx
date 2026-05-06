'use client';

import { FilterX } from 'lucide-react';
import React from 'react';

import { MasterFolderTreeViewport } from '@/shared/lib/foldertree/public';
import { Badge, Button, Checkbox, Input } from '@/shared/ui/primitives.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { FolderTreePanel } from '@/shared/ui/FolderTreePanel';

import { FilemakerMailSidebarContext } from './FilemakerMailSidebarContext';
import { MailPlus } from './FilemakerMailSidebar.helpers';
import type { FilemakerMailSidebarActions, FilemakerMailSidebarModel } from './FilemakerMailSidebar.types';

type FilemakerMailSidebarViewProps = {
  actions?: FilemakerMailSidebarActions;
  model: FilemakerMailSidebarModel;
};

const HeaderActions = ({
  model,
}: {
  model: FilemakerMailSidebarModel;
}): React.JSX.Element => (
  <div className='flex flex-wrap gap-2'>
    <Button type='button' size='sm' variant='outline' onClick={model.handleNewMailbox}>
      New Mailbox
    </Button>
    <Button type='button' size='sm' variant='outline' onClick={model.handleCompose}>
      <MailPlus className='mr-2 size-4' />
      Compose
    </Button>
    {model.selectedAccountId !== null && model.isRecentContext && model.hasActiveRecentFilters ? (
      <Button type='button' size='sm' variant='outline' onClick={model.clearRecentFilters}>
        <FilterX className='mr-2 size-4' />
        Clear Recent
      </Button>
    ) : null}
    {model.isSearchContext && model.hasActiveSearchQuery ? (
      <Button type='button' size='sm' variant='outline' onClick={model.clearSearchQuery}>
        <FilterX className='mr-2 size-4' />
        Clear Search
      </Button>
    ) : null}
  </div>
);

const RecentControls = ({
  actions,
  model,
}: FilemakerMailSidebarViewProps): React.JSX.Element | null => {
  if (!model.showRecentControls) return null;
  return (
    <div className='space-y-2 rounded-md border border-white/10 bg-white/[0.03] p-2'>
      <SelectSimple
        ariaLabel='Sidebar recent mailbox filter'
        onValueChange={(nextValue): void => {
          if (actions?.onRecentMailboxFilterChange !== undefined) {
            actions.onRecentMailboxFilterChange(nextValue);
            return;
          }
          model.updateRecentFilters({ recentMailboxFilter: nextValue });
        }}
        options={model.recentMailboxOptions}
        placeholder='All mailboxes'
        value={model.recentMailboxFilter ?? ''}
      />
      <Input
        aria-label='Sidebar recent search'
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
          const nextValue = event.target.value;
          if (actions?.onRecentQueryChange !== undefined) {
            actions.onRecentQueryChange(nextValue);
            return;
          }
          model.updateRecentFilters({ recentQuery: nextValue });
        }}
        placeholder='Filter recent threads...'
        value={model.recentQuery ?? ''}
      />
      <label
        htmlFor='filemaker-mail-sidebar-recent-unread'
        className='flex items-center gap-2 text-[11px] text-gray-300'
      >
        <Checkbox
          id='filemaker-mail-sidebar-recent-unread'
          checked={model.recentUnreadOnly}
          onCheckedChange={(checked): void => {
            const nextValue = checked === true;
            if (actions?.onRecentUnreadOnlyChange !== undefined) {
              actions.onRecentUnreadOnlyChange(nextValue);
              return;
            }
            model.updateRecentFilters({ recentUnreadOnly: nextValue });
          }}
        />
        Sidebar recent unread only
      </label>
    </div>
  );
};

const SidebarBadges = ({
  model,
}: {
  model: FilemakerMailSidebarModel;
}): React.JSX.Element => (
  <div className='flex flex-wrap gap-2 text-[10px]'>
    <Badge variant='outline'>Accounts: {model.accountsCount}</Badge>
    <Badge variant='outline'>Folders: {model.foldersCount}</Badge>
    <PositiveCountBadge count={model.errorAccountCount} label='Sync Errors' />
    <PositiveCountBadge count={model.inactiveAccountCount} label='Inactive' />
    <SelectedAccountBadge model={model} />
    <RecentMailboxBadge model={model} />
    <RecentUnreadBadge model={model} />
    <RecentQueryBadge model={model} />
    <SearchQueryBadge model={model} />
    <ThreadsBadge model={model} />
  </div>
);

const PositiveCountBadge = ({
  count,
  label,
}: {
  count: number;
  label: string;
}): React.JSX.Element | null =>
  count > 0 ? <Badge variant='outline'>{label}: {count}</Badge> : null;

const SelectedAccountBadge = ({
  model,
}: {
  model: FilemakerMailSidebarModel;
}): React.JSX.Element | null =>
  model.selectedAccountId !== null ? <Badge variant='outline'>Recent: {model.visibleRecentCount}</Badge> : null;

const RecentMailboxBadge = ({
  model,
}: {
  model: FilemakerMailSidebarModel;
}): React.JSX.Element | null => {
  if (!model.isRecentContext) return null;
  if (model.selectedAccountId === null) return null;
  if (model.recentMailboxFilter === null) return null;
  return <Badge variant='outline'>Recent Mailbox: {model.recentMailboxFilter}</Badge>;
};

const RecentUnreadBadge = ({
  model,
}: {
  model: FilemakerMailSidebarModel;
}): React.JSX.Element | null => {
  if (!model.isRecentContext) return null;
  if (model.selectedAccountId === null) return null;
  if (!model.recentUnreadOnly) return null;
  return <Badge variant='outline'>Recent Unread</Badge>;
};

const trimNullable = (value: string | null | undefined): string => value?.trim() ?? '';

const RecentQueryBadge = ({
  model,
}: {
  model: FilemakerMailSidebarModel;
}): React.JSX.Element | null => {
  const query = trimNullable(model.recentQuery);
  if (!model.isRecentContext) return null;
  if (model.selectedAccountId === null) return null;
  if (query === '') return null;
  return <Badge variant='outline'>Recent Search: {query}</Badge>;
};

const SearchQueryBadge = ({
  model,
}: {
  model: FilemakerMailSidebarModel;
}): React.JSX.Element | null => {
  if (!model.isSearchContext) return null;
  if (!model.hasActiveSearchQuery) return null;
  return <Badge variant='outline'>Search Query: {trimNullable(model.contextValue.searchQuery)}</Badge>;
};

const ThreadsBadge = ({
  model,
}: {
  model: FilemakerMailSidebarModel;
}): React.JSX.Element | null => {
  if (model.selectedAccountId === null) return null;
  if (model.selectedMailboxPath === null) return null;
  return <Badge variant='outline'>Threads: {model.threadsCount}</Badge>;
};

const SidebarHeader = (props: FilemakerMailSidebarViewProps): React.JSX.Element => (
  <div className='space-y-3 border-b border-border/60 px-1 pb-3'>
    <div>
      <div className='text-sm font-semibold text-white'>Mail Navigation</div>
      <div className='text-xs text-gray-500'>Manage mailbox accounts and browse synced folders.</div>
    </div>
    <HeaderActions model={props.model} />
    <RecentControls actions={props.actions} model={props.model} />
    <SidebarBadges model={props.model} />
  </div>
);

export const FilemakerMailSidebarView = ({
  actions,
  model,
}: FilemakerMailSidebarViewProps): React.JSX.Element => (
  <FilemakerMailSidebarContext.Provider value={model.contextValue}>
    <div className='rounded-lg border border-border/60 bg-card/25 p-3'>
      <FolderTreePanel
        className='min-h-[680px]'
        bodyClassName='min-h-0 overflow-hidden'
        masterInstance='filemaker_mail'
        header={<SidebarHeader actions={actions} model={model} />}
      >
        <div className='min-h-0 overflow-auto p-2'>
          <MasterFolderTreeViewport
            tree={model.tree}
            emptyLabel={model.isLoading ? 'Loading mailboxes...' : 'No mailboxes configured'}
            enableDnd={false}
            renderNode={model.renderNode}
          />
        </div>
      </FolderTreePanel>
    </div>
  </FilemakerMailSidebarContext.Provider>
);
