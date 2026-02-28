import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiPathRunQueueSloStatus } from '@/features/ai/ai-paths/workers/aiPathRunQueue';
import { notifyAiPathsSloBreach } from '@/features/observability/lib/ai-paths-slo-notifier';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getRedisConnection } from '@/shared/lib/queue';

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: vi.fn(),
}));

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    setting: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      findOne: vi.fn(),
    }),
  }),
}));

vi.mock('@/shared/lib/queue', () => ({
  getRedisConnection: vi.fn(),
}));

vi.mock('@/shared/lib/observability/transient-recovery/with-recovery', () => ({
  withTransientRecovery: vi.fn((op) => op()),
}));

const buildStatus = (
  overall: 'warning' | 'critical',
  breach: { indicator: string; level: 'warning' | 'critical'; message: string }
): AiPathRunQueueSloStatus => ({
  overall,
  evaluatedAt: new Date('2026-02-10T10:00:00.000Z').toISOString(),
  thresholds: {
    queueLagWarningMs: 60000,
    queueLagCriticalMs: 180000,
    successRateWarningPct: 95,
    successRateCriticalPct: 90,
    deadLetterRateWarningPct: 1,
    deadLetterRateCriticalPct: 3,
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
      message: 'Worker is healthy.',
    },
    queueLag: {
      level: breach.indicator === 'queueLag' ? breach.level : 'ok',
      valueMs: 0,
      message: breach.indicator === 'queueLag' ? breach.message : 'No queued runs.',
    },
    successRate24h: {
      level: breach.indicator === 'successRate24h' ? breach.level : 'ok',
      valuePct: 100,
      sampleSize: 100,
      message:
        breach.indicator === 'successRate24h'
          ? breach.message
          : 'Success 100% over 100 terminal runs.',
    },
    deadLetterRate24h: {
      level: breach.indicator === 'deadLetterRate24h' ? breach.level : 'ok',
      valuePct: 0,
      sampleSize: 100,
      message:
        breach.indicator === 'deadLetterRate24h'
          ? breach.message
          : 'Dead-letter rate 0% over 100 terminal runs.',
    },
    brainErrorRate24h: {
      level: breach.indicator === 'brainErrorRate24h' ? breach.level : 'ok',
      valuePct: 0,
      sampleSize: 100,
      message:
        breach.indicator === 'brainErrorRate24h'
          ? breach.message
          : 'Brain error rate 0% over 100 reports.',
    },
  },
  breachCount: 1,
  breaches: [breach],
});

