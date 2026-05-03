import { describe, expect, it } from 'vitest';

import { matchesMailClientThreadQuery } from '../pages/AdminFilemakerMailClientPage.helpers';
import type { FilemakerMailThread } from '../types';

const thread: FilemakerMailThread = {
  id: 'thread-1',
  accountId: 'account-1',
  mailboxPath: 'INBOX',
  mailboxRole: 'inbox',
  providerThreadId: null,
  subject: 'Customer replied',
  normalizedSubject: 'customer replied',
  snippet: 'Reply from Jan.',
  participantSummary: [{ address: 'jan@example.com', name: 'Jan Example' }],
  relatedPersonIds: [],
  relatedOrganizationIds: [],
  unreadCount: 1,
  messageCount: 2,
  lastMessageAt: '2026-04-23T09:30:00.000Z',
  campaignContext: {
    campaignId: 'campaign-analytics',
    runId: 'run-2026-04',
    deliveryId: 'delivery-jan-1',
  },
  createdAt: '2026-04-23T09:00:00.000Z',
  updatedAt: '2026-04-23T09:30:00.000Z',
};

describe('AdminFilemakerMailClientPage helpers', () => {
  it('matches recent threads by campaign context ids', () => {
    expect(matchesMailClientThreadQuery(thread, null, 'campaign-analytics')).toBe(true);
    expect(matchesMailClientThreadQuery(thread, null, 'run-2026-04')).toBe(true);
    expect(matchesMailClientThreadQuery(thread, null, 'delivery-jan-1')).toBe(true);
    expect(matchesMailClientThreadQuery(thread, null, 'unrelated-campaign')).toBe(false);
  });
});
