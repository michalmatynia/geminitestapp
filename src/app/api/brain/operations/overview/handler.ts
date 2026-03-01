import { NextRequest, NextResponse } from 'next/server';

import { chatbotJobRepository } from '@/features/ai/chatbot/services/chatbot-job-repository';
import { listImageStudioRuns } from '@/features/ai/image-studio/server/run-repository';
import { getAiPathRunQueueStatus } from '@/features/jobs/server';
import type {
  BrainOperationsDomainKey,
  BrainOperationsDomainOverview,
  BrainOperationsDomainState,
  BrainOperationsOverviewResponse,
  BrainOperationsRange,
  BrainOperationsRecentEvent,
  BrainOperationsTrend,
} from '@/shared/contracts/ai-brain';
import {
  brainOperationsOverviewResponseSchema,
  brainOperationsRangeSchema,
} from '@/shared/contracts/ai-brain';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import prisma from '@/shared/lib/db/prisma';

const CHATBOT_SAMPLE_SIZE = 200;
const AGENT_SAMPLE_SIZE = 200;
const IMAGE_STUDIO_SAMPLE_SIZE = 200;
const RECENT_EVENTS_LIMIT = 6;

const RANGE_MS_BY_KEY: Record<BrainOperationsRange, number> = {
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
};

const RANGE_LABELS: Record<BrainOperationsRange, string> = {
  '15m': '15m',
  '1h': '1h',
  '6h': '6h',
  '24h': '24h',
};

type DomainConfig = {
  label: string;
  links: Array<{ label: string; href: string }>;
};

type WindowBounds = {
  currentStartMs: number;
  currentEndMs: number;
  previousStartMs: number;
  previousEndMs: number;
};

type TimedStatusRecord = {
  id?: string;
  status: string;
  timestampMs: number;
};

const DOMAIN_CONFIG: Record<BrainOperationsDomainKey, DomainConfig> = {
  ai_paths: {
    label: 'AI Paths',
    links: [
      { label: 'Queue', href: '/admin/ai-paths/queue' },
      { label: 'Canvas', href: '/admin/ai-paths' },
      { label: 'Dead Letter', href: '/admin/ai-paths/dead-letter' },
    ],
  },
  chatbot: {
    label: 'Chatbot',
    links: [
      { label: 'Chat', href: '/admin/chatbot' },
      { label: 'Sessions', href: '/admin/chatbot/sessions' },
    ],
  },
  agent_runtime: {
    label: 'Agent Runtime',
    links: [
      { label: 'Runs', href: '/admin/agentcreator/runs' },
      { label: 'Agent Creator', href: '/admin/agentcreator' },
    ],
  },
  image_studio: {
    label: 'Image Studio',
    links: [
      { label: 'Studio', href: '/admin/image-studio' },
      { label: 'Settings', href: '/admin/image-studio?tab=settings' },
    ],
  },
};

const nowIso = (): string => new Date().toISOString();

const parseTimestampMs = (value: string | Date | null | undefined): number | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return null;
  return ms;
};

const toIsoOrFallback = (value: string | Date | null | undefined, fallback: string): string => {
  const ms = parseTimestampMs(value);
  if (ms === null) return fallback;
  return new Date(ms).toISOString();
};

const parseRangeFromRequest = (req: NextRequest): BrainOperationsRange => {
  const url = new URL(req.url);
  const parsed = brainOperationsRangeSchema.safeParse(url.searchParams.get('range'));
  return parsed.success ? parsed.data : '1h';
};

const resolveWindowBounds = (range: BrainOperationsRange, nowMs: number): WindowBounds => {
  const windowSize = RANGE_MS_BY_KEY[range];
  const currentEndMs = nowMs;
  const currentStartMs = currentEndMs - windowSize;
  const previousEndMs = currentStartMs;
  const previousStartMs = previousEndMs - windowSize;
  return {
    currentStartMs,
    currentEndMs,
    previousStartMs,
    previousEndMs,
  };
};

const isWithinWindow = (timestampMs: number, startMs: number, endMs: number): boolean =>
  timestampMs >= startMs && timestampMs < endMs;

