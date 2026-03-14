import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { readStoredSettingValueMock, upsertStoredSettingValueMock } = vi.hoisted(() => ({
  readStoredSettingValueMock: vi.fn(),
  upsertStoredSettingValueMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  readStoredSettingValue: readStoredSettingValueMock,
  upsertStoredSettingValue: upsertStoredSettingValueMock,
}));

vi.mock('server-only', () => ({}));

import {
  __resetUsageCacheForTests,
  buildKangurAiTutorUsageDateKey,
  consumeKangurAiTutorDailyUsage,
  ensureKangurAiTutorDailyUsageAvailable,
  readKangurAiTutorDailyUsage,
} from './ai-tutor-usage';

const TODAY = '2026-03-12';
const mockNow = new Date(`${TODAY}T10:00:00.000Z`);

const makeStore = (learnerId: string, count: number) =>
  JSON.stringify({ [learnerId]: { dateKey: TODAY, messageCount: count, updatedAt: mockNow.toISOString() } });

beforeEach(() => {
  vi.resetAllMocks();
  __resetUsageCacheForTests();
  readStoredSettingValueMock.mockResolvedValue(null);
  upsertStoredSettingValueMock.mockResolvedValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('buildKangurAiTutorUsageDateKey', () => {
  it('formats the date as YYYY-MM-DD', () => {
    expect(buildKangurAiTutorUsageDateKey(new Date('2026-03-12T10:00:00Z'))).toBe('2026-03-12');
  });

  it('pads month and day with leading zeros', () => {
    expect(buildKangurAiTutorUsageDateKey(new Date('2026-01-05T00:00:00Z'))).toBe('2026-01-05');
  });
});

describe('readKangurAiTutorDailyUsage', () => {
  it('returns zero count when no usage entry exists', async () => {
    readStoredSettingValueMock.mockResolvedValue(null);

    const result = await readKangurAiTutorDailyUsage({
      learnerId: 'learner-1',
      dailyMessageLimit: 10,
      now: mockNow,
    });

    expect(result.messageCount).toBe(0);
    expect(result.dateKey).toBe(TODAY);
    expect(result.remainingMessages).toBe(10);
  });

  it('returns current count from stored entry for today', async () => {
    readStoredSettingValueMock.mockResolvedValue(makeStore('learner-1', 7));

    const result = await readKangurAiTutorDailyUsage({
      learnerId: 'learner-1',
      dailyMessageLimit: 10,
      now: mockNow,
    });

    expect(result.messageCount).toBe(7);
    expect(result.remainingMessages).toBe(3);
  });

  it('returns zero count when stored entry is for a different date', async () => {
    const yesterday = JSON.stringify({
      'learner-1': { dateKey: '2026-03-11', messageCount: 9, updatedAt: new Date().toISOString() },
    });
    readStoredSettingValueMock.mockResolvedValue(yesterday);

    const result = await readKangurAiTutorDailyUsage({
      learnerId: 'learner-1',
      dailyMessageLimit: 10,
      now: mockNow,
    });

    expect(result.messageCount).toBe(0);
    expect(result.remainingMessages).toBe(10);
  });

  it('returns null remainingMessages when dailyMessageLimit is null', async () => {
    readStoredSettingValueMock.mockResolvedValue(makeStore('learner-1', 5));

    const result = await readKangurAiTutorDailyUsage({
      learnerId: 'learner-1',
      dailyMessageLimit: null,
      now: mockNow,
    });

    expect(result.remainingMessages).toBeNull();
  });
});

describe('ensureKangurAiTutorDailyUsageAvailable', () => {
  it('throws quota exceeded when daily limit is reached', async () => {
    readStoredSettingValueMock.mockResolvedValue(makeStore('learner-1', 10));

    await expect(
      ensureKangurAiTutorDailyUsageAvailable({
        learnerId: 'learner-1',
        dailyMessageLimit: 10,
        now: mockNow,
      })
    ).rejects.toThrow('Daily AI Tutor message limit reached');
  });

  it('does not throw when under the limit', async () => {
    readStoredSettingValueMock.mockResolvedValue(makeStore('learner-1', 9));

    const result = await ensureKangurAiTutorDailyUsageAvailable({
      learnerId: 'learner-1',
      dailyMessageLimit: 10,
      now: mockNow,
    });

    expect(result.messageCount).toBe(9);
  });

  it('does not throw when dailyMessageLimit is null', async () => {
    readStoredSettingValueMock.mockResolvedValue(makeStore('learner-1', 9999));

    const result = await ensureKangurAiTutorDailyUsageAvailable({
      learnerId: 'learner-1',
      dailyMessageLimit: null,
      now: mockNow,
    });

    expect(result.messageCount).toBe(9999);
  });
});

describe('consumeKangurAiTutorDailyUsage', () => {
  it('increments the message count and persists it', async () => {
    readStoredSettingValueMock.mockResolvedValue(makeStore('learner-1', 5));

    const result = await consumeKangurAiTutorDailyUsage({
      learnerId: 'learner-1',
      dailyMessageLimit: 10,
      now: mockNow,
    });

    expect(result.messageCount).toBe(6);
    expect(result.remainingMessages).toBe(4);
    expect(upsertStoredSettingValueMock).toHaveBeenCalledOnce();
    const persisted = JSON.parse(upsertStoredSettingValueMock.mock.calls[0][1]);
    expect(persisted['learner-1'].messageCount).toBe(6);
  });

  it('does not increment when dailyMessageLimit is null', async () => {
    readStoredSettingValueMock.mockResolvedValue(makeStore('learner-1', 5));

    const result = await consumeKangurAiTutorDailyUsage({
      learnerId: 'learner-1',
      dailyMessageLimit: null,
      now: mockNow,
    });

    expect(result.messageCount).toBe(5);
    expect(upsertStoredSettingValueMock).not.toHaveBeenCalled();
  });

  it('throws when upsert fails', async () => {
    readStoredSettingValueMock.mockResolvedValue(makeStore('learner-1', 3));
    upsertStoredSettingValueMock.mockResolvedValue(false);

    await expect(
      consumeKangurAiTutorDailyUsage({
        learnerId: 'learner-1',
        dailyMessageLimit: 10,
        now: mockNow,
      })
    ).rejects.toThrow('Failed to persist');
  });
});
