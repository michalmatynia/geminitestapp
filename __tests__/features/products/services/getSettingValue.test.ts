import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAppDbProvider: vi.fn(),
  prismaFindUnique: vi.fn(),
  mongoFindOne: vi.fn(),
}));

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: mocks.getAppDbProvider,
}));

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    setting: {
      findUnique: mocks.prismaFindUnique,
    },
  },
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      findOne: mocks.mongoFindOne,
    }),
  }),
}));

import { getSettingValue } from '@/features/products/services/aiDescriptionService';

describe('getSettingValue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['DATABASE_URL'] = 'postgres://test-db';
    process.env['MONGODB_URI'] = 'mongodb://test-db';
  });

  it('uses Mongo first when provider is mongodb', async () => {
    mocks.getAppDbProvider.mockResolvedValue('mongodb');
    mocks.mongoFindOne.mockResolvedValue({ value: 'false' });
    mocks.prismaFindUnique.mockResolvedValue({ value: 'true' });

    const value = await getSettingValue('ai_analytics_schedule_enabled');

    expect(value).toBe('false');
    expect(mocks.mongoFindOne).toHaveBeenCalledWith({
      $or: [{ _id: 'ai_analytics_schedule_enabled' }, { key: 'ai_analytics_schedule_enabled' }],
    });
    expect(mocks.prismaFindUnique).not.toHaveBeenCalled();
  });

  it('uses Prisma first for non-AI keys when provider is prisma', async () => {
    mocks.getAppDbProvider.mockResolvedValue('prisma');
    mocks.prismaFindUnique.mockResolvedValue({ value: 'prisma-value' });
    mocks.mongoFindOne.mockResolvedValue({ value: 'mongo-value' });

    const value = await getSettingValue('site_name');

    expect(value).toBe('prisma-value');
    expect(mocks.prismaFindUnique).toHaveBeenCalledWith({
      where: { key: 'site_name' },
      select: { value: true },
    });
    expect(mocks.mongoFindOne).not.toHaveBeenCalled();
  });

  it('uses Mongo first for AI keys even when provider is prisma', async () => {
    mocks.getAppDbProvider.mockResolvedValue('prisma');
    mocks.mongoFindOne.mockResolvedValue({ value: 'mongo-openai-key' });
    mocks.prismaFindUnique.mockResolvedValue({ value: 'prisma-openai-key' });

    const value = await getSettingValue('openai_api_key');

    expect(value).toBe('mongo-openai-key');
    expect(mocks.mongoFindOne).toHaveBeenCalledOnce();
    expect(mocks.prismaFindUnique).not.toHaveBeenCalled();
  });

  it('falls back to Mongo when Prisma has no value', async () => {
    mocks.getAppDbProvider.mockResolvedValue('prisma');
    mocks.prismaFindUnique.mockResolvedValue(null);
    mocks.mongoFindOne.mockResolvedValue({ value: 'mongo-fallback' });

    const value = await getSettingValue('runtime_analytics_feature_flag');

    expect(value).toBe('mongo-fallback');
    expect(mocks.prismaFindUnique).toHaveBeenCalledOnce();
    expect(mocks.mongoFindOne).toHaveBeenCalledOnce();
  });

  it('falls back to Prisma when Mongo has no value in mongodb mode', async () => {
    mocks.getAppDbProvider.mockResolvedValue('mongodb');
    mocks.mongoFindOne.mockResolvedValue(null);
    mocks.prismaFindUnique.mockResolvedValue({ value: 'prisma-fallback' });

    const value = await getSettingValue('ai_brain_settings');

    expect(value).toBe('prisma-fallback');
    expect(mocks.mongoFindOne).toHaveBeenCalledOnce();
    expect(mocks.prismaFindUnique).toHaveBeenCalledOnce();
  });
});
