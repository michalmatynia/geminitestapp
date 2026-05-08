/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import { GET, POST } from './route';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAllStories: vi.fn(),
  saveStory: vi.fn(),
  validateStory: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getSession: mocks.getSession,
}));

vi.mock('@/lib/storiesCms', () => ({
  getAllStories: mocks.getAllStories,
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

describe('stories CMS API route', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.getAllStories.mockReset();
    mocks.saveStory.mockReset();
    mocks.validateStory.mockReset();
    mocks.revalidatePath.mockReset();
    mocks.getSession.mockResolvedValue({ id: 'admin-1', isSuperAdmin: true });
    mocks.getAllStories.mockResolvedValue([story]);
    mocks.saveStory.mockResolvedValue(undefined);
    mocks.validateStory.mockReturnValue({ story, errors: [] });
  });

  it('loads stories for the requested locale', async () => {
    const response = await GET(makeRequest('http://localhost/api/cms/stories?locale=pl'));
    const body = await response.json() as { locale?: string; stories?: unknown[] };

    expect(response.status).toBe(200);
    expect(body.locale).toBe('pl');
    expect(body.stories ?? []).toHaveLength(1);
    expect(mocks.getAllStories).toHaveBeenCalledWith('pl');
  });

  it('saves stories to the requested locale and revalidates localized pages', async () => {
    const response = await POST(makeRequest('http://localhost/api/cms/stories?locale=pl', 'POST', { story }));
    const body = await response.json() as { ok?: boolean; locale?: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, locale: 'pl' });
    expect(mocks.saveStory).toHaveBeenCalledWith(story, 'pl');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/stories');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/pl/stories');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/stories/story-1');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/pl/stories/story-1');
  });
});
