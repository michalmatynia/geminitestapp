import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

import type { KangurLearnerProfile } from '@/features/kangur/shared/contracts/kangur';
import {
  listKangurDuelLobbyPresence,
  recordKangurDuelLobbyPresence,
} from '../lobby-presence';

const buildLearner = (overrides: Partial<KangurLearnerProfile> = {}): KangurLearnerProfile => ({
  id: overrides.id ?? 'learner-1',
  ownerUserId: overrides.ownerUserId ?? 'owner-1',
  displayName: overrides.displayName ?? 'Ada',
  loginName: overrides.loginName ?? 'ada',
  status: overrides.status ?? 'active',
  legacyUserKey: overrides.legacyUserKey ?? null,
  aiTutor: overrides.aiTutor ?? null,
  createdAt: overrides.createdAt ?? '2026-03-16T10:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-03-16T10:00:00.000Z',
});

describe('kangur duel lobby presence', () => {
  let collection: {
    createIndex: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    updateOne: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    collection = {
      createIndex: vi.fn(),
      find: vi.fn(),
      updateOne: vi.fn(),
    };
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => collection),
    });
  });

  it('lists active lobby presence entries', async () => {
    const now = new Date('2026-03-16T12:00:00.000Z');
    const cursor = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([
        {
          _id: 'learner-1',
          learnerId: 'learner-1',
          displayName: 'Ada',
          lastSeenAt: now,
          expiresAt: new Date(now.getTime() + 60_000),
        },
      ]),
    };
    collection.find.mockReturnValue(cursor);

    const response = await listKangurDuelLobbyPresence({ limit: 5, now });

    expect(collection.find).toHaveBeenCalledWith({ expiresAt: { $gte: now } });
    expect(response.entries).toHaveLength(1);
    expect(response.entries[0]?.displayName).toBe('Ada');
  });

  it('records learner presence and returns updated list', async () => {
    const now = new Date('2026-03-16T12:00:00.000Z');
    const cursor = {
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([
        {
          _id: 'learner-1',
          learnerId: 'learner-1',
          displayName: 'Ada',
          lastSeenAt: now,
          expiresAt: new Date(now.getTime() + 60_000),
        },
      ]),
    };
    collection.find.mockReturnValue(cursor);
    collection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

    const response = await recordKangurDuelLobbyPresence(buildLearner());

    expect(collection.updateOne).toHaveBeenCalledWith(
      { _id: 'learner-1' },
      expect.objectContaining({
        $set: expect.objectContaining({
          learnerId: 'learner-1',
          displayName: 'Ada',
        }),
      }),
      { upsert: true }
    );
    expect(response.entries[0]?.learnerId).toBe('learner-1');
  });
});
