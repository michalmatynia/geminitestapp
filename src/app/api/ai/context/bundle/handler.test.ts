import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

const { resolveRefsMock, logSystemEventMock, captureExceptionMock } = vi.hoisted(() => ({
  resolveRefsMock: vi.fn(),
  logSystemEventMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-context-registry/server', () => ({
  contextRegistryEngine: {
    resolveRefs: resolveRefsMock,
  },
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: logSystemEventMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

import { POST_handler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-ai-context-bundle-1',
    traceId: 'trace-ai-context-bundle-1',
    correlationId: 'corr-ai-context-bundle-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

describe('ai context bundle handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveRefsMock.mockResolvedValue({
      refs: [{ id: 'node-1', kind: 'static_node' }],
      nodes: [{ id: 'node-1' }],
      documents: [],
      truncated: false,
      engineVersion: 'engine-test',
    });
    logSystemEventMock.mockResolvedValue(undefined);
    captureExceptionMock.mockResolvedValue(undefined);
  });

  it('rejects invalid JSON bodies and captures the parse error', async () => {
    await expect(
      POST_handler(
        new NextRequest('http://localhost/api/ai/context/bundle', {
          method: 'POST',
          body: '{invalid-json',
          headers: {
            'content-type': 'application/json',
          },
        }),
        createRequestContext()
      )
    ).rejects.toThrow('Invalid JSON body.');

    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    expect(resolveRefsMock).not.toHaveBeenCalled();
  });

  it('rejects invalid bundle request payloads', async () => {
    await expect(
      POST_handler(
        new NextRequest('http://localhost/api/ai/context/bundle', {
          method: 'POST',
          body: JSON.stringify({ refs: [] }),
          headers: {
            'content-type': 'application/json',
          },
        }),
        createRequestContext()
      )
    ).rejects.toThrow('Invalid bundle request payload.');

    expect(resolveRefsMock).not.toHaveBeenCalled();
  });

  it('resolves refs, logs the bundle summary, and returns a cached response', async () => {
    const response = await POST_handler(
      new NextRequest('http://localhost/api/ai/context/bundle', {
        method: 'POST',
        body: JSON.stringify({
          refs: [{ id: 'node-1', kind: 'static_node' }],
          depth: 2,
          maxNodes: 12,
        }),
        headers: {
          'content-type': 'application/json',
        },
      }),
      createRequestContext()
    );

    expect(resolveRefsMock).toHaveBeenCalledWith({
      refs: [{ id: 'node-1', kind: 'static_node' }],
      depth: 2,
      maxNodes: 12,
    });
    expect(logSystemEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        source: 'ai.context.bundle',
        context: expect.objectContaining({
          refCount: 1,
          depth: 2,
          maxNodes: 12,
          nodeCount: 1,
          documentCount: 0,
          truncated: false,
          engineVersion: 'engine-test',
        }),
      })
    );
    expect(response.headers.get('Cache-Control')).toBe(
      'private, max-age=15, stale-while-revalidate=60'
    );
    await expect(response.json()).resolves.toEqual({
      refs: [{ id: 'node-1', kind: 'static_node' }],
      nodes: [{ id: 'node-1' }],
      documents: [],
      truncated: false,
      engineVersion: 'engine-test',
    });
  });
});
