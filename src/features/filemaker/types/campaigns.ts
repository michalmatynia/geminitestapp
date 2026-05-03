/* eslint-disable max-lines */
import type {
  FilemakerEmail,
  FilemakerPartyKind,
} from '../types';
import type {
  FilemakerEmailCampaignRunStatus,
  FilemakerEmailCampaignLifecycleStatus,
  FilemakerEmailCampaignDeliveryStatus,
  FilemakerEmailCampaignDeliveryProvider,
  FilemakerEmailCampaignDeliveryFailureCategory,
  FilemakerEmailCampaignDeliveryAttemptStatus,
  FilemakerEmailCampaignSuppressionReason,
} from '../types';

export type FilemakerEmailCampaignAudienceRecipient = {
  emailId: string;
  email: string;
  emailStatus: FilemakerEmail['status'];
  partyKind: FilemakerPartyKind;
  partyId: string;
  partyName: string;
  city: string;
  country: string;
  matchedEventIds: string[];
};

export type FilemakerEmailCampaignAudiencePreview = {
  recipients: FilemakerEmailCampaignAudienceRecipient[];
  excludedCount: number;
  suppressedCount: number;
  dedupedCount: number;
  totalLinkedEmailCount: number;
  sampleRecipients: FilemakerEmailCampaignAudienceRecipient[];
};

export type FilemakerEmailCampaignLaunchEvaluation = {
  isEligible: boolean;
  blockers: string[];
  nextEligibleAt: string | null;
};

export type FilemakerEmailCampaignRunMetrics = {
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  skippedCount: number;
};

export type FilemakerEmailCampaignAnalytics = {
  totalRuns: number;
  liveRunCount: number;
  dryRunCount: number;
  totalRecipients: number;
  processedCount: number;
  queuedCount: number;
  sentCount: number;
  failedCount: number;
  bouncedCount: number;
  skippedCount: number;
  completionRatePercent: number;
  deliveryRatePercent: number;
  failureRatePercent: number;
  bounceRatePercent: number;
  suppressionImpactCount: number;
  openCount: number;
  openRatePercent: number;
  uniqueOpenCount: number;
  uniqueOpenRatePercent: number;
  clickCount: number;
  clickRatePercent: number;
  uniqueClickCount: number;
  uniqueClickRatePercent: number;
  unsubscribeCount: number;
  unsubscribeRatePercent: number;
  resubscribeCount: number;
  resubscribeRatePercent: number;
  netUnsubscribeCount: number;
  netUnsubscribeRatePercent: number;
  replyCount: number;
  replyRatePercent: number;
  latestRunStatus: FilemakerEmailCampaignRunStatus | null;
  latestRunAt: string | null;
  latestActivityAt: string | null;
  latestOpenAt: string | null;
  latestClickAt: string | null;
  latestReplyAt: string | null;
  latestUnsubscribeAt: string | null;
  latestResubscribeAt: string | null;
  topClickedLinks: FilemakerEmailCampaignLinkPerformance[];
  languageSummaries: FilemakerEmailCampaignSegmentAnalytics[];
  contentVariantSummaries: FilemakerEmailCampaignSegmentAnalytics[];
  countrySummaries: FilemakerEmailCampaignSegmentAnalytics[];
  domainSummaries: FilemakerEmailCampaignSegmentAnalytics[];
  fallbackContentCount: number;
  fallbackContentRatePercent: number;
  eventCount: number;
};

export type FilemakerEmailCampaignLinkPerformance = {
  targetUrl: string;
  clickCount: number;
  uniqueDeliveryCount: number;
  clickRatePercent: number;
  latestClickAt: string | null;
};

export type FilemakerEmailCampaignSegmentAnalytics = {
  key: string;
  label: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  bouncedCount: number;
  skippedCount: number;
  queuedCount: number;
  deliveryRatePercent: number;
  failureRatePercent: number;
  bounceRatePercent: number;
  openCount: number;
  uniqueOpenCount: number;
  uniqueOpenRatePercent: number;
  clickCount: number;
  uniqueClickCount: number;
  uniqueClickRatePercent: number;
  replyCount: number;
  replyRatePercent: number;
  unsubscribeCount: number;
  unsubscribeRatePercent: number;
  fallbackContentCount: number;
  latestActivityAt: string | null;
};

export type FilemakerEmailCampaignDeliverabilityHealthLevel =
  | 'healthy'
  | 'warning'
  | 'critical';

export type FilemakerEmailCampaignDeliverabilityAlert = {
  id: string;
  level: Exclude<FilemakerEmailCampaignDeliverabilityHealthLevel, 'healthy'>;
  code:
    | 'global_bounce_rate'
    | 'global_failure_rate'
    | 'complaint_pressure'
    | 'queue_backlog'
    | 'rate_limited_retries'
    | 'retry_backlog'
    | 'suppression_pressure'
    | 'campaign_health'
    | 'domain_health';
  title: string;
  message: string;
  campaignId: string | null;
  campaignName: string | null;
  domain: string | null;
  value: number | null;
};

