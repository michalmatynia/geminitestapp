import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aiPathsPlaywrightEnqueueRequestSchema } from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  requireAiPathsAccessOrInternalMock,
  enforceAiPathsActionRateLimitMock,
  parseJsonBodyMock,
  resolveAiPathsContextRegistryEnvelopeMock,
  enqueuePlaywrightNodeRunMock,
  readPlaywrightNodeRunMock,
  readPlaywrightNodeArtifactMock,
} = vi.hoisted(() => ({
  requireAiPathsAccessOrInternalMock: vi.fn(),
  enforceAiPathsActionRateLimitMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  resolveAiPathsContextRegistryEnvelopeMock: vi.fn(),
  enqueuePlaywrightNodeRunMock: vi.fn(),
  readPlaywrightNodeRunMock: vi.fn(),
  readPlaywrightNodeArtifactMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server/access', () => ({
  requireAiPathsAccessOrInternal: requireAiPathsAccessOrInternalMock,
  enforceAiPathsActionRateLimit: enforceAiPathsActionRateLimitMock,
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: parseJsonBodyMock,
}));

vi.mock('@/features/ai/ai-paths/context-registry/server', () => ({
  resolveAiPathsContextRegistryEnvelope: resolveAiPathsContextRegistryEnvelopeMock,
}));

vi.mock('@/features/playwright/server', () => ({
  enqueuePlaywrightEngineRun: enqueuePlaywrightNodeRunMock,
  readPlaywrightEngineRun: readPlaywrightNodeRunMock,
  readPlaywrightEngineArtifact: readPlaywrightNodeArtifactMock,
  createAiPathNodePlaywrightInstance: (input: Record<string, unknown> = {}) => ({
    kind: 'ai_path_node',
    label: 'AI Paths Playwright node',
    tags: ['ai-paths', 'playwright'],
    ...input,
  }),
}));

import { GET_handler as GET_playwrightArtifactHandler } from '@/app/api/ai-paths/playwright/[runId]/artifacts/[file]/handler';
import { GET_handler } from '@/app/api/ai-paths/playwright/[runId]/handler';
import { POST_handler } from '@/app/api/ai-paths/playwright/handler';

const mockContext: ApiHandlerContext = {
  requestId: 'test-req-id',
  startTime: Date.now(),
  getElapsedMs: () => 0,
};

const createPostRequest = (): NextRequest =>
  new NextRequest('http://localhost/api/ai-paths/playwright', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
  });

const createGetRequest = (runId: string): NextRequest =>
  new NextRequest(`http://localhost/api/ai-paths/playwright/${encodeURIComponent(runId)}`, {
    method: 'GET',
  });

const createArtifactGetRequest = (runId: string, file: string): NextRequest =>
  new NextRequest(
    `http://localhost/api/ai-paths/playwright/${encodeURIComponent(runId)}/artifacts/${encodeURIComponent(file)}`,
    {
      method: 'GET',
    }
  );

const buildRun = (patch: Record<string, unknown> = {}): Record<string, unknown> => ({
  runId: 'run-1',
  ownerUserId: 'user-1',
  status: 'queued',
  startedAt: null,
  completedAt: null,
  createdAt: '2026-02-21T10:00:00.000Z',
  updatedAt: '2026-02-21T10:00:00.000Z',
  artifacts: [],
  logs: [],
  ...patch,
});

