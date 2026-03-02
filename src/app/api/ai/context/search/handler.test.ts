import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { searchMock, getVersionMock } = vi.hoisted(() => ({
  searchMock: vi.fn(),
  getVersionMock: vi.fn().mockReturnValue('codefirst:11'),
}));

vi.mock('@/features/ai/ai-context-registry/server', () => ({
  registryBackend: { search: searchMock, getVersion: getVersionMock },
}));

import { POST_handler } from './handler';

const BASE_NODE = {
  id: 'page:home',
  kind: 'page',
  name: 'Home',
  description: '',
  tags: [],
  version: '1.0.0',
  permissions: { readScopes: ['ctx:read'], riskTier: 'none', classification: 'public' },
  updatedAtISO: '2026-01-01T00:00:00.000Z',
  source: { type: 'code', ref: 'test.ts' },
};

const makeRequest = (body?: unknown): NextRequest =>
  new NextRequest('http://localhost/api/ai/context/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

describe('POST /api/ai/context/search handler', () => {
  beforeEach(() => {
    searchMock.mockReset();
    getVersionMock.mockReturnValue('codefirst:11');
  });

  it('returns search results with registryVersion', async () => {
    searchMock.mockReturnValue([BASE_NODE]);

    const res = await POST_handler(
      makeRequest({ query: 'home' }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { nodes: unknown[]; total: number; registryVersion: string };
    expect(body.total).toBe(1);
    expect(body.registryVersion).toBe('codefirst:11');
    expect(searchMock).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'home' })
    );
  });

  it('accepts empty body and calls search with default limit', async () => {
    searchMock.mockReturnValue([]);

    const res = await POST_handler(
      makeRequest({}),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { nodes: unknown[]; total: number; registryVersion: string };
    expect(body.total).toBe(0);
    expect(body.registryVersion).toBe('codefirst:11');
    // Default limit=10 is passed
    expect(searchMock).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }));
  });

  it('passes kinds array filter through to backend', async () => {
    searchMock.mockReturnValue([]);

    await POST_handler(
      makeRequest({ kinds: ['collection', 'action'] }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(searchMock).toHaveBeenCalledWith(
      expect.objectContaining({ kinds: ['collection', 'action'] })
    );
  });

  it('throws for invalid payload (kinds element out of enum)', async () => {
    await expect(
      POST_handler(
        makeRequest({ kinds: ['invalid-kind'] }),
        {} as Parameters<typeof POST_handler>[1]
      )
    ).rejects.toThrow('Invalid search request payload.');
  });

  it('throws for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/ai/context/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json{',
    });

    await expect(
      POST_handler(req, {} as Parameters<typeof POST_handler>[1])
    ).rejects.toThrow('Invalid JSON body.');
  });
});
