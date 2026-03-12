import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMongoDb } from '@/shared/lib/db/mongo-client';
import {
  CENTRAL_LOG_DEAD_LETTER_SETTINGS_KEY,
  loadCentralLogDeadLetters,
  saveCentralLogDeadLetters,
} from '@/shared/lib/observability/central-log-dead-letter-store';

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
    process.env['MONGODB_URI'] = 'mongodb://example';
  });

  it('loads normalized entries from stored setting payload', async () => {
    const findOne = vi.fn().mockResolvedValue({
      value: JSON.stringify({
        version: 1,
        updatedAt: '2026-03-05T00:00:00.000Z',
        entries: [deadLetterEntry],
      }),
    });
    const collection = vi.fn().mockReturnValue({ findOne });
    vi.mocked(getMongoDb).mockResolvedValue({
      collection,
    } as Awaited<ReturnType<typeof getMongoDb>>);

    const entries = await loadCentralLogDeadLetters({ maxEntries: 10 });

    expect(entries).toEqual([deadLetterEntry]);
    expect(collection).toHaveBeenCalledWith('settings');
    expect(findOne).toHaveBeenCalledWith(
      { $or: [{ _id: CENTRAL_LOG_DEAD_LETTER_SETTINGS_KEY }, { key: CENTRAL_LOG_DEAD_LETTER_SETTINGS_KEY }] },
      { projection: { value: 1 } }
    );
  });

  it('returns an empty list when payload is malformed JSON', async () => {
    const findOne = vi.fn().mockResolvedValue({
      value: '{',
    });
    const collection = vi.fn().mockReturnValue({ findOne });
    vi.mocked(getMongoDb).mockResolvedValue({
      collection,
    } as Awaited<ReturnType<typeof getMongoDb>>);

    const entries = await loadCentralLogDeadLetters({ maxEntries: 10 });

    expect(entries).toEqual([]);
  });

  it('persists dead letters to mongodb settings storage', async () => {
    const updateOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const collection = vi.fn().mockReturnValue({ updateOne });
    vi.mocked(getMongoDb).mockResolvedValue({
      collection,
    } as Awaited<ReturnType<typeof getMongoDb>>);

    const persisted = await saveCentralLogDeadLetters([deadLetterEntry], { maxEntries: 10 });

    expect(persisted).toBe(true);
    expect(collection).toHaveBeenCalledWith('settings');
    expect(updateOne).toHaveBeenCalledTimes(1);
    expect(updateOne).toHaveBeenCalledWith(
      { $or: [{ _id: CENTRAL_LOG_DEAD_LETTER_SETTINGS_KEY }, { key: CENTRAL_LOG_DEAD_LETTER_SETTINGS_KEY }] },
      expect.objectContaining({
        $set: expect.objectContaining({
          key: CENTRAL_LOG_DEAD_LETTER_SETTINGS_KEY,
        }),
        $setOnInsert: expect.objectContaining({
          _id: CENTRAL_LOG_DEAD_LETTER_SETTINGS_KEY,
        }),
      }),
      { upsert: true }
    );
  });
});
