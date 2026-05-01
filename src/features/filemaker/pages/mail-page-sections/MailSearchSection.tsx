import { FilterX, Search } from 'lucide-react';
import React, { startTransition } from 'react';

import { Badge, Button, Input } from '@/shared/ui/primitives.public';

import { buildFilemakerMailThreadHref as buildThreadHref } from '../../components/FilemakerMailSidebar.helpers';

import { useMailPageContext } from '../FilemakerMail.context';
import type { FilemakerMailSearchResultGroup } from '../../types';

type MailPageRouter = ReturnType<typeof useMailPageContext>['router'];
type MailSearchHit = FilemakerMailSearchResultGroup['hits'][number];

const formatOptionalDate = (value: string | null | undefined): string => {
  if (typeof value !== 'string' || value.length === 0) return 'Unknown date';
  return new Date(value).toLocaleString();
};

const formatHitDate = (hit: MailSearchHit): string => {
  const value = hit.receivedAt ?? hit.sentAt ?? null;
  if (value === null || value.length === 0) return '';
  return new Date(value).toLocaleString();
};

const formatRecipients = (hit: MailSearchHit): string => {
  const label = hit.to.map((party) => party.name ?? party.address).join(', ');
  return label.length > 0 ? label : 'Unknown';
};

const getSearchAccountId = (selectedAccountId: string | null): string | null =>
  selectedAccountId !== null && selectedAccountId.length > 0 ? null : 'all';

function SearchSummaryBadge({
  result,
}: {
  result: ReturnType<typeof useMailPageContext>['deepSearchResults'];
}): React.JSX.Element | null {
  if (result === null) return null;
  return (
    <Badge variant='outline' className='text-[10px]'>
      {result.totalHits} hit{result.totalHits !== 1 ? 's' : ''} in {result.groups.length} thread
      {result.groups.length !== 1 ? 's' : ''}
    </Badge>
  );
}

function SearchInputRow({
  deepSearchQuery,
  onClearSearch,
  setDeepSearchQuery,
}: {
  deepSearchQuery: string;
  onClearSearch: () => void;
  setDeepSearchQuery: (value: string) => void;
}): React.JSX.Element {
  return (
    <div className='flex gap-2'>
      <Input
        value={deepSearchQuery}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setDeepSearchQuery(event.target.value);
        }}
        placeholder='Search message bodies, subjects, senders...'
        aria-label='Deep message search'
        className='flex-1'
      />
      {deepSearchQuery.length > 0 ? (
        <Button type='button' size='sm' variant='outline' onClick={onClearSearch}>
          <FilterX className='size-4' />
        </Button>
      ) : null}
    </div>
  );
}

function SearchHitRow({
  hit,
}: {
  hit: MailSearchHit;
}): React.JSX.Element {
  const sender = hit.from?.name ?? hit.from?.address ?? 'Unknown';
  return (
    <div className='rounded border border-border/40 bg-card/10 p-3'>
      <div className='flex flex-wrap items-center gap-2 text-[11px] text-gray-500'>
        <span className='font-medium text-gray-300'>{sender}</span>
        <span>&rarr;</span>
        <span>{formatRecipients(hit)}</span>
        <Badge variant='outline' className='text-[10px]'>
          {hit.matchField}
        </Badge>
        <span>{formatHitDate(hit)}</span>
      </div>
      <div className='mt-1 text-xs text-gray-400'>{hit.matchSnippet}</div>
    </div>
  );
}

function SearchResultGroupCard({
  deepSearchQuery,
  group,
  router,
  selectedAccountId,
}: {
  deepSearchQuery: string;
  group: FilemakerMailSearchResultGroup;
  router: MailPageRouter;
  selectedAccountId: string | null;
}): React.JSX.Element {
  const openThread = (): void => {
    const href = buildThreadHref({
      threadId: group.threadId,
      accountId: group.accountId,
      mailboxPath: group.mailboxPath,
      originPanel: 'search',
      searchAccountId: getSearchAccountId(selectedAccountId),
      searchQuery: deepSearchQuery,
    });
    startTransition(() => {
      router.push(href);
    });
  };
  return (
    <div className='rounded-lg border border-border/60 bg-card/25 p-4'>
      <div className='flex flex-wrap items-start justify-between gap-2'>
        <div className='min-w-0 flex-1'>
          <div className='truncate text-sm font-semibold text-white'>{group.threadSubject}</div>
          <div className='text-[11px] text-gray-500'>
            {group.mailboxPath} &middot; {formatOptionalDate(group.lastMessageAt)}
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Badge variant='outline' className='text-[10px]'>
            {group.hits.length} match{group.hits.length !== 1 ? 'es' : ''}
          </Badge>
          <Button type='button' size='sm' variant='outline' onClick={openThread}>
            Open Thread
          </Button>
        </div>
      </div>
      <div className='mt-3 space-y-2'>
        {group.hits.map((hit) => (
          <SearchHitRow key={hit.messageId} hit={hit} />
        ))}
      </div>
    </div>
  );
}

function SearchResults({
  deepSearchQuery,
  deepSearchResults,
  isSearching,
  router,
  selectedAccountId,
}: {
  deepSearchQuery: string;
  deepSearchResults: ReturnType<typeof useMailPageContext>['deepSearchResults'];
  isSearching: boolean;
  router: MailPageRouter;
  selectedAccountId: string | null;
}): React.JSX.Element | null {
  if (isSearching) return <div className='text-sm text-gray-500'>Searching messages...</div>;
  if (deepSearchResults !== null && deepSearchResults.groups.length > 0) {
    return (
      <div className='space-y-4'>
        {deepSearchResults.groups.map((group: FilemakerMailSearchResultGroup) => (
          <SearchResultGroupCard
            key={group.threadId}
            deepSearchQuery={deepSearchQuery}
            group={group}
            router={router}
            selectedAccountId={selectedAccountId}
          />
        ))}
      </div>
    );
  }
  if (deepSearchResults !== null && deepSearchResults.groups.length === 0) {
    return (
      <div className='rounded-lg border border-border/60 bg-card/25 p-4 text-sm text-gray-500'>
        No messages matched your search.
      </div>
    );
  }
  if (deepSearchQuery.length === 0) {
    return (
      <div className='rounded-lg border border-border/60 bg-card/25 p-4 text-sm text-gray-500'>
        Enter a search term to find messages across all synced mailboxes.
      </div>
    );
  }
  return null;
}

export function MailSearchSection(): React.JSX.Element {
  const {
    selectedAccount,
    selectedAccountId,
    deepSearchQuery,
    setDeepSearchQuery,
    deepSearchResults,
    setDeepSearchResults,
    isSearching,
    router,
  } = useMailPageContext();

  const onClearSearch = (): void => {
    setDeepSearchQuery('');
    setDeepSearchResults(null);
  };
  const searchScopeText =
    selectedAccount !== null ? ` Scoped to ${selectedAccount.name}.` : ' Searching all accounts.';

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
            {searchScopeText}
          </div>
        </div>
        <SearchSummaryBadge result={deepSearchResults} />
      </div>

      <SearchInputRow
        deepSearchQuery={deepSearchQuery}
        onClearSearch={onClearSearch}
        setDeepSearchQuery={setDeepSearchQuery}
      />
      <SearchResults
        deepSearchQuery={deepSearchQuery}
        deepSearchResults={deepSearchResults}
        isSearching={isSearching}
        router={router}
        selectedAccountId={selectedAccountId}
      />
    </div>
  );
}
