import { validationError } from '@/shared/errors/app-error';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { normalizeString } from '../filemaker-settings.helpers';
import {
  getFilemakerEmailById,
  getFilemakerOrganizationsForEvent,
} from './database-getters';
import { getFilemakerOrganizationById, getFilemakerPersonById } from './party-getters';
import {
  FilemakerDatabase,
  FilemakerEmailCampaign,
  FilemakerEmailCampaignAudienceRule,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryAttemptRegistry,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignDeliveryStatus,
  FilemakerEmailCampaignEvent,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignRegistry,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignRunRegistry,
  FilemakerEmailCampaignRunStatus,
  FilemakerEmailCampaignSuppressionRegistry,
  FilemakerPartyKind,
  FilemakerPartyReference,
} from '../types';
import {
  FilemakerEmailCampaignAnalytics,
  FilemakerEmailCampaignAudiencePreview,
  FilemakerEmailCampaignAudienceRecipient,
  FilemakerEmailCampaignDeliverabilityAlert,
  FilemakerEmailCampaignDeliverabilityCampaignHealth,
  FilemakerEmailCampaignDeliverabilityHealthLevel,
  FilemakerEmailCampaignDeliverabilityOverview,
  FilemakerEmailCampaignDomainDeliverability,
  FilemakerEmailCampaignLaunchEvaluation,
  FilemakerEmailCampaignLinkPerformance,
  FilemakerEmailCampaignRecentDeliveryAttempt,
  FilemakerEmailCampaignRecentDeliveryIssue,
  FilemakerEmailCampaignRecipientActivityItem,
  FilemakerEmailCampaignRecipientActivitySummary,
  FilemakerEmailCampaignRecipientActivityType,
  FilemakerEmailCampaignRunMetrics,
  FilemakerEmailCampaignScheduledRetryItem,
} from '../types/campaigns';
import {
  createFilemakerEmailCampaignDelivery,
  createFilemakerEmailCampaignRun,
  getFilemakerEmailCampaignDeliveriesForRun,
  getFilemakerEmailCampaignSuppressionByAddress,
  isFilemakerEmailCampaignRetryableFailureCategory,
  normalizeCampaignAudienceRule,
  normalizeFilemakerEmailCampaignDeliveryAttemptRegistry,
  normalizeFilemakerEmailCampaignDeliveryRegistry,
  normalizeFilemakerEmailCampaignEventRegistry,
  normalizeFilemakerEmailCampaignSuppressionRegistry,
  resolveFilemakerEmailCampaignRetryableDeliveries,
  resolveFilemakerEmailCampaignRetryDelayForAttemptCount,
  FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS,
} from './campaign-factories';

export const roundPercentage = (numerator: number, denominator: number): number => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return Math.round((numerator / denominator) * 1000) / 10;
};

export const summarizeUniqueDeliveryEventCount = (
  events: FilemakerEmailCampaignEvent[]
): number => {
  if (events.length === 0) return 0;
  const keys = new Set(
    events.map((event: FilemakerEmailCampaignEvent): string => {
      const deliveryId = normalizeString(event.deliveryId);
      if (deliveryId) return `delivery:${deliveryId}`;
      const runId = normalizeString(event.runId) || 'runless';
      const targetUrl = normalizeString(event.targetUrl) || 'targetless';
      return `event:${runId}:${targetUrl}:${event.id}`;
    })
  );
  return keys.size;
};

export const toSortedLatestTimestamp = (values: Array<string | null | undefined>): string | null =>
  values
    .filter((value: string | null | undefined): value is string => Boolean(value))
    .sort((left: string, right: string): number => Date.parse(right) - Date.parse(left))[0] ??
  null;

export const toSortedOldestTimestamp = (values: Array<string | null | undefined>): string | null =>
  values
    .filter((value: string | null | undefined): value is string => Boolean(value))
    .sort((left: string, right: string): number => Date.parse(left) - Date.parse(right))[0] ??
  null;

export const resolveEmailDomain = (emailAddress: string | null | undefined): string => {
  const normalized = normalizeString(emailAddress).toLowerCase();
  if (!normalized) return 'unknown';
  const atIndex = normalized.lastIndexOf('@');
  if (atIndex === -1 || atIndex === normalized.length - 1) return 'unknown';
  return normalized.slice(atIndex + 1);
};

export const resolveDeliverabilityAlertLevel = (input: {
  bounceRatePercent: number;
  failureRatePercent: number;
  queuedCount?: number;
  oldestQueuedAgeMinutes?: number | null;
}): FilemakerEmailCampaignDeliverabilityHealthLevel => {
  if (input.bounceRatePercent >= 8 || input.failureRatePercent >= 12) {
    return 'critical';
  }
  if ((input.queuedCount ?? 0) > 0 && (input.oldestQueuedAgeMinutes ?? 0) >= 120) {
    return 'critical';
  }
  if (input.bounceRatePercent >= 3 || input.failureRatePercent >= 5) {
    return 'warning';
  }
  if ((input.queuedCount ?? 0) > 0 && (input.oldestQueuedAgeMinutes ?? 0) >= 30) {
    return 'warning';
  }
  return 'healthy';
};

export const mapDeliveryStatusToActivityType = (
  status: FilemakerEmailCampaignDelivery['status']
): FilemakerEmailCampaignRecipientActivityType | null => {
  if (status === 'sent') return 'delivery_sent';
  if (status === 'failed') return 'delivery_failed';
  if (status === 'bounced') return 'delivery_bounced';
  return null;
};

export const isRecipientActivityType = (
  type: FilemakerEmailCampaignEvent['type']
): type is
  | 'delivery_sent'
  | 'delivery_failed'
  | 'delivery_bounced'
  | 'opened'
  | 'clicked'
  | 'unsubscribed'
  | 'resubscribed' =>
  type === 'delivery_sent' ||
  type === 'delivery_failed' ||
  type === 'delivery_bounced' ||
  type === 'opened' ||
  type === 'clicked' ||
  type === 'unsubscribed' ||
  type === 'resubscribed';

export const summarizeFilemakerEmailCampaignRunDeliveries = (
  deliveries: FilemakerEmailCampaignDelivery[]
): FilemakerEmailCampaignRunMetrics => ({
  recipientCount: deliveries.length,
  deliveredCount: deliveries.filter((delivery) => delivery.status === 'sent').length,
  failedCount: deliveries.filter(
    (delivery) => delivery.status === 'failed' || delivery.status === 'bounced'
  ).length,
  skippedCount: deliveries.filter((delivery) => delivery.status === 'skipped').length,
});

export const resolveFilemakerEmailCampaignRunStatusFromDeliveries = (input: {
  currentStatus: FilemakerEmailCampaignRunStatus;
  deliveries: FilemakerEmailCampaignDelivery[];
}): FilemakerEmailCampaignRunStatus => {
  const metrics = summarizeFilemakerEmailCampaignRunDeliveries(input.deliveries);
  const queuedCount =
    metrics.recipientCount - metrics.deliveredCount - metrics.failedCount - metrics.skippedCount;
  const processedCount = metrics.deliveredCount + metrics.failedCount + metrics.skippedCount;

  if (metrics.recipientCount === 0) {
    return input.currentStatus;
  }
  if (queuedCount > 0) {
    if (processedCount > 0) return 'running';
    if (input.currentStatus === 'pending') return 'pending';
    return 'queued';
  }
  if (metrics.deliveredCount === 0 && metrics.failedCount === 0 && metrics.skippedCount > 0) {
    return 'cancelled';
  }
  if (metrics.deliveredCount === 0 && metrics.failedCount > 0 && metrics.skippedCount === 0) {
    return 'failed';
  }
  return 'completed';
};

