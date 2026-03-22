import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const { createErrorResponseMock } = vi.hoisted(() => ({
  createErrorResponseMock: vi.fn(),
}));

vi.mock('@/shared/lib/api/handle-api-error', () => ({
  createErrorResponse: createErrorResponseMock,
}));

import { parseJsonBody, parseObjectJsonBody } from './parse-json';

describe('parse-json helpers', () => {
  beforeEach(() => {
    createErrorResponseMock.mockReset();
    createErrorResponseMock.mockResolvedValue(new Response(JSON.stringify({ error: 'bad' }), { status: 400 }));
  });

  it('parses valid JSON payloads through the provided schema', async () => {
    const request = new Request('https://kangur.example/api/demo', {
      method: 'POST',
      body: JSON.stringify({ title: 'Kangur' }),
      headers: { 'content-type': 'application/json' },
    });

    await expect(
      parseJsonBody(request, z.object({ title: z.string() }), { logPrefix: 'demo.POST' })
    ).resolves.toEqual({
      ok: true,
      data: { title: 'Kangur' },
    });
  });

  it('returns a logged error response for invalid JSON and schema failures', async () => {
    const invalidJsonRequest = new Request('https://kangur.example/api/demo', {
      method: 'POST',
      body: '{bad',
      headers: { 'content-type': 'application/json' },
    });

    const invalidJsonResult = await parseJsonBody(invalidJsonRequest, z.object({ title: z.string() }), {
      logPrefix: 'demo.POST',
    });
    expect(invalidJsonResult.ok).toBe(false);
    expect(createErrorResponseMock).toHaveBeenCalledTimes(1);

    const invalidSchemaRequest = new Request('https://kangur.example/api/demo', {
      method: 'POST',
      body: JSON.stringify({ title: 42 }),
      headers: { 'content-type': 'application/json' },
    });
    const invalidSchemaResult = await parseJsonBody(
      invalidSchemaRequest,
      z.object({ title: z.string() }),
      {
      logPrefix: 'demo.POST',
      }
    );
    expect(invalidSchemaResult.ok).toBe(false);
    expect(createErrorResponseMock).toHaveBeenCalledTimes(2);
  });

  it('supports empty bodies when allowEmpty is enabled', async () => {
    const request = new Request('https://kangur.example/api/demo', {
      method: 'POST',
      body: '',
      headers: { 'content-type': 'application/json' },
    });

    await expect(parseObjectJsonBody(request, { allowEmpty: true })).resolves.toEqual({
      ok: true,
      data: {},
    });
  });
});
