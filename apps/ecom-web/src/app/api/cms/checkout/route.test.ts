/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import { DELETE, GET, PUT } from './route';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  deleteCheckoutContent: vi.fn(),
  getCheckoutCmsSnapshot: vi.fn(),
  parseCheckoutContentUpdate: vi.fn(),
  saveCheckoutContent: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getSession: mocks.getSession,
}));

vi.mock('@/lib/cms', () => ({
  deleteCheckoutContent: mocks.deleteCheckoutContent,
  getCheckoutCmsSnapshot: mocks.getCheckoutCmsSnapshot,
  parseCheckoutContentUpdate: mocks.parseCheckoutContentUpdate,
  saveCheckoutContent: mocks.saveCheckoutContent,
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

function makeRequest(url: string, body?: unknown): NextRequest {
  const request = new Request(url, {
    method: body === undefined ? 'GET' : 'PUT',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as NextRequest;
  Object.defineProperty(request, 'nextUrl', { value: new URL(url) });
  return request;
}

describe('checkout CMS API route', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.deleteCheckoutContent.mockReset();
    mocks.getCheckoutCmsSnapshot.mockReset();
    mocks.parseCheckoutContentUpdate.mockReset();
    mocks.saveCheckoutContent.mockReset();
    mocks.revalidatePath.mockReset();
    mocks.getSession.mockResolvedValue({ id: 'admin-1', isSuperAdmin: true });
    mocks.deleteCheckoutContent.mockResolvedValue(true);
  });

  it('loads the requested locale snapshot', async () => {
    mocks.getCheckoutCmsSnapshot.mockResolvedValue({
      content: { title: 'PL checkout' },
      updatedAt: null,
      updatedBy: null,
    });

    const response = await GET(makeRequest('http://localhost/api/cms/checkout?locale=pl'));
    const body = await response.json() as { content?: unknown; updatedAt?: string | null };

    expect(response.status).toBe(200);
    expect(mocks.getCheckoutCmsSnapshot).toHaveBeenCalledWith('pl');
    expect(body.updatedAt).toBeNull();
  });

  it('saves checkout content to the requested locale', async () => {
    const content = { title: 'PL checkout' };
    mocks.parseCheckoutContentUpdate.mockReturnValue({ content, errors: [] });
    mocks.saveCheckoutContent.mockResolvedValue({
      content,
      updatedAt: '2026-05-08T12:00:00.000Z',
      updatedBy: 'admin-1',
    });

    const response = await PUT(makeRequest('http://localhost/api/cms/checkout?locale=pl', { content }));
    const body = await response.json() as { ok?: boolean; updatedBy?: string | null };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, updatedBy: 'admin-1' });
    expect(mocks.parseCheckoutContentUpdate).toHaveBeenCalledWith({ content });
    expect(mocks.saveCheckoutContent).toHaveBeenCalledWith(content, 'admin-1', 'pl');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/checkout');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/pl/checkout');
  });

  it('deletes the requested non-default locale snapshot', async () => {
    const response = await DELETE(makeRequest('http://localhost/api/cms/checkout?locale=pl'));
    const body = await response.json() as { ok?: boolean; locale?: string; deleted?: boolean };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, locale: 'pl', deleted: true });
    expect(mocks.deleteCheckoutContent).toHaveBeenCalledWith('pl');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/checkout');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/pl/checkout');
  });

  it('rejects deleting the default locale snapshot', async () => {
    const response = await DELETE(makeRequest('http://localhost/api/cms/checkout?locale=en'));

    expect(response.status).toBe(400);
    expect(mocks.deleteCheckoutContent).not.toHaveBeenCalled();
  });

  it('rejects non-admin access before loading content', async () => {
    mocks.getSession.mockResolvedValue({ id: 'user-1', isSuperAdmin: false });

    const response = await GET(makeRequest('http://localhost/api/cms/checkout?locale=pl'));

    expect(response.status).toBe(403);
    expect(mocks.getCheckoutCmsSnapshot).not.toHaveBeenCalled();
  });
});
