import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const {
  getTraderaDefaultConnectionIdMock,
  setTraderaDefaultConnectionIdMock,
  parseJsonBodyMock,
} = vi.hoisted(() => ({
  getTraderaDefaultConnectionIdMock: vi.fn(),
  setTraderaDefaultConnectionIdMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  getTraderaDefaultConnectionId: (...args: unknown[]) =>
    getTraderaDefaultConnectionIdMock(...args),
  setTraderaDefaultConnectionId: (...args: unknown[]) =>
    setTraderaDefaultConnectionIdMock(...args),
}));

vi.mock('@/features/products/server', () => ({
  parseJsonBody: (...args: unknown[]) => parseJsonBodyMock(...args),
}));

import { getHandler, postHandler } from './handler';

describe('tradera default connection handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the stored Tradera default connection id', async () => {
    getTraderaDefaultConnectionIdMock.mockResolvedValue('conn-tradera-1');

    const response = await getHandler({} as NextRequest, {} as never);

    await expect(response.json()).resolves.toEqual({ connectionId: 'conn-tradera-1' });
  });

  it('persists the posted Tradera default connection id', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: { connectionId: 'conn-tradera-2' },
    });
    setTraderaDefaultConnectionIdMock.mockResolvedValue(undefined);

    const response = await postHandler({} as NextRequest, {} as never);

    expect(setTraderaDefaultConnectionIdMock).toHaveBeenCalledWith('conn-tradera-2');
    await expect(response.json()).resolves.toEqual({ connectionId: 'conn-tradera-2' });
  });
});
