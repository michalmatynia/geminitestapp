import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCmsDataProviderMock = vi.fn();
const pageFindFirstMock = vi.fn();
const logSystemEventMock = vi.fn();

const mongoRepositoryMock = { provider: 'mongodb' };
const prismaRepositoryMock = { provider: 'prisma' };

vi.mock('@/features/cms/services/cms-provider', () => ({
  getCmsDataProvider: getCmsDataProviderMock,
}));

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    page: {
      findFirst: pageFindFirstMock,
    },
  },
}));

vi.mock('@/features/cms/services/cms-repository/mongo-cms-repository', () => ({
  mongoCmsRepository: mongoRepositoryMock,
}));

vi.mock('@/features/cms/services/cms-repository/prisma-cms-repository', () => ({
  prismaCmsRepository: prismaRepositoryMock,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: logSystemEventMock,
}));

describe('cms repository provider fallback', () => {
  beforeEach(async () => {
    getCmsDataProviderMock.mockReset();
    pageFindFirstMock.mockReset();
    logSystemEventMock.mockReset();
    const { resetCmsRepositoryCache } = await import('@/features/cms/services/cms-repository');
    resetCmsRepositoryCache();
  });

  it('falls back to mongo repository when Prisma validation fails', async () => {
    getCmsDataProviderMock.mockResolvedValue('prisma');
    pageFindFirstMock.mockImplementation(async () => {
      const validationError = new Error('Invalid prisma.page.findFirst invocation');
      Object.setPrototypeOf(validationError, Prisma.PrismaClientValidationError.prototype);
      throw validationError;
    });

    const { getCmsRepository } = await import('@/features/cms/services/cms-repository');
    const repository = await getCmsRepository();

    expect(repository).toBe(mongoRepositoryMock);
  });

  it('uses prisma repository when readiness probe succeeds', async () => {
    getCmsDataProviderMock.mockResolvedValue('prisma');
    pageFindFirstMock.mockResolvedValue(null);

    const { getCmsRepository } = await import('@/features/cms/services/cms-repository');
    const repository = await getCmsRepository();

    expect(repository).toBe(prismaRepositoryMock);
  });
});
