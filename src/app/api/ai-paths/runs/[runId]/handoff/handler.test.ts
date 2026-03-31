import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireAiPathsAccessMock,
  enforceAiPathsActionRateLimitMock,
  assertAiPathRunAccessMock,
  markPathRunHandoffReadyMock,
  findRunByIdMock,
  parseJsonBodyMock,
} = vi.hoisted(() => ({
  requireAiPathsAccessMock: vi.fn(),
  enforceAiPathsActionRateLimitMock: vi.fn(),
  assertAiPathRunAccessMock: vi.fn(),
  markPathRunHandoffReadyMock: vi.fn(),
  findRunByIdMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccess: requireAiPathsAccessMock,
  enforceAiPathsActionRateLimit: enforceAiPathsActionRateLimitMock,
  assertAiPathRunAccess: assertAiPathRunAccessMock,
  markPathRunHandoffReady: markPathRunHandoffReadyMock,
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: vi.fn(async () => ({
    findRunById: findRunByIdMock,
  })),
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: parseJsonBodyMock,
}));

import { POST_handler } from './handler';

const makeRequest = (body: Record<string, unknown> = {}): NextRequest =>
  new NextRequest('http://localhost/api/ai-paths/runs/run-1/handoff', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

const parseResponseBody = async (response: Response): Promise<Record<string, unknown>> => {
  const bodyText = await response.text();
  const parsed: unknown = bodyText ? JSON.parse(bodyText) : {};
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Expected a JSON object response body.');
  }
  return parsed;
};

describe('ai-paths run handoff handler', () => {
  beforeEach(() => {
    requireAiPathsAccessMock.mockReset().mockResolvedValue({ userId: 'user-1' });
    enforceAiPathsActionRateLimitMock.mockReset().mockResolvedValue(undefined);
    assertAiPathRunAccessMock.mockReset().mockReturnValue(undefined);
    markPathRunHandoffReadyMock.mockReset().mockResolvedValue({
      id: 'run-1',
      status: 'handoff_ready',
    });
    findRunByIdMock.mockReset().mockResolvedValue({
      id: 'run-1',
      status: 'blocked_on_lease',
    });
    parseJsonBodyMock.mockReset().mockResolvedValue({
      ok: true,
      data: {
        reason: 'Execution lease remains owned by another worker.',
        checkpointLineageId: 'run-1:123',
      },
    });
  });

  it('marks the run handoff ready and returns the updated run', async () => {
    const response = await POST_handler(
      makeRequest({
        reason: 'Execution lease remains owned by another worker.',
        checkpointLineageId: 'run-1:123',
      }),
      {} as Parameters<typeof POST_handler>[1],
      { runId: 'run-1' }
    );

    expect(response.status).toBe(200);
    await expect(parseResponseBody(response)).resolves.toEqual({
      run: { id: 'run-1', status: 'handoff_ready' },
      handoffReady: true,
      runId: 'run-1',
    });
    expect(enforceAiPathsActionRateLimitMock).toHaveBeenCalledWith(
      { userId: 'user-1' },
      'run-handoff'
    );
    expect(assertAiPathRunAccessMock).toHaveBeenCalledWith(
      { userId: 'user-1' },
      expect.objectContaining({ id: 'run-1' })
    );
    expect(markPathRunHandoffReadyMock).toHaveBeenCalledWith({
      runId: 'run-1',
      reason: 'Execution lease remains owned by another worker.',
      checkpointLineageId: 'run-1:123',
      requestedBy: 'user-1',
    });
  });

  it('returns the parser response when the request body is invalid', async () => {
    parseJsonBodyMock.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400 }),
    });

    const response = await POST_handler(
      makeRequest(),
      {} as Parameters<typeof POST_handler>[1],
      { runId: 'run-1' }
    );

    expect(response.status).toBe(400);
    expect(findRunByIdMock).not.toHaveBeenCalled();
    expect(markPathRunHandoffReadyMock).not.toHaveBeenCalled();
  });

  it('throws when the run does not exist', async () => {
    findRunByIdMock.mockResolvedValueOnce(null);

    await expect(
      POST_handler(makeRequest(), {} as Parameters<typeof POST_handler>[1], { runId: 'run-1' })
    ).rejects.toThrow(/run not found/i);

    expect(markPathRunHandoffReadyMock).not.toHaveBeenCalled();
  });
});
