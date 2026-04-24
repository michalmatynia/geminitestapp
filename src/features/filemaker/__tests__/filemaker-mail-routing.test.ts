import { describe, expect, it } from 'vitest';

import { buildFilemakerMailComposeHref, buildFilemakerMailThreadHref } from '../components/FilemakerMailSidebar.helpers';
import { buildFilemakerMailSelectionHref } from '../mail-ui-helpers';

describe('filemaker mail routing helpers', () => {
  it('drops recent-only query params outside recent selection routes', () => {
    expect(
      buildFilemakerMailSelectionHref({
        accountId: 'account-1',
        mailboxPath: 'VIP',
        recentMailboxFilter: 'VIP',
        recentUnreadOnly: true,
        recentQuery: 'welcome',
      })
    ).toBe('/admin/filemaker/mail?accountId=account-1&mailboxPath=VIP');
  });

  it('keeps recent query params on recent selection routes', () => {
    expect(
      buildFilemakerMailSelectionHref({
        accountId: 'account-1',
        panel: 'recent',
        recentMailboxFilter: 'VIP',
        recentUnreadOnly: true,
        recentQuery: 'welcome',
        recentCampaignId: 'campaign-1',
        recentRunId: 'run-1',
        recentDeliveryId: 'delivery-1',
      })
    ).toBe(
      '/admin/filemaker/mail?accountId=account-1&panel=recent&recentMailbox=VIP&recentUnread=1&recentQuery=welcome&campaignId=campaign-1&runId=run-1&deliveryId=delivery-1'
    );
  });

  it('drops mailboxPath on non-folder selection routes', () => {
    expect(
      buildFilemakerMailSelectionHref({
        accountId: 'account-1',
        mailboxPath: 'VIP',
        panel: 'recent',
      })
    ).toBe('/admin/filemaker/mail?accountId=account-1&panel=recent');

    expect(
      buildFilemakerMailSelectionHref({
        accountId: 'account-1',
        mailboxPath: 'VIP',
        panel: 'settings',
      })
    ).toBe('/admin/filemaker/mail?accountId=account-1&panel=settings');

    expect(
      buildFilemakerMailSelectionHref({
        accountId: 'account-1',
        panel: 'account',
      })
    ).toBe('/admin/filemaker/mail?accountId=account-1&panel=settings');

    expect(
      buildFilemakerMailSelectionHref({
        panel: 'settings',
      })
    ).toBe('/admin/filemaker/mail?panel=settings');

    expect(
      buildFilemakerMailSelectionHref({
        accountId: 'account-1',
        mailboxPath: 'VIP',
        panel: 'search',
        searchQuery: 'invoice',
      })
    ).toBe('/admin/filemaker/mail?panel=search&accountId=account-1&searchQuery=invoice');
  });

  it('drops recent-only params on folder-origin compose and thread routes', () => {
    expect(
      buildFilemakerMailComposeHref({
        accountId: 'account-1',
        mailboxPath: 'VIP',
        recentMailboxFilter: 'VIP',
        recentUnreadOnly: true,
        recentQuery: 'welcome',
      })
    ).toBe('/admin/filemaker/mail/compose?accountId=account-1&mailboxPath=VIP');

    expect(
      buildFilemakerMailThreadHref({
        threadId: 'thread-1',
        accountId: 'account-1',
        mailboxPath: 'VIP',
        recentMailboxFilter: 'VIP',
        recentUnreadOnly: true,
        recentQuery: 'welcome',
      })
    ).toBe('/admin/filemaker/mail/threads/thread-1?accountId=account-1&mailboxPath=VIP');
  });

  it('keeps recent-only params on recent-origin compose and thread routes', () => {
    expect(
      buildFilemakerMailComposeHref({
        accountId: 'account-1',
        originPanel: 'recent',
        recentMailboxFilter: 'VIP',
        recentUnreadOnly: true,
        recentQuery: 'welcome',
        recentCampaignId: 'campaign-1',
        recentRunId: 'run-1',
        recentDeliveryId: 'delivery-1',
      })
    ).toBe(
      '/admin/filemaker/mail/compose?accountId=account-1&panel=recent&recentMailbox=VIP&recentUnread=1&recentQuery=welcome&campaignId=campaign-1&runId=run-1&deliveryId=delivery-1'
    );

    expect(
      buildFilemakerMailThreadHref({
        threadId: 'thread-1',
        accountId: 'account-1',
        mailboxPath: 'VIP',
        originPanel: 'recent',
        recentMailboxFilter: 'VIP',
        recentUnreadOnly: true,
        recentQuery: 'welcome',
        recentCampaignId: 'campaign-1',
        recentRunId: 'run-1',
        recentDeliveryId: 'delivery-1',
      })
    ).toBe(
      '/admin/filemaker/mail/threads/thread-1?accountId=account-1&mailboxPath=VIP&panel=recent&recentMailbox=VIP&recentUnread=1&recentQuery=welcome&campaignId=campaign-1&runId=run-1&deliveryId=delivery-1'
    );
  });

  it('marks global search context on search-origin compose and thread routes', () => {
    expect(
      buildFilemakerMailComposeHref({
        accountId: 'account-1',
        mailboxPath: 'VIP',
        originPanel: 'search',
        searchAccountId: 'all',
        searchQuery: 'invoice',
      })
    ).toBe(
      '/admin/filemaker/mail/compose?accountId=account-1&mailboxPath=VIP&panel=search&searchQuery=invoice&searchAccountId=all'
    );

    expect(
      buildFilemakerMailThreadHref({
        threadId: 'thread-1',
        accountId: 'account-1',
        mailboxPath: 'VIP',
        originPanel: 'search',
        searchAccountId: 'all',
        searchQuery: 'invoice',
      })
    ).toBe(
      '/admin/filemaker/mail/threads/thread-1?accountId=account-1&mailboxPath=VIP&panel=search&searchQuery=invoice&searchAccountId=all'
    );
  });

  it('keeps distinct focused search context on search-origin compose and thread routes', () => {
    expect(
      buildFilemakerMailComposeHref({
        accountId: 'account-1',
        originPanel: 'search',
        searchContextAccountId: 'account-2',
        searchQuery: 'invoice',
      })
    ).toBe(
      '/admin/filemaker/mail/compose?accountId=account-1&panel=search&searchQuery=invoice&searchContextAccountId=account-2'
    );

    expect(
      buildFilemakerMailThreadHref({
        threadId: 'thread-1',
        accountId: 'account-1',
        mailboxPath: 'VIP',
        originPanel: 'search',
        searchContextAccountId: 'account-2',
        searchQuery: 'invoice',
      })
    ).toBe(
      '/admin/filemaker/mail/threads/thread-1?accountId=account-1&mailboxPath=VIP&panel=search&searchQuery=invoice&searchContextAccountId=account-2'
    );
  });
});
