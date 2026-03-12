import { describe, it, expect, vi, beforeEach } from 'vitest';

import { notifyCriticalError } from '@/shared/lib/observability/critical-error-notifier';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

vi.mock('@/shared/utils/transient-recovery', () => ({
  withTransientRecovery: vi.fn((fn) => fn()),
}));

describe('critical-error-notifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as typeof globalThis & { __criticalErrorNotificationCache?: Map<string, number> })
      .__criticalErrorNotificationCache;
    process.env['MONGODB_URI'] = 'mongodb://localhost';
    (global as any).fetch = vi.fn().mockResolvedValue({ ok: true });

    const mockCollection = {
      findOne: vi.fn().mockImplementation(({ $or }: { $or: Array<{ _id?: string; key?: string }> }) => {
        const key = $or[0]?._id ?? $or[1]?.key;
        if (key === 'critical_notifications_enabled') return { value: 'true' };
        if (key === 'critical_notifications_webhook_url') return { value: 'http://webhook.test' };
        if (key === 'critical_notifications_min_level') return { value: 'error' };
        return null;
      }),
    };
    const mockDb = {
      collection: vi.fn().mockReturnValue(mockCollection),
    };
    (getMongoDb as any).mockResolvedValue(mockDb);
  });

  it('should send a notification for a critical error', async () => {
    const log = {
      id: 'log-1',
      level: 'error' as const,
      message: 'Critical breakdown',
      createdAt: new Date(),
    };

    const result = await notifyCriticalError(log as any, true);

    expect(result.delivered).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://webhook.test',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Critical breakdown'),
      })
    );
  });

  it('should not send if not critical', async () => {
    const log = {
      level: 'error' as const,
      message: 'Error but not critical',
    };

    const result = await notifyCriticalError(log as any, false);

    expect(result.delivered).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should not send if level is below threshold', async () => {
    (getMongoDb as any).mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        findOne: vi.fn().mockImplementation(({ $or }: { $or: Array<{ _id?: string; key?: string }> }) => {
          const key = $or[0]?._id ?? $or[1]?.key;
          if (key === 'critical_notifications_min_level') return { value: 'error' };
          if (key === 'critical_notifications_enabled') return { value: 'true' };
          if (key === 'critical_notifications_webhook_url') return { value: 'http://webhook.test' };
          return null;
        }),
      }),
    });


    const log = {
      level: 'warn' as const,
      message: 'Warning message',
    };

    const result = await notifyCriticalError(log as any, true);

    expect(result.delivered).toBe(false);
  });

  it('should throttle duplicate notifications', async () => {
    const log = {
      level: 'error' as const,
      message: 'Repeated error',
    };

    const first = await notifyCriticalError(log as any, true);
    expect(first.delivered).toBe(true);

    const second = await notifyCriticalError(log as any, true);
    expect(second.delivered).toBe(false);
    expect(second.throttled).toBe(true);
  });
});
