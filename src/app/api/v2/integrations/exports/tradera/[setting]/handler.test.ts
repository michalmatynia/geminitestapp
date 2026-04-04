import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDefaultConnectionHandlerMock, postDefaultConnectionHandlerMock } = vi.hoisted(() => ({
  getDefaultConnectionHandlerMock: vi.fn(),
  postDefaultConnectionHandlerMock: vi.fn(),
}));

vi.mock('@/app/api/v2/integrations/exports/tradera/default-connection/handler', () => ({
  GET_handler: (...args: unknown[]) => getDefaultConnectionHandlerMock(...args),
  POST_handler: (...args: unknown[]) => postDefaultConnectionHandlerMock(...args),
}));

import { GET_handler, POST_handler, querySchema } from './handler';

describe('tradera export setting handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates GET requests to the default-connection handler', async () => {
    const request = {} as never;
    const context = {} as never;
    const delegatedResponse = NextResponse.json({ source: 'tradera-default-connection-get' });
    getDefaultConnectionHandlerMock.mockResolvedValue(delegatedResponse);

    const response = await GET_handler(request, context, { setting: 'default-connection' });

    expect(getDefaultConnectionHandlerMock).toHaveBeenCalledWith(request, context);
    expect(response).toBe(delegatedResponse);
  });

  it('delegates POST requests to the default-connection handler', async () => {
    const request = {} as never;
    const context = {} as never;
    const delegatedResponse = NextResponse.json({ source: 'tradera-default-connection-post' });
    postDefaultConnectionHandlerMock.mockResolvedValue(delegatedResponse);

    const response = await POST_handler(request, context, { setting: 'default-connection' });

    expect(postDefaultConnectionHandlerMock).toHaveBeenCalledWith(request, context);
    expect(response).toBe(delegatedResponse);
  });

  it('rejects unknown Tradera export setting names', async () => {
    await expect(POST_handler({} as never, {} as never, { setting: 'unknown' })).rejects.toThrow(
      'Unknown exports/tradera setting: unknown'
    );
  });

  it('uses the shared connection-only query schema', () => {
    expect(
      querySchema.parse({
        connectionId: '  conn-tradera  ',
      })
    ).toEqual({
      connectionId: 'conn-tradera',
    });
  });
});
