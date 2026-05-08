/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import { DELETE, GET, PUT } from './route';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  deleteLookbookEntry: vi.fn(),
  getLookbookEntry: vi.fn(),
  saveLookbookEntry: vi.fn(),
  validateEditorial: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getSession: mocks.getSession,
}));

vi.mock('@/lib/lookbookCms', () => ({
  deleteLookbookEntry: mocks.deleteLookbookEntry,
  getLookbookEntry: mocks.getLookbookEntry,
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

const context = { params: Promise.resolve({ id: 'look-1' }) };

describe('lookbook entry CMS API route', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.deleteLookbookEntry.mockReset();
    mocks.getLookbookEntry.mockReset();
    mocks.saveLookbookEntry.mockReset();
    mocks.validateEditorial.mockReset();
    mocks.revalidatePath.mockReset();
    mocks.getSession.mockResolvedValue({ id: 'admin-1', isSuperAdmin: true });
    mocks.getLookbookEntry.mockResolvedValue(entry);
    mocks.saveLookbookEntry.mockResolvedValue(undefined);
    mocks.deleteLookbookEntry.mockResolvedValue(undefined);
    mocks.validateEditorial.mockReturnValue({ editorial: entry, errors: [] });
  });

  it('loads the requested locale lookbook entry', async () => {
    const response = await GET(makeRequest('http://localhost/api/cms/lookbook/look-1?locale=pl'), context);
    const body = await response.json() as { locale?: string; entry?: { id?: string } };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ locale: 'pl', entry: { id: 'look-1' } });
    expect(mocks.getLookbookEntry).toHaveBeenCalledWith('look-1', 'pl');
  });

  it('updates the requested locale lookbook entry', async () => {
    const response = await PUT(makeRequest('http://localhost/api/cms/lookbook/look-1?locale=pl', 'PUT', { entry }), context);
    const body = await response.json() as { ok?: boolean; locale?: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, locale: 'pl' });
    expect(mocks.saveLookbookEntry).toHaveBeenCalledWith(entry, 'pl');
  });

  it('deletes only the requested locale lookbook entry', async () => {
    const response = await DELETE(makeRequest('http://localhost/api/cms/lookbook/look-1?locale=pl', 'DELETE'), context);
    const body = await response.json() as { ok?: boolean; locale?: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, locale: 'pl' });
    expect(mocks.deleteLookbookEntry).toHaveBeenCalledWith('look-1', 'pl');
  });
});
