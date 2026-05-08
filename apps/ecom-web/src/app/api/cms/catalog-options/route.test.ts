/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import { GET } from './route';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getMentiosCategories: vi.fn(),
  getMentiosThemeNames: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getSession: mocks.getSession,
}));

vi.mock('@/lib/mentios', () => ({
  getMentiosCategories: mocks.getMentiosCategories,
  getMentiosThemeNames: mocks.getMentiosThemeNames,
}));

function makeRequest(url: string): NextRequest {
  const request = new Request(url) as NextRequest;
  Object.defineProperty(request, 'nextUrl', { value: new URL(url) });
  return request;
}

describe('CMS catalog options API route', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.getMentiosCategories.mockReset();
    mocks.getMentiosThemeNames.mockReset();
    mocks.getSession.mockResolvedValue({ id: 'admin-1', isSuperAdmin: true });
    mocks.getMentiosCategories.mockResolvedValue([{ id: 'cat-1', name: 'Anime Ring', count: 11 }]);
    mocks.getMentiosThemeNames.mockResolvedValue([{ name: 'Tokyo Ghoul', count: 3 }]);
  });

  it('returns category and theme options for the requested locale', async () => {
    const response = await GET(makeRequest('http://localhost/api/cms/catalog-options?locale=pl'));
    const body = await response.json() as {
      categories?: Array<{ name: string; count: number }>;
      themes?: Array<{ name: string; count: number }>;
    };

    expect(response.status).toBe(200);
    expect(mocks.getMentiosCategories).toHaveBeenCalledWith('pl');
    expect(mocks.getMentiosThemeNames).toHaveBeenCalledWith('pl');
    expect(body.categories).toEqual([{ id: 'cat-1', name: 'Anime Ring', count: 11 }]);
    expect(body.themes).toEqual([{ name: 'Tokyo Ghoul', count: 3 }]);
  });

  it('rejects non-admin access before loading catalog data', async () => {
    mocks.getSession.mockResolvedValue({ id: 'user-1', isSuperAdmin: false });

    const response = await GET(makeRequest('http://localhost/api/cms/catalog-options?locale=pl'));

    expect(response.status).toBe(403);
    expect(mocks.getMentiosCategories).not.toHaveBeenCalled();
    expect(mocks.getMentiosThemeNames).not.toHaveBeenCalled();
  });
});
