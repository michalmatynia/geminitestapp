import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.unmock('@/shared/lib/db/prisma');

import {
  GET as GET_page,
  PUT as PUT_page,
  DELETE as DELETE_page,
} from '@/app/api/cms/pages/[id]/route';
import { GET as GET_pages, POST as POST_pages } from '@/app/api/cms/pages/route';
import { getCmsRepository } from '@/features/cms/services/cms-repository';
import type { Page } from '@/shared/contracts/cms';

describe('CMS Pages API', () => {
  let cmsRepository: any;

  beforeEach(async () => {
    cmsRepository = await getCmsRepository();

    // Cleanup: Delete all pages and slugs
    const pages = await cmsRepository.getPages();
    for (const p of pages) {
      await cmsRepository.deletePage(p.id);
    }

    const slugs = await cmsRepository.getSlugs();
    for (const s of slugs) {
      await cmsRepository.deleteSlug(s.id);
    }

    const themes = await cmsRepository.getThemes();
    for (const t of themes) {
      await cmsRepository.deleteTheme(t.id);
    }
  });

  describe('GET /api/cms/pages', () => {
    it('should return an empty list when no pages exist', async () => {
      const res = await GET_pages(new NextRequest('http://localhost/api/cms/pages'));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should return all pages', async () => {
      await cmsRepository.createPage({ name: 'Page 1' });
      await cmsRepository.createPage({ name: 'Page 2' });

      const res = await GET_pages(new NextRequest('http://localhost/api/cms/pages?scope=all'));
      const data = (await res.json()) as Page[];
      expect(res.status).toBe(200);
      expect(data.length).toBe(2);
      expect(data.map((p) => p.name)).toContain('Page 1');
      expect(data.map((p) => p.name)).toContain('Page 2');
    });
  });

  describe('CMS Slugs Type Check', () => {
    it('should correctly type a slug object', () => {
      const slug = {
        id: 's1',
        slug: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(slug.slug).toBe('test');
    });
  });

  describe('POST /api/cms/pages', () => {
    it('should create a new page without slugs', async () => {
      const req = new NextRequest('http://localhost/api/cms/pages', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Page' }),
      });

      const res = await POST_pages(req);
      const data = (await res.json()) as Page;

      expect(res.status).toBe(200);
      expect(data.name).toBe('New Page');
      expect(data.id).toBeDefined();
    });

    it('should create a new page with slugs', async () => {
      const slug1 = await cmsRepository.createSlug({ slug: 'test-slug-1' });
      const slug2 = await cmsRepository.createSlug({ slug: 'test-slug-2' });

      const req = new NextRequest('http://localhost/api/cms/pages', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Page with Slugs',
          slugIds: [slug1.id, slug2.id],
        }),
      });

      const res = await POST_pages(req);
      const data = (await res.json()) as Page;

      expect(res.status).toBe(200);
      expect(data.name).toBe('Page with Slugs');

      // Verify page in repository has slugs
      const savedPage = await cmsRepository.getPageById(data.id);
      expect(savedPage.slugs.length).toBe(2);
    });

    it('should create a new page with a theme', async () => {
      const theme = await cmsRepository.createTheme({
        name: 'Creation Theme',
        colors: {
          primary: '#000',
          secondary: '#fff',
          accent: '#f00',
          background: '#fff',
          surface: '#eee',
          text: '#000',
          muted: '#888',
        },
        typography: {
          headingFont: 'Arial',
          bodyFont: 'Arial',
          baseSize: 16,
          headingWeight: 700,
          bodyWeight: 400,
        },
        spacing: { sectionPadding: '1rem', containerMaxWidth: '1000px' },
      });

      const req = new NextRequest('http://localhost/api/cms/pages', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Page with Theme',
          themeId: theme.id,
        }),
      });

      const res = await POST_pages(req);
      const data = (await res.json()) as Page;

      expect(res.status).toBe(200);
      expect(data.name).toBe('Page with Theme');

      // Verify page in repository has the theme
      const savedPage = await cmsRepository.getPageById(data.id);
      expect(savedPage.themeId).toBe(theme.id);
    });

    it('should return 400 for invalid input', async () => {
      const req = new NextRequest('http://localhost/api/cms/pages', {
        method: 'POST',
        body: JSON.stringify({ name: '' }), // Invalid: empty name
      });

      const res = await POST_pages(req);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/cms/pages/[id]', () => {
    it('should return a page by ID', async () => {
      const page = await cmsRepository.createPage({ name: 'Single Page' });

      const res = await GET_page(new NextRequest(`http://localhost/api/cms/pages/${page.id}`), {
        params: Promise.resolve({ id: page.id }),
      });
      const data = (await res.json()) as Page;

      expect(res.status).toBe(200);
      expect(data.id).toBe(page.id);
      expect(data.name).toBe('Single Page');
    });

    it('should return 404 for non-existent page', async () => {
      const res = await GET_page(new NextRequest('http://localhost/api/cms/pages/non-existent'), {
        params: Promise.resolve({ id: 'non-existent' }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/cms/pages/[id]', () => {
    it('should update page basic info, components and theme', async () => {
      const page = await cmsRepository.createPage({ name: 'Old Name' });
      const slug = await cmsRepository.createSlug({ slug: 'updated-slug' });
      const theme = await cmsRepository.createTheme({
        name: 'Page Theme',
        colors: {
          primary: '#000',
          secondary: '#fff',
          accent: '#f00',
          background: '#fff',
          surface: '#eee',
          text: '#000',
          muted: '#888',
        },
        typography: {
          headingFont: 'Arial',
          bodyFont: 'Arial',
          baseSize: 16,
          headingWeight: 700,
          bodyWeight: 400,
        },
        spacing: { sectionPadding: '1rem', containerMaxWidth: '1000px' },
      });

      const updatePayload = {
        name: 'Updated Name',
        status: 'published',
        publishedAt: new Date().toISOString(),
        seoTitle: 'SEO Title',
        seoDescription: 'SEO Description',
        slugIds: [slug.id],
        themeId: theme.id,
        components: [
          { type: 'hero', content: { title: 'Hello World' }, order: 0 },
          { type: 'text', content: { body: 'Lorem ipsum' }, order: 1 },
        ],
      };

      const req = new NextRequest(`http://localhost/api/cms/pages/${page.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatePayload),
      });

      const res = await PUT_page(req, { params: Promise.resolve({ id: page.id }) });
      const data = (await res.json()) as Page;

      expect(res.status).toBe(200);
      expect(data.name).toBe('Updated Name');
      expect(data.status).toBe('published');
      expect(data.seoTitle).toBe('SEO Title');

      // Verify in repository
      const updatedPage = await cmsRepository.getPageById(page.id);
      expect(updatedPage.components.length).toBe(2);
      expect(updatedPage.slugs.length).toBe(1);
      expect(updatedPage.slugs[0].slug).toBe('updated-slug');
      expect(updatedPage.themeId).toBe(theme.id);
    });

    it('should return 404 when updating non-existent page', async () => {
      const req = new NextRequest('http://localhost/api/cms/pages/non-existent', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Non-existent',
          slugIds: [],
          components: [],
        }),
      });

      const res = await PUT_page(req, { params: Promise.resolve({ id: 'non-existent' }) });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/cms/pages/[id]', () => {
    it('should delete a page', async () => {
      const page = await cmsRepository.createPage({ name: 'To Delete' });

      const req = new NextRequest(`http://localhost/api/cms/pages/${page.id}`, {
        method: 'DELETE',
      });

      const res = await DELETE_page(req, { params: Promise.resolve({ id: page.id }) });
      expect(res.status).toBe(204);

      const deletedPage = await cmsRepository.getPageById(page.id);
      expect(deletedPage).toBeNull();
    });
  });
});
