import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest';

vi.unmock('@/shared/lib/db/prisma');

import { DELETE } from '@/app/api/cms/slugs/[id]/route';
import { GET, POST } from '@/app/api/cms/slugs/route';
import { getCmsRepository } from '@/features/cms/services/cms-repository';
import type { Slug, CmsRepository } from '@/shared/contracts/cms';
import prisma from '@/shared/lib/db/prisma';

let canRunCmsSlugApiTests = true;

describe('CMS API', () => {
  const shouldSkipCmsSlugApiTests = (): boolean => !canRunCmsSlugApiTests;
  let cmsRepository: CmsRepository;

  beforeEach(async () => {
    if (shouldSkipCmsSlugApiTests()) return;

    try {
      cmsRepository = await getCmsRepository();
      // Use a try-catch or ensure deleteMany exists/works for the provider
      const slugs = await cmsRepository.getSlugs();
      for (const s of slugs) {
        await cmsRepository.deleteSlug(s.id);
      }
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'EPERM' || code === 'ECONNREFUSED') {
        canRunCmsSlugApiTests = false;
        return;
      }
      throw error;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create a new slug', async () => {
    if (shouldSkipCmsSlugApiTests()) return;
    const req = new NextRequest('http://localhost/api/cms/slugs', {
      method: 'POST',
      body: JSON.stringify({ slug: 'test-slug' }),
    });

    const res = await POST(req);
    const data = (await res.json()) as { slug: string };

    expect(res.status).toBe(200);
    expect(data.slug).toBe('test-slug');
  });

  it('should not create a duplicate slug (idempotent)', async () => {
    if (shouldSkipCmsSlugApiTests()) return;
    await cmsRepository.createSlug({ slug: 'test-slug' });

    const req = new NextRequest('http://localhost/api/cms/slugs', {
      method: 'POST',
      body: JSON.stringify({ slug: 'test-slug' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { slug: string };
    expect(data.slug).toBe('test-slug');
  });

  it('should fetch all slugs', async () => {
    if (shouldSkipCmsSlugApiTests()) return;
    await cmsRepository.createSlug({ slug: 'test-slug-1' });
    await cmsRepository.createSlug({ slug: 'test-slug-2' });

    const res = await GET(new NextRequest('http://localhost/api/cms/slugs?scope=all'));
    const data = (await res.json()) as Slug[];

    expect(res.status).toBe(200);
    expect(data.length).toBe(2);
  });

  it('should delete a slug', async () => {
    if (shouldSkipCmsSlugApiTests()) return;
    const slug = await cmsRepository.createSlug({ slug: 'test-slug' });

    const req = new NextRequest(`http://localhost/api/cms/slugs/${slug.id}`, {
      method: 'DELETE',
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: slug.id }) });
    expect(res.status).toBe(204);

    const deletedSlug = await cmsRepository.getSlugById(slug.id);
    expect(deletedSlug).toBeNull();
  });
});
