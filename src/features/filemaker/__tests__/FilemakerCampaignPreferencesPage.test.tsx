import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FilemakerCampaignPreferencesPage } from '../pages/FilemakerCampaignPreferencesPage';
import type { FilemakerEmailCampaignRecipientActivitySummary } from '../types/campaigns';

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: vi.fn(),
  },
  ApiError: class ApiError extends Error {},
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type='button' {...props}>
      {children}
    </button>
  ),
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const recipientSummary: FilemakerEmailCampaignRecipientActivitySummary = {
  emailAddress: 'jan@example.com',
  campaignId: 'campaign-analytics',
  campaignName: 'Analytics campaign',
  deliveryCount: 1,
  sentCount: 1,
  failedCount: 0,
  bouncedCount: 0,
  skippedCount: 0,
  openCount: 3,
  clickCount: 1,
  replyCount: 2,
  unsubscribeCount: 0,
  resubscribeCount: 0,
  latestSentAt: '2026-03-27T10:05:00.000Z',
  latestOpenAt: '2026-03-28T12:00:00.000Z',
  latestClickAt: '2026-03-28T13:00:00.000Z',
  latestReplyAt: '2026-03-31T08:00:00.000Z',
  latestUnsubscribeAt: null,
  latestResubscribeAt: null,
  recentActivity: [
    {
      id: 'event-reply-1',
      type: 'reply_received',
      campaignId: 'campaign-analytics',
      campaignName: 'Analytics campaign',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      mailThreadId: 'thread-reply-1',
      mailMessageId: 'message-reply-1',
      timestamp: '2026-03-31T08:00:00.000Z',
      details: 'jan@example.com replied to the campaign email.',
    },
  ],
};

describe('FilemakerCampaignPreferencesPage', () => {
  it('shows recipient reply activity from campaign mail replies', () => {
    render(
      <FilemakerCampaignPreferencesPage
        initialEmailAddress='jan@example.com'
        initialCampaignId='campaign-analytics'
        initialScope='campaign'
        hasValidSignedToken
        initialRecipientSummary={recipientSummary}
      />
    );

    expect(screen.getByText(/1 clicks.*2 replies/)).toBeInTheDocument();
    expect(screen.getByText('2026-03-31T08:00:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('Reply')).toBeInTheDocument();
    expect(screen.getByText('jan@example.com replied to the campaign email.')).toBeInTheDocument();
  });
});
