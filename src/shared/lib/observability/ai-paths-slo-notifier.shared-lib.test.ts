import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiPathRunQueueSloStatus } from '@/shared/contracts/ai-paths-runtime';
import { notifyAiPathsSloBreach } from '@/shared/lib/observability/ai-paths-slo-notifier';
import { getRedisConnection } from '@/shared/lib/queue';

const getMongoDbMock = vi.hoisted(() => vi.fn());
const getRedisConnectionMock = vi.hoisted(() => vi.fn());
const withTransientRecoveryMock = vi.hoisted(() => vi.fn());
const captureExceptionMock = vi.hoisted(() => vi.fn());
const logWarningMock = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/lib/queue', () => ({
  getRedisConnection: getRedisConnectionMock,
}));

vi.mock('@/shared/lib/observability/transient-recovery/with-recovery', () => ({
  withTransientRecovery: withTransientRecoveryMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
    logWarning: logWarningMock,
  },
}));

const buildStatus = (
  overall: 'ok' | 'warning' | 'critical',
  breach?: { indicator: string; level: 'warning' | 'critical'; message: string }
): AiPathRunQueueSloStatus => ({
  overall,
  evaluatedAt: '2026-03-25T15:00:00.000Z',
  thresholds: {
    queueLagWarningMs: 60_000,
    queueLagCriticalMs: 180_000,
    successRateWarningPct: 95,
    successRateCriticalPct: 90,
    failureRateWarningPct: 5,
    failureRateCriticalPct: 10,
    brainErrorRateWarningPct: 5,
    brainErrorRateCriticalPct: 15,
    minTerminalSamples: 10,
    minBrainSamples: 20,
  },
  indicators: {
    workerHealth: {
      level: 'ok',
      running: true,
      healthy: true,
      message: 'Worker healthy',
    },
    queueLag: {
      level: breach?.indicator === 'queueLag' ? breach.level : 'ok',
      valueMs: 0,
      message: breach?.indicator === 'queueLag' ? breach.message : 'No lag',
    },
    successRate24h: {
      level: breach?.indicator === 'successRate24h' ? breach.level : 'ok',
      valuePct: 100,
      sampleSize: 100,
      message: breach?.indicator === 'successRate24h' ? breach.message : 'Success okay',
    },
    failureRate24h: {
      level: breach?.indicator === 'failureRate24h' ? breach.level : 'ok',
      valuePct: 0,
      sampleSize: 100,
      message:
        breach?.indicator === 'failureRate24h' ? breach.message : 'Failure rate okay',
    },
    brainErrorRate24h: {
      level: breach?.indicator === 'brainErrorRate24h' ? breach.level : 'ok',
      valuePct: 0,
      sampleSize: 100,
      message:
        breach?.indicator === 'brainErrorRate24h' ? breach.message : 'Brain-error okay',
    },
  },
  breachCount: breach ? 1 : 0,
  breaches: breach ? [breach] : [],
});

