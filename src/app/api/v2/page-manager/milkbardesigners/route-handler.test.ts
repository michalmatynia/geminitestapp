import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  apiHandler: vi.fn((handler: unknown, _options: unknown) => handler),
  getMilkbarDesignersCmsSnapshot: vi.fn(),
  saveMilkbarDesignersCmsSnapshot: vi.fn(),
}));

vi.mock('@/features/page-manager/milkbardesigners/milkbar-cms.server', () => ({
  getMilkbarDesignersCmsSnapshot: mocks.getMilkbarDesignersCmsSnapshot,
  saveMilkbarDesignersCmsSnapshot: mocks.saveMilkbarDesignersCmsSnapshot,
}));

vi.mock('@/shared/lib/api/api-handler', () => ({
  apiHandler: mocks.apiHandler,
}));

import { GET, PUT } from './route-handler';

const buildRequest = (body: unknown): NextRequest =>
  new Request('http://localhost/api/v2/page-manager/milkbardesigners', {
    body: JSON.stringify(body),
    method: 'PUT',
  }) as NextRequest;

describe('v2 page-manager milkbardesigners route handler', () => {
  beforeEach(() => {
    mocks.getMilkbarDesignersCmsSnapshot.mockReset();
    mocks.saveMilkbarDesignersCmsSnapshot.mockReset();
  });

  it('wraps GET and PUT with authenticated page-manager sources', () => {
    expect(mocks.apiHandler).toHaveBeenCalledTimes(2);
    expect(mocks.apiHandler.mock.calls[0]?.[1]).toMatchObject({
      requireAuth: true,
      source: 'v2.page-manager.milkbardesigners.GET',
    });
    expect(mocks.apiHandler.mock.calls[1]?.[1]).toMatchObject({
      requireAuth: true,
      source: 'v2.page-manager.milkbardesigners.PUT',
    });
  });

  it('returns the Milkbar CMS snapshot', async () => {
    mocks.getMilkbarDesignersCmsSnapshot.mockResolvedValue({
      ok: true,
      pageContent: { hero: { lede: 'Snapshot' } },
      projects: [],
      services: [],
    });

    const response = await GET(
      new Request('http://localhost/api/v2/page-manager/milkbardesigners') as NextRequest
    );
    const body = (await response.json()) as { pageContent: { hero: { lede: string } } };

    expect(response.status).toBe(200);
    expect(body.pageContent.hero.lede).toBe('Snapshot');
    expect(mocks.getMilkbarDesignersCmsSnapshot).toHaveBeenCalledTimes(1);
  });

  it('passes the PUT payload into the Milkbar CMS save service', async () => {
    const payload = {
      pageContent: { hero: { lede: 'Updated' } },
      projects: [],
      services: [],
    };
    mocks.saveMilkbarDesignersCmsSnapshot.mockResolvedValue({
      ok: true,
      ...payload,
    });

    const response = await PUT(buildRequest(payload));
    const body = (await response.json()) as { pageContent: { hero: { lede: string } } };

    expect(response.status).toBe(200);
    expect(body.pageContent.hero.lede).toBe('Updated');
    expect(mocks.saveMilkbarDesignersCmsSnapshot).toHaveBeenCalledWith(payload);
  });
});
