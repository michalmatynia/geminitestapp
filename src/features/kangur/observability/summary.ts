import 'server-only';

import { readFile } from 'fs/promises';
import path from 'path';

import type {
  KangurAnalyticsCount,
  KangurAnalyticsEventType,
  KangurAnalyticsSnapshot,
  KangurObservabilityAlert,
  KangurObservabilityInvestigation,
  KangurObservabilityRange,
  KangurObservabilityStatus,
  KangurObservabilitySummary,
  KangurPerformanceBaseline,
  KangurRecentAnalyticsEvent,
  KangurRouteMetrics,
  SystemLogMetricsDto as SystemLogMetrics,
} from '@/shared/contracts';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { getSystemLogMetrics, listSystemLogs } from '@/shared/lib/observability/system-logger';

type AnalyticsEventMongoDoc = {
  _id?: { toString(): string } | string;
  ts?: Date | string;
  type?: KangurAnalyticsEventType;
  name?: string | null;
  path?: string;
  visitorId?: string;
  sessionId?: string;
  meta?: Record<string, unknown> | null;
};

const ANALYTICS_COLLECTION_NAME = 'analytics_events';
const KANGUR_ANALYTICS_EVENT_NAMES = [
  'kangur_learner_signin_succeeded',
  'kangur_learner_signin_failed',
  'kangur_game_completed',
  'kangur_progress_hydrated',
  'kangur_progress_hydration_failed',
  'kangur_progress_sync_failed',
  'kangur_api_write_succeeded',
  'kangur_api_write_failed',
  'kangur_api_read_failed',
] as const;

const emptyAnalyticsSnapshot = (): KangurAnalyticsSnapshot => ({
  totals: {
    events: 0,
    pageviews: 0,
  },
  visitors: 0,
  sessions: 0,
  topPaths: [],
  topEventNames: [],
  importantEvents: KANGUR_ANALYTICS_EVENT_NAMES.map((name: string) => ({
    name,
    count: 0,
  })),
  recent: [],
});

const emptyRouteMetrics = (): KangurRouteMetrics => ({
  authMeGet: null,
  learnerSignInPost: null,
  progressPatch: null,
  scoresPost: null,
  assignmentsPost: null,
  learnersPost: null,
  ttsPost: null,
});

export const resolveKangurObservabilityRangeWindow = (
  range: KangurObservabilityRange
): { from: Date; to: Date } => {
  const to = new Date();
  const msByRange: Record<KangurObservabilityRange, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };

  return {
    from: new Date(to.getTime() - msByRange[range]),
    to,
  };
};

const toIso = (value: Date | string | undefined | null): string => {
  if (!value) {
    return new Date(0).toISOString();
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date(0).toISOString();
  }
  return date.toISOString();
};

const toRecentAnalyticsEvent = (doc: AnalyticsEventMongoDoc): KangurRecentAnalyticsEvent => ({
  id:
    typeof doc._id === 'string'
      ? doc._id
      : doc._id && typeof doc._id.toString === 'function'
        ? doc._id.toString()
        : '',
  ts: toIso(doc.ts),
  type: doc.type === 'pageview' ? 'pageview' : 'event',
  name: typeof doc.name === 'string' && doc.name.trim().length > 0 ? doc.name : null,
  path: typeof doc.path === 'string' ? doc.path : '',
  visitorId: typeof doc.visitorId === 'string' ? doc.visitorId : '',
  sessionId: typeof doc.sessionId === 'string' ? doc.sessionId : '',
  meta: doc.meta && typeof doc.meta === 'object' && !Array.isArray(doc.meta) ? doc.meta : null,
});

const toPercent = (numerator: number, denominator: number): number | null => {
  if (denominator <= 0) return null;
  return Number(((numerator / denominator) * 100).toFixed(1));
};

const rateStatus = (
  value: number | null,
  options: {
    warningThreshold: number;
    criticalThreshold: number;
    minSample?: number;
    sampleSize?: number;
  }
): KangurObservabilityStatus => {
  if (value === null) return 'insufficient_data';
  if ((options.sampleSize ?? 0) < (options.minSample ?? 0)) {
    return 'insufficient_data';
  }
  if (value >= options.criticalThreshold) return 'critical';
  if (value >= options.warningThreshold) return 'warning';
  return 'ok';
};

const countStatus = (
  value: number,
  options: {
    warningThreshold: number;
    criticalThreshold: number;
  }
): Exclude<KangurObservabilityStatus, 'insufficient_data'> => {
  if (value >= options.criticalThreshold) return 'critical';
  if (value >= options.warningThreshold) return 'warning';
  return 'ok';
};

