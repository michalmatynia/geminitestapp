import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCmsDataProviderMock = vi.fn();

const mongoRepositoryMock = { provider: 'mongodb' };
const prismaRepositoryMock = { provider: 'prisma' };

vi.mock('@/shared/lib/cms/services/cms-provider', () => ({
  getCmsDataProvider: getCmsDataProviderMock,
}));

vi.mock('@/features/cms/services/cms-repository/mongo-cms-repository', () => ({
  mongoCmsRepository: mongoRepositoryMock,
}));

vi.mock('@/features/cms/services/cms-repository/prisma-cms-repository', () => ({
  prismaCmsRepository: prismaRepositoryMock,
}));

describe('cms repository provider cutover', () => {
  beforeEach(async () => {
    getCmsDataProviderMock.mockReset();
    const { resetCmsRepositoryCache } = await import('@/features/cms/services/cms-repository');
    resetCmsRepositoryCache();
  });

  it('returns prisma repository when provider resolves to prisma', async () => {
    getCmsDataProviderMock.mockResolvedValue('prisma');

    const { getCmsRepository, getCmsRepositoryProvider } = await import(
      '@/features/cms/services/cms-repository'
    );
    const repository = await getCmsRepository();

    expect(repository).toBe(prismaRepositoryMock);
    expect(getCmsRepositoryProvider()).toBe('prisma');
  });

  it('returns mongodb repository when provider resolves to mongodb', async () => {
    getCmsDataProviderMock.mockResolvedValue('mongodb');

    const { getCmsRepository, getCmsRepositoryProvider } = await import(
      '@/features/cms/services/cms-repository'
    );
    const repository = await getCmsRepository();

    expect(repository).toBe(mongoRepositoryMock);
    expect(getCmsRepositoryProvider()).toBe('mongodb');
  });

  it('caches repository resolution until reset', async () => {
    getCmsDataProviderMock.mockResolvedValue('prisma');

    const { getCmsRepository } = await import('@/features/cms/services/cms-repository');
    const first = await getCmsRepository();
    const second = await getCmsRepository();

    expect(first).toBe(prismaRepositoryMock);
    expect(second).toBe(prismaRepositoryMock);
    expect(getCmsDataProviderMock).toHaveBeenCalledTimes(1);
  });
});
