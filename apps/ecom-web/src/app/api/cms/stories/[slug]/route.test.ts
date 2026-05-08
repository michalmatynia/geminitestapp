/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import { DELETE, GET, PUT } from './route';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  deleteStory: vi.fn(),
  getStoryBySlug: vi.fn(),
  saveStory: vi.fn(),
  validateStory: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getSession: mocks.getSession,
}));

vi.mock('@/lib/storiesCms', () => ({
  deleteStory: mocks.deleteStory,
  getStoryBySlug: mocks.getStoryBySlug,
  saveStory: mocks.saveStory,
  validateStory: mocks.validateStory,
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

function makeRequest(url: string, method = 'GET', body?: unknown): NextRequest {
  const request = new Request(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as NextRequest;
  Object.defineProperty(request, 'nextUrl', { value: new URL(url) });
  return request;
}

const story = {
  id: 'story-1',
  slug: 'story-1',
  category: 'Craft',
  title: 'Story',
  subtitle: 'Subtitle',
  excerpt: 'Excerpt',
  readTime: '4 min',
  date: 'May 2026',
  gradient: 'linear-gradient(#000, #111)',
  accentColor: '#fff',
  textColor: '#fff',
  tags: ['Craft'],
  body: [],
  relatedSlugs: [],
};

const context = { params: Promise.resolve({ slug: 'story-1' }) };

describe('story CMS API route', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.deleteStory.mockReset();
    mocks.getStoryBySlug.mockReset();
    mocks.saveStory.mockReset();
    mocks.validateStory.mockReset();
    mocks.revalidatePath.mockReset();
    mocks.getSession.mockResolvedValue({ id: 'admin-1', isSuperAdmin: true });
    mocks.getStoryBySlug.mockResolvedValue(story);
    mocks.saveStory.mockResolvedValue(undefined);
    mocks.deleteStory.mockResolvedValue(undefined);
    mocks.validateStory.mockReturnValue({ story, errors: [] });
  });

  it('loads the requested locale story', async () => {
    const response = await GET(makeRequest('http://localhost/api/cms/stories/story-1?locale=pl'), context);
    const body = await response.json() as { locale?: string; story?: { slug?: string } };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ locale: 'pl', story: { slug: 'story-1' } });
    expect(mocks.getStoryBySlug).toHaveBeenCalledWith('story-1', 'pl');
  });

  it('updates the requested locale story', async () => {
    const response = await PUT(makeRequest('http://localhost/api/cms/stories/story-1?locale=pl', 'PUT', { story }), context);
    const body = await response.json() as { ok?: boolean; locale?: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, locale: 'pl' });
    expect(mocks.saveStory).toHaveBeenCalledWith(story, 'pl');
  });

  it('deletes only the requested locale story', async () => {
    const response = await DELETE(makeRequest('http://localhost/api/cms/stories/story-1?locale=pl', 'DELETE'), context);
    const body = await response.json() as { ok?: boolean; locale?: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, locale: 'pl' });
    expect(mocks.deleteStory).toHaveBeenCalledWith('story-1', 'pl');
  });
});
