export type FilemakerEmailCampaignRecipientActivityType =
  | 'delivery_sent'
  | 'delivery_failed'
  | 'delivery_bounced'
  | 'opened'
  | 'clicked'
  | 'reply_received'
  | 'unsubscribed'
  | 'resubscribed';

export type FilemakerEmailCampaignRecipientActivityItem = {
  id: string;
  type: FilemakerEmailCampaignRecipientActivityType;
  campaignId: string | null;
  campaignName: string | null;
  runId: string | null;
  deliveryId: string | null;
  mailThreadId?: string | null;
  mailMessageId?: string | null;
  timestamp: string;
  details: string | null;
};

export type FilemakerEmailCampaignRecipientActivitySummary = {
  emailAddress: string;
  campaignId: string | null;
  campaignName: string | null;
  deliveryCount: number;
  sentCount: number;
  failedCount: number;
  bouncedCount: number;
  skippedCount: number;
  openCount: number;
  clickCount: number;
  replyCount: number;
  unsubscribeCount: number;
  resubscribeCount: number;
  latestSentAt: string | null;
  latestOpenAt: string | null;
  latestClickAt: string | null;
  latestReplyAt: string | null;
  latestUnsubscribeAt: string | null;
  latestResubscribeAt: string | null;
  recentActivity: FilemakerEmailCampaignRecipientActivityItem[];
};
