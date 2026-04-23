import { AlertTriangle, Inbox, MailPlus, Search } from 'lucide-react';
import React from 'react';

import {
  NavigationCard,
  NavigationCardGrid,
} from '@/shared/ui/navigation-and-layout.public';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/primitives.public';

import { buildFilemakerMailComposeHref } from '../components/FilemakerMailSidebar.helpers';
import { buildFilemakerMailSelectionHref } from '../mail-ui-helpers';
import type { FilemakerMailAccount } from '../types';

type MailClientSummaryCardsProps = {
  accountCount: number;
  activeCount: number;
  attentionCount: number;
  folderCount: number;
};

type MailClientQuickActionsProps = {
  accountCount: number;
  activeCount: number;
  attentionCount: number;
  firstActiveAccount: FilemakerMailAccount | null;
};

function MailClientSummaryCards({
  accountCount,
  activeCount,
  attentionCount,
  folderCount,
}: MailClientSummaryCardsProps): React.JSX.Element {
  const cards = [
    ['Mailboxes', accountCount, 'Configured Filemaker mailbox connections.'],
    ['Active', activeCount, 'Mailboxes ready to sync and send.'],
    ['Attention', attentionCount, 'Mailboxes paused or reporting sync errors.'],
    ['Folders', folderCount, 'Indexed mailbox folders across all accounts.'],
  ] as const;

  return (
    <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
      {cards.map(([label, value, description]) => (
        <Card key={label} variant='subtle' className='border-border/70 bg-card/60'>
          <CardHeader className='space-y-1 pb-2'>
            <div className='text-xs uppercase tracking-[0.22em] text-gray-500'>{label}</div>
            <CardTitle className='text-3xl text-white'>{value}</CardTitle>
          </CardHeader>
          <CardContent className='pt-0 text-sm text-gray-400'>{description}</CardContent>
        </Card>
      ))}
    </div>
  );
}

function MailClientQuickActions({
  accountCount,
  activeCount,
  attentionCount,
  firstActiveAccount,
}: MailClientQuickActionsProps): React.JSX.Element {
  const composeDescription =
    firstActiveAccount !== null
      ? `Start a message from ${firstActiveAccount.name}.`
      : 'Open the composer and choose a mailbox.';
  const attentionDescription =
    attentionCount > 0
      ? `${attentionCount} mailbox${attentionCount === 1 ? '' : 'es'} need follow-up.`
      : 'All configured mailboxes currently look healthy.';

  return (
    <NavigationCardGrid className='sm:grid-cols-2 xl:grid-cols-4'>
      <NavigationCard
        href='/admin/filemaker/mail'
        ariaLabel='Open Workspace'
        linkClassName='group'
        className='border-border/70 bg-card/50 group-hover:border-sky-500/40 group-hover:bg-card/70'
        leading={<div className='flex size-12 items-center justify-center rounded-lg bg-sky-500/10 text-sky-300'><Inbox className='size-6' /></div>}
        title='Open Workspace'
        description='Go directly into folders, recent threads, and account settings.'
        trailing={<Badge variant='outline'>{accountCount} mailboxes</Badge>}
      />
      <NavigationCard
        href={buildFilemakerMailComposeHref({ accountId: firstActiveAccount?.id ?? null })}
        ariaLabel='Compose'
        linkClassName='group'
        className='border-border/70 bg-card/50 group-hover:border-emerald-500/40 group-hover:bg-card/70'
        leading={<div className='flex size-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300'><MailPlus className='size-6' /></div>}
        title='Compose'
        description={composeDescription}
        trailing={<Badge variant='outline'>{activeCount} active</Badge>}
      />
      <NavigationCard
        href={buildFilemakerMailSelectionHref({ panel: 'search' })}
        ariaLabel='Search Messages'
        linkClassName='group'
        className='border-border/70 bg-card/50 group-hover:border-violet-500/40 group-hover:bg-card/70'
        leading={<div className='flex size-12 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300'><Search className='size-6' /></div>}
        title='Search Messages'
        description='Run deep search across connected Filemaker mailboxes.'
        trailing={<Badge variant='outline'>Global</Badge>}
      />
      <NavigationCard
        href={buildFilemakerMailSelectionHref({ panel: 'attention' })}
        ariaLabel='Needs Attention'
        linkClassName='group'
        className='border-border/70 bg-card/50 group-hover:border-amber-500/40 group-hover:bg-card/70'
        leading={<div className='flex size-12 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300'><AlertTriangle className='size-6' /></div>}
        title='Needs Attention'
        description={attentionDescription}
        trailing={<Badge variant='outline'>{attentionCount} flagged</Badge>}
      />
    </NavigationCardGrid>
  );
}

export {
  MailClientQuickActions,
  MailClientSummaryCards,
};
