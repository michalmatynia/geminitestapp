import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const {
  getVintedDefaultConnectionIdMock,
  setVintedDefaultConnectionIdMock,
  parseJsonBodyMock,
} = vi.hoisted(() => ({
  getVintedDefaultConnectionIdMock: vi.fn(),
  setVintedDefaultConnectionIdMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  getVintedDefaultConnectionId: (...args: unknown[]) =>
    getVintedDefaultConnectionIdMock(...args),
  setVintedDefaultConnectionId: (...args: unknown[]) =>
    setVintedDefaultConnectionIdMock(...args),
}));

vi.mock('@/features/products/server', () => ({
  parseJsonBody: (...args: unknown[]) => parseJsonBodyMock(...args),
}));

import { getHandler, postHandler } from './handler';

describe('vinted default connection handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the stored Vinted default connection id', async () => {
    getVintedDefaultConnectionIdMock.mockResolvedValue('conn-vinted-1');

    const response = await getHandler({} as NextRequest, {} as never);

    await expect(response.json()).resolves.toEqual({ connectionId: 'conn-vinted-1' });
  });

  it('persists the posted Vinted default connection id', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: { connectionId: 'conn-vinted-2' },
    });
    setVintedDefaultConnectionIdMock.mockResolvedValue(undefined);

    const response = await postHandler({} as NextRequest, {} as never);

    expect(setVintedDefaultConnectionIdMock).toHaveBeenCalledWith('conn-vinted-2');
    await expect(response.json()).resolves.toEqual({ connectionId: 'conn-vinted-2' });
  });
});
