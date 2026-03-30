import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CENTRAL_LOG_DEAD_LETTER_SETTINGS_KEY,
  loadCentralLogDeadLetters,
  saveCentralLogDeadLetters,
} from '@/shared/lib/observability/central-log-dead-letter-store';

const getMongoDbMock = vi.hoisted(() => vi.fn());
const reportObservabilityInternalErrorMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/utils/observability/internal-observability-fallback', () => ({
  reportObservabilityInternalError: reportObservabilityInternalErrorMock,
}));

describe('central-log-dead-letter-store shared-lib coverage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-25T14:00:00.000Z'));
    getMongoDbMock.mockReset();
    reportObservabilityInternalErrorMock.mockReset();
    process.env['MONGODB_URI'] = 'mongodb://example.test/db';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads normalized envelope entries and applies max-entry trimming', async () => {
    const findOne = vi.fn().mockResolvedValue({
      value: JSON.stringify({
        version: 1,
        updatedAt: '2026-03-25T13:00:00.000Z',
        entries: [
          { payload: { invalid: true } },
          {
            payload: { id: 'keep-1' },
            queuedAt: '2026-03-25T13:01:00.000Z',
            lastError: 'timeout',
            retryCount: '2',
          },
          {
            payload: { id: 'keep-2' },
            queuedAt: '2026-03-25T13:02:00.000Z',
            lastError: 'unreachable',
            retryCount: 3,
          },
        ],
      }),
    });
    const collection = vi.fn().mockReturnValue({ findOne });
    getMongoDbMock.mockResolvedValue({ collection });

    const result = await loadCentralLogDeadLetters({ maxEntries: 1 });

    expect(result).toEqual([
      {
        payload: { id: 'keep-2' },
        queuedAt: '2026-03-25T13:02:00.000Z',
        lastError: 'unreachable',
        retryCount: 3,
      },
    ]);
    expect(collection).toHaveBeenCalledWith('settings');
    expect(findOne).toHaveBeenCalledWith(
      {
        $or: [
          { _id: CENTRAL_LOG_DEAD_LETTER_SETTINGS_KEY },
          { key: CENTRAL_LOG_DEAD_LETTER_SETTINGS_KEY },
        ],
      },
      { projection: { value: 1 } }
    );
  });

  it('returns an empty list and reports parse failures for malformed payloads', async () => {
    const findOne = vi.fn().mockResolvedValue({ value: '{' });
    const collection = vi.fn().mockReturnValue({ findOne });
    getMongoDbMock.mockResolvedValue({ collection });

    await expect(loadCentralLogDeadLetters({ maxEntries: 10 })).resolves.toEqual([]);

    expect(reportObservabilityInternalErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'observability.central-log-dead-letter-store',
        action: 'parseStoredEntries',
      })
    );
  });

  it('serializes normalized entries back into settings storage', async () => {
    const updateOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const collection = vi.fn().mockReturnValue({ updateOne });
    getMongoDbMock.mockResolvedValue({ collection });

    const persisted = await saveCentralLogDeadLetters(
      [
        {
          payload: { id: 'entry-1' },
          queuedAt: '',
          lastError: '',
          retryCount: 0,
        },
        {
          payload: { id: 'entry-2' },
          queuedAt: '2026-03-25T13:10:00.000Z',
          lastError: 'network',
          retryCount: 4,
        },
      ],
      { maxEntries: 10_000 }
    );

    expect(persisted).toBe(true);
    const [, updatePayload] = updateOne.mock.calls[0] ?? [];
    const storedEnvelope = JSON.parse(updatePayload.$set.value as string) as {
      entries: Array<{
        payload: Record<string, unknown>;
        queuedAt: string;
        lastError: string;
        retryCount: number;
      }>;
      updatedAt: string;
      version: number;
    };

    expect(storedEnvelope.version).toBe(1);
    expect(storedEnvelope.updatedAt).toBe('2026-03-25T14:00:00.000Z');
    expect(storedEnvelope.entries).toEqual([
      {
        payload: { id: 'entry-1' },
        queuedAt: '2026-03-25T14:00:00.000Z',
        lastError: 'unknown_forward_error',
        retryCount: 1,
      },
      {
        payload: { id: 'entry-2' },
        queuedAt: '2026-03-25T13:10:00.000Z',
        lastError: 'network',
        retryCount: 4,
      },
    ]);
  });
});