export const syncFilemakerEmailCampaignRunWithDeliveries = (input: {
  run: FilemakerEmailCampaignRun;
  deliveries: FilemakerEmailCampaignDelivery[];
  status?: FilemakerEmailCampaignRunStatus;
}): FilemakerEmailCampaignRun => {
  const metrics = summarizeFilemakerEmailCampaignRunDeliveries(input.deliveries);
  const now = new Date().toISOString();
  const nextStatus =
    input.status ??
    resolveFilemakerEmailCampaignRunStatusFromDeliveries({
      currentStatus: input.run.status,
      deliveries: input.deliveries,
    });
  return createFilemakerEmailCampaignRun({
    ...input.run,
    campaignId: input.run.campaignId,
    status: nextStatus,
    recipientCount: metrics.recipientCount,
    deliveredCount: metrics.deliveredCount,
    failedCount: metrics.failedCount,
    skippedCount: metrics.skippedCount,
    startedAt:
      nextStatus === 'running'
        ? input.run.startedAt ?? now
        : input.run.startedAt ?? null,
    completedAt:
      nextStatus === 'completed' || nextStatus === 'failed' || nextStatus === 'cancelled'
        ? now
        : input.run.completedAt ?? null,
    updatedAt: now,
  });
};

export const matchesPartyReferenceFilter = (
  references: FilemakerPartyReference[],
  partyKind: FilemakerPartyKind,
  partyId: string
): boolean =>
  references.some(
    (reference: FilemakerPartyReference): boolean =>
      reference.kind === partyKind && reference.id === partyId
  );

export const matchesLocationFilter = (
  values: string[],
  candidate: string
): boolean => {
  if (values.length === 0) return true;
  const normalizedCandidate = normalizeString(candidate).toLowerCase();
  if (!normalizedCandidate) return false;
  return values.some((value: string): boolean => value.trim().toLowerCase() === normalizedCandidate);
};

