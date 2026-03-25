import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createErrorResponseMock } = vi.hoisted(() => ({
  createErrorResponseMock: vi.fn(
    async (
      error: { message: string; meta?: { allowedMethods?: string[] } },
      options: { source: string }
    ) =>
      new Response(
        JSON.stringify({
          message: error.message,
          source: options.source,
          allowedMethods: error.meta?.allowedMethods ?? null,
        }),
        {
          status: error.message === 'Method not allowed' ? 405 : 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
  ),
}));

vi.mock('@/shared/errors/app-error', () => ({
  methodNotAllowedError: (message: string, meta: { allowedMethods: string[] }) => ({
    message,
    meta,
  }),
  notFoundError: (message: string) => ({
    message,
  }),
}));

vi.mock('@/shared/lib/api/handle-api-error', () => ({
  createErrorResponse: createErrorResponseMock,
}));

import {
  getPathSegments,
  handleCatchAllRequest,
  matchCatchAllPattern,
} from '@/shared/lib/api/catch-all-router';

describe('catch-all-router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts path segments only when the request matches the base path', () => {
    const request = {
      nextUrl: {
        pathname: '/api/notes/folders/abc/children',
      },
    } as NextRequest;

    expect(getPathSegments(request, '/api/notes')).toEqual(['folders', 'abc', 'children']);
    expect(getPathSegments(request, '/api/files')).toEqual([]);
  });

  it('matches literal, param, and optional pattern tokens', () => {
    expect(
      matchCatchAllPattern(
        ['folders', { param: 'id' }, { literal: 'children', optional: true }],
        ['folders', 'folder-1']
      )
    ).toEqual({ id: 'folder-1' });

    expect(
      matchCatchAllPattern(
        ['folders', { param: 'id' }, { literal: 'children', optional: true }],
        ['folders', 'folder-1', 'children']
      )
    ).toEqual({ id: 'folder-1' });

    expect(
      matchCatchAllPattern(
        ['folders', { param: 'id' }],
        ['folders', 'folder-1', 'extra']
      )
    ).toBeNull();
  });

  it('dispatches matching routes with resolved params', async () => {
    const getHandler = vi.fn(async (_request, context: { params: Promise<{ id: string }> }) => {
      const params = await context.params;
      return new Response(JSON.stringify(params), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    const request = new NextRequest('http://localhost/api/notes/folders/folder-1');

    const response = await handleCatchAllRequest(
      'GET',
      request,
      ['folders', 'folder-1'],
      [{ pattern: ['folders', { param: 'id' }], module: { GET: getHandler } }],
      'notes'
    );

    expect(getHandler).toHaveBeenCalledWith(
      request,
      expect.objectContaining({
        params: expect.any(Promise),
      })
    );
    await expect(response.json()).resolves.toEqual({ id: 'folder-1' });
    expect(createErrorResponseMock).not.toHaveBeenCalled();
  });

  it('returns method not allowed when the route matches but the method does not', async () => {
    const response = await handleCatchAllRequest(
      'GET',
      new NextRequest('http://localhost/api/notes/folders/folder-1'),
      ['folders', 'folder-1'],
      [{ pattern: ['folders', { param: 'id' }], module: { POST: vi.fn() } }],
      'notes'
    );

    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('POST');
    await expect(response.json()).resolves.toEqual({
      message: 'Method not allowed',
      source: 'catch-all-router.dispatch',
      allowedMethods: ['POST'],
    });
  });

  it('returns not found when no route patterns match the request', async () => {
    const response = await handleCatchAllRequest(
      'GET',
      new NextRequest('http://localhost/api/notes/unknown'),
      ['unknown'],
      [{ pattern: ['folders', { param: 'id' }], module: { GET: vi.fn() } }],
      'notes'
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: 'Not Found',
      source: 'notes.[[...path]].GET',
      allowedMethods: null,
    });
  });
});
