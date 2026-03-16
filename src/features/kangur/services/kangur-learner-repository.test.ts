import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  hashMock,
  compareMock,
  getAppDbProviderMock,
  getMongoDbMock,
  readStoredSettingValueMock,
  upsertStoredSettingValueMock,
  randomUUIDMock,
} = vi.hoisted(() => ({
  hashMock: vi.fn(),
  compareMock: vi.fn(),
  getAppDbProviderMock: vi.fn(),
  getMongoDbMock: vi.fn(),
  readStoredSettingValueMock: vi.fn(),
  upsertStoredSettingValueMock: vi.fn(),
  randomUUIDMock: vi.fn(),
}));

vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  const mock = {
    ...actual,
    randomUUID: randomUUIDMock,
  };
  return {
    ...mock,
    default: mock,
  };
});

vi.mock('bcryptjs', () => ({
  default: {
    hash: hashMock,
    compare: compareMock,
  },
}));

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: getAppDbProviderMock,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  readStoredSettingValue: readStoredSettingValueMock,
  upsertStoredSettingValue: upsertStoredSettingValueMock,
}));

import {
  createKangurLearner,
  listKangurLearnersByOwner,
  setKangurLearnerAiTutorState,
} from './kangur-learner-repository';

describe('kangur learner repository mongo mode', () => {
  const learnersCollection = {
    createIndex: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    updateOne: vi.fn(),
    bulkWrite: vi.fn(),
  };

  const mockDb = {
    collection: vi.fn((name: string) => {
      if (name !== 'kangur_learners') {
        throw new Error(`Unexpected collection ${name}`);
      }
      return learnersCollection;
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';

    getAppDbProviderMock.mockResolvedValue('mongodb');
    getMongoDbMock.mockResolvedValue(mockDb);
    readStoredSettingValueMock.mockResolvedValue('[]');
    upsertStoredSettingValueMock.mockResolvedValue(true);
    hashMock.mockResolvedValue('hashed-password');
    compareMock.mockResolvedValue(true);
    randomUUIDMock.mockReturnValue('mongo-learner-1');
    learnersCollection.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    });
    learnersCollection.createIndex.mockResolvedValue('kangur_learners_login_name_unique');
    learnersCollection.findOne.mockResolvedValue(null);
    learnersCollection.updateOne.mockResolvedValue({
      acknowledged: true,
      matchedCount: 0,
      modifiedCount: 0,
      upsertedCount: 1,
      upsertedId: 'mongo-learner-1',
    });
    learnersCollection.bulkWrite.mockResolvedValue({
      acknowledged: true,
      matchedCount: 0,
      modifiedCount: 0,
      upsertedCount: 1,
    });
  });

  it('materializes legacy learners into the Mongo collection during owner listing', async () => {
    readStoredSettingValueMock.mockResolvedValue(
      JSON.stringify([
        {
          id: 'legacy-learner-1',
          ownerUserId: 'owner-1',
          displayName: 'Ada',
          loginName: 'ada',
          status: 'active',
          legacyUserKey: 'owner@example.com',
          createdAt: '2026-03-01T10:00:00.000Z',
          updatedAt: '2026-03-01T10:00:00.000Z',
          passwordHash: 'legacy-hash',
        },
      ])
    );

    const rows = await listKangurLearnersByOwner('owner-1');

    expect(rows).toEqual([
      {
        id: 'legacy-learner-1',
        ownerUserId: 'owner-1',
        displayName: 'Ada',
        loginName: 'ada',
        avatarId: null,
        status: 'active',
        legacyUserKey: 'owner@example.com',
        aiTutor: {
          currentMoodId: 'neutral',
          baselineMoodId: 'neutral',
          confidence: 0.25,
          lastComputedAt: null,
          lastReasonCode: null,
        },
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-01T10:00:00.000Z',
      },
    ]);
    expect(learnersCollection.bulkWrite).toHaveBeenCalledWith([
      expect.objectContaining({
        updateOne: expect.objectContaining({
          filter: { _id: 'legacy-learner-1' },
          upsert: true,
        }),
      }),
    ]);
  });

  it('creates new learners directly in Mongo when app provider is mongodb', async () => {
    const learner = await createKangurLearner({
      ownerUserId: 'owner-1',
      learner: {
        displayName: 'Ada',
        loginName: 'ada',
        password: 'password123',
      },
    });

    expect(learnersCollection.findOne).toHaveBeenCalledWith({
      loginName: 'ada',
    });
    expect(learnersCollection.updateOne).toHaveBeenCalledWith(
      { _id: 'mongo-learner-1' },
      expect.objectContaining({
        $set: expect.objectContaining({
          ownerUserId: 'owner-1',
          displayName: 'Ada',
          loginName: 'ada',
          passwordHash: 'hashed-password',
        }),
        $setOnInsert: {
          _id: 'mongo-learner-1',
        },
      }),
      {
        upsert: true,
      }
    );
    expect(learner).toEqual(
      expect.objectContaining({
        id: 'mongo-learner-1',
        ownerUserId: 'owner-1',
        displayName: 'Ada',
        loginName: 'ada',
        status: 'active',
        aiTutor: expect.objectContaining({
          currentMoodId: 'neutral',
          baselineMoodId: 'neutral',
        }),
      })
    );
  });

  it('persists learner-specific tutor mood summaries for Mongo-backed learners', async () => {
    learnersCollection.findOne.mockResolvedValue({
      _id: 'mongo-learner-1',
      ownerUserId: 'owner-1',
      displayName: 'Ada',
      loginName: 'ada',
      status: 'active',
      legacyUserKey: 'owner@example.com',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
      passwordHash: 'legacy-hash',
      aiTutor: {
        currentMoodId: 'neutral',
        baselineMoodId: 'neutral',
        confidence: 0.25,
        lastComputedAt: null,
        lastReasonCode: null,
      },
    });

    const learner = await setKangurLearnerAiTutorState('mongo-learner-1', {
      currentMoodId: 'supportive',
      baselineMoodId: 'encouraging',
      confidence: 0.72,
      lastComputedAt: '2026-03-08T12:00:00.000Z',
      lastReasonCode: 'learner_confusion',
    });

    expect(learnersCollection.updateOne).toHaveBeenCalledWith(
      { _id: 'mongo-learner-1' },
      expect.objectContaining({
        $set: expect.objectContaining({
          aiTutor: {
            currentMoodId: 'supportive',
            baselineMoodId: 'encouraging',
            confidence: 0.72,
            lastComputedAt: '2026-03-08T12:00:00.000Z',
            lastReasonCode: 'learner_confusion',
          },
        }),
      }),
      {
        upsert: true,
      }
    );
    expect(learner).toEqual(
      expect.objectContaining({
        id: 'mongo-learner-1',
        aiTutor: expect.objectContaining({
          currentMoodId: 'supportive',
          baselineMoodId: 'encouraging',
        }),
      })
    );
  });
});
