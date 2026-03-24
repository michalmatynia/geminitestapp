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
});
