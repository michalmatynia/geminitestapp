import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FilemakerEmailCampaignAnalytics } from '../types/campaigns';
import { CampaignAnalyticsSection } from '../pages/campaign-edit-sections/CampaignInsightsSections';

const useCampaignEditContextMock = vi.fn();

vi.mock('@/shared/ui/primitives.public', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({ children }: { children: React.ReactNode }) => <button type='button'>{children}</button>,
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormSection: ({
    title,
    children,
  }: {
    title?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <section>
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  ),
}));

vi.mock('../pages/AdminFilemakerCampaignEditPage.context', () => ({
  useCampaignEditContext: () => useCampaignEditContextMock(),
}));

const analytics: FilemakerEmailCampaignAnalytics = {
  totalRuns: 1,
  liveRunCount: 1,
  dryRunCount: 0,
  totalRecipients: 10,
  processedCount: 10,
  queuedCount: 0,
  sentCount: 8,
  failedCount: 1,
  bouncedCount: 1,
  skippedCount: 0,
  completionRatePercent: 100,
  deliveryRatePercent: 80,
  failureRatePercent: 20,
  bounceRatePercent: 10,
  suppressionImpactCount: 2,
  openCount: 4,
  openRatePercent: 50,
  uniqueOpenCount: 3,
  uniqueOpenRatePercent: 37.5,
  clickCount: 2,
  clickRatePercent: 25,
  uniqueClickCount: 2,
  uniqueClickRatePercent: 25,
  unsubscribeCount: 1,
  unsubscribeRatePercent: 12.5,
  resubscribeCount: 0,
  resubscribeRatePercent: 0,
  netUnsubscribeCount: 1,
  netUnsubscribeRatePercent: 12.5,
  replyCount: 3,
  replyRatePercent: 37.5,
  latestRunStatus: 'completed',
  latestRunAt: '2026-04-01T09:00:00.000Z',
  latestActivityAt: '2026-04-01T12:00:00.000Z',
  latestOpenAt: '2026-04-01T10:00:00.000Z',
  latestClickAt: '2026-04-01T11:00:00.000Z',
  latestReplyAt: '2026-04-01T12:00:00.000Z',
  latestUnsubscribeAt: null,
  latestResubscribeAt: null,
  topClickedLinks: [],
  eventCount: 8,
};

describe('CampaignAnalyticsSection', () => {
  beforeEach(() => {
    useCampaignEditContextMock.mockReset();
    useCampaignEditContextMock.mockReturnValue({ analytics });
  });

  it('surfaces reply metrics from campaign mail replies', () => {
    render(<CampaignAnalyticsSection />);

    expect(screen.getByText('Replies')).toBeInTheDocument();
    expect(screen.getByText('Reply rate: 37.5%')).toBeInTheDocument();
    expect(screen.getByText(/Latest reply:/)).toBeInTheDocument();
  });
});
