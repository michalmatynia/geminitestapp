import { FilterX, Search } from 'lucide-react';
import React from 'react';

import { Badge, Button, Input } from '@/shared/ui/primitives.public';

import { buildFilemakerMailThreadHref as buildThreadHref } from '../../components/FilemakerMailSidebar.helpers';

import type {
  FilemakerMailAccount,
  FilemakerMailSearchResponse,
  FilemakerMailSearchResultGroup,
} from '../../types';

export interface MailSearchSectionProps {
  selectedAccount: FilemakerMailAccount | null;
  selectedAccountId: string | null;
  deepSearchQuery: string;
  onDeepSearchQueryChange: (query: string) => void;
  deepSearchResults: FilemakerMailSearchResponse | null;
  isSearching: boolean;
  onClearSearch: () => void;
  onOpenThread: (href: string) => void;
}

export function MailSearchSection({
  selectedAccount,
  selectedAccountId,
  deepSearchQuery,
  onDeepSearchQueryChange,
  deepSearchResults,
  isSearching,
  onClearSearch,
  onOpenThread,
}: MailSearchSectionProps): React.JSX.Element {
  return (
    <div className='space-y-6 rounded-lg border border-border/60 bg-card/25 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <div className='text-base font-semibold text-white'>
            <Search className='mr-2 inline-block size-4' />
            Search Messages
          </div>
          <div className='text-sm text-gray-500'>
            Full-text search across all message bodies, subjects, and participants.
            {selectedAccount ? ` Scoped to ${selectedAccount.name}.` : ' Searching all accounts.'}
          </div>
        </div>
        {deepSearchResults ? (
          <Badge variant='outline' className='text-[10px]'>
            {deepSearchResults.totalHits} hit{deepSearchResults.totalHits !== 1 ? 's' : ''} in{' '}
            {deepSearchResults.groups.length} thread
            {deepSearchResults.groups.length !== 1 ? 's' : ''}
          </Badge>
        ) : null}
      </div>

      <div className='flex gap-2'>
        <Input
          value={deepSearchQuery}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onDeepSearchQueryChange(event.target.value)
          }
          placeholder='Search message bodies, subjects, senders...'
          aria-label='Deep message search'
          className='flex-1'
        />
        {deepSearchQuery ? (
          <Button type='button' size='sm' variant='outline' onClick={onClearSearch}>
            <FilterX className='size-4' />
          </Button>
        ) : null}
      </div>

      {isSearching ? (
        <div className='text-sm text-gray-500'>Searching messages...</div>
      ) : deepSearchResults && deepSearchResults.groups.length > 0 ? (
        <div className='space-y-4'>
          {deepSearchResults.groups.map((group: FilemakerMailSearchResultGroup) => (
            <div key={group.threadId} className='rounded-lg border border-border/60 bg-card/25 p-4'>
              <div className='flex flex-wrap items-start justify-between gap-2'>
                <div className='min-w-0 flex-1'>
                  <div className='truncate text-sm font-semibold text-white'>
                    {group.threadSubject}
                  </div>
                  <div className='text-[11px] text-gray-500'>
                    {group.mailboxPath} &middot;{' '}
                    {group.lastMessageAt
                      ? new Date(group.lastMessageAt).toLocaleString()
                      : 'Unknown date'}
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline' className='text-[10px]'>
                    {group.hits.length} match{group.hits.length !== 1 ? 'es' : ''}
                  </Badge>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={() =>
                      onOpenThread(
                        buildThreadHref({
                          threadId: group.threadId,
                          accountId: group.accountId,
                          mailboxPath: group.mailboxPath,
                          originPanel: 'search',
                          searchAccountId: selectedAccountId ? null : 'all',
                          searchQuery: deepSearchQuery,
                        })
                      )
                    }
                  >
                    Open Thread
                  </Button>
                </div>
              </div>

              <div className='mt-3 space-y-2'>
                {group.hits.map((hit) => (
                  <div key={hit.messageId} className='rounded border border-border/40 bg-card/10 p-3'>
                    <div className='flex flex-wrap items-center gap-2 text-[11px] text-gray-500'>
                      <span className='font-medium text-gray-300'>
                        {hit.from?.name ?? hit.from?.address ?? 'Unknown'}
                      </span>
                      <span>&rarr;</span>
                      <span>{hit.to.map((p) => p.name ?? p.address).join(', ') || 'Unknown'}</span>
                      <Badge variant='outline' className='text-[10px]'>
                        {hit.matchField}
                      </Badge>
                      <span>
                        {hit.receivedAt ?? hit.sentAt
                          ? new Date(hit.receivedAt ?? hit.sentAt ?? '').toLocaleString()
                          : ''}
                      </span>
                    </div>
                    <div className='mt-1 text-xs text-gray-400'>{hit.matchSnippet}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : deepSearchResults?.groups.length === 0 ? (
        <div className='rounded-lg border border-border/60 bg-card/25 p-4 text-sm text-gray-500'>
          No messages matched your search.
        </div>
      ) : !deepSearchQuery ? (
        <div className='rounded-lg border border-border/60 bg-card/25 p-4 text-sm text-gray-500'>
          Enter a search term to find messages across all synced mailboxes.
        </div>
      ) : null}
    </div>
  );
}
