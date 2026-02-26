import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireAiPathsAccessOrInternalMock,
  enforceAiPathsActionRateLimitMock,
  parseJsonBodyMock,
  enqueuePlaywrightNodeRunMock,
  readPlaywrightNodeRunMock,
  readPlaywrightNodeArtifactMock,
} = vi.hoisted(() => ({
  requireAiPathsAccessOrInternalMock: vi.fn(),
  enforceAiPathsActionRateLimitMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  enqueuePlaywrightNodeRunMock: vi.fn(),
  readPlaywrightNodeRunMock: vi.fn(),
  readPlaywrightNodeArtifactMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccessOrInternal: requireAiPathsAccessOrInternalMock,
  enforceAiPathsActionRateLimit: enforceAiPathsActionRateLimitMock,
}));

vi.mock('@/features/products/server', () => ({
  parseJsonBody: parseJsonBodyMock,
}));

vi.mock('@/features/ai/ai-paths/services/playwright-node-runner', () => ({
  enqueuePlaywrightNodeRun: enqueuePlaywrightNodeRunMock,
  readPlaywrightNodeRun: readPlaywrightNodeRunMock,
  readPlaywrightNodeArtifact: readPlaywrightNodeArtifactMock,
}));

import { GET_handler as GET_playwrightArtifactHandler } from '@/app/api/ai-paths/playwright/[runId]/artifacts/[file]/handler';
import { GET_handler } from '@/app/api/ai-paths/playwright/[runId]/handler';
import { POST_handler } from '@/app/api/ai-paths/playwright/handler';

const createPostRequest = (): Request =>
  new Request('http://localhost/api/ai-paths/playwright', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
  });

const createGetRequest = (runId: string): Request =>
  new Request(
    `http://localhost/api/ai-paths/playwright/${encodeURIComponent(runId)}`,
    {
      method: 'GET',
    },
  );

const createArtifactGetRequest = (runId: string, file: string): Request =>
  new Request(
    `http://localhost/api/ai-paths/playwright/${encodeURIComponent(runId)}/artifacts/${encodeURIComponent(file)}`,
    {
      method: 'GET',
    },
  );

const buildRun = (
  patch: Record<string, unknown> = {},
): Record<string, unknown> => ({
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
        capture: { screenshot: true, html: false, video: false, trace: false },
      },
    });
    enqueuePlaywrightNodeRunMock.mockResolvedValueOnce(
      buildRun({ runId: 'run-123' }),
    );

    const response = await POST_handler(
      createPostRequest() as Parameters<typeof POST_handler>[0],
      {} as Parameters<typeof POST_handler>[1],
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(enforceAiPathsActionRateLimitMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
      'playwright-enqueue',
    );
    expect(enqueuePlaywrightNodeRunMock).toHaveBeenCalledWith({
      request: expect.objectContaining({
        script: 'export default async function run() {}',
        input: { prompt: 'go' },
        startUrl: 'https://example.com',
        timeoutMs: 45000,
        browserEngine: 'firefox',
        personaId: 'persona-1',
      }),
      waitForResult: false,
      ownerUserId: 'user-1',
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

    await POST_handler(
      createPostRequest() as Parameters<typeof POST_handler>[0],
      {} as Parameters<typeof POST_handler>[1],
    );

    expect(enforceAiPathsActionRateLimitMock).not.toHaveBeenCalled();
    expect(enqueuePlaywrightNodeRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: 'system',
      }),
    );
  });

  it('returns run via GET and enforces poll rate limit for external requests', async () => {
    readPlaywrightNodeRunMock.mockResolvedValueOnce(
      buildRun({ runId: 'run-900', status: 'completed' }),
    );

    const response = await GET_handler(
      createGetRequest('run-900') as Parameters<typeof GET_handler>[0],
      {} as Parameters<typeof GET_handler>[1],
      { runId: 'run-900' },
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(enforceAiPathsActionRateLimitMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
      'playwright-poll',
    );
    expect(body['run']).toEqual(
      expect.objectContaining({
        runId: 'run-900',
        status: 'completed',
      }),
    );
  });

  it('throws not found when GET run id does not exist', async () => {
    readPlaywrightNodeRunMock.mockResolvedValueOnce(null);

    await expect(
      GET_handler(
        createGetRequest('missing-run') as Parameters<typeof GET_handler>[0],
        {} as Parameters<typeof GET_handler>[1],
        { runId: 'missing-run' },
      ),
    ).rejects.toThrow('Playwright run not found.');
  });

  it('blocks GET polling for non-owner non-elevated user', async () => {
    readPlaywrightNodeRunMock.mockResolvedValueOnce(
      buildRun({ runId: 'run-unauthorized', ownerUserId: 'different-user' }),
    );

    await expect(
      GET_handler(
        createGetRequest('run-unauthorized') as Parameters<
          typeof GET_handler
        >[0],
        {} as Parameters<typeof GET_handler>[1],
        { runId: 'run-unauthorized' },
      ),
    ).rejects.toThrow('Playwright run access denied.');
  });

  it('returns artifact bytes via artifact GET route', async () => {
    readPlaywrightNodeRunMock.mockResolvedValueOnce(
      buildRun({ runId: 'run-901', ownerUserId: 'user-1' }),
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
      createArtifactGetRequest('run-901', 'final.png') as Parameters<
        typeof GET_playwrightArtifactHandler
      >[0],
      {} as Parameters<typeof GET_playwrightArtifactHandler>[1],
      { runId: 'run-901', file: 'final.png' },
    );

    expect(enforceAiPathsActionRateLimitMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
      'playwright-artifact',
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
      buildRun({ runId: 'run-902', ownerUserId: 'user-1' }),
    );
    readPlaywrightNodeArtifactMock.mockResolvedValueOnce(null);

    await expect(
      GET_playwrightArtifactHandler(
        createArtifactGetRequest('run-902', 'missing.png') as Parameters<
          typeof GET_playwrightArtifactHandler
        >[0],
        {} as Parameters<typeof GET_playwrightArtifactHandler>[1],
        { runId: 'run-902', file: 'missing.png' },
      ),
    ).rejects.toThrow('Playwright artifact not found.');
  });

  it('blocks artifact GET for non-owner non-elevated user', async () => {
    readPlaywrightNodeRunMock.mockResolvedValueOnce(
      buildRun({ runId: 'run-903', ownerUserId: 'different-user' }),
    );

    await expect(
      GET_playwrightArtifactHandler(
        createArtifactGetRequest('run-903', 'final.png') as Parameters<
          typeof GET_playwrightArtifactHandler
        >[0],
        {} as Parameters<typeof GET_playwrightArtifactHandler>[1],
        { runId: 'run-903', file: 'final.png' },
      ),
    ).rejects.toThrow('Playwright run access denied.');
    expect(readPlaywrightNodeArtifactMock).not.toHaveBeenCalled();
  });
});
