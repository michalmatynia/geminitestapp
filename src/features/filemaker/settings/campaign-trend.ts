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

const parseRunSortTimestamp = (run: FilemakerEmailCampaignRun): number => {
  const timestamp = Date.parse(run.completedAt ?? run.startedAt ?? run.createdAt ?? '');
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const compareRunsNewestFirst = (
  left: FilemakerEmailCampaignRun,
  right: FilemakerEmailCampaignRun
): number => {
  const leftAt = parseRunSortTimestamp(left);
  const rightAt = parseRunSortTimestamp(right);
  return rightAt - leftAt;
};

interface SummarizeCampaignTrendInput {
  campaign: Pick<FilemakerEmailCampaign, 'id'>;
  runRegistry: FilemakerEmailCampaignRunRegistry;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  eventRegistry: FilemakerEmailCampaignEventRegistry;
  suppressionRegistry: FilemakerEmailCampaignSuppressionRegistry;
  limit?: number;
}

const groupDeliveriesByRunId = (
  deliveries: FilemakerEmailCampaignDelivery[]
): Map<string, FilemakerEmailCampaignDelivery[]> => {
  const deliveriesByRunId = new Map<string, FilemakerEmailCampaignDelivery[]>();
  deliveries.forEach((delivery) => {
    const list = deliveriesByRunId.get(delivery.runId) ?? [];
    list.push(delivery);
    deliveriesByRunId.set(delivery.runId, list);
  });
  return deliveriesByRunId;
};

const groupEventsByRunId = (
  events: FilemakerEmailCampaignEvent[]
): Map<string, FilemakerEmailCampaignEvent[]> => {
  const eventsByRunId = new Map<string, FilemakerEmailCampaignEvent[]>();
  events.forEach((event) => {
    if (event.runId === null || event.runId === undefined || event.runId.length === 0) return;
    const list = eventsByRunId.get(event.runId) ?? [];
    list.push(event);
    eventsByRunId.set(event.runId, list);
  });
  return eventsByRunId;
};

const countColdSuppressionsByRunId = (
  registry: FilemakerEmailCampaignSuppressionRegistry
): Map<string, number> => {
  const suppressionsByRunId = new Map<string, number>();
  registry.entries.forEach((entry) => {
    if (entry.reason !== 'cold') return;
    if (entry.runId === null || entry.runId === undefined || entry.runId.length === 0) return;
    suppressionsByRunId.set(entry.runId, (suppressionsByRunId.get(entry.runId) ?? 0) + 1);
  });
  return suppressionsByRunId;
};

const resolveCount = (value: number, fallback: number): number =>
  value > 0 ? value : fallback;

const getEventDeliveryId = (event: FilemakerEmailCampaignEvent): string | null => {
  if (event.deliveryId === null || event.deliveryId === undefined || event.deliveryId.length === 0) {
    return null;
  }
  return event.deliveryId;
};

const collectRunEventCounts = (
  events: FilemakerEmailCampaignEvent[]
): { uniqueOpens: number; uniqueClicks: number; decisionCount: number } => {
  const uniqueOpensSet = new Set<string>();
  const uniqueClicksSet = new Set<string>();
  let decisionCount = 0;
  events.forEach((event) => {
    const deliveryId = getEventDeliveryId(event);
    if (event.type === 'opened' && deliveryId !== null) uniqueOpensSet.add(deliveryId);
    if (event.type === 'clicked' && deliveryId !== null) uniqueClicksSet.add(deliveryId);
    if (isFilemakerEmailCampaignDeliverabilityDecisionEvent(event)) decisionCount += 1;
  });
  return {
    uniqueOpens: uniqueOpensSet.size,
    uniqueClicks: uniqueClicksSet.size,
    decisionCount,
  };
};

const toCampaignRunTrendDataPoint = ({
  deliveries,
  events,
  run,
  suppressionsByRunId,
}: {
  deliveries: FilemakerEmailCampaignDelivery[];
  events: FilemakerEmailCampaignEvent[];
  run: FilemakerEmailCampaignRun;
  suppressionsByRunId: Map<string, number>;
}): CampaignRunTrendDataPoint => {
  const recipientCount = resolveCount(run.recipientCount, deliveries.length);
  const deliveredCount = resolveCount(
    run.deliveredCount,
    deliveries.filter((delivery) => delivery.status === 'sent').length
  );
  const bouncedCount = deliveries.filter((delivery) => delivery.status === 'bounced').length;
  const failedCount = resolveCount(
    run.failedCount,
    deliveries.filter((delivery) => delivery.status === 'failed').length
  );
  const eventCounts = collectRunEventCounts(events);
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
    uniqueOpens: eventCounts.uniqueOpens,
    uniqueClicks: eventCounts.uniqueClicks,
    openRatePercent: roundPercent(eventCounts.uniqueOpens, deliveredCount),
    clickRatePercent: roundPercent(eventCounts.uniqueClicks, deliveredCount),
    bounceRatePercent: roundPercent(bouncedCount, recipientCount),
    failureRatePercent: roundPercent(failedCount + bouncedCount, recipientCount),
    coldSuppressionsAdded: suppressionsByRunId.get(run.id) ?? 0,
    decisionCount: eventCounts.decisionCount,
  };
};

const sumTrendDataPointValue = (
  points: CampaignRunTrendDataPoint[],
  key: keyof CampaignRunTrendDataPoint
): number => points.reduce((sum, point) => sum + (point[key] as number), 0);

const averageTrendDataPointValue = (
  points: CampaignRunTrendDataPoint[],
  key: keyof CampaignRunTrendDataPoint
): number =>
  points.length === 0
    ? 0
    : Math.round((sumTrendDataPointValue(points, key) * 10) / points.length) / 10;

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
  const deliveriesByRunId = groupDeliveriesByRunId(input.deliveryRegistry.deliveries);
  const eventsByRunId = groupEventsByRunId(input.eventRegistry.events);
  const suppressionsByRunId = countColdSuppressionsByRunId(input.suppressionRegistry);
  const points = runs.map((run) =>
    toCampaignRunTrendDataPoint({
      run,
      deliveries: deliveriesByRunId.get(run.id) ?? [],
      events: eventsByRunId.get(run.id) ?? [],
      suppressionsByRunId,
    })
  );

  return {
    campaignId,
    // Reverse for chart consumption: oldest → newest left-to-right.
    points: points.slice().reverse(),
    averages: {
      openRatePercent: averageTrendDataPointValue(points, 'openRatePercent'),
      clickRatePercent: averageTrendDataPointValue(points, 'clickRatePercent'),
      bounceRatePercent: averageTrendDataPointValue(points, 'bounceRatePercent'),
      failureRatePercent: averageTrendDataPointValue(points, 'failureRatePercent'),
    },
  };
};
