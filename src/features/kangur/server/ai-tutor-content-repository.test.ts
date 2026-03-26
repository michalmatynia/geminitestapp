import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';

const { getMongoDbMock, captureExceptionMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/features/kangur/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

describe('ai tutor content repository', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
  });

  it('returns default content when Mongo is unavailable', async () => {
    getMongoDbMock.mockRejectedValueOnce(new Error('mongo unavailable'));

    const { getKangurAiTutorContent } = await import('./ai-tutor-content-repository');
    const result = await getKangurAiTutorContent('de');

    expect(result).toEqual({
      ...DEFAULT_KANGUR_AI_TUTOR_CONTENT,
      locale: 'de',
    });
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
  });

  it('returns default content when the locale bootstrap write fails', async () => {
    const collection = {
      createIndex: vi.fn().mockResolvedValue('ok'),
      findOne: vi.fn().mockResolvedValue(null),
      updateOne: vi.fn().mockRejectedValue(new Error('write failed')),
    };
    const db = {
      collection: vi.fn(() => collection),
    };
    getMongoDbMock.mockResolvedValue(db);

    const { getKangurAiTutorContent } = await import('./ai-tutor-content-repository');
    const result = await getKangurAiTutorContent('en');

    expect(result).toEqual({
      ...DEFAULT_KANGUR_AI_TUTOR_CONTENT,
      locale: 'en',
    });
    expect(collection.findOne).toHaveBeenCalledWith({ locale: 'en' });
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
  });

  it('reuses cached tutor content across repeated reads for the same locale', async () => {
    const collection = {
      createIndex: vi.fn().mockResolvedValue('ok'),
      findOne: vi.fn().mockResolvedValue({
        locale: 'pl',
        content: {
          ...DEFAULT_KANGUR_AI_TUTOR_CONTENT,
          locale: 'pl',
        },
        createdAt: new Date('2026-03-01T10:00:00.000Z'),
        updatedAt: new Date('2026-03-01T10:00:00.000Z'),
      }),
      updateOne: vi.fn().mockResolvedValue({}),
    };
    const db = {
      collection: vi.fn(() => collection),
    };
    getMongoDbMock.mockResolvedValue(db);

    const { clearKangurAiTutorContentCache, getKangurAiTutorContent } = await import(
      './ai-tutor-content-repository'
    );
    clearKangurAiTutorContentCache();

    const firstResult = await getKangurAiTutorContent('pl');
    const secondResult = await getKangurAiTutorContent('pl');

    expect(firstResult).toEqual({
      ...DEFAULT_KANGUR_AI_TUTOR_CONTENT,
      locale: 'pl',
    });
    expect(secondResult).toEqual(firstResult);
    expect(collection.findOne).toHaveBeenCalledTimes(1);
  });
});
