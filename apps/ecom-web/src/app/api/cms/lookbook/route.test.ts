/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import { GET, POST } from './route';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAllLookbookEntries: vi.fn(),
  saveLookbookEntry: vi.fn(),
  validateEditorial: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getSession: mocks.getSession,
}));

vi.mock('@/lib/lookbookCms', () => ({
  getAllLookbookEntries: mocks.getAllLookbookEntries,
  saveLookbookEntry: mocks.saveLookbookEntry,
  validateEditorial: mocks.validateEditorial,
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

const entry = {
  id: 'look-1',
  issue: '01',
  title: 'Lookbook',
  subtitle: 'Entry',
  season: 'Spring 2026',
  gradient: 'linear-gradient(#000, #111)',
  textColor: '#fff',
  productSlug: 'product-1',
};

describe('lookbook CMS API route', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.getAllLookbookEntries.mockReset();
    mocks.saveLookbookEntry.mockReset();
    mocks.validateEditorial.mockReset();
    mocks.revalidatePath.mockReset();
    mocks.getSession.mockResolvedValue({ id: 'admin-1', isSuperAdmin: true });
    mocks.getAllLookbookEntries.mockResolvedValue([entry]);
    mocks.saveLookbookEntry.mockResolvedValue(undefined);
    mocks.validateEditorial.mockReturnValue({ editorial: entry, errors: [] });
  });

  it('loads lookbook entries for the requested locale', async () => {
    const response = await GET(makeRequest('http://localhost/api/cms/lookbook?locale=pl'));
    const body = await response.json() as { locale?: string; entries?: unknown[] };

    expect(response.status).toBe(200);
    expect(body.locale).toBe('pl');
    expect(body.entries ?? []).toHaveLength(1);
    expect(mocks.getAllLookbookEntries).toHaveBeenCalledWith('pl');
  });

  it('saves lookbook entries to the requested locale and revalidates localized pages', async () => {
    const response = await POST(makeRequest('http://localhost/api/cms/lookbook?locale=pl', 'POST', { entry }));
    const body = await response.json() as { ok?: boolean; locale?: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, locale: 'pl' });
    expect(mocks.saveLookbookEntry).toHaveBeenCalledWith(entry, 'pl');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/lookbook');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/pl/lookbook');
  });
});