const scaleCountThreshold = (
  range: KangurObservabilityRange,
  base24hThreshold: number
): number => {
  if (range === '24h') return base24hThreshold;
  if (range === '7d') return base24hThreshold * 7;
  return base24hThreshold * 30;
};

const buildSystemLogsHref = (input: {
  query?: string;
  source?: string;
  level?: 'info' | 'warn' | 'error';
  from: Date;
  to: Date;
}): string => {
  const params = new URLSearchParams();

  if (input.query) params.set('query', input.query);
  if (input.source) params.set('source', input.source);
  if (input.level) params.set('level', input.level);

  params.set('from', input.from.toISOString());
  params.set('to', input.to.toISOString());

  return `/admin/system/logs?${params.toString()}`;
};

const buildKangurObservabilitySectionHref = (
  range: KangurObservabilityRange,
  sectionId: string
): string => {
  const params = new URLSearchParams({ range });
  return `/admin/kangur/observability?${params.toString()}#${sectionId}`;
};

const loadKangurPerformanceBaseline = async (): Promise<KangurPerformanceBaseline | null> => {
  try {
    const filepath = path.join(process.cwd(), 'docs', 'metrics', 'kangur-performance-latest.json');
    const raw = await readFile(filepath, 'utf8');
    const parsed = JSON.parse(raw) as {
      generatedAt?: string;
      unit?: { status?: string; durationMs?: number };
      e2e?: { status?: string; durationMs?: number };
      summary?: { infraFailures?: number; failedRuns?: number };
      bundleRisk?: { totalBytes?: number; totalLines?: number };
    };
    const unitDurationMs = parsed.unit?.durationMs;
    const e2eDurationMs = parsed.e2e?.durationMs;

    return {
      generatedAt: typeof parsed.generatedAt === 'string' ? parsed.generatedAt : null,
      unitStatus: typeof parsed.unit?.status === 'string' ? parsed.unit.status : null,
      unitDurationMs:
        typeof unitDurationMs === 'number' && Number.isFinite(unitDurationMs)
          ? unitDurationMs
          : null,
      e2eStatus: typeof parsed.e2e?.status === 'string' ? parsed.e2e.status : null,
      e2eDurationMs:
        typeof e2eDurationMs === 'number' && Number.isFinite(e2eDurationMs)
          ? e2eDurationMs
          : null,
      infraFailures: Number.isFinite(parsed.summary?.infraFailures)
        ? parsed.summary?.infraFailures ?? null
        : null,
      failedRuns: Number.isFinite(parsed.summary?.failedRuns)
        ? parsed.summary?.failedRuns ?? null
        : null,
      bundleRiskTotalBytes: Number.isFinite(parsed.bundleRisk?.totalBytes)
        ? parsed.bundleRisk?.totalBytes ?? null
        : null,
      bundleRiskTotalLines: Number.isFinite(parsed.bundleRisk?.totalLines)
        ? parsed.bundleRisk?.totalLines ?? null
        : null,
    };
  } catch {
    return null;
  }
};

const buildKangurAnalyticsMatch = (from: Date, to: Date): Record<string, unknown> => ({
  ts: { $gte: from, $lt: to },
  scope: 'public',
  $or: [{ path: /^\/kangur(?:\/|$)/i }, { 'meta.feature': 'kangur' }],
});

