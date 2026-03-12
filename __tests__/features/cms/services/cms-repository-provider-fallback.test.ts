import { beforeEach, describe, expect, it, vi } from 'vitest';

const mongoRepositoryMock = { provider: 'mongodb' };

vi.mock('@/features/cms/services/cms-repository/mongo-cms-repository', () => ({
  mongoCmsRepository: mongoRepositoryMock,
}));

describe('cms repository provider', () => {
  beforeEach(async () => {
    const { resetCmsRepositoryCache } = await import('@/features/cms/services/cms-repository');
    resetCmsRepositoryCache();
  });

  it('returns the mongodb repository', async () => {
    const { getCmsRepository, getCmsRepositoryProvider } = await import(
      '@/features/cms/services/cms-repository'
    );
    const repository = await getCmsRepository();

    expect(repository).toBe(mongoRepositoryMock);
    expect(getCmsRepositoryProvider()).toBe('mongodb');
  });

  it('caches the mongodb repository until reset', async () => {
    const { getCmsRepository } = await import('@/features/cms/services/cms-repository');
    const first = await getCmsRepository();
    const second = await getCmsRepository();

    expect(first).toBe(mongoRepositoryMock);
    expect(second).toBe(mongoRepositoryMock);
  });

  it('clears the cached provider when reset', async () => {
    const { getCmsRepository, getCmsRepositoryProvider, resetCmsRepositoryCache } = await import(
      '@/features/cms/services/cms-repository'
    );

    await getCmsRepository();
    expect(getCmsRepositoryProvider()).toBe('mongodb');

    resetCmsRepositoryCache();

    expect(getCmsRepositoryProvider()).toBeNull();
  });
});
