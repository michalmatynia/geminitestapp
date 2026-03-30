import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import { buildKangurAiTutorContentLocaleScaffold } from '@/features/kangur/server/ai-tutor-content-locale-scaffold';

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

    expect(result).toEqual(
      buildKangurAiTutorContentLocaleScaffold({
        locale: 'de',
        sourceContent: DEFAULT_KANGUR_AI_TUTOR_CONTENT,
      })
    );
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
  });

  it('returns scaffolded locale content when the locale bootstrap write fails', async () => {
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

    expect(result).toEqual(
      buildKangurAiTutorContentLocaleScaffold({
        locale: 'en',
        sourceContent: DEFAULT_KANGUR_AI_TUTOR_CONTENT,
      })
    );
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

  it('scaffolds localized overlays for existing source-copy locale documents', async () => {
    const sourceCopyEnglish = {
      ...DEFAULT_KANGUR_AI_TUTOR_CONTENT,
      locale: 'en',
    };
    const collection = {
      createIndex: vi.fn().mockResolvedValue('ok'),
      findOne: vi.fn().mockResolvedValue({
        locale: 'en',
        content: sourceCopyEnglish,
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

    const result = await getKangurAiTutorContent('en');

    expect(result.common.openTutorAria).toBe('Open AI tutor');
    expect(result.parentVerification.emailSubject).toBe(
      'Kangur: confirm the parent email'
    );
    expect(collection.updateOne).toHaveBeenCalledWith(
      { locale: 'en' },
      expect.objectContaining({
        $set: expect.objectContaining({
          content: expect.objectContaining({
            locale: 'en',
            common: expect.objectContaining({
              openTutorAria: 'Open AI tutor',
            }),
          }),
        }),
      })
    );
  });
});
