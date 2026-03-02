import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { searchNodesMock } = vi.hoisted(() => ({
  searchNodesMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-context-registry/server', () => ({
  searchNodes: searchNodesMock,
}));

import { POST_handler } from './handler';

const makeRequest = (body?: unknown): NextRequest =>
  new NextRequest('http://localhost/api/ai/context/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

describe('POST /api/ai/context/search handler', () => {
  beforeEach(() => {
    searchNodesMock.mockReset();
  });

  it('returns search results from the registry service', async () => {
    searchNodesMock.mockReturnValue({
      nodes: [{ id: 'page:home', kind: 'page', name: 'Home', description: '', tags: [], version: '1.0.0' }],
      total: 1,
    });

    const res = await POST_handler(
      makeRequest({ query: 'home' }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { nodes: unknown[]; total: number };
    expect(body.total).toBe(1);
    expect(searchNodesMock).toHaveBeenCalledWith({ query: 'home' });
  });

  it('accepts empty body and calls searchNodes with empty object', async () => {
    searchNodesMock.mockReturnValue({ nodes: [], total: 0 });

    const res = await POST_handler(
      makeRequest({}),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(res.status).toBe(200);
    expect(searchNodesMock).toHaveBeenCalledWith({});
  });

  it('passes kind filter through to searchNodes', async () => {
    searchNodesMock.mockReturnValue({ nodes: [], total: 0 });

    await POST_handler(
      makeRequest({ kind: 'collection' }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(searchNodesMock).toHaveBeenCalledWith({ kind: 'collection' });
  });

  it('throws for invalid payload (kind out of enum)', async () => {
    await expect(
      POST_handler(
        makeRequest({ kind: 'invalid-kind' }),
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