describe('ai-paths-slo-notifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    vi.mocked(getAppDbProvider).mockResolvedValue('prisma');
    vi.mocked(getRedisConnection).mockReturnValue(null);

    delete process.env['AI_PATHS_SLO_NOTIFICATIONS_ENABLED'];
    delete process.env['AI_PATHS_SLO_WEBHOOK_URL'];
    delete process.env['AI_PATHS_SLO_MIN_LEVEL'];
    delete process.env['AI_PATHS_SLO_COOLDOWN_SECONDS'];

    const globalAny = globalThis as unknown as { __aiPathsSloNotificationCache?: Map<string, number> };
    if (globalAny.__aiPathsSloNotificationCache) {
      globalAny.__aiPathsSloNotificationCache.clear();
    }
  });

  it('delivers notification for critical breaches when enabled', async () => {
    process.env['AI_PATHS_SLO_NOTIFICATIONS_ENABLED'] = 'true';
    process.env['AI_PATHS_SLO_WEBHOOK_URL'] = 'http://webhook.test';

    const result = await notifyAiPathsSloBreach({
      status: buildStatus('critical', {
        indicator: 'queueLag',
        level: 'critical',
        message: 'Lag is above critical threshold.',
      }),
    });

    expect(result.delivered).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      'http://webhook.test',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('ai_paths_slo_breach'),
      })
    );
  });

  it('skips warning notifications when minimum level is critical', async () => {
    process.env['AI_PATHS_SLO_NOTIFICATIONS_ENABLED'] = 'true';
    process.env['AI_PATHS_SLO_WEBHOOK_URL'] = 'http://webhook.test';
    process.env['AI_PATHS_SLO_MIN_LEVEL'] = 'critical';

    const result = await notifyAiPathsSloBreach({
      status: buildStatus('warning', {
        indicator: 'queueLag',
        level: 'warning',
        message: 'Lag is above warning threshold.',
      }),
    });

    expect(result.delivered).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('below-min-level');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('throttles duplicate breach signatures within cooldown window', async () => {
    process.env['AI_PATHS_SLO_NOTIFICATIONS_ENABLED'] = 'true';
    process.env['AI_PATHS_SLO_WEBHOOK_URL'] = 'http://webhook.test';
    process.env['AI_PATHS_SLO_COOLDOWN_SECONDS'] = '60';

    const status = buildStatus('critical', {
      indicator: 'queueLag',
      level: 'critical',
      message: 'Lag is above critical threshold.',
    });

    const first = await notifyAiPathsSloBreach({ status });
    const second = await notifyAiPathsSloBreach({ status });

    expect(first.delivered).toBe(true);
    expect(second.delivered).toBe(false);
    expect(second.throttled).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not throttle when breach signature changes', async () => {
    process.env['AI_PATHS_SLO_NOTIFICATIONS_ENABLED'] = 'true';
    process.env['AI_PATHS_SLO_WEBHOOK_URL'] = 'http://webhook.test';
    process.env['AI_PATHS_SLO_COOLDOWN_SECONDS'] = '60';

    const first = await notifyAiPathsSloBreach({
      status: buildStatus('critical', {
        indicator: 'queueLag',
        level: 'critical',
        message: 'Lag is above critical threshold.',
      }),
    });
    const second = await notifyAiPathsSloBreach({
      status: buildStatus('critical', {
        indicator: 'successRate24h',
        level: 'critical',
        message: 'Success rate dropped below threshold.',
      }),
    });

    expect(first.delivered).toBe(true);
    expect(second.delivered).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('uses Redis cooldown key for distributed dedupe', async () => {
    process.env['AI_PATHS_SLO_NOTIFICATIONS_ENABLED'] = 'true';
    process.env['AI_PATHS_SLO_WEBHOOK_URL'] = 'http://webhook.test';
    process.env['AI_PATHS_SLO_COOLDOWN_SECONDS'] = '60';

    const redis = {
      set: vi.fn().mockResolvedValueOnce('OK').mockResolvedValueOnce(null),
      del: vi.fn().mockResolvedValue(1),
    };
    vi.mocked(getRedisConnection).mockReturnValue(redis as unknown as any);

    const status = buildStatus('critical', {
      indicator: 'queueLag',
      level: 'critical',
      message: 'Lag is above critical threshold.',
    });

    const first = await notifyAiPathsSloBreach({ status });
    const second = await notifyAiPathsSloBreach({ status });

    expect(first.delivered).toBe(true);
    expect(second.throttled).toBe(true);
    expect(redis.set).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('releases Redis cooldown key on failed webhook response', async () => {
    process.env['AI_PATHS_SLO_NOTIFICATIONS_ENABLED'] = 'true';
    process.env['AI_PATHS_SLO_WEBHOOK_URL'] = 'http://webhook.test';
    process.env['AI_PATHS_SLO_COOLDOWN_SECONDS'] = '60';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503, statusText: 'Down' })
    );

    const redis = {
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
    };
    vi.mocked(getRedisConnection).mockReturnValue(redis as unknown as any);

    const result = await notifyAiPathsSloBreach({
      status: buildStatus('critical', {
        indicator: 'queueLag',
        level: 'critical',
        message: 'Lag is above critical threshold.',
      }),
    });

    expect(result.delivered).toBe(false);
    expect(result.reason).toBe('http-503');
    expect(redis.del).toHaveBeenCalledTimes(1);
  });
});
