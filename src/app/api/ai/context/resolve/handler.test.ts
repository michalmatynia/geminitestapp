import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resolveWithExpansionMock, getVersionMock } = vi.hoisted(() => ({
  resolveWithExpansionMock: vi.fn(),
  getVersionMock: vi.fn().mockReturnValue('codefirst:11'),
}));

vi.mock('@/features/ai/ai-context-registry/server', () => ({
  retrievalService: { resolveWithExpansion: resolveWithExpansionMock },
  registryBackend: { getVersion: getVersionMock },
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

const makeRequest = (body: unknown): NextRequest =>
  new NextRequest('http://localhost/api/ai/context/resolve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/ai/context/resolve handler', () => {
  beforeEach(() => {
    resolveWithExpansionMock.mockReset();
    getVersionMock.mockReturnValue('codefirst:11');
  });

  it('returns resolved nodes with truncated, visitedIds, and registryVersion', async () => {
    resolveWithExpansionMock.mockReturnValue({
      nodes: [BASE_NODE],
      truncated: false,
      visitedIds: ['page:home'],
    });

    const res = await POST_handler(
      makeRequest({ ids: ['page:home'] }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      nodes: unknown[];
      truncated: boolean;
      visitedIds: string[];
      registryVersion: string;
    };
    expect(body.nodes).toHaveLength(1);
    expect(body.truncated).toBe(false);
    expect(body.visitedIds).toEqual(['page:home']);
    expect(body.registryVersion).toBe('codefirst:11');
  });

  it('passes depth and maxNodes through to retrievalService', async () => {
    resolveWithExpansionMock.mockReturnValue({
      nodes: [],
      truncated: false,
      visitedIds: [],
    });

    await POST_handler(
      makeRequest({ ids: ['page:home'], depth: 2, maxNodes: 50 }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(resolveWithExpansionMock).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ['page:home'], depth: 2, maxNodes: 50 })
    );
  });

  it('reports truncated=true when service returns it', async () => {
    resolveWithExpansionMock.mockReturnValue({
      nodes: [BASE_NODE],
      truncated: true,
      visitedIds: ['page:home'],
    });

    const res = await POST_handler(
      makeRequest({ ids: ['page:home'] }),
      {} as Parameters<typeof POST_handler>[1]
    );

    const body = (await res.json()) as { truncated: boolean };
    expect(body.truncated).toBe(true);
  });

  it('throws for missing ids field', async () => {
    await expect(
      POST_handler(makeRequest({}), {} as Parameters<typeof POST_handler>[1])
    ).rejects.toThrow('Invalid resolve request payload.');
  });

  it('throws for empty ids array', async () => {
    await expect(
      POST_handler(makeRequest({ ids: [] }), {} as Parameters<typeof POST_handler>[1])
    ).rejects.toThrow('Invalid resolve request payload.');
  });

  it('throws for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/ai/context/resolve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad json',
    });

    await expect(
      POST_handler(req, {} as Parameters<typeof POST_handler>[1])
    ).rejects.toThrow('Invalid JSON body.');
  });
});