const loadKangurAnalyticsSnapshot = async (
  range: KangurObservabilityRange
): Promise<KangurAnalyticsSnapshot> => {
  const { from, to } = resolveKangurObservabilityRangeWindow(range);
  const mongo = await getMongoDb();
  const collection = mongo.collection<AnalyticsEventMongoDoc>(ANALYTICS_COLLECTION_NAME);
  const match = buildKangurAnalyticsMatch(from, to);

  const [
    totalsResult,
    visitorsResult,
    sessionsResult,
    topPathsResult,
    topEventNamesResult,
    recentResult,
  ] = await Promise.all([
    collection
      .aggregate<{ events: number; pageviews: number }>([
        { $match: match },
        {
          $group: {
            _id: null,
            events: { $sum: 1 },
            pageviews: {
              $sum: {
                $cond: [{ $eq: ['$type', 'pageview'] }, 1, 0],
              },
            },
          },
        },
        { $project: { _id: 0, events: 1, pageviews: 1 } },
      ])
      .toArray(),
    collection
      .aggregate<{ count: number }>([
        { $match: match },
        { $group: { _id: '$visitorId' } },
        { $count: 'count' },
      ])
      .toArray(),
    collection
      .aggregate<{ count: number }>([
        { $match: match },
        { $group: { _id: '$sessionId' } },
        { $count: 'count' },
      ])
      .toArray(),
    collection
      .aggregate<{ path: string; count: number }>([
        { $match: match },
        { $group: { _id: '$path', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, path: '$_id', count: 1 } },
      ])
      .toArray(),
    collection
      .aggregate<{ name: string; count: number }>([
        {
          $match: {
            ...match,
            type: 'event',
            name: { $exists: true, $nin: [null, ''] },
          },
        },
        { $group: { _id: '$name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 100 },
        { $project: { _id: 0, name: '$_id', count: 1 } },
      ])
      .toArray(),
    collection
      .find(match, {
        projection: {
          _id: 1,
          ts: 1,
          type: 1,
          name: 1,
          path: 1,
          visitorId: 1,
          sessionId: 1,
          meta: 1,
        },
      })
      .sort({ ts: -1 })
      .limit(20)
      .toArray(),
  ]);

  const topEventNames = (topEventNamesResult ?? []).map((entry: { name: string; count: number }) => ({
    name: entry.name,
    count: entry.count,
  }));
  const topEventCountMap = new Map(
    topEventNames.map((entry: KangurAnalyticsCount) => [entry.name, entry.count])
  );

  return {
    totals: totalsResult[0] ?? { events: 0, pageviews: 0 },
    visitors: visitorsResult[0]?.count ?? 0,
    sessions: sessionsResult[0]?.count ?? 0,
    topPaths: topPathsResult ?? [],
    topEventNames,
    importantEvents: KANGUR_ANALYTICS_EVENT_NAMES.map((name: string) => ({
      name,
      count: topEventCountMap.get(name) ?? 0,
    })),
    recent: (recentResult ?? []).map(toRecentAnalyticsEvent),
  };
};

const loadRouteMetrics = async (
  from: Date,
  to: Date
): Promise<KangurRouteMetrics> => {
  const routeMetrics = await Promise.all([
    getSystemLogMetrics({ source: 'kangur.auth.me.GET', from, to }),
    getSystemLogMetrics({ source: 'kangur.auth.learnerSignIn.POST', from, to }),
    getSystemLogMetrics({ source: 'kangur.progress.PATCH', from, to }),
    getSystemLogMetrics({ source: 'kangur.scores.POST', from, to }),
    getSystemLogMetrics({ source: 'kangur.assignments.POST', from, to }),
    getSystemLogMetrics({ source: 'kangur.learners.POST', from, to }),
    getSystemLogMetrics({ source: 'kangur.tts.POST', from, to }),
  ]);

  return {
    authMeGet: routeMetrics[0],
    learnerSignInPost: routeMetrics[1],
    progressPatch: routeMetrics[2],
    scoresPost: routeMetrics[3],
    assignmentsPost: routeMetrics[4],
    learnersPost: routeMetrics[5],
    ttsPost: routeMetrics[6],
  };
};

const eventCount = (analytics: KangurAnalyticsSnapshot, name: string): number =>
  analytics.importantEvents.find((entry: KangurAnalyticsCount) => entry.name === name)?.count ?? 0;

const buildKangurObservabilityAlerts = (input: {
  range: KangurObservabilityRange;
  from: Date;
  to: Date;
  serverLogMetrics: SystemLogMetrics | null;
  analytics: KangurAnalyticsSnapshot;
  ttsRequestCount: number;
  ttsFallbackCount: number;
  performanceBaseline: KangurPerformanceBaseline | null;
}): KangurObservabilityAlert[] => {
  const signInSuccessCount = eventCount(input.analytics, 'kangur_learner_signin_succeeded');
  const signInFailureCount = eventCount(input.analytics, 'kangur_learner_signin_failed');
  const signInAttemptCount = signInSuccessCount + signInFailureCount;
  const progressSyncFailureCount = eventCount(input.analytics, 'kangur_progress_sync_failed');
  const serverErrorCount = input.serverLogMetrics?.levels.error ?? 0;
  const serverTotalCount = input.serverLogMetrics?.total ?? 0;

  const serverErrorRatePercent = toPercent(serverErrorCount, serverTotalCount);
  const signInFailureRatePercent = toPercent(signInFailureCount, signInAttemptCount);
  const ttsFallbackRatePercent = toPercent(input.ttsFallbackCount, input.ttsRequestCount);

  const progressWarningThreshold = scaleCountThreshold(input.range, 3);
  const progressCriticalThreshold = scaleCountThreshold(input.range, 10);
  const recentAnalyticsHref = buildKangurObservabilitySectionHref(
    input.range,
    'recent-analytics-events'
  );
  const performanceBaselineHref = buildKangurObservabilitySectionHref(
    input.range,
    'performance-baseline'
  );

  const performanceStatus: KangurObservabilityStatus = !input.performanceBaseline
    ? 'insufficient_data'
    : input.performanceBaseline.unitStatus !== 'pass'
      ? 'critical'
      : input.performanceBaseline.e2eStatus === 'fail'
        ? 'critical'
        : input.performanceBaseline.e2eStatus === 'infra_fail'
          ? 'warning'
          : 'ok';

  return [
    {
      id: 'kangur-server-error-rate',
      title: 'Kangur Server Error Rate',
      status: rateStatus(serverErrorRatePercent, {
        warningThreshold: 2,
        criticalThreshold: 5,
        minSample: 20,
        sampleSize: serverTotalCount,
      }),
      value: serverErrorRatePercent,
      unit: '%',
      warningThreshold: 2,
      criticalThreshold: 5,
      summary:
        serverTotalCount < 20
          ? 'Insufficient Kangur log volume to evaluate server error rate confidently.'
          : `${serverErrorCount} error logs out of ${serverTotalCount} Kangur logs in the selected window.`,
      investigation: {
        label: 'View error logs',
        href: buildSystemLogsHref({
          query: 'kangur.',
          level: 'error',
          from: input.from,
          to: input.to,
        }),
      },
    },
    {
      id: 'kangur-learner-signin-failure-rate',
      title: 'Learner Sign-In Failure Rate',
      status: rateStatus(signInFailureRatePercent, {
        warningThreshold: 5,
        criticalThreshold: 10,
        minSample: 10,
        sampleSize: signInAttemptCount,
      }),
      value: signInFailureRatePercent,
      unit: '%',
      warningThreshold: 5,
      criticalThreshold: 10,
      summary:
        signInAttemptCount < 10
          ? 'Insufficient sign-in attempts to evaluate learner sign-in failure rate.'
          : `${signInFailureCount} failed learner sign-ins out of ${signInAttemptCount} attempts.`,
      investigation: {
        label: 'Review sign-in analytics',
        href: recentAnalyticsHref,
      },
    },
    {
      id: 'kangur-progress-sync-failures',
      title: 'Progress Sync Failures',
      status: countStatus(progressSyncFailureCount, {
        warningThreshold: progressWarningThreshold,
        criticalThreshold: progressCriticalThreshold,
      }),
      value: progressSyncFailureCount,
      unit: 'events',
      warningThreshold: progressWarningThreshold,
      criticalThreshold: progressCriticalThreshold,
      summary: `${progressSyncFailureCount} client progress sync failures were reported in the selected window.`,
      investigation: {
        label: 'Review sync analytics',
        href: recentAnalyticsHref,
      },
    },
    {
      id: 'kangur-tts-fallback-rate',
      title: 'TTS Fallback Rate',
      status: rateStatus(ttsFallbackRatePercent, {
        warningThreshold: 10,
        criticalThreshold: 25,
        minSample: 10,
        sampleSize: input.ttsRequestCount,
      }),
      value: ttsFallbackRatePercent,
      unit: '%',
      warningThreshold: 10,
      criticalThreshold: 25,
      summary:
        input.ttsRequestCount < 10
          ? 'Insufficient TTS request volume to evaluate fallback rate.'
          : `${input.ttsFallbackCount} fallback responses out of ${input.ttsRequestCount} TTS requests.`,
      investigation: {
        label: 'View fallback logs',
        href: buildSystemLogsHref({
          source: 'kangur.tts.fallback',
          from: input.from,
          to: input.to,
        }),
      },
    },
    {
      id: 'kangur-performance-baseline',
      title: 'Kangur Performance Baseline',
      status: performanceStatus,
      value: null,
      unit: 'status',
      warningThreshold: null,
      criticalThreshold: null,
      summary: !input.performanceBaseline
        ? 'Kangur performance baseline artifact is missing.'
        : `Latest baseline unit=${input.performanceBaseline.unitStatus ?? 'unknown'}, e2e=${input.performanceBaseline.e2eStatus ?? 'unknown'}.`,
      investigation: {
        label: 'Open baseline details',
        href: performanceBaselineHref,
      },
    },
  ];
};

const resolveOverallStatus = (
  alerts: KangurObservabilityAlert[],
  errors: Record<string, string>
): Exclude<KangurObservabilityStatus, 'insufficient_data'> => {
  if (alerts.some((alert: KangurObservabilityAlert) => alert.status === 'critical')) {
    return 'critical';
  }
  if (
    alerts.some((alert: KangurObservabilityAlert) => alert.status === 'warning') ||
    Object.keys(errors).length > 0
  ) {
    return 'warning';
  }
  return 'ok';
};

export const getKangurObservabilitySummary = async (input: {
  range?: KangurObservabilityRange;
} = {}): Promise<KangurObservabilitySummary> => {
  const range = input.range ?? '24h';
  const { from, to } = resolveKangurObservabilityRangeWindow(range);
  const errors: Record<string, string> = {};

  const [serverLogMetrics, recentKangurLogs, routeMetrics, analytics, performanceBaseline] =
    await Promise.all([
      getSystemLogMetrics({ source: 'kangur.', from, to }).catch((error: unknown) => {
        errors['serverLogs.metrics'] =
          error instanceof Error ? error.message : 'Failed to load Kangur log metrics.';
        return null;
      }),
      listSystemLogs({
        page: 1,
        pageSize: 25,
        source: 'kangur.',
        from,
        to,
      })
        .then((result) => result.logs)
        .catch((error: unknown) => {
          errors['serverLogs.recent'] =
            error instanceof Error ? error.message : 'Failed to load recent Kangur logs.';
          return [];
        }),
      loadRouteMetrics(from, to).catch((error: unknown) => {
        errors['routes'] =
          error instanceof Error ? error.message : 'Failed to load Kangur route metrics.';
        return emptyRouteMetrics();
      }),
      loadKangurAnalyticsSnapshot(range).catch((error: unknown) => {
        errors['analytics'] =
          error instanceof Error ? error.message : 'Failed to load Kangur analytics snapshot.';
        return emptyAnalyticsSnapshot();
      }),
      loadKangurPerformanceBaseline().catch((error: unknown) => {
        errors['performanceBaseline'] =
          error instanceof Error ? error.message : 'Failed to load Kangur performance baseline.';
        return null;
      }),
    ]);

  const ttsRequestCount = routeMetrics.ttsPost?.total ?? 0;
  const ttsFallbackCount =
    (await getSystemLogMetrics({ source: 'kangur.tts.fallback', from, to }).catch(
      (error: unknown) => {
        errors['ttsFallback'] =
          error instanceof Error ? error.message : 'Failed to load Kangur TTS fallback metrics.';
        return null;
      }
    ))?.total ?? 0;

  const alerts = buildKangurObservabilityAlerts({
    range,
    from,
    to,
    serverLogMetrics,
    analytics,
    ttsRequestCount,
    ttsFallbackCount,
    performanceBaseline,
  });

  const signInSuccessCount = eventCount(analytics, 'kangur_learner_signin_succeeded');
  const signInFailureCount = eventCount(analytics, 'kangur_learner_signin_failed');
  const progressSyncFailureCount = eventCount(analytics, 'kangur_progress_sync_failed');
  const overallStatus = resolveOverallStatus(alerts, errors);

  return {
    generatedAt: new Date().toISOString(),
    range,
    overallStatus,
    window: {
      from: from.toISOString(),
      to: to.toISOString(),
    },
    keyMetrics: {
      serverErrorRatePercent: toPercent(serverLogMetrics?.levels.error ?? 0, serverLogMetrics?.total ?? 0),
      learnerSignInAttempts: signInSuccessCount + signInFailureCount,
      learnerSignInFailureRatePercent: toPercent(
        signInFailureCount,
        signInSuccessCount + signInFailureCount
      ),
      progressSyncFailures: progressSyncFailureCount,
      ttsRequests: ttsRequestCount,
      ttsFallbackRatePercent: toPercent(ttsFallbackCount, ttsRequestCount),
    },
    alerts,
    serverLogs: {
      metrics: serverLogMetrics,
      recent: recentKangurLogs,
    },
    routes: routeMetrics,
    analytics,
    performanceBaseline,
    errors: Object.keys(errors).length > 0 ? errors : null,
  };
};

export const __testables = {
  buildKangurObservabilityAlerts,
  loadKangurPerformanceBaseline,
};
