import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDefaultConnectionHandlerMock, postDefaultConnectionHandlerMock } = vi.hoisted(() => ({
  getDefaultConnectionHandlerMock: vi.fn(),
  postDefaultConnectionHandlerMock: vi.fn(),
}));

vi.mock('@/app/api/v2/integrations/exports/vinted/default-connection/handler', () => ({
  getHandler: (...args: unknown[]) => getDefaultConnectionHandlerMock(...args),
  postHandler: (...args: unknown[]) => postDefaultConnectionHandlerMock(...args),
}));

import { getHandler, postHandler, querySchema } from './handler';

describe('vinted export setting handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates GET requests to the default-connection handler', async () => {
    const request = {} as never;
    const context = {} as never;
    const delegatedResponse = NextResponse.json({ source: 'vinted-default-connection-get' });
    getDefaultConnectionHandlerMock.mockResolvedValue(delegatedResponse);

    const response = await getHandler(request, context, { setting: 'default-connection' });

    expect(getDefaultConnectionHandlerMock).toHaveBeenCalledWith(request, context);
    expect(response).toBe(delegatedResponse);
  });

  it('delegates POST requests to the default-connection handler', async () => {
    const request = {} as never;
    const context = {} as never;
    const delegatedResponse = NextResponse.json({ source: 'vinted-default-connection-post' });
    postDefaultConnectionHandlerMock.mockResolvedValue(delegatedResponse);

    const response = await postHandler(request, context, { setting: 'default-connection' });

    expect(postDefaultConnectionHandlerMock).toHaveBeenCalledWith(request, context);
    expect(response).toBe(delegatedResponse);
  });

  it('rejects unknown Vinted export setting names', async () => {
    await expect(postHandler({} as never, {} as never, { setting: 'unknown' })).rejects.toThrow(
      'Unknown exports/vinted setting: unknown'
    );
  });

  it('uses the shared connection-only query schema', () => {
    expect(
      querySchema.parse({
        connectionId: '  conn-vinted  ',
      })
    ).toEqual({
      connectionId: 'conn-vinted',
    });
  });
});