describe('ai-paths-slo-notifier shared-lib coverage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-25T15:00:00.000Z'));
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    withTransientRecoveryMock.mockImplementation(async (op: () => Promise<Response>) => op());
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(null),
      }),
    });
    getRedisConnectionMock.mockReturnValue(null);

    delete process.env['MONGODB_URI'];
    delete process.env['AI_PATHS_SLO_NOTIFICATIONS_ENABLED'];
    delete process.env['AI_PATHS_SLO_WEBHOOK_URL'];
    delete process.env['AI_PATHS_SLO_MIN_LEVEL'];
    delete process.env['AI_PATHS_SLO_COOLDOWN_SECONDS'];

    const globalAny = globalThis as typeof globalThis & {
      __aiPathsSloNotificationCache?: Map<string, number>;
    };
    globalAny.__aiPathsSloNotificationCache?.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('skips notifications entirely when the status is healthy', async () => {
    const result = await notifyAiPathsSloBreach({
      status: buildStatus('ok'),
    });

    expect(result).toEqual({
      delivered: false,
      throttled: false,
      skipped: true,
      reason: 'slo-ok',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('delivers critical notifications when env settings enable the webhook', async () => {
    process.env['AI_PATHS_SLO_NOTIFICATIONS_ENABLED'] = 'true';
    process.env['AI_PATHS_SLO_WEBHOOK_URL'] = 'http://webhook.test';

    const result = await notifyAiPathsSloBreach({
      status: buildStatus('critical', {
        indicator: 'queueLag',
        level: 'critical',
        message: 'Queue lag above critical threshold.',
      }),
      queue: { running: true, activeRuns: 4, queuedCount: 12 },
    });

    expect(result.delivered).toBe(true);
    expect(result.signature).toEqual(expect.any(String));
    expect(fetch).toHaveBeenCalledWith(
      'http://webhook.test',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('ai_paths_slo_breach'),
      })
    );
  });

  it('skips warning notifications when the configured minimum level is critical', async () => {
    process.env['AI_PATHS_SLO_NOTIFICATIONS_ENABLED'] = 'true';
    process.env['AI_PATHS_SLO_WEBHOOK_URL'] = 'http://webhook.test';
    process.env['AI_PATHS_SLO_MIN_LEVEL'] = 'critical';

    const result = await notifyAiPathsSloBreach({
      status: buildStatus('warning', {
        indicator: 'queueLag',
        level: 'warning',
        message: 'Queue lag above warning threshold.',
      }),
    });

    expect(result).toEqual({
      delivered: false,
      throttled: false,
      skipped: true,
      reason: 'below-min-level',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('throttles duplicate notifications in memory during the cooldown window', async () => {
    process.env['AI_PATHS_SLO_NOTIFICATIONS_ENABLED'] = 'true';
    process.env['AI_PATHS_SLO_WEBHOOK_URL'] = 'http://webhook.test';
    process.env['AI_PATHS_SLO_COOLDOWN_SECONDS'] = '60';

    const status = buildStatus('critical', {
      indicator: 'queueLag',
      level: 'critical',
      message: 'Queue lag above critical threshold.',
    });

    const first = await notifyAiPathsSloBreach({ status });
    const second = await notifyAiPathsSloBreach({ status });

    expect(first.delivered).toBe(true);
    expect(second.delivered).toBe(false);
    expect(second.throttled).toBe(true);
    expect(second.reason).toBe('cooldown');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('uses Redis NX cooldown keys for distributed throttling', async () => {
    process.env['AI_PATHS_SLO_NOTIFICATIONS_ENABLED'] = 'true';
    process.env['AI_PATHS_SLO_WEBHOOK_URL'] = 'http://webhook.test';
    process.env['AI_PATHS_SLO_COOLDOWN_SECONDS'] = '60';

    const redis = {
      set: vi.fn().mockResolvedValueOnce('OK').mockResolvedValueOnce(null),
      del: vi.fn().mockResolvedValue(1),
    };
    vi.mocked(getRedisConnection).mockReturnValue(redis as never);

    const status = buildStatus('critical', {
      indicator: 'queueLag',
      level: 'critical',
      message: 'Queue lag above critical threshold.',
    });

    const first = await notifyAiPathsSloBreach({ status });
    const second = await notifyAiPathsSloBreach({ status });

    expect(first.delivered).toBe(true);
    expect(second.throttled).toBe(true);
    expect(redis.set).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('releases the throttle slot and reports warning details when the webhook fails', async () => {
    process.env['AI_PATHS_SLO_NOTIFICATIONS_ENABLED'] = 'true';
    process.env['AI_PATHS_SLO_WEBHOOK_URL'] = 'http://webhook.test';
    process.env['AI_PATHS_SLO_COOLDOWN_SECONDS'] = '60';

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, statusText: 'Down' }));

    const redis = {
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
    };
    vi.mocked(getRedisConnection).mockReturnValue(redis as never);

    const result = await notifyAiPathsSloBreach({
      status: buildStatus('critical', {
        indicator: 'queueLag',
        level: 'critical',
        message: 'Queue lag above critical threshold.',
      }),
    });

    expect(result.delivered).toBe(false);
    expect(result.reason).toBe('http-503');
    expect(redis.del).toHaveBeenCalledTimes(1);
    expect(logWarningMock).toHaveBeenCalledWith(
      '[ai-paths-slo-notifier] Webhook failed',
      expect.objectContaining({
        service: 'ai-paths-slo-notifier',
        status: 503,
        statusText: 'Down',
      })
    );
  });

  it('prefers persisted notification settings over env defaults when Mongo is enabled', async () => {
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    process.env['AI_PATHS_SLO_NOTIFICATIONS_ENABLED'] = 'false';
    process.env['AI_PATHS_SLO_WEBHOOK_URL'] = 'http://env-webhook.test';
    process.env['AI_PATHS_SLO_MIN_LEVEL'] = 'critical';
    process.env['AI_PATHS_SLO_COOLDOWN_SECONDS'] = '5';

    const settingsByKey = new Map<string, string>([
      ['ai_paths_slo_notifications_enabled', 'true'],
      ['ai_paths_slo_notifications_webhook_url', 'http://mongo-webhook.test'],
      ['ai_paths_slo_notifications_min_level', 'warning'],
      ['ai_paths_slo_notifications_cooldown_seconds', '90'],
    ]);
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        findOne: vi.fn().mockImplementation(async (query: { $or?: Array<{ _id?: string; key?: string }> }) => {
          const key = query.$or?.[0]?._id ?? query.$or?.[1]?.key ?? '';
          const value = settingsByKey.get(key);
          return value ? { value } : null;
        }),
      }),
    });

    const result = await notifyAiPathsSloBreach({
      status: buildStatus('warning', {
        indicator: 'queueLag',
        level: 'warning',
        message: 'Queue lag above warning threshold.',
      }),
    });

    expect(result.delivered).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      'http://mongo-webhook.test',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });
});
