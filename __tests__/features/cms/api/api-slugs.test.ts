import { NextRequest } from 'next/server';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { GET as listSlugs, POST as createSlug } from '@/app/api/cms/slugs/route';
import { getCmsRepository } from '@/features/cms/services/cms-repository';

vi.mock('@/features/cms/services/cms-repository', () => ({
  getCmsRepository: vi.fn(),
}));

vi.mock('@/features/cms/services/cms-domain', () => ({
  resolveCmsDomainFromRequest: vi.fn().mockResolvedValue({ id: 'd1', domain: 'localhost' }),
  getSlugsForDomain: vi.fn(),
  ensureDomainSlug: vi.fn().mockResolvedValue(undefined),
  getSlugForDomainById: vi.fn(),
}));

import { getSlugsForDomain, getSlugForDomainById } from '@/features/cms/services/cms-domain';

describe('CMS Slugs API', () => {
  const mockRepo = {
    getSlugs: vi.fn(),
    createSlug: vi.fn(),
    getSlugByValue: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getCmsRepository as any).mockResolvedValue(mockRepo);
  });

  describe('GET /api/cms/slugs', () => {
    it('should return a list of slugs', async () => {
      const mockSlugs = [{ id: '1', slug: 'home' }];
      vi.mocked(getSlugsForDomain).mockResolvedValue(mockSlugs as any);

      const res = await listSlugs(new NextRequest('http://localhost/api/cms/slugs'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(mockSlugs);
    });
  });

  describe('POST /api/cms/slugs', () => {
    it('should create a new slug', async () => {
      const slugData = { slug: 'new-path' };
      const createdSlug = { id: 's-123', slug: 'new-path' };
      mockRepo.getSlugByValue.mockResolvedValue(null);
      mockRepo.createSlug.mockResolvedValue(createdSlug);
      vi.mocked(getSlugForDomainById).mockResolvedValue(createdSlug as any);

      const req = new NextRequest('http://localhost/api/cms/slugs', {
        method: 'POST',
        body: JSON.stringify(slugData),
      });

      const res = await createSlug(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(createdSlug);
      expect(mockRepo.createSlug).toHaveBeenCalledWith({ slug: 'new-path', isDefault: false });
    });

    it('should return 400 if slug is missing', async () => {
      const req = new NextRequest('http://localhost/api/cms/slugs', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const res = await createSlug(req);
      expect(res.status).toBe(400);
    });
  });
});
