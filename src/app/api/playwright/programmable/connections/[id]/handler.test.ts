import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  parseJsonBodyMock: vi.fn(),
  updateProgrammableConnectionMock: vi.fn(),
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: (...args: unknown[]) => mocks.parseJsonBodyMock(...args),
}));

vi.mock('@/features/playwright/server', () => ({
  programmableConnectionMutationSchema: { safeParse: vi.fn() },
  updatePlaywrightProgrammableConnection: (...args: unknown[]) =>
    mocks.updateProgrammableConnectionMock(...args),
}));

import { putHandler } from './handler';

describe('playwright programmable connection by-id handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates the connection through the shared Playwright server action', async () => {
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: { name: 'Programmable Browser' },
    });
    mocks.updateProgrammableConnectionMock.mockResolvedValue({ id: 'conn-playwright-1' });

    const response = await putHandler(
      new NextRequest('http://localhost/api/playwright/programmable/connections/conn-playwright-1', {
        method: 'PUT',
      }),
      {} as never,
      { id: 'conn-playwright-1' }
    );

    expect(mocks.updateProgrammableConnectionMock).toHaveBeenCalledWith({
      connectionId: 'conn-playwright-1',
      data: { name: 'Programmable Browser' },
    });
    await expect(response.json()).resolves.toEqual({ id: 'conn-playwright-1' });
  });
});
