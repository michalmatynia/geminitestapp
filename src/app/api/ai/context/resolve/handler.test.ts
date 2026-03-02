import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resolveNodesMock } = vi.hoisted(() => ({
  resolveNodesMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-context-registry/server', () => ({
  resolveNodes: resolveNodesMock,
}));

import { POST_handler } from './handler';

const makeRequest = (body: unknown): NextRequest =>
  new NextRequest('http://localhost/api/ai/context/resolve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/ai/context/resolve handler', () => {
  beforeEach(() => {
    resolveNodesMock.mockReset();
  });

  it('returns resolved nodes and missing IDs', async () => {
    resolveNodesMock.mockReturnValue({
      nodes: [{ id: 'page:home', kind: 'page', name: 'Home', description: '', tags: [], version: '1.0.0' }],
      missing: ['page:ghost'],
    });

    const res = await POST_handler(
      makeRequest({ ids: ['page:home', 'page:ghost'] }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { nodes: unknown[]; missing: string[] };
    expect(body.nodes).toHaveLength(1);
    expect(body.missing).toEqual(['page:ghost']);
    expect(resolveNodesMock).toHaveBeenCalledWith(['page:home', 'page:ghost']);
  });

  it('throws for missing ids field', async () => {
    await expect(
      POST_handler(
        makeRequest({}),
        {} as Parameters<typeof POST_handler>[1]
      )
    ).rejects.toThrow('Invalid resolve request payload.');
  });

  it('throws for empty ids array', async () => {
    await expect(
      POST_handler(
        makeRequest({ ids: [] }),
        {} as Parameters<typeof POST_handler>[1]
      )
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
