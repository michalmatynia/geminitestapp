import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  apiHandler: vi.fn((handler: unknown, _options: unknown) => handler),
  getMilkbarDesignersCmsSnapshot: vi.fn(),
  saveMilkbarDesignersCmsSnapshot: vi.fn(),
  patchMilkbarInquiryStatus: vi.fn(),
}));

vi.mock('@/features/page-manager/milkbardesigners/milkbar-cms.server', () => ({
  getMilkbarDesignersCmsSnapshot: mocks.getMilkbarDesignersCmsSnapshot,
  saveMilkbarDesignersCmsSnapshot: mocks.saveMilkbarDesignersCmsSnapshot,
  patchMilkbarInquiryStatus: mocks.patchMilkbarInquiryStatus,
}));

vi.mock('@/shared/lib/api/api-handler', () => ({
  apiHandler: mocks.apiHandler,
}));

import { GET, PATCH, PUT } from './route-handler';

const buildRequest = (body: unknown): NextRequest =>
  new Request('http://localhost/api/v2/page-manager/milkbardesigners', {
    body: JSON.stringify(body),
    method: 'PUT',
  }) as NextRequest;

describe('v2 page-manager milkbardesigners route handler', () => {
  beforeEach(() => {
    mocks.getMilkbarDesignersCmsSnapshot.mockReset();
    mocks.saveMilkbarDesignersCmsSnapshot.mockReset();
    mocks.patchMilkbarInquiryStatus.mockReset();
  });

  it('wraps GET, PUT, and PATCH with authenticated page-manager sources', () => {
    expect(mocks.apiHandler).toHaveBeenCalledTimes(3);
    expect(mocks.apiHandler.mock.calls[0]?.[1]).toMatchObject({
      requireAuth: true,
      source: 'v2.page-manager.milkbardesigners.GET',
    });
    expect(mocks.apiHandler.mock.calls[1]?.[1]).toMatchObject({
      requireAuth: true,
      source: 'v2.page-manager.milkbardesigners.PUT',
    });
    expect(mocks.apiHandler.mock.calls[2]?.[1]).toMatchObject({
      requireAuth: true,
      source: 'v2.page-manager.milkbardesigners.PATCH',
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

  it('PATCH marks an inquiry as contacted', async () => {
    mocks.patchMilkbarInquiryStatus.mockResolvedValue({ ok: true });

    const request = new Request('http://localhost/api/v2/page-manager/milkbardesigners', {
      method: 'PATCH',
      body: JSON.stringify({ email: 'test@example.com', status: 'contacted' }),
    }) as NextRequest;

    const response = await PATCH(request);
    const body = (await response.json()) as { ok: boolean };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mocks.patchMilkbarInquiryStatus).toHaveBeenCalledWith('test@example.com', 'contacted');
  });

  it('PATCH defaults to pending status when status is not contacted', async () => {
    mocks.patchMilkbarInquiryStatus.mockResolvedValue({ ok: true });

    const request = new Request('http://localhost/api/v2/page-manager/milkbardesigners', {
      method: 'PATCH',
      body: JSON.stringify({ email: 'other@example.com', status: 'pending' }),
    }) as NextRequest;

    await PATCH(request);

    expect(mocks.patchMilkbarInquiryStatus).toHaveBeenCalledWith('other@example.com', 'pending');
  });
});
