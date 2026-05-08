/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { deleteLocalizedCmsRouteContent } from './cmsRouteHandlers';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getSession: mocks.getSession,
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

function makeRequest(url: string): NextRequest {
  const request = new Request(url, { method: 'DELETE' }) as NextRequest;
  Object.defineProperty(request, 'nextUrl', { value: new URL(url) });
  return request;
}

describe('CMS route handlers', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.revalidatePath.mockReset();
    mocks.getSession.mockResolvedValue({ id: 'admin-1', isSuperAdmin: true });
  });

  it('deletes a non-default locale and revalidates all localized targets', async () => {
    const deleteContent = vi.fn().mockResolvedValue(true);

    const response = await deleteLocalizedCmsRouteContent({
      req: makeRequest('http://localhost/api/cms/products?locale=pl'),
      label: 'products',
      deleteContent,
      revalidate: [
        { path: '/products' },
        { path: '/products/[slug]', type: 'page' },
      ],
    });
    const body = await response.json() as { ok?: boolean; locale?: string; deleted?: boolean };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, locale: 'pl', deleted: true });
    expect(deleteContent).toHaveBeenCalledWith('pl');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/products');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/pl/products');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/products/[slug]', 'page');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/pl/products/[slug]', 'page');
  });

  it('rejects default locale deletion before calling the delete function', async () => {
    const deleteContent = vi.fn();

    const response = await deleteLocalizedCmsRouteContent({
      req: makeRequest('http://localhost/api/cms/products?locale=en'),
      label: 'products',
      deleteContent,
      revalidate: [{ path: '/products' }],
    });

    expect(response.status).toBe(400);
    expect(deleteContent).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('rejects non-admin requests', async () => {
    mocks.getSession.mockResolvedValue({ id: 'user-1', isSuperAdmin: false });
    const deleteContent = vi.fn();

    const response = await deleteLocalizedCmsRouteContent({
      req: makeRequest('http://localhost/api/cms/products?locale=pl'),
      label: 'products',
      deleteContent,
      revalidate: [{ path: '/products' }],
    });

    expect(response.status).toBe(403);
    expect(deleteContent).not.toHaveBeenCalled();
  });
});