const buildRecentEvents = (
  records: TimedStatusRecord[],
  window: WindowBounds
): BrainOperationsRecentEvent[] => {
  const currentWindow = records.filter((record) =>
    isWithinWindow(record.timestampMs, window.currentStartMs, window.currentEndMs)
  );
  const source = currentWindow.length > 0 ? currentWindow : records;
  return source
    .slice()
    .sort((a, b) => b.timestampMs - a.timestampMs)
    .slice(0, RECENT_EVENTS_LIMIT)
    .map((record) => ({
      id: record.id,
      status: record.status,
      timestamp: new Date(record.timestampMs).toISOString(),
    }));
};

const buildFailedTrend = (
  records: TimedStatusRecord[],
  window: WindowBounds,
  range: BrainOperationsRange
): BrainOperationsTrend => {
  const current = records.filter(
    (record) =>
      record.status === 'failed' &&
      isWithinWindow(record.timestampMs, window.currentStartMs, window.currentEndMs)
  ).length;
  const previous = records.filter(
    (record) =>
      record.status === 'failed' &&
      isWithinWindow(record.timestampMs, window.previousStartMs, window.previousEndMs)
  ).length;
  const delta = current - previous;
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

  return {
    direction,
    delta,
    label: `Failed vs previous ${RANGE_LABELS[range]}`,
    current,
    previous,
  };
};

const buildUnknownDomain = (
  key: BrainOperationsDomainKey,
  message: string,
  fallbackIso: string
): BrainOperationsDomainOverview => ({
  key,
  label: DOMAIN_CONFIG[key].label,
  state: 'unknown',
  message,
  sampleSize: 0,
  updatedAt: fallbackIso,
  metrics: [],
  trend: {
    direction: 'unknown',
    delta: 0,
    label: 'Trend unavailable.',
  },
  recentEvents: [],
  links: DOMAIN_CONFIG[key].links,
});

const mapAiPathsState = (overall: 'ok' | 'warning' | 'critical'): BrainOperationsDomainState => {
  if (overall === 'ok') return 'healthy';
  if (overall === 'warning') return 'warning';
  return 'critical';
};

const collectAiPathsDomain = async (
  range: BrainOperationsRange
): Promise<BrainOperationsDomainOverview> => {
  const status = await getAiPathRunQueueStatus();
  const overall = status.slo.overall;
  const state = mapAiPathsState(overall);
  const message =
    state === 'healthy'
      ? 'Queue and SLO are healthy.'
      : status.slo.breaches[0]?.message ?? 'AI Paths queue reported degraded health.';
  const updatedAt = status.lastPollTime > 0 ? new Date(status.lastPollTime).toISOString() : nowIso();
  const queueLagValue = status.queueLagMs === null ? 'n/a' : status.queueLagMs;

  return {
    key: 'ai_paths',
    label: DOMAIN_CONFIG.ai_paths.label,
    state,
    message,
    sampleSize: status.brainAnalytics24h.totalReports,
    updatedAt,
    metrics: [
      { key: 'queued_count', label: 'Queued', value: status.queuedCount },
      { key: 'active_runs', label: 'Active runs', value: status.activeRuns },
      { key: 'queue_lag_ms', label: 'Queue lag (ms)', value: queueLagValue },
      { key: 'throughput_per_minute', label: 'Throughput / min', value: status.throughputPerMinute },
      {
        key: 'brain_reports_24h',
        label: 'Brain reports (24h)',
        value: status.brainAnalytics24h.totalReports,
      },
      {
        key: 'brain_error_reports_24h',
        label: 'Brain error reports (24h)',
        value: status.brainAnalytics24h.errorReports,
      },
    ],
    trend: {
      direction: 'unknown',
      delta: 0,
      label: `Trend unavailable for ${RANGE_LABELS[range]} queue snapshot.`,
    },
    recentEvents: [],
    links: DOMAIN_CONFIG.ai_paths.links,
  };
};

