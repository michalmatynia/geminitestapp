import {
  FilemakerDatabase,
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryFailureCategory,
  FilemakerEmailCampaignDeliveryAttemptRegistry,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignRegistry,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignRunRegistry,
  FilemakerEmailCampaignSuppressionRegistry,
} from '../../types';
import {
  FilemakerEmailCampaignDeliverabilityAlert,
  FilemakerEmailCampaignDeliverabilityCampaignHealth,
  FilemakerEmailCampaignDeliveryFailureCategorySummary,
  FilemakerEmailCampaignDeliveryProviderSummary,
  FilemakerEmailCampaignDeliverabilityHealthLevel,
  FilemakerEmailCampaignDeliverabilityOverview,
  FilemakerEmailCampaignDomainDeliverability,
  FilemakerEmailCampaignRecentDeliveryAttempt,
  FilemakerEmailCampaignRecentDeliveryIssue,
  FilemakerEmailCampaignScheduledRetryItem,
} from '../../types/campaigns';
import {
  FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS,
  normalizeFilemakerEmailCampaignDeliveryAttemptRegistry,
  normalizeFilemakerEmailCampaignDeliveryRegistry,
  normalizeFilemakerEmailCampaignSuppressionRegistry,
  resolveFilemakerEmailCampaignRetryableDeliveries,
} from '../campaign-factories';
import {
  resolveDeliverabilityAlertLevel,
  resolveEmailDomain,
  roundPercentage,
  toSortedLatestTimestamp,
  toSortedOldestTimestamp,
} from './utils';
import { summarizeFilemakerEmailCampaignAnalytics } from './analytics';

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

  const failureCategoryBreakdown = Array.from(
    attemptRegistry.attempts.reduce<Map<FilemakerEmailCampaignDeliveryFailureCategory, number>>(
      (map, attempt) => {
        const category = attempt.failureCategory;
        if (!category) return map;
        map.set(category, (map.get(category) ?? 0) + 1);
        return map;
      },
      new Map<FilemakerEmailCampaignDeliveryFailureCategory, number>()
    )
  )
    .map(([
      category,
      count,
    ]: [
      FilemakerEmailCampaignDeliveryFailureCategory,
      number,
    ]): FilemakerEmailCampaignDeliveryFailureCategorySummary => ({
      category,
      count,
    }))
    .sort(
      (
        left: FilemakerEmailCampaignDeliveryFailureCategorySummary,
        right: FilemakerEmailCampaignDeliveryFailureCategorySummary
      ) => right.count - left.count
    );

  const providerBreakdown = Array.from(
    attemptRegistry.attempts.reduce<
      Map<
        string,
        FilemakerEmailCampaignDeliveryProviderSummary
      >
    >((map, attempt) => {
      if (!attempt.provider) return map;
      const existing: FilemakerEmailCampaignDeliveryProviderSummary =
        map.get(attempt.provider) ?? {
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
    .map(([, entry]): FilemakerEmailCampaignDeliveryProviderSummary => entry)
    .sort(
      (
        left: FilemakerEmailCampaignDeliveryProviderSummary,
        right: FilemakerEmailCampaignDeliveryProviderSummary
      ) => right.attemptCount - left.attemptCount
    );

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