export type FilemakerEmailCampaignDomainDeliverability = {
  domain: string;
  totalDeliveries: number;
  sentCount: number;
  failedCount: number;
  bouncedCount: number;
  queuedCount: number;
  skippedCount: number;
  pendingRetryCount: number;
  overdueRetryCount: number;
  rateLimitedRetryCount: number;
  suppressionCount: number;
  deliveryRatePercent: number;
  failureRatePercent: number;
  bounceRatePercent: number;
  latestDeliveryAt: string | null;
  nextScheduledRetryAt: string | null;
  oldestOverdueRetryAt: string | null;
  alertLevel: FilemakerEmailCampaignDeliverabilityHealthLevel;
};

export type FilemakerEmailCampaignDeliverabilityCampaignHealth = {
  campaignId: string;
  campaignName: string;
  status: FilemakerEmailCampaignLifecycleStatus;
  latestRunStatus: FilemakerEmailCampaignRunStatus | null;
  latestRunAt: string | null;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  bouncedCount: number;
  queuedCount: number;
  skippedCount: number;
  pendingRetryCount: number;
  overdueRetryCount: number;
  rateLimitedRetryCount: number;
  deliveryRatePercent: number;
  failureRatePercent: number;
  bounceRatePercent: number;
  suppressionImpactCount: number;
  nextScheduledRetryAt: string | null;
  oldestOverdueRetryAt: string | null;
  alertLevel: FilemakerEmailCampaignDeliverabilityHealthLevel;
};

export type FilemakerEmailCampaignRecentDeliveryIssue = {
  deliveryId: string;
  campaignId: string;
  campaignName: string | null;
  runId: string | null;
  emailAddress: string;
  domain: string;
  status: Extract<FilemakerEmailCampaignDeliveryStatus, 'failed' | 'bounced'>;
  provider: FilemakerEmailCampaignDeliveryProvider | null;
  failureCategory: FilemakerEmailCampaignDeliveryFailureCategory | null;
  message: string;
  updatedAt: string | null;
};

export type FilemakerEmailCampaignRecentDeliveryAttempt = {
  attemptId: string;
  attemptNumber: number;
  deliveryId: string;
  campaignId: string;
  campaignName: string | null;
  runId: string;
  emailAddress: string;
  domain: string;
  status: FilemakerEmailCampaignDeliveryAttemptStatus;
  provider: FilemakerEmailCampaignDeliveryProvider | null;
  failureCategory: FilemakerEmailCampaignDeliveryFailureCategory | null;
  message: string;
  attemptedAt: string | null;
};

export type FilemakerEmailCampaignDeliveryFailureCategorySummary = {
  category: FilemakerEmailCampaignDeliveryFailureCategory;
  count: number;
};

export type FilemakerEmailCampaignDeliveryProviderSummary = {
  provider: FilemakerEmailCampaignDeliveryProvider;
  attemptCount: number;
  sentCount: number;
  failedCount: number;
  bouncedCount: number;
};

export type FilemakerEmailCampaignSuppressionReasonSummary = {
  reason: FilemakerEmailCampaignSuppressionReason;
  count: number;
  ratePercent: number;
  latestSuppressedAt: string | null;
};

export type FilemakerEmailCampaignScheduledRetryItem = {
  deliveryId: string;
  campaignId: string;
  campaignName: string | null;
  runId: string;
  emailAddress: string;
  domain: string;
  status: Extract<FilemakerEmailCampaignDeliveryStatus, 'failed' | 'bounced'>;
  failureCategory: FilemakerEmailCampaignDeliveryFailureCategory | null;
  attemptCount: number;
  nextRetryAt: string;
};

export type FilemakerEmailCampaignDeliverabilityOverview = {
  campaignCount: number;
  liveRunCount: number;
  totalRecipients: number;
  totalAttempts: number;
  retryEligibleCount: number;
  retryExhaustedCount: number;
  pendingRetryCount: number;
  overdueRetryCount: number;
  rateLimitedRetryCount: number;
  processedCount: number;
  acceptedCount: number;
  failedCount: number;
  bouncedCount: number;
  queuedCount: number;
  skippedCount: number;
  retriedDeliveryCount: number;
  recoveredAfterRetryCount: number;
  deliveryRatePercent: number;
  failureRatePercent: number;
  bounceRatePercent: number;
  suppressionCount: number;
  suppressionRatePercent: number;
  suppressionReasonBreakdown: FilemakerEmailCampaignSuppressionReasonSummary[];
  latestDeliveryAt: string | null;
  oldestQueuedAt: string | null;
  oldestQueuedAgeMinutes: number | null;
  nextScheduledRetryAt: string | null;
  nextScheduledRetryInMinutes: number | null;
  oldestOverdueRetryAt: string | null;
  oldestOverdueRetryAgeMinutes: number | null;
  failureCategoryBreakdown: FilemakerEmailCampaignDeliveryFailureCategorySummary[];
  providerBreakdown: FilemakerEmailCampaignDeliveryProviderSummary[];
  alerts: FilemakerEmailCampaignDeliverabilityAlert[];
  domainHealth: FilemakerEmailCampaignDomainDeliverability[];
  campaignHealth: FilemakerEmailCampaignDeliverabilityCampaignHealth[];
  recentDeliveryIssues: FilemakerEmailCampaignRecentDeliveryIssue[];
  recentAttempts: FilemakerEmailCampaignRecentDeliveryAttempt[];
  scheduledRetries: FilemakerEmailCampaignScheduledRetryItem[];
};

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