const collectChatbotDomain = async (
  window: WindowBounds,
  range: BrainOperationsRange
): Promise<BrainOperationsDomainOverview> => {
  const jobs = await chatbotJobRepository.findAll(CHATBOT_SAMPLE_SIZE);
  const counts = {
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    canceled: 0,
  };

  jobs.forEach((job) => {
    if (job.status in counts) {
      counts[job.status as keyof typeof counts] += 1;
    }
  });

  const timedRecords: TimedStatusRecord[] = jobs.flatMap((job) => {
    const timestampMs = parseTimestampMs(job.createdAt);
    if (timestampMs === null) return [];
    return [{
      id: job.id,
      status: job.status as TimedStatusRecord['status'],
      timestampMs,
    }];
  });

  const trend = buildFailedTrend(timedRecords, window, range);
  const recentEvents = buildRecentEvents(timedRecords, window);

  const state: BrainOperationsDomainState = counts.failed > 0 ? 'warning' : 'healthy';
  const message =
    counts.failed > 0
      ? `${counts.failed} failed job(s) in recent sample.`
      : 'No failed jobs in recent sample.';
  const updatedAt = toIsoOrFallback(jobs[0]?.createdAt, nowIso());

  return {
    key: 'chatbot',
    label: DOMAIN_CONFIG.chatbot.label,
    state,
    message,
    sampleSize: jobs.length,
    updatedAt,
    metrics: [
      { key: 'pending', label: 'Pending', value: counts.pending },
      { key: 'running', label: 'Running', value: counts.running },
      { key: 'completed', label: 'Completed', value: counts.completed },
      { key: 'failed', label: 'Failed', value: counts.failed },
      { key: 'canceled', label: 'Canceled', value: counts.canceled },
      { key: 'failed_current_window', label: `Failed (${RANGE_LABELS[range]})`, value: trend.current ?? 0 },
      { key: 'failed_previous_window', label: 'Failed (prev)', value: trend.previous ?? 0 },
    ],
    trend,
    recentEvents,
    links: DOMAIN_CONFIG.chatbot.links,
  };
};

const collectAgentRuntimeDomain = async (
  window: WindowBounds,
  range: BrainOperationsRange
): Promise<BrainOperationsDomainOverview> => {
  if (!('chatbotAgentRun' in prisma)) {
    return buildUnknownDomain(
      'agent_runtime',
      'Agent Runtime run store is not available for the current database provider.',
      nowIso()
    );
  }

  const runs = await prisma.chatbotAgentRun.findMany({
    orderBy: { updatedAt: 'desc' },
    take: AGENT_SAMPLE_SIZE,
    select: {
      id: true,
      status: true,
      updatedAt: true,
    },
  });

  const counts = {
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0,
    stopped: 0,
    waiting_human: 0,
  };

  runs.forEach((run) => {
    if (run.status in counts) {
      counts[run.status as keyof typeof counts] += 1;
    }
  });

  const timedRecords: TimedStatusRecord[] = runs.flatMap((run) => {
    const timestampMs = parseTimestampMs(run.updatedAt);
    if (timestampMs === null) return [];
    return [{
      id: run.id,
      status: run.status as TimedStatusRecord['status'],
      timestampMs,
    }];
  });

  const trend = buildFailedTrend(timedRecords, window, range);
  const recentEvents = buildRecentEvents(timedRecords, window);

  const state: BrainOperationsDomainState = counts.failed > 0 ? 'warning' : 'healthy';
  const message =
    counts.failed > 0
      ? `${counts.failed} failed run(s) in recent sample.`
      : 'No failed runs in recent sample.';
  const updatedAt = toIsoOrFallback(runs[0]?.updatedAt, nowIso());

  return {
    key: 'agent_runtime',
    label: DOMAIN_CONFIG.agent_runtime.label,
    state,
    message,
    sampleSize: runs.length,
    updatedAt,
    metrics: [
      { key: 'queued', label: 'Queued', value: counts.queued },
      { key: 'running', label: 'Running', value: counts.running },
      { key: 'completed', label: 'Completed', value: counts.completed },
      { key: 'failed', label: 'Failed', value: counts.failed },
      { key: 'stopped', label: 'Stopped', value: counts.stopped },
      { key: 'waiting_human', label: 'Waiting human', value: counts.waiting_human },
      { key: 'failed_current_window', label: `Failed (${RANGE_LABELS[range]})`, value: trend.current ?? 0 },
      { key: 'failed_previous_window', label: 'Failed (prev)', value: trend.previous ?? 0 },
    ],
    trend,
    recentEvents,
    links: DOMAIN_CONFIG.agent_runtime.links,
  };
};

