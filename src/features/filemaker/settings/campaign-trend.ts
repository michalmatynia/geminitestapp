import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignEvent,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignEventType,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignRunRegistry,
  FilemakerEmailCampaignSuppressionRegistry,
} from '../types';

export const FILEMAKER_EMAIL_CAMPAIGN_DELIVERABILITY_DECISION_EVENT_TYPES: ReadonlyArray<FilemakerEmailCampaignEventType> = [
  'delivery_deferred_domain',
  'delivery_deferred_warmup',
  'run_paused_circuit_breaker',
];

const DELIVERABILITY_DECISION_EVENT_TYPE_SET = new Set<FilemakerEmailCampaignEventType>(
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERABILITY_DECISION_EVENT_TYPES
);

export const isFilemakerEmailCampaignDeliverabilityDecisionEvent = (
  event: Pick<FilemakerEmailCampaignEvent, 'type'>
): boolean => DELIVERABILITY_DECISION_EVENT_TYPE_SET.has(event.type);

export const FILEMAKER_EMAIL_CAMPAIGN_DELIVERABILITY_DECISION_EVENT_LABEL: Readonly<
  Partial<Record<FilemakerEmailCampaignEventType, string>>
> = {
  delivery_deferred_domain: 'Domain throttle',
  delivery_deferred_warmup: 'Warm-up cap',
  run_paused_circuit_breaker: 'Circuit breaker',
};

export interface CampaignRunTrendDataPoint {
  runId: string;
  status: FilemakerEmailCampaignRun['status'];
  mode: FilemakerEmailCampaignRun['mode'];
  startedAt: string | null;
  completedAt: string | null;
  recipientCount: number;
  deliveredCount: number;
  bouncedCount: number;
  failedCount: number;
  uniqueOpens: number;
  uniqueClicks: number;
  openRatePercent: number;
  clickRatePercent: number;
  bounceRatePercent: number;
  failureRatePercent: number;
  coldSuppressionsAdded: number;
  decisionCount: number;
}

export interface CampaignTrendSummary {
  campaignId: string;
  points: CampaignRunTrendDataPoint[];
  averages: {
    openRatePercent: number;
    clickRatePercent: number;
    bounceRatePercent: number;
    failureRatePercent: number;
  };
}

const roundPercent = (numerator: number, denominator: number): number => {
  if (denominator <= 0) return 0;
  return Math.round((numerator * 1000) / denominator) / 10;
};

const compareRunsNewestFirst = (
  left: FilemakerEmailCampaignRun,
  right: FilemakerEmailCampaignRun
): number => {
  const leftAt = Date.parse(left.completedAt ?? left.startedAt ?? left.createdAt ?? '');
  const rightAt = Date.parse(right.completedAt ?? right.startedAt ?? right.createdAt ?? '');
  const safeLeft = Number.isFinite(leftAt) ? leftAt : 0;
  const safeRight = Number.isFinite(rightAt) ? rightAt : 0;
  return safeRight - safeLeft;
};

interface SummarizeCampaignTrendInput {
  campaign: Pick<FilemakerEmailCampaign, 'id'>;
  runRegistry: FilemakerEmailCampaignRunRegistry;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  eventRegistry: FilemakerEmailCampaignEventRegistry;
  suppressionRegistry: FilemakerEmailCampaignSuppressionRegistry;
  limit?: number;
}

export const summarizeFilemakerEmailCampaignRunTrend = (
  input: SummarizeCampaignTrendInput
): CampaignTrendSummary => {
  const limit = input.limit ?? 10;
  const campaignId = input.campaign.id;

  const runs = input.runRegistry.runs
    .filter((run) => run.campaignId === campaignId)
    .slice()
    .sort(compareRunsNewestFirst)
    .slice(0, limit);

  const deliveriesByRunId = new Map<string, FilemakerEmailCampaignDelivery[]>();
  input.deliveryRegistry.deliveries.forEach((delivery) => {
    const list = deliveriesByRunId.get(delivery.runId) ?? [];
    list.push(delivery);
    deliveriesByRunId.set(delivery.runId, list);
  });

  const eventsByRunId = new Map<string, FilemakerEmailCampaignEvent[]>();
  input.eventRegistry.events.forEach((event) => {
    if (!event.runId) return;
    const list = eventsByRunId.get(event.runId) ?? [];
    list.push(event);
    eventsByRunId.set(event.runId, list);
  });

  const suppressionsByRunId = new Map<string, number>();
  input.suppressionRegistry.entries.forEach((entry) => {
    if (entry.reason !== 'cold' || !entry.runId) return;
    suppressionsByRunId.set(entry.runId, (suppressionsByRunId.get(entry.runId) ?? 0) + 1);
  });

  const points: CampaignRunTrendDataPoint[] = runs.map((run) => {
    const deliveries = deliveriesByRunId.get(run.id) ?? [];
    const events = eventsByRunId.get(run.id) ?? [];

    const recipientCount = run.recipientCount || deliveries.length;
    const deliveredCount = run.deliveredCount || deliveries.filter((d) => d.status === 'sent').length;
    const bouncedCount = deliveries.filter((d) => d.status === 'bounced').length;
    const failedCount = run.failedCount || deliveries.filter((d) => d.status === 'failed').length;

    const uniqueOpensSet = new Set<string>();
    const uniqueClicksSet = new Set<string>();
    let decisionCount = 0;
    events.forEach((event) => {
      if (event.type === 'opened' && event.deliveryId) uniqueOpensSet.add(event.deliveryId);
      if (event.type === 'clicked' && event.deliveryId) uniqueClicksSet.add(event.deliveryId);
      if (isFilemakerEmailCampaignDeliverabilityDecisionEvent(event)) decisionCount += 1;
    });

    const openRatePercent = roundPercent(uniqueOpensSet.size, deliveredCount);
    const clickRatePercent = roundPercent(uniqueClicksSet.size, deliveredCount);
    const bounceRatePercent = roundPercent(bouncedCount, recipientCount);
    const failureRatePercent = roundPercent(failedCount + bouncedCount, recipientCount);

    return {
      runId: run.id,
      status: run.status,
      mode: run.mode,
      startedAt: run.startedAt ?? null,
      completedAt: run.completedAt ?? null,
      recipientCount,
      deliveredCount,
      bouncedCount,
      failedCount,
      uniqueOpens: uniqueOpensSet.size,
      uniqueClicks: uniqueClicksSet.size,
      openRatePercent,
      clickRatePercent,
      bounceRatePercent,
      failureRatePercent,
      coldSuppressionsAdded: suppressionsByRunId.get(run.id) ?? 0,
      decisionCount,
    };
  });

  const sumOf = (key: keyof CampaignRunTrendDataPoint): number =>
    points.reduce((sum, point) => sum + (point[key] as number), 0);
  const safeAvg = (key: keyof CampaignRunTrendDataPoint): number =>
    points.length === 0 ? 0 : Math.round((sumOf(key) * 10) / points.length) / 10;

  return {
    campaignId,
    // Reverse for chart consumption: oldest → newest left-to-right.
    points: points.slice().reverse(),
    averages: {
      openRatePercent: safeAvg('openRatePercent'),
      clickRatePercent: safeAvg('clickRatePercent'),
      bounceRatePercent: safeAvg('bounceRatePercent'),
      failureRatePercent: safeAvg('failureRatePercent'),
    },
  };
};
