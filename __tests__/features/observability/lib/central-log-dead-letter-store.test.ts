import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import {
  loadCentralLogDeadLetters,
  saveCentralLogDeadLetters,
} from '@/shared/lib/observability/central-log-dead-letter-store';

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: vi.fn(),
}));

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    setting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

const deadLetterEntry = {
  payload: { message: 'Central sink unavailable', level: 'error' },
  queuedAt: '2026-03-05T00:00:00.000Z',
  lastError: 'network outage',
  retryCount: 1,
};

describe('central-log-dead-letter-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['DATABASE_URL'] = 'postgres://example';
    process.env['MONGODB_URI'] = 'mongodb://example';
    vi.mocked(getAppDbProvider).mockResolvedValue('prisma');
  });

  it('loads normalized entries from stored setting payload', async () => {
    vi.mocked(prisma.setting.findUnique).mockResolvedValue({
      value: JSON.stringify({
        version: 1,
        updatedAt: '2026-03-05T00:00:00.000Z',
        entries: [deadLetterEntry],
      }),
    } as { value: string });

    const entries = await loadCentralLogDeadLetters({ maxEntries: 10 });

    expect(entries).toEqual([deadLetterEntry]);
  });

  it('returns an empty list when payload is malformed JSON', async () => {
    vi.mocked(prisma.setting.findUnique).mockResolvedValue({
      value: '{',
    } as { value: string });

    const entries = await loadCentralLogDeadLetters({ maxEntries: 10 });

    expect(entries).toEqual([]);
  });

  it('persists dead letters to mongodb when mongodb provider is active', async () => {
    vi.mocked(getAppDbProvider).mockResolvedValue('mongodb');
    const updateOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const collection = vi.fn().mockReturnValue({ updateOne });
    vi.mocked(getMongoDb).mockResolvedValue({
      collection,
    } as unknown as Awaited<ReturnType<typeof getMongoDb>>);

    const persisted = await saveCentralLogDeadLetters([deadLetterEntry], { maxEntries: 10 });

    expect(persisted).toBe(true);
    expect(updateOne).toHaveBeenCalledTimes(1);
  });
});
