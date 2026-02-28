import { describe, it, expect, vi, beforeEach } from 'vitest';

import { notifyCriticalError } from '@/shared/lib/observability/critical-error-notifier';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';

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

vi.mock('@/shared/lib/observability/transient-recovery/with-recovery', () => ({
  withTransientRecovery: vi.fn((op) => op()),
}));

describe('critical-error-notifier', () => {
  const mockLog: any = {
    level: 'error',
    message: 'Test critical error',
    source: 'test-source',
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    (getAppDbProvider as any).mockResolvedValue('prisma');

    // Clear global throttle cache
    const globalAny = globalThis as any;
    if (globalAny.__criticalErrorNotificationCache) {
      globalAny.__criticalErrorNotificationCache.clear();
    }
  });

  it('should not notify if disabled', async () => {
    process.env['CRITICAL_ERROR_NOTIFICATIONS_ENABLED'] = 'false';
    const result = await notifyCriticalError(mockLog, true);
    expect(result.delivered).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should notify if enabled and critical', async () => {
    process.env['CRITICAL_ERROR_NOTIFICATIONS_ENABLED'] = 'true';
    process.env['CRITICAL_ERROR_WEBHOOK_URL'] = 'http://webhook.test';

    const result = await notifyCriticalError(mockLog, true);

    expect(result.delivered).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      'http://webhook.test',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Test critical error'),
      })
    );
  });

  it('should throttle frequent identical notifications', async () => {
    process.env['CRITICAL_ERROR_NOTIFICATIONS_ENABLED'] = 'true';
    process.env['CRITICAL_ERROR_WEBHOOK_URL'] = 'http://webhook.test';
    process.env['CRITICAL_ERROR_THROTTLE_SECONDS'] = '60';

    // First call
    const res1 = await notifyCriticalError(mockLog, true);
    expect(res1.delivered).toBe(true);
    expect(res1.throttled).toBe(false);

    // Immediate second call
    const res2 = await notifyCriticalError(mockLog, true);
    expect(res2.delivered).toBe(false);
    expect(res2.throttled).toBe(true);

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should not notify if log level is below minimum', async () => {
    process.env['CRITICAL_ERROR_NOTIFICATIONS_ENABLED'] = 'true';
    process.env['CRITICAL_ERROR_WEBHOOK_URL'] = 'http://webhook.test';
    process.env['CRITICAL_ERROR_MIN_LEVEL'] = 'error';

    const infoLog = { ...mockLog, level: 'info' };
    const result = await notifyCriticalError(infoLog, true);

    expect(result.delivered).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
