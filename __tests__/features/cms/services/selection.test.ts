import { vi, describe, it, expect, beforeEach } from 'vitest';

import { getCmsRepository, resetCmsRepositoryCache } from '@/features/cms/services/cms-repository';

vi.mock('@/features/cms/services/cms-repository/mongo-cms-repository', () => ({
  mongoCmsRepository: { type: 'mongo' },
}));

describe('CMS Repository Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCmsRepositoryCache();
  });

  it('should return the mongo repository', async () => {
    const repo = await getCmsRepository();
    expect(repo).toEqual({ type: 'mongo' });
  });

  it('should keep returning the cached mongo repository until reset', async () => {
    const first = await getCmsRepository();
    const second = await getCmsRepository();

    expect(first).toEqual({ type: 'mongo' });
    expect(second).toEqual({ type: 'mongo' });
  });
});