describe('AI Paths Playwright routes', () => {
  beforeEach(() => {
    requireAiPathsAccessOrInternalMock.mockReset();
    enforceAiPathsActionRateLimitMock.mockReset();
    parseJsonBodyMock.mockReset();
    resolveAiPathsContextRegistryEnvelopeMock.mockReset().mockResolvedValue(null);
    enqueuePlaywrightNodeRunMock.mockReset();
    readPlaywrightNodeRunMock.mockReset();
    readPlaywrightNodeArtifactMock.mockReset();

    requireAiPathsAccessOrInternalMock.mockResolvedValue({
      access: {
        userId: 'user-1',
        permissions: ['ai_paths.manage'],
        isElevated: false,
      },
      isInternal: false,
    });
  });

  it('enqueues run via POST and enforces action rate limit for external requests', async () => {
    parseJsonBodyMock.mockResolvedValueOnce({
      ok: true,
      data: {
        script: 'export default async function run() {}',
        input: { prompt: 'go' },
        startUrl: ' https://example.com ',
        timeoutMs: 45000,
        waitForResult: false,
        browserEngine: 'firefox',
        personaId: ' persona-1 ',
        settingsOverrides: { headless: true },
        launchOptions: { args: ['--disable-gpu'] },
        contextOptions: { locale: 'en-US' },
        contextRegistry: {
          refs: [{ kind: 'static_node', id: 'page:ai-paths' }],
        },
        capture: { screenshot: true, html: false, video: false, trace: false },
      },
    });
    resolveAiPathsContextRegistryEnvelopeMock.mockResolvedValueOnce({
      refs: [{ kind: 'static_node', id: 'page:ai-paths' }],
      resolved: {
        refs: [{ kind: 'static_node', id: 'page:ai-paths' }],
        nodes: [],
        documents: [],
      },
    });
    enqueuePlaywrightNodeRunMock.mockResolvedValueOnce(buildRun({ runId: 'run-123' }));
    const expectedEnqueueRequest = expect.objectContaining({
      script: 'export default async function run() {}',
      input: { prompt: 'go' },
      startUrl: 'https://example.com',
      timeoutMs: 45000,
      browserEngine: 'firefox',
      personaId: 'persona-1',
      contextRegistry: {
        refs: [{ kind: 'static_node', id: 'page:ai-paths' }],
        resolved: {
          refs: [{ kind: 'static_node', id: 'page:ai-paths' }],
          nodes: [],
          documents: [],
        },
      },
    }) as unknown;

    const response = await POST_handler(createPostRequest(), mockContext);
    const body = (await response.json()) as Record<string, unknown>;

    expect(parseJsonBodyMock).toHaveBeenCalledWith(
      expect.any(NextRequest),
      aiPathsPlaywrightEnqueueRequestSchema,
      expect.objectContaining({ logPrefix: 'ai-paths.playwright.enqueue' })
    );
    expect(enforceAiPathsActionRateLimitMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
      'playwright-enqueue'
    );
    expect(enqueuePlaywrightNodeRunMock).toHaveBeenCalledWith({
      request: expectedEnqueueRequest,
      waitForResult: false,
      ownerUserId: 'user-1',
      instance: {
        kind: 'ai_path_node',
        label: 'AI Paths Playwright node',
        tags: ['ai-paths', 'playwright'],
      },
    });
    expect(resolveAiPathsContextRegistryEnvelopeMock).toHaveBeenCalledWith({
      refs: [{ kind: 'static_node', id: 'page:ai-paths' }],
    });
    expect(body['run']).toEqual(expect.objectContaining({ runId: 'run-123' }));
  });

  it('skips action rate limit for internal POST requests', async () => {
    requireAiPathsAccessOrInternalMock.mockResolvedValueOnce({
      access: {
        userId: 'system',
        permissions: ['ai_paths.manage'],
        isElevated: true,
      },
      isInternal: true,
    });
    parseJsonBodyMock.mockResolvedValueOnce({
      ok: true,
      data: { script: 'export default async function run() {}' },
    });
    enqueuePlaywrightNodeRunMock.mockResolvedValueOnce(buildRun());

    await POST_handler(createPostRequest(), mockContext);

    expect(enforceAiPathsActionRateLimitMock).not.toHaveBeenCalled();
    expect(enqueuePlaywrightNodeRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: 'system',
        instance: expect.objectContaining({
          kind: 'ai_path_node',
        }),
      })
    );
  });

  it('returns run via GET and enforces poll rate limit for external requests', async () => {
    readPlaywrightNodeRunMock.mockResolvedValueOnce(
      buildRun({ runId: 'run-900', status: 'completed' })
    );

    const response = await GET_handler(createGetRequest('run-900'), mockContext, {
      runId: 'run-900',
    });
    const body = (await response.json()) as Record<string, unknown>;

    expect(enforceAiPathsActionRateLimitMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
      'playwright-poll'
    );
    expect(body['run']).toEqual(
      expect.objectContaining({
        runId: 'run-900',
        status: 'completed',
      })
    );
  });

  it('throws not found when GET run id does not exist', async () => {
    readPlaywrightNodeRunMock.mockResolvedValueOnce(null);

    await expect(
      GET_handler(createGetRequest('missing-run'), mockContext, { runId: 'missing-run' })
    ).rejects.toThrow('Playwright run not found.');
  });

  it('blocks GET polling for non-owner non-elevated user', async () => {
    readPlaywrightNodeRunMock.mockResolvedValueOnce(
      buildRun({ runId: 'run-unauthorized', ownerUserId: 'different-user' })
    );

    await expect(
      GET_handler(createGetRequest('run-unauthorized'), mockContext, { runId: 'run-unauthorized' })
    ).rejects.toThrow('Playwright run access denied.');
  });

  it('returns artifact bytes via artifact GET route', async () => {
    readPlaywrightNodeRunMock.mockResolvedValueOnce(
      buildRun({ runId: 'run-901', ownerUserId: 'user-1' })
    );
    readPlaywrightNodeArtifactMock.mockResolvedValueOnce({
      artifact: {
        name: 'final',
        path: 'run-901/final.png',
        mimeType: 'image/png',
        kind: 'screenshot',
      },
      content: Buffer.from('png-binary-data'),
    });

    const response = await GET_playwrightArtifactHandler(
      createArtifactGetRequest('run-901', 'final.png'),
      mockContext,
      { runId: 'run-901', file: 'final.png' }
    );

    expect(enforceAiPathsActionRateLimitMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
      'playwright-artifact'
    );
    expect(readPlaywrightNodeArtifactMock).toHaveBeenCalledWith({
      runId: 'run-901',
      fileName: 'final.png',
    });
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = Buffer.from(await response.arrayBuffer()).toString('utf8');
    expect(body).toBe('png-binary-data');
  });

  it('throws not found when artifact GET target does not exist', async () => {
    readPlaywrightNodeRunMock.mockResolvedValueOnce(
      buildRun({ runId: 'run-902', ownerUserId: 'user-1' })
    );
    readPlaywrightNodeArtifactMock.mockResolvedValueOnce(null);

    await expect(
      GET_playwrightArtifactHandler(
        createArtifactGetRequest('run-902', 'missing.png'),
        mockContext,
        { runId: 'run-902', file: 'missing.png' }
      )
    ).rejects.toThrow('Playwright artifact not found.');
  });

  it('blocks artifact GET for non-owner non-elevated user', async () => {
    readPlaywrightNodeRunMock.mockResolvedValueOnce(
      buildRun({ runId: 'run-903', ownerUserId: 'different-user' })
    );

    await expect(
      GET_playwrightArtifactHandler(createArtifactGetRequest('run-903', 'final.png'), mockContext, {
        runId: 'run-903',
        file: 'final.png',
      })
    ).rejects.toThrow('Playwright run access denied.');
    expect(readPlaywrightNodeArtifactMock).not.toHaveBeenCalled();
  });
});