const collectImageStudioDomain = async (
  window: WindowBounds,
  range: BrainOperationsRange
): Promise<BrainOperationsDomainOverview> => {
  const result = await listImageStudioRuns({
    limit: IMAGE_STUDIO_SAMPLE_SIZE,
    offset: 0,
  });
  const counts = {
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0,
  };

  result.runs.forEach((run) => {
    if (run.status in counts) {
      counts[run.status as keyof typeof counts] += 1;
    }
  });

  const timedRecords: TimedStatusRecord[] = result.runs.flatMap((run) => {
    const timestampMs = parseTimestampMs(run.updatedAt ?? run.createdAt);
    if (timestampMs === null) return [];
    return [{
      id: run.id,
      status: run.status as TimedStatusRecord['status'],
      timestampMs,
    }];
  });

  const trend = buildFailedTrend(timedRecords, window, range);
  const recentEvents = buildRecentEvents(timedRecords, window);

  const state: BrainOperationsDomainState = counts.failed > 0 ? 'warning' : 'healthy';
  const message =
    counts.failed > 0
      ? `${counts.failed} failed run(s) in recent sample.`
      : 'No failed runs in recent sample.';
  const updatedAt = toIsoOrFallback(result.runs[0]?.updatedAt, nowIso());

  return {
    key: 'image_studio',
    label: DOMAIN_CONFIG.image_studio.label,
    state,
    message,
    sampleSize: result.runs.length,
    updatedAt,
    metrics: [
      { key: 'queued', label: 'Queued', value: counts.queued },
      { key: 'running', label: 'Running', value: counts.running },
      { key: 'completed', label: 'Completed', value: counts.completed },
      { key: 'failed', label: 'Failed', value: counts.failed },
      { key: 'failed_current_window', label: `Failed (${RANGE_LABELS[range]})`, value: trend.current ?? 0 },
      { key: 'failed_previous_window', label: 'Failed (prev)', value: trend.previous ?? 0 },
    ],
    trend,
    recentEvents,
    links: DOMAIN_CONFIG.image_studio.links,
  };
};

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const range = parseRangeFromRequest(req);
  const nowMs = Date.now();
  const windowBounds = resolveWindowBounds(range, nowMs);
  const generatedAt = new Date(windowBounds.currentEndMs).toISOString();

  const tasks: Record<BrainOperationsDomainKey, Promise<BrainOperationsDomainOverview>> = {
    ai_paths: collectAiPathsDomain(range),
    chatbot: collectChatbotDomain(windowBounds, range),
    agent_runtime: collectAgentRuntimeDomain(windowBounds, range),
    image_studio: collectImageStudioDomain(windowBounds, range),
  };

  const keys = Object.keys(tasks) as BrainOperationsDomainKey[];
  const settled = await Promise.allSettled(keys.map((key) => tasks[key]));

  const domains = {} as BrainOperationsOverviewResponse['domains'];

  settled.forEach((result, index) => {
    const key = keys[index];
    if (!key) return;
    if (result.status === 'fulfilled') {
      domains[key] = result.value;
      return;
    }
    const errorMessage =
      result.reason instanceof Error ? result.reason.message : 'Collector execution failed.';
    domains[key] = buildUnknownDomain(key, errorMessage, generatedAt);
  });

  const payload = brainOperationsOverviewResponseSchema.parse({
    range,
    generatedAt,
    window: {
      currentStart: new Date(windowBounds.currentStartMs).toISOString(),
      currentEnd: new Date(windowBounds.currentEndMs).toISOString(),
      previousStart: new Date(windowBounds.previousStartMs).toISOString(),
      previousEnd: new Date(windowBounds.previousEndMs).toISOString(),
    },
    domains,
  });

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