export const resolveFilemakerEmailCampaignAudiencePreview = (
  database: FilemakerDatabase,
  audience: FilemakerEmailCampaignAudienceRule,
  suppressionRegistry?: FilemakerEmailCampaignSuppressionRegistry | null
): FilemakerEmailCampaignAudiencePreview => {
  const normalizedAudience = normalizeCampaignAudienceRule(audience);
  const normalizedSuppressionRegistry = normalizeFilemakerEmailCampaignSuppressionRegistry(
    suppressionRegistry
  );
  const recipients: FilemakerEmailCampaignAudienceRecipient[] = [];
  let excludedCount = 0;
  let suppressedCount = 0;
  let totalLinkedEmailCount = 0;
  const organizationsByEventId = new Map<string, Set<string>>();

  normalizedAudience.eventIds.forEach((eventId: string): void => {
    organizationsByEventId.set(
      eventId,
      new Set(getFilemakerOrganizationsForEvent(database, eventId).map((entry) => entry.id))
    );
  });

  database.emailLinks.forEach((link): void => {
    totalLinkedEmailCount += 1;
    const email = getFilemakerEmailById(database, link.emailId);
    if (!email) {
      excludedCount += 1;
      return;
    }
    if (!normalizedAudience.partyKinds.includes(link.partyKind)) {
      excludedCount += 1;
      return;
    }
    if (!normalizedAudience.emailStatuses.includes(email.status)) {
      excludedCount += 1;
      return;
    }
    if (getFilemakerEmailCampaignSuppressionByAddress(normalizedSuppressionRegistry, email.email)) {
      excludedCount += 1;
      suppressedCount += 1;
      return;
    }
    if (
      normalizedAudience.includePartyReferences.length > 0 &&
      !matchesPartyReferenceFilter(
        normalizedAudience.includePartyReferences,
        link.partyKind,
        link.partyId
      )
    ) {
      excludedCount += 1;
      return;
    }
    if (
      matchesPartyReferenceFilter(
        normalizedAudience.excludePartyReferences,
        link.partyKind,
        link.partyId
      )
    ) {
      excludedCount += 1;
      return;
    }

    const person =
      link.partyKind === 'person' ? getFilemakerPersonById(database, link.partyId) : null;
    const organization =
      link.partyKind === 'organization'
        ? getFilemakerOrganizationById(database, link.partyId)
        : null;
    const party = person ?? organization;
    if (!party) {
      excludedCount += 1;
      return;
    }

    if (
      normalizedAudience.organizationIds.length > 0 &&
      (link.partyKind !== 'organization' ||
        !normalizedAudience.organizationIds.includes(link.partyId))
    ) {
      excludedCount += 1;
      return;
    }

    const matchedEventIds =
      normalizedAudience.eventIds.length === 0
        ? []
        : normalizedAudience.eventIds.filter((eventId: string): boolean =>
            organizationsByEventId.get(eventId)?.has(link.partyId) ?? false
          );

    if (normalizedAudience.eventIds.length > 0 && matchedEventIds.length === 0) {
      excludedCount += 1;
      return;
    }

    if (!matchesLocationFilter(normalizedAudience.countries, party.country)) {
      excludedCount += 1;
      return;
    }
    if (!matchesLocationFilter(normalizedAudience.cities, party.city)) {
      excludedCount += 1;
      return;
    }

    recipients.push({
      emailId: email.id,
      email: email.email,
      emailStatus: email.status,
      partyKind: link.partyKind,
      partyId: link.partyId,
      partyName:
        link.partyKind === 'person'
          ? [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim() || link.partyId
          : organization?.name || link.partyId,
      city: party.city,
      country: party.country,
      matchedEventIds,
    });
  });

  const dedupedRecipients =
    normalizedAudience.dedupeByEmail
      ? Array.from(
          recipients.reduce<Map<string, FilemakerEmailCampaignAudienceRecipient>>((map, entry) => {
            const key = entry.email.trim().toLowerCase();
            if (!map.has(key)) {
              map.set(key, entry);
            }
            return map;
          }, new Map())
        ).map(([, value]) => value)
      : recipients;
  const limitedRecipients =
    normalizedAudience.limit && normalizedAudience.limit > 0
      ? dedupedRecipients.slice(0, normalizedAudience.limit)
      : dedupedRecipients;

  return {
    recipients: limitedRecipients,
    excludedCount,
    suppressedCount,
    dedupedCount: recipients.length - dedupedRecipients.length,
    totalLinkedEmailCount,
    sampleRecipients: limitedRecipients.slice(0, 8),
  };
};

export const summarizeFilemakerEmailCampaignRecipientActivity = (input: {
  emailAddress: string;
  campaignId?: string | null;
  campaignRegistry: FilemakerEmailCampaignRegistry;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  eventRegistry?: FilemakerEmailCampaignEventRegistry | null;
}): FilemakerEmailCampaignRecipientActivitySummary => {
  const normalizedEmailAddress = normalizeString(input.emailAddress).toLowerCase();
  const normalizedCampaignId = normalizeString(input.campaignId) || null;
  const campaignName =
    normalizedCampaignId
      ? input.campaignRegistry.campaigns.find(
          (campaign: FilemakerEmailCampaign): boolean => campaign.id === normalizedCampaignId
        )?.name ?? null
      : null;

  const deliveries = normalizeFilemakerEmailCampaignDeliveryRegistry(input.deliveryRegistry).deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean =>
      delivery.emailAddress === normalizedEmailAddress &&
      (!normalizedCampaignId || delivery.campaignId === normalizedCampaignId)
  );
  const deliveryIds = new Set(deliveries.map((delivery: FilemakerEmailCampaignDelivery) => delivery.id));
  const deliveryEventRegistry = normalizeFilemakerEmailCampaignEventRegistry(input.eventRegistry);
  const activityEvents = deliveryEventRegistry.events.filter(
    (
      event: FilemakerEmailCampaignEvent
    ): event is FilemakerEmailCampaignEvent & {
      type: FilemakerEmailCampaignRecipientActivityType;
    } => {
      if (!isRecipientActivityType(event.type)) return false;
      if (normalizedCampaignId && event.campaignId !== normalizedCampaignId) return false;
      if (event.deliveryId && deliveryIds.has(event.deliveryId)) return true;
      if (event.message.toLowerCase().includes(normalizedEmailAddress)) return true;
      return false;
    }
  );
  const campaignNameById = new Map(
    input.campaignRegistry.campaigns.map((campaign: FilemakerEmailCampaign) => [campaign.id, campaign.name])
  );

  const eventActivity = activityEvents.map(
    (
      event: FilemakerEmailCampaignEvent & {
        type: FilemakerEmailCampaignRecipientActivityType;
      }
    ): FilemakerEmailCampaignRecipientActivityItem => ({
      id: event.id,
      type: event.type,
      campaignId: event.campaignId ?? null,
      campaignName: campaignNameById.get(event.campaignId) ?? null,
      runId: event.runId ?? null,
      deliveryId: event.deliveryId ?? null,
      createdAt: event.createdAt ?? null,
      message: event.message,
      targetUrl: event.targetUrl ?? null,
    })
  );

  const fallbackDeliveryActivity = deliveries.flatMap(
    (delivery: FilemakerEmailCampaignDelivery): FilemakerEmailCampaignRecipientActivityItem[] => {
      const type = mapDeliveryStatusToActivityType(delivery.status);
      if (!type) return [];
      const alreadyTracked = activityEvents.some(
        (event: FilemakerEmailCampaignEvent): boolean =>
          event.deliveryId === delivery.id && event.type === type
      );
      if (alreadyTracked) return [];

      const message =
        type === 'delivery_sent'
          ? `${delivery.emailAddress} received a campaign delivery.`
          : type === 'delivery_bounced'
            ? delivery.lastError?.trim() || delivery.providerMessage?.trim() || `${delivery.emailAddress} delivery bounced.`
            : delivery.lastError?.trim() || delivery.providerMessage?.trim() || `${delivery.emailAddress} delivery failed.`;

      return [
        {
          id: `recipient-activity-${delivery.id}-${type}`,
          type,
          campaignId: delivery.campaignId,
          campaignName: campaignNameById.get(delivery.campaignId) ?? null,
          runId: delivery.runId,
          deliveryId: delivery.id,
          createdAt: delivery.sentAt ?? delivery.updatedAt ?? delivery.createdAt ?? null,
          message,
          targetUrl: null,
        },
      ];
    }
  );

  return {
    emailAddress: normalizedEmailAddress,
    campaignId: normalizedCampaignId,
    campaignName,
    deliveryCount: deliveries.length,
    sentCount: deliveries.filter((delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'sent')
      .length,
    failedCount: deliveries.filter((delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'failed')
      .length,
    bouncedCount: deliveries.filter((delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'bounced')
      .length,
    skippedCount: deliveries.filter((delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'skipped')
      .length,
    openCount: activityEvents.filter((event: FilemakerEmailCampaignEvent): boolean => event.type === 'opened')
      .length,
    clickCount: activityEvents.filter((event: FilemakerEmailCampaignEvent): boolean => event.type === 'clicked')
      .length,
    unsubscribeCount: activityEvents.filter(
      (event: FilemakerEmailCampaignEvent): boolean => event.type === 'unsubscribed'
    ).length,
    resubscribeCount: activityEvents.filter(
      (event: FilemakerEmailCampaignEvent): boolean => event.type === 'resubscribed'
    ).length,
    latestSentAt: toSortedLatestTimestamp(
      deliveries
        .filter((delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'sent')
        .map((delivery: FilemakerEmailCampaignDelivery) => delivery.sentAt ?? delivery.updatedAt ?? null)
    ),
    latestOpenAt: toSortedLatestTimestamp(
      activityEvents
        .filter((event: FilemakerEmailCampaignEvent): boolean => event.type === 'opened')
        .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
    ),
    latestClickAt: toSortedLatestTimestamp(
      activityEvents
        .filter((event: FilemakerEmailCampaignEvent): boolean => event.type === 'clicked')
        .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
    ),
    latestUnsubscribeAt: toSortedLatestTimestamp(
      activityEvents
        .filter((event: FilemakerEmailCampaignEvent): boolean => event.type === 'unsubscribed')
        .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
    ),
    latestResubscribeAt: toSortedLatestTimestamp(
      activityEvents
        .filter((event: FilemakerEmailCampaignEvent): boolean => event.type === 'resubscribed')
        .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
    ),
    recentActivity: eventActivity
      .concat(fallbackDeliveryActivity)
      .sort(
        (
          left: FilemakerEmailCampaignRecipientActivityItem,
          right: FilemakerEmailCampaignRecipientActivityItem
        ): number => Date.parse(right.createdAt ?? '') - Date.parse(left.createdAt ?? '')
      )
      .slice(0, 8),
  };
};

export const summarizeFilemakerEmailCampaignAnalytics = (input: {
  campaign: FilemakerEmailCampaign;
  database: FilemakerDatabase;
  runRegistry: FilemakerEmailCampaignRunRegistry;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  eventRegistry?: FilemakerEmailCampaignEventRegistry | null;
  suppressionRegistry?: FilemakerEmailCampaignSuppressionRegistry | null;
}): FilemakerEmailCampaignAnalytics => {
  const runs = input.runRegistry.runs.filter(
    (run: FilemakerEmailCampaignRun): boolean => run.campaignId === input.campaign.id
  );
  const campaignEvents = normalizeFilemakerEmailCampaignEventRegistry(
    input.eventRegistry
  ).events.filter((event: FilemakerEmailCampaignEvent): boolean => event.campaignId === input.campaign.id);
  const preview = resolveFilemakerEmailCampaignAudiencePreview(
    input.database,
    input.campaign.audience,
    input.suppressionRegistry
  );
  const unsubscribeEvents = campaignEvents.filter(
    (event: FilemakerEmailCampaignEvent): boolean => event.type === 'unsubscribed'
  );
  const resubscribeEvents = campaignEvents.filter(
    (event: FilemakerEmailCampaignEvent): boolean => event.type === 'resubscribed'
  );
  const openEvents = campaignEvents.filter(
    (event: FilemakerEmailCampaignEvent): boolean => event.type === 'opened'
  );
  const clickEvents = campaignEvents.filter(
    (event: FilemakerEmailCampaignEvent): boolean => event.type === 'clicked'
  );
  const uniqueOpenCount = summarizeUniqueDeliveryEventCount(openEvents);
  const uniqueClickCount = summarizeUniqueDeliveryEventCount(clickEvents);
  const rawTopClickedLinks = Array.from(
    clickEvents.reduce<
      Map<
        string,
        {
          targetUrl: string;
          clickCount: number;
          deliveryIds: Set<string>;
          latestClickAt: string | null;
        }
      >
    >((map, event) => {
      const targetUrl = normalizeString(event.targetUrl);
      if (!targetUrl) return map;
      const existing = map.get(targetUrl) ?? {
        targetUrl,
        clickCount: 0,
        deliveryIds: new Set<string>(),
        latestClickAt: null,
      };
      existing.clickCount += 1;
      if (event.deliveryId) {
        existing.deliveryIds.add(event.deliveryId);
      }
      const eventAt = event.createdAt ?? null;
      if (
        eventAt &&
        (!existing.latestClickAt || Date.parse(eventAt) > Date.parse(existing.latestClickAt))
      ) {
        existing.latestClickAt = eventAt;
      }
      map.set(targetUrl, existing);
      return map;
    }, new Map())
  )
    .map(([, entry]) => ({
      targetUrl: entry.targetUrl,
      clickCount: entry.clickCount,
      uniqueDeliveryCount: entry.deliveryIds.size > 0 ? entry.deliveryIds.size : entry.clickCount,
      latestClickAt: entry.latestClickAt,
    }))
    .sort((left, right) => {
      if (right.clickCount !== left.clickCount) {
        return right.clickCount - left.clickCount;
      }
      return Date.parse(right.latestClickAt ?? '') - Date.parse(left.latestClickAt ?? '');
    })
    .slice(0, 5);

  const deliveryTotals = runs.reduce(
    (
      totals: {
        totalRecipients: number;
        sentCount: number;
        failedCount: number;
        bouncedCount: number;
        skippedCount: number;
        queuedCount: number;
      },
      run: FilemakerEmailCampaignRun
    ) => {
      const deliveries = getFilemakerEmailCampaignDeliveriesForRun(input.deliveryRegistry, run.id);
      if (deliveries.length === 0) {
        const queuedCount = Math.max(
          0,
          run.recipientCount - run.deliveredCount - run.failedCount - run.skippedCount
        );
        totals.totalRecipients += run.recipientCount;
        totals.sentCount += run.deliveredCount;
        totals.failedCount += run.failedCount;
        totals.skippedCount += run.skippedCount;
        totals.queuedCount += queuedCount;
        return totals;
      }

      totals.totalRecipients += deliveries.length;
      deliveries.forEach((delivery: FilemakerEmailCampaignDelivery): void => {
        if (delivery.status === 'sent') {
          totals.sentCount += 1;
          return;
        }
        if (delivery.status === 'failed') {
          totals.failedCount += 1;
          return;
        }
        if (delivery.status === 'bounced') {
          totals.bouncedCount += 1;
          return;
        }
        if (delivery.status === 'skipped') {
          totals.skippedCount += 1;
          return;
        }
        if (delivery.status === 'queued') {
          totals.queuedCount += 1;
        }
      });
      return totals;
    },
    {
      totalRecipients: 0,
      sentCount: 0,
      failedCount: 0,
      bouncedCount: 0,
      skippedCount: 0,
      queuedCount: 0,
    }
  );

  const processedCount =
    deliveryTotals.sentCount +
    deliveryTotals.failedCount +
    deliveryTotals.bouncedCount +
    deliveryTotals.skippedCount;
  const topClickedLinks = rawTopClickedLinks.map(
    (entry): FilemakerEmailCampaignLinkPerformance => ({
      ...entry,
      clickRatePercent: roundPercentage(entry.uniqueDeliveryCount, deliveryTotals.sentCount),
    })
  );

  const latestRun =
    [...runs].sort(
      (left: FilemakerEmailCampaignRun, right: FilemakerEmailCampaignRun): number =>
        Date.parse(right.createdAt ?? '') - Date.parse(left.createdAt ?? '')
    )[0] ?? null;

  const latestActivitySource = [
    latestRun?.updatedAt ?? latestRun?.createdAt ?? null,
    ...campaignEvents.map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null),
  ]
    .filter((value: string | null): value is string => Boolean(value))
    .sort((left: string, right: string): number => Date.parse(right) - Date.parse(left));
  const latestUnsubscribeAt =
    unsubscribeEvents
      .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
      .filter((value: string | null): value is string => Boolean(value))
      .sort((left: string, right: string): number => Date.parse(right) - Date.parse(left))[0] ??
    null;
  const latestResubscribeAt =
    resubscribeEvents
      .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
      .filter((value: string | null): value is string => Boolean(value))
      .sort((left: string, right: string): number => Date.parse(right) - Date.parse(left))[0] ??
    null;
  const latestOpenAt =
    openEvents
      .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
      .filter((value: string | null): value is string => Boolean(value))
      .sort((left: string, right: string): number => Date.parse(right) - Date.parse(left))[0] ??
    null;
  const latestClickAt =
    clickEvents
      .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
      .filter((value: string | null): value is string => Boolean(value))
      .sort((left: string, right: string): number => Date.parse(right) - Date.parse(left))[0] ??
    null;

  const netUnsubscribeCount = Math.max(unsubscribeEvents.length - resubscribeEvents.length, 0);

  return {
    totalRuns: runs.length,
    liveRunCount: runs.filter((run: FilemakerEmailCampaignRun): boolean => run.mode === 'live')
      .length,
    dryRunCount: runs.filter((run: FilemakerEmailCampaignRun): boolean => run.mode === 'dry_run')
      .length,
    totalRecipients: deliveryTotals.totalRecipients,
    processedCount,
    queuedCount: deliveryTotals.queuedCount,
    sentCount: deliveryTotals.sentCount,
    failedCount: deliveryTotals.failedCount,
    bouncedCount: deliveryTotals.bouncedCount,
    skippedCount: deliveryTotals.skippedCount,
    completionRatePercent: roundPercentage(processedCount, deliveryTotals.totalRecipients),
    deliveryRatePercent: roundPercentage(deliveryTotals.sentCount, deliveryTotals.totalRecipients),
    failureRatePercent: roundPercentage(
      deliveryTotals.failedCount + deliveryTotals.bouncedCount,
      deliveryTotals.totalRecipients
    ),
    bounceRatePercent: roundPercentage(
      deliveryTotals.bouncedCount,
      deliveryTotals.totalRecipients
    ),
    suppressionImpactCount: preview.suppressedCount,
    openCount: openEvents.length,
    openRatePercent: roundPercentage(openEvents.length, deliveryTotals.sentCount),
    uniqueOpenCount,
    uniqueOpenRatePercent: roundPercentage(uniqueOpenCount, deliveryTotals.sentCount),
    clickCount: clickEvents.length,
    clickRatePercent: roundPercentage(clickEvents.length, deliveryTotals.sentCount),
    uniqueClickCount,
    uniqueClickRatePercent: roundPercentage(uniqueClickCount, deliveryTotals.sentCount),
    unsubscribeCount: unsubscribeEvents.length,
    unsubscribeRatePercent: roundPercentage(unsubscribeEvents.length, deliveryTotals.sentCount),
    resubscribeCount: resubscribeEvents.length,
    resubscribeRatePercent: roundPercentage(resubscribeEvents.length, deliveryTotals.sentCount),
    netUnsubscribeCount,
    netUnsubscribeRatePercent: roundPercentage(netUnsubscribeCount, deliveryTotals.sentCount),
    latestRunStatus: latestRun?.status ?? null,
    latestRunAt: latestRun?.createdAt ?? null,
    latestActivityAt: latestActivitySource[0] ?? null,
    latestOpenAt,
    latestClickAt,
    latestUnsubscribeAt,
    latestResubscribeAt,
    topClickedLinks,
    eventCount: campaignEvents.length,
  };
};

export const summarizeFilemakerEmailCampaignDeliverabilityOverview = (input: {
  database: FilemakerDatabase;
  campaignRegistry: FilemakerEmailCampaignRegistry;
  runRegistry: FilemakerEmailCampaignRunRegistry;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  attemptRegistry?: FilemakerEmailCampaignDeliveryAttemptRegistry | null;
  eventRegistry?: FilemakerEmailCampaignEventRegistry | null;
  suppressionRegistry?: FilemakerEmailCampaignSuppressionRegistry | null;
  now?: Date;
}): FilemakerEmailCampaignDeliverabilityOverview => {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const deliveryRegistry = normalizeFilemakerEmailCampaignDeliveryRegistry(input.deliveryRegistry);
  const attemptRegistry = normalizeFilemakerEmailCampaignDeliveryAttemptRegistry(
    input.attemptRegistry
  );
  const suppressionRegistry = normalizeFilemakerEmailCampaignSuppressionRegistry(
    input.suppressionRegistry
  );
  const campaignHealthBase = input.campaignRegistry.campaigns
    .map((campaign): FilemakerEmailCampaignDeliverabilityCampaignHealth => {
      const analytics = summarizeFilemakerEmailCampaignAnalytics({
        campaign,
        database: input.database,
        runRegistry: input.runRegistry,
        deliveryRegistry,
        eventRegistry: input.eventRegistry,
        suppressionRegistry,
      });
      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        status: campaign.status,
        latestRunStatus: analytics.latestRunStatus,
        latestRunAt: analytics.latestRunAt,
        totalRecipients: analytics.totalRecipients,
        sentCount: analytics.sentCount,
        failedCount: analytics.failedCount,
        bouncedCount: analytics.bouncedCount,
        queuedCount: analytics.queuedCount,
        skippedCount: analytics.skippedCount,
        pendingRetryCount: 0,
        overdueRetryCount: 0,
        deliveryRatePercent: analytics.deliveryRatePercent,
        failureRatePercent: analytics.failureRatePercent,
        bounceRatePercent: analytics.bounceRatePercent,
        suppressionImpactCount: analytics.suppressionImpactCount,
        nextScheduledRetryAt: null,
        oldestOverdueRetryAt: null,
        alertLevel: resolveDeliverabilityAlertLevel({
          bounceRatePercent: analytics.bounceRatePercent,
          failureRatePercent: analytics.failureRatePercent,
          queuedCount: analytics.queuedCount,
        }),
      };
    })
    .sort((left, right) => {
      const score = (value: FilemakerEmailCampaignDeliverabilityHealthLevel): number =>
        value === 'critical' ? 2 : value === 'warning' ? 1 : 0;
      const levelDelta = score(right.alertLevel) - score(left.alertLevel);
      if (levelDelta !== 0) return levelDelta;
      if (right.bounceRatePercent !== left.bounceRatePercent) {
        return right.bounceRatePercent - left.bounceRatePercent;
      }
      if (right.overdueRetryCount !== left.overdueRetryCount) {
        return right.overdueRetryCount - left.overdueRetryCount;
      }
      if (right.failureRatePercent !== left.failureRatePercent) {
        return right.failureRatePercent - left.failureRatePercent;
      }
      return Date.parse(right.latestRunAt ?? '') - Date.parse(left.latestRunAt ?? '');
    });

  const suppressionCountByDomain = suppressionRegistry.entries.reduce<Map<string, number>>(
    (map, entry) => {
      const domain = resolveEmailDomain(entry.emailAddress);
      map.set(domain, (map.get(domain) ?? 0) + 1);
      return map;
    },
    new Map()
  );

  const domainHealthBase = Array.from(
    deliveryRegistry.deliveries.reduce<
      Map<
        string,
        {
          domain: string;
          totalDeliveries: number;
          sentCount: number;
          failedCount: number;
          bouncedCount: number;
          queuedCount: number;
          skippedCount: number;
          latestDeliveryAt: string | null;
        }
      >
    >((map, delivery) => {
      const domain = resolveEmailDomain(delivery.emailAddress);
      const existing = map.get(domain) ?? {
        domain,
        totalDeliveries: 0,
        sentCount: 0,
        failedCount: 0,
        bouncedCount: 0,
        queuedCount: 0,
        skippedCount: 0,
        latestDeliveryAt: null,
      };
      existing.totalDeliveries += 1;
      if (delivery.status === 'sent') existing.sentCount += 1;
      if (delivery.status === 'failed') existing.failedCount += 1;
      if (delivery.status === 'bounced') existing.bouncedCount += 1;
      if (delivery.status === 'queued') existing.queuedCount += 1;
      if (delivery.status === 'skipped') existing.skippedCount += 1;
      const deliveryTimestamp =
        delivery.sentAt ?? delivery.updatedAt ?? delivery.createdAt ?? null;
      if (
        deliveryTimestamp &&
        (!existing.latestDeliveryAt ||
          Date.parse(deliveryTimestamp) > Date.parse(existing.latestDeliveryAt))
      ) {
        existing.latestDeliveryAt = deliveryTimestamp;
      }
      map.set(domain, existing);
      return map;
    }, new Map())
  )
    .map(([, entry]): FilemakerEmailCampaignDomainDeliverability => {
      const failureCount = entry.failedCount + entry.bouncedCount;
      const bounceRatePercent = roundPercentage(entry.bouncedCount, entry.totalDeliveries);
      const failureRatePercent = roundPercentage(failureCount, entry.totalDeliveries);
      const oldestQueuedAgeMinutes =
        entry.queuedCount > 0 && entry.latestDeliveryAt
          ? Math.max(0, Math.round((nowMs - Date.parse(entry.latestDeliveryAt)) / 60_000))
          : null;
      return {
        domain: entry.domain,
        totalDeliveries: entry.totalDeliveries,
        sentCount: entry.sentCount,
        failedCount: entry.failedCount,
        bouncedCount: entry.bouncedCount,
        queuedCount: entry.queuedCount,
        skippedCount: entry.skippedCount,
        pendingRetryCount: 0,
        overdueRetryCount: 0,
        suppressionCount: suppressionCountByDomain.get(entry.domain) ?? 0,
        deliveryRatePercent: roundPercentage(entry.sentCount, entry.totalDeliveries),
        failureRatePercent,
        bounceRatePercent,
        latestDeliveryAt: entry.latestDeliveryAt,
        nextScheduledRetryAt: null,
        oldestOverdueRetryAt: null,
        alertLevel:
          entry.totalDeliveries >= 3
            ? resolveDeliverabilityAlertLevel({
                bounceRatePercent,
                failureRatePercent,
                queuedCount: entry.queuedCount,
                oldestQueuedAgeMinutes,
              })
            : 'healthy',
      };
    })
    .sort((left, right) => {
      const score = (value: FilemakerEmailCampaignDeliverabilityHealthLevel): number =>
        value === 'critical' ? 2 : value === 'warning' ? 1 : 0;
      const levelDelta = score(right.alertLevel) - score(left.alertLevel);
      if (levelDelta !== 0) return levelDelta;
      if (right.bounceRatePercent !== left.bounceRatePercent) {
        return right.bounceRatePercent - left.bounceRatePercent;
      }
      if (right.overdueRetryCount !== left.overdueRetryCount) {
        return right.overdueRetryCount - left.overdueRetryCount;
      }
      if (right.totalDeliveries !== left.totalDeliveries) {
        return right.totalDeliveries - left.totalDeliveries;
      }
      return left.domain.localeCompare(right.domain);
    });

  const totalRecipients = deliveryRegistry.deliveries.length;
  const acceptedCount = deliveryRegistry.deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'sent'
  ).length;
  const failedCount = deliveryRegistry.deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'failed'
  ).length;
  const bouncedCount = deliveryRegistry.deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'bounced'
  ).length;
  const queuedDeliveries = deliveryRegistry.deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'queued'
  );
  const queuedCount = queuedDeliveries.length;
  const skippedCount = deliveryRegistry.deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'skipped'
  ).length;
  const processedCount = acceptedCount + failedCount + bouncedCount + skippedCount;
  const totalAttempts = attemptRegistry.attempts.length;
  const latestDeliveryAt = toSortedLatestTimestamp(
    deliveryRegistry.deliveries.map(
      (delivery: FilemakerEmailCampaignDelivery) =>
        delivery.sentAt ?? delivery.updatedAt ?? delivery.createdAt ?? null
    )
  );
  const oldestQueuedAt = toSortedOldestTimestamp(
    queuedDeliveries.map(
      (delivery: FilemakerEmailCampaignDelivery) =>
        delivery.createdAt ?? delivery.updatedAt ?? delivery.sentAt ?? null
    )
  );
  const oldestQueuedAgeMinutes =
    oldestQueuedAt && Number.isFinite(Date.parse(oldestQueuedAt))
      ? Math.max(0, Math.round((nowMs - Date.parse(oldestQueuedAt)) / 60_000))
      : null;

  const campaignNameById = new Map(
    input.campaignRegistry.campaigns.map((campaign: FilemakerEmailCampaign) => [campaign.id, campaign.name])
  );
  const recentDeliveryIssues = [...deliveryRegistry.deliveries]
    .filter(
      (
        delivery: FilemakerEmailCampaignDelivery
      ): delivery is FilemakerEmailCampaignDelivery & {
        status: 'failed' | 'bounced';
      } => delivery.status === 'failed' || delivery.status === 'bounced'
    )
    .sort((left, right) => {
      const leftTime = Date.parse(left.updatedAt ?? left.createdAt ?? '');
      const rightTime = Date.parse(right.updatedAt ?? right.createdAt ?? '');
      return rightTime - leftTime;
    })
    .slice(0, 10)
    .map((delivery): FilemakerEmailCampaignRecentDeliveryIssue => ({
      deliveryId: delivery.id,
      campaignId: delivery.campaignId,
      campaignName: campaignNameById.get(delivery.campaignId) ?? null,
      runId: delivery.runId,
      emailAddress: delivery.emailAddress,
      domain: resolveEmailDomain(delivery.emailAddress),
      status: delivery.status,
      provider: delivery.provider ?? null,
      failureCategory: delivery.failureCategory ?? null,
      message:
        delivery.lastError?.trim() ||
        delivery.providerMessage?.trim() ||
        (delivery.status === 'bounced'
          ? `${delivery.emailAddress} bounced.`
          : `${delivery.emailAddress} failed.`),
      updatedAt: delivery.updatedAt ?? delivery.createdAt ?? null,
    }));

  const attemptCountsByDeliveryId = attemptRegistry.attempts.reduce<Map<string, number>>(
    (map, attempt) => {
      map.set(attempt.deliveryId, (map.get(attempt.deliveryId) ?? 0) + 1);
      return map;
    },
    new Map()
  );
  const retrySummary = resolveFilemakerEmailCampaignRetryableDeliveries({
    deliveries: deliveryRegistry.deliveries,
    attemptRegistry,
    maxAttempts: FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS,
  });
  const scheduledRetries = deliveryRegistry.deliveries
    .filter(
      (
        delivery: FilemakerEmailCampaignDelivery
      ): delivery is FilemakerEmailCampaignDelivery & {
        status: 'failed' | 'bounced';
        nextRetryAt: string;
      } =>
        (delivery.status === 'failed' || delivery.status === 'bounced') &&
        typeof delivery.nextRetryAt === 'string' &&
        delivery.nextRetryAt.trim().length > 0
    )
    .sort((left, right) => Date.parse(left.nextRetryAt) - Date.parse(right.nextRetryAt))
    .map((delivery): FilemakerEmailCampaignScheduledRetryItem => ({
      deliveryId: delivery.id,
      campaignId: delivery.campaignId,
      campaignName: campaignNameById.get(delivery.campaignId) ?? null,
      runId: delivery.runId,
      emailAddress: delivery.emailAddress,
      domain: resolveEmailDomain(delivery.emailAddress),
      status: delivery.status,
      failureCategory: delivery.failureCategory ?? null,
      attemptCount: attemptCountsByDeliveryId.get(delivery.id) ?? 0,
      nextRetryAt: delivery.nextRetryAt,
    }));
  const scheduledRetryCountByCampaign = scheduledRetries.reduce<Map<string, number>>((map, retry) => {
    map.set(retry.campaignId, (map.get(retry.campaignId) ?? 0) + 1);
    return map;
  }, new Map());
  const overdueRetryCountByCampaign = scheduledRetries.reduce<Map<string, number>>((map, retry) => {
    if (Date.parse(retry.nextRetryAt) > nowMs) return map;
    map.set(retry.campaignId, (map.get(retry.campaignId) ?? 0) + 1);
    return map;
  }, new Map());
  const oldestOverdueRetryAtByCampaign = scheduledRetries.reduce<Map<string, string>>((map, retry) => {
    if (Date.parse(retry.nextRetryAt) > nowMs) return map;
    const existing = map.get(retry.campaignId);
    if (!existing || Date.parse(retry.nextRetryAt) < Date.parse(existing)) {
      map.set(retry.campaignId, retry.nextRetryAt);
    }
    return map;
  }, new Map());
  const scheduledRetryNextAtByCampaign = scheduledRetries.reduce<Map<string, string>>((map, retry) => {
    const existing = map.get(retry.campaignId);
    if (!existing || Date.parse(retry.nextRetryAt) < Date.parse(existing)) {
      map.set(retry.campaignId, retry.nextRetryAt);
    }
    return map;
  }, new Map());
  const scheduledRetryCountByDomain = scheduledRetries.reduce<Map<string, number>>((map, retry) => {
    map.set(retry.domain, (map.get(retry.domain) ?? 0) + 1);
    return map;
  }, new Map());
  const overdueRetryCountByDomain = scheduledRetries.reduce<Map<string, number>>((map, retry) => {
    if (Date.parse(retry.nextRetryAt) > nowMs) return map;
    map.set(retry.domain, (map.get(retry.domain) ?? 0) + 1);
    return map;
  }, new Map());
  const oldestOverdueRetryAtByDomain = scheduledRetries.reduce<Map<string, string>>((map, retry) => {
    if (Date.parse(retry.nextRetryAt) > nowMs) return map;
    const existing = map.get(retry.domain);
    if (!existing || Date.parse(retry.nextRetryAt) < Date.parse(existing)) {
      map.set(retry.domain, retry.nextRetryAt);
    }
    return map;
  }, new Map());
  const scheduledRetryNextAtByDomain = scheduledRetries.reduce<Map<string, string>>((map, retry) => {
    const existing = map.get(retry.domain);
    if (!existing || Date.parse(retry.nextRetryAt) < Date.parse(existing)) {
      map.set(retry.domain, retry.nextRetryAt);
    }
    return map;
  }, new Map());
  const overdueRetryCount = scheduledRetries.filter(
    (retry) => Date.parse(retry.nextRetryAt) <= nowMs
  ).length;
  const oldestOverdueRetryAt =
    scheduledRetries
      .filter((retry) => Date.parse(retry.nextRetryAt) <= nowMs)
      .sort((left, right) => Date.parse(left.nextRetryAt) - Date.parse(right.nextRetryAt))[0]
      ?.nextRetryAt ?? null;
  const oldestOverdueRetryAgeMinutes =
    oldestOverdueRetryAt && Number.isFinite(Date.parse(oldestOverdueRetryAt))
      ? Math.max(0, Math.round((nowMs - Date.parse(oldestOverdueRetryAt)) / 60_000))
      : null;
  const campaignHealth = campaignHealthBase.map((campaign) => ({
    ...campaign,
    pendingRetryCount: scheduledRetryCountByCampaign.get(campaign.campaignId) ?? 0,
    overdueRetryCount: overdueRetryCountByCampaign.get(campaign.campaignId) ?? 0,
    nextScheduledRetryAt: scheduledRetryNextAtByCampaign.get(campaign.campaignId) ?? null,
    oldestOverdueRetryAt: oldestOverdueRetryAtByCampaign.get(campaign.campaignId) ?? null,
  }));
  const domainHealth = domainHealthBase.map((domain) => ({
    ...domain,
    pendingRetryCount: scheduledRetryCountByDomain.get(domain.domain) ?? 0,
    overdueRetryCount: overdueRetryCountByDomain.get(domain.domain) ?? 0,
    nextScheduledRetryAt: scheduledRetryNextAtByDomain.get(domain.domain) ?? null,
    oldestOverdueRetryAt: oldestOverdueRetryAtByDomain.get(domain.domain) ?? null,
  }));
  const nextScheduledRetryAt = scheduledRetries[0]?.nextRetryAt ?? null;
  const nextScheduledRetryInMinutes =
    nextScheduledRetryAt && Number.isFinite(Date.parse(nextScheduledRetryAt))
      ? Math.max(0, Math.round((Date.parse(nextScheduledRetryAt) - nowMs) / 60_000))
      : null;
  const retriedDeliveryCount = Array.from(attemptCountsByDeliveryId.values()).filter(
    (count) => count > 1
  ).length;
  const recoveredAfterRetryCount = deliveryRegistry.deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean =>
      delivery.status === 'sent' && (attemptCountsByDeliveryId.get(delivery.id) ?? 0) > 1
  ).length;

  const fallbackFailureCategoryBreakdown = Array.from(
    deliveryRegistry.deliveries.reduce<
      Map<string, number>
    >((map, delivery) => {
      const category = delivery.failureCategory;
      if (!category) return map;
      map.set(category, (map.get(category) ?? 0) + 1);
      return map;
    }, new Map())
  )
    .map(([category, count]): any => ({
      category,
      count,
    }))
    .sort((left: any, right: any) => right.count - left.count);
  const failureCategoryBreakdownFromAttempts = Array.from(
    attemptRegistry.attempts.reduce<Map<string, number>>(
      (map, attempt) => {
        const category = attempt.failureCategory;
        if (!category) return map;
        map.set(category, (map.get(category) ?? 0) + 1);
        return map;
      },
      new Map()
    )
  )
    .map(([category, count]): any => ({
      category,
      count,
    }))
    .sort((left: any, right: any) => right.count - left.count);
  const failureCategoryBreakdown =
    failureCategoryBreakdownFromAttempts.length > 0
      ? failureCategoryBreakdownFromAttempts
      : fallbackFailureCategoryBreakdown;

  const providerBreakdown = Array.from(
    attemptRegistry.attempts.reduce<
      Map<
        string,
        any
      >
    >((map, attempt) => {
      if (!attempt.provider) return map;
      const existing = map.get(attempt.provider) ?? {
        provider: attempt.provider,
        attemptCount: 0,
        sentCount: 0,
        failedCount: 0,
        bouncedCount: 0,
      };
      existing.attemptCount += 1;
      if (attempt.status === 'sent') existing.sentCount += 1;
      if (attempt.status === 'failed') existing.failedCount += 1;
      if (attempt.status === 'bounced') existing.bouncedCount += 1;
      map.set(attempt.provider, existing);
      return map;
    }, new Map())
  )
    .map(([, entry]) => entry)
    .sort((left, right) => right.attemptCount - left.attemptCount);

  const recentAttempts = [...attemptRegistry.attempts]
    .sort((left, right) => {
      const leftTime = Date.parse(left.attemptedAt ?? left.createdAt ?? '');
      const rightTime = Date.parse(right.attemptedAt ?? right.createdAt ?? '');
      return rightTime - leftTime;
    })
    .slice(0, 10)
    .map((attempt): FilemakerEmailCampaignRecentDeliveryAttempt => ({
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      deliveryId: attempt.deliveryId,
      campaignId: attempt.campaignId,
      campaignName: campaignNameById.get(attempt.campaignId) ?? null,
      runId: attempt.runId,
      emailAddress: attempt.emailAddress,
      domain: resolveEmailDomain(attempt.emailAddress),
      status: attempt.status,
      provider: attempt.provider ?? null,
      failureCategory: attempt.failureCategory ?? null,
      message:
        attempt.errorMessage?.trim() ||
        attempt.providerMessage?.trim() ||
        (attempt.status === 'sent'
          ? `${attempt.emailAddress} accepted by the provider.`
          : attempt.status === 'bounced'
            ? `${attempt.emailAddress} bounced during delivery attempt ${attempt.attemptNumber}.`
            : `${attempt.emailAddress} failed during delivery attempt ${attempt.attemptNumber}.`),
      attemptedAt: attempt.attemptedAt ?? attempt.createdAt ?? null,
    }));

  const alerts: FilemakerEmailCampaignDeliverabilityAlert[] = [];
  const pushAlert = (
    alert: FilemakerEmailCampaignDeliverabilityAlert | null | undefined
  ): void => {
    if (!alert) return;
    alerts.push(alert);
  };

  const globalBounceRatePercent = roundPercentage(bouncedCount, totalRecipients);
  const globalFailureRatePercent = roundPercentage(failedCount + bouncedCount, totalRecipients);
  const suppressionCount = suppressionRegistry.entries.length;
  const suppressionRatePercent = roundPercentage(suppressionCount, input.database.emails.length);

  if (globalBounceRatePercent >= 3) {
    pushAlert({
      id: 'deliverability-alert-global-bounce-rate',
      level: globalBounceRatePercent >= 8 ? 'critical' : 'warning',
      code: 'global_bounce_rate',
      title: 'Bounce rate is elevated',
      message: `Global bounce rate is ${globalBounceRatePercent}% across ${totalRecipients} deliveries.`,
      campaignId: null,
      campaignName: null,
      domain: null,
      value: globalBounceRatePercent,
    });
  }

  if (globalFailureRatePercent >= 5) {
    pushAlert({
      id: 'deliverability-alert-global-failure-rate',
      level: globalFailureRatePercent >= 12 ? 'critical' : 'warning',
      code: 'global_failure_rate',
      title: 'Delivery failures are elevated',
      message: `Failed or bounced deliveries reached ${globalFailureRatePercent}% across recent campaign traffic.`,
      campaignId: null,
      campaignName: null,
      domain: null,
      value: globalFailureRatePercent,
    });
  }

  if (queuedCount > 0 && oldestQueuedAgeMinutes != null && oldestQueuedAgeMinutes >= 30) {
    pushAlert({
      id: 'deliverability-alert-queue-backlog',
      level: oldestQueuedAgeMinutes >= 120 ? 'critical' : 'warning',
      code: 'queue_backlog',
      title: 'Queued deliveries are aging',
      message: `${queuedCount} deliveries are still queued. Oldest queued item is ${oldestQueuedAgeMinutes} minutes old.`,
      campaignId: null,
      campaignName: null,
      domain: null,
      value: oldestQueuedAgeMinutes,
    });
  }

  if (overdueRetryCount > 0) {
    pushAlert({
      id: 'deliverability-alert-retry-backlog',
      level: overdueRetryCount >= 5 ? 'critical' : 'warning',
      code: 'retry_backlog',
      title: 'Scheduled retries are overdue',
      message:
        overdueRetryCount === 1
          ? `1 scheduled retry is overdue${oldestOverdueRetryAgeMinutes != null ? ` by ${oldestOverdueRetryAgeMinutes} minutes` : ''} and has not been processed yet.`
          : `${overdueRetryCount} scheduled retries are overdue${oldestOverdueRetryAgeMinutes != null ? `, oldest by ${oldestOverdueRetryAgeMinutes} minutes` : ''}, and have not been processed yet.`,
      campaignId: null,
      campaignName: null,
      domain: null,
      value: overdueRetryCount,
    });
  }

  if (suppressionRatePercent >= 10) {
    pushAlert({
      id: 'deliverability-alert-suppression-pressure',
      level: suppressionRatePercent >= 25 ? 'critical' : 'warning',
      code: 'suppression_pressure',
      title: 'Suppression pressure is growing',
      message: `${suppressionCount} addresses are suppressed, or ${suppressionRatePercent}% of known Filemaker email addresses.`,
      campaignId: null,
      campaignName: null,
      domain: null,
      value: suppressionRatePercent,
    });
  }

  campaignHealth
    .filter((campaign) => campaign.alertLevel !== 'healthy')
    .slice(0, 5)
    .forEach((campaign) => {
      pushAlert({
        id: `deliverability-alert-campaign-${campaign.campaignId}`,
        level: campaign.alertLevel === 'critical' ? 'critical' : 'warning',
        code: 'campaign_health',
        title: `${campaign.campaignName} needs attention`,
        message: `Bounce rate ${campaign.bounceRatePercent}%, failure rate ${campaign.failureRatePercent}%, queued ${campaign.queuedCount}.`,
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName,
        domain: null,
        value: Math.max(campaign.bounceRatePercent, campaign.failureRatePercent),
      });
    });

  domainHealth
    .filter((domain) => domain.alertLevel !== 'healthy')
    .slice(0, 5)
    .forEach((domain) => {
      pushAlert({
        id: `deliverability-alert-domain-${domain.domain}`,
        level: domain.alertLevel === 'critical' ? 'critical' : 'warning',
        code: 'domain_health',
        title: `${domain.domain} is unstable`,
        message: `Bounce rate ${domain.bounceRatePercent}% and failure rate ${domain.failureRatePercent}% across ${domain.totalDeliveries} deliveries.`,
        campaignId: null,
        campaignName: null,
        domain: domain.domain,
        value: Math.max(domain.bounceRatePercent, domain.failureRatePercent),
      });
    });

  return {
    campaignCount: input.campaignRegistry.campaigns.length,
    liveRunCount: input.runRegistry.runs.filter(
      (run: FilemakerEmailCampaignRun): boolean => run.mode === 'live'
    ).length,
    totalRecipients,
    totalAttempts,
    retryEligibleCount: retrySummary.retryableDeliveries.length,
    retryExhaustedCount: retrySummary.exhaustedDeliveries.length,
    pendingRetryCount: scheduledRetries.length,
    overdueRetryCount,
    processedCount,
    acceptedCount,
    failedCount,
    bouncedCount,
    queuedCount,
    skippedCount,
    retriedDeliveryCount,
    recoveredAfterRetryCount,
    deliveryRatePercent: roundPercentage(acceptedCount, totalRecipients),
    failureRatePercent: roundPercentage(failedCount + bouncedCount, totalRecipients),
    bounceRatePercent: globalBounceRatePercent,
    suppressionCount,
    suppressionRatePercent,
    latestDeliveryAt,
    oldestQueuedAt,
    oldestQueuedAgeMinutes,
    nextScheduledRetryAt,
    nextScheduledRetryInMinutes,
    oldestOverdueRetryAt,
    oldestOverdueRetryAgeMinutes,
    failureCategoryBreakdown,
    providerBreakdown,
    alerts,
    domainHealth,
    campaignHealth,
    recentDeliveryIssues,
    recentAttempts,
    scheduledRetries,
  };
};
