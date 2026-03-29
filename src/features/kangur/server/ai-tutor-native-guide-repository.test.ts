import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE } from '@/shared/contracts/kangur-ai-tutor-native-guide';
import { buildKangurAiTutorNativeGuideLocaleScaffold } from './ai-tutor-native-guide-locale-scaffold';

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

describe('ai tutor native guide repository', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
  });

  it('returns scaffolded locale native-guide content when Mongo is unavailable', async () => {
    getMongoDbMock.mockRejectedValueOnce(new Error('mongo unavailable'));

    const { getKangurAiTutorNativeGuideStore } = await import('./ai-tutor-native-guide-repository');
    const result = await getKangurAiTutorNativeGuideStore('de');

    expect(result).toEqual(
      buildKangurAiTutorNativeGuideLocaleScaffold({
        locale: 'de',
        sourceStore: DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
      })
    );
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
  });

  it('returns scaffolded locale native-guide content when the locale bootstrap write fails', async () => {
    const collection = {
      createIndex: vi.fn().mockResolvedValue('ok'),
      findOne: vi.fn().mockResolvedValue(null),
      updateOne: vi.fn().mockRejectedValue(new Error('write failed')),
    };
    const db = {
      collection: vi.fn(() => collection),
    };
    getMongoDbMock.mockResolvedValue(db);

    const { getKangurAiTutorNativeGuideStore } = await import('./ai-tutor-native-guide-repository');
    const result = await getKangurAiTutorNativeGuideStore('en');

    expect(result).toEqual(
      buildKangurAiTutorNativeGuideLocaleScaffold({
        locale: 'en',
        sourceStore: DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
      })
    );
    expect(collection.findOne).toHaveBeenCalledWith({ locale: 'en' });
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
  });

  it('scaffolds localized overlays for existing source-copy locale native-guide stores', async () => {
    const sourceCopyEnglish = {
      ...DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
      locale: 'en',
    };
    const collection = {
      createIndex: vi.fn().mockResolvedValue('ok'),
      findOne: vi.fn().mockResolvedValue({
        locale: 'en',
        store: sourceCopyEnglish,
        createdAt: new Date('2026-03-01T10:00:00.000Z'),
        updatedAt: new Date('2026-03-01T10:00:00.000Z'),
      }),
      updateOne: vi.fn().mockResolvedValue({}),
    };
    const db = {
      collection: vi.fn(() => collection),
    };
    getMongoDbMock.mockResolvedValue(db);

    const { getKangurAiTutorNativeGuideStore } = await import('./ai-tutor-native-guide-repository');
    const result = await getKangurAiTutorNativeGuideStore('en');

    const authOverview = result.entries.find((entry) => entry.id === 'auth-overview');
    expect(authOverview?.title).toBe('Sign-in and account setup screen');
    expect(collection.updateOne).toHaveBeenCalledWith(
      { locale: 'en' },
      expect.objectContaining({
        $set: expect.objectContaining({
          store: expect.objectContaining({
            locale: 'en',
            entries: expect.arrayContaining([
              expect.objectContaining({
                id: 'auth-overview',
                title: 'Sign-in and account setup screen',
              }),
            ]),
          }),
        }),
      })
    );
  });
});
