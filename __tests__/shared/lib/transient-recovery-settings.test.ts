import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_TRANSIENT_RECOVERY_SETTINGS } from '@/shared/lib/observability/transient-recovery/constants';
import { getTransientRecoverySettings } from '@/shared/lib/observability/transient-recovery/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

describe('Transient Recovery Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://example';
  });

  it('returns default settings if no setting found in DB', async () => {
    const findOne = vi.fn().mockResolvedValue(null);
    const collection = vi.fn().mockReturnValue({ findOne });
    vi.mocked(getMongoDb).mockResolvedValue({
      collection,
    } as Awaited<ReturnType<typeof getMongoDb>>);

    const settings = await getTransientRecoverySettings({ force: true });

    expect(settings).toEqual(DEFAULT_TRANSIENT_RECOVERY_SETTINGS);
  });

  it('normalizes invalid values from DB', async () => {
    const invalidData = JSON.stringify({
      retry: { maxAttempts: -5, initialDelayMs: 'invalid' },
    });
    const findOne = vi.fn().mockResolvedValue({ value: invalidData });
    const collection = vi.fn().mockReturnValue({ findOne });
    vi.mocked(getMongoDb).mockResolvedValue({
      collection,
    } as Awaited<ReturnType<typeof getMongoDb>>);

    const settings = await getTransientRecoverySettings({ force: true });

    expect(settings.retry.maxAttempts).toBe(DEFAULT_TRANSIENT_RECOVERY_SETTINGS.retry.maxAttempts);
    expect(settings.retry.initialDelayMs).toBe(
      DEFAULT_TRANSIENT_RECOVERY_SETTINGS.retry.initialDelayMs
    );
  });

  it('respects valid settings from DB', async () => {
    const validData = JSON.stringify({
      enabled: false,
      retry: { maxAttempts: 10, initialDelayMs: 5000 },
    });
    const findOne = vi.fn().mockResolvedValue({ value: validData });
    const collection = vi.fn().mockReturnValue({ findOne });
    vi.mocked(getMongoDb).mockResolvedValue({
      collection,
    } as Awaited<ReturnType<typeof getMongoDb>>);

    const settings = await getTransientRecoverySettings({ force: true });

    expect(settings.enabled).toBe(false);
    expect(settings.retry.maxAttempts).toBe(10);
    expect(settings.retry.initialDelayMs).toBe(5000);
  });
});
