import React from 'react';

import {
  Chip,
  SearchInput,
  SegmentedControl,
  type SegmentedControlOption,
} from '@/shared/ui/forms-and-actions.public';
import { Badge, Card, CardContent } from '@/shared/ui/primitives.public';

import type { FilemakerMailAccount } from '../types';
import type { MailClientDashboardScope } from './AdminFilemakerMailClientPage.helpers';

type MailClientDashboardFiltersProps = {
  accountId: string;
  accounts: Array<Pick<FilemakerMailAccount, 'id' | 'name'>>;
  query: string;
  scope: MailClientDashboardScope;
  onAccountIdChange: (accountId: string) => void;
  onQueryChange: (value: string) => void;
  onScopeChange: (value: MailClientDashboardScope) => void;
  onClearFilters: () => void;
  visibleAccountCount: number;
  visibleAttentionCount: number;
  totalAccountCount: number;
  totalAttentionCount: number;
  visibleRecentThreadCount: number;
  totalRecentThreadCount: number;
};

const MAIL_CLIENT_SCOPE_OPTIONS: ReadonlyArray<SegmentedControlOption<MailClientDashboardScope>> = [
  { value: 'all', label: 'All' },
  { value: 'healthy', label: 'Healthy' },
  { value: 'attention', label: 'Attention' },
];

function MailClientDashboardCounterBadges({
  totalAccountCount,
  totalAttentionCount,
  totalRecentThreadCount,
  visibleAccountCount,
  visibleAttentionCount,
  visibleRecentThreadCount,
}: Pick<
  MailClientDashboardFiltersProps,
  'totalAccountCount' | 'totalAttentionCount' | 'totalRecentThreadCount' | 'visibleAccountCount' | 'visibleAttentionCount' | 'visibleRecentThreadCount'
>): React.JSX.Element {
  return (
    <div className='flex flex-wrap gap-2'>
      <Badge variant='outline'>Mailboxes: {visibleAccountCount}/{totalAccountCount}</Badge>
      <Badge variant='outline'>Attention: {visibleAttentionCount}/{totalAttentionCount}</Badge>
      <Badge variant='outline'>Recent: {visibleRecentThreadCount}/{totalRecentThreadCount}</Badge>
    </div>
  );
}

function MailClientDashboardAccountFocus({
  accountId,
  accounts,
  onAccountIdChange,
}: Pick<MailClientDashboardFiltersProps, 'accountId' | 'accounts' | 'onAccountIdChange'>): React.JSX.Element | null {
  if (accounts.length === 0) return null;

  return (
    <div className='space-y-2'>
      <div className='text-xs font-semibold uppercase tracking-[0.18em] text-gray-500'>
        Mailbox Focus
      </div>
      <div className='flex flex-wrap gap-2'>
        <Chip
          label='All Mailboxes'
          active={accountId === ''}
          ariaLabel='Show all mailboxes'
          onClick={() => onAccountIdChange('')}
          variant='cyan'
        />
        {accounts.map((account) => (
          <Chip
            key={account.id}
            label={account.name}
            active={accountId === account.id}
            ariaLabel={`Focus ${account.name}`}
            onClick={() => onAccountIdChange(account.id)}
            variant='cyan'
          />
        ))}
      </div>
    </div>
  );
}

function MailClientDashboardFilters({
  accountId,
  accounts,
  query,
  scope,
  onAccountIdChange,
  onQueryChange,
  onScopeChange,
  onClearFilters,
  visibleAccountCount,
  visibleAttentionCount,
  totalAccountCount,
  totalAttentionCount,
  visibleRecentThreadCount,
  totalRecentThreadCount,
}: MailClientDashboardFiltersProps): React.JSX.Element {
  return (
    <Card variant='subtle' className='border-border/70 bg-card/50'>
      <CardContent className='space-y-4 p-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div className='space-y-1'>
            <div className='text-sm font-semibold text-white'>Mailbox Finder</div>
            <div className='text-sm text-gray-400'>
              Filter mailbox cards and recent activity by account, folder, subject, or participant.
            </div>
          </div>
          <MailClientDashboardCounterBadges
            totalAccountCount={totalAccountCount}
            totalAttentionCount={totalAttentionCount}
            totalRecentThreadCount={totalRecentThreadCount}
            visibleAccountCount={visibleAccountCount}
            visibleAttentionCount={visibleAttentionCount}
            visibleRecentThreadCount={visibleRecentThreadCount}
          />
        </div>

        <MailClientDashboardAccountFocus
          accountId={accountId}
          accounts={accounts}
          onAccountIdChange={onAccountIdChange}
        />

        <SegmentedControl
          value={scope}
          onChange={onScopeChange}
          options={MAIL_CLIENT_SCOPE_OPTIONS}
          ariaLabel='Dashboard mailbox scope'
        />

        <SearchInput
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onClear={onClearFilters}
          placeholder='Filter mailboxes and recent threads...'
          aria-label='Filter mailboxes and recent threads'
          variant='subtle'
        />
      </CardContent>
    </Card>
  );
}

export { MailClientDashboardFilters };
