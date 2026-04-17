import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findProgrammableIntegrationMock: vi.fn(),
  requireProgrammableIntegrationMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  listProgrammableConnectionsMock: vi.fn(),
  createProgrammableConnectionMock: vi.fn(),
}));

vi.mock('../shared', () => ({
  findPlaywrightProgrammableIntegration: (...args: unknown[]) =>
    mocks.findProgrammableIntegrationMock(...args),
  requirePlaywrightProgrammableIntegration: (...args: unknown[]) =>
    mocks.requireProgrammableIntegrationMock(...args),
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: (...args: unknown[]) => mocks.parseJsonBodyMock(...args),
}));

vi.mock('@/features/playwright/server', () => ({
  programmableConnectionMutationSchema: { safeParse: vi.fn() },
  listPlaywrightProgrammableConnections: (...args: unknown[]) =>
    mocks.listProgrammableConnectionsMock(...args),
  createPlaywrightProgrammableConnection: (...args: unknown[]) =>
    mocks.createProgrammableConnectionMock(...args),
}));

import { GET_handler, POST_handler } from './handler';

describe('playwright programmable connections handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty list when the programmable integration is missing', async () => {
    mocks.findProgrammableIntegrationMock.mockResolvedValue(null);

    const response = await GET_handler(
      new NextRequest('http://localhost/api/playwright/programmable/connections'),
      {} as never
    );

    expect(mocks.listProgrammableConnectionsMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual([]);
  });

  it('lists connections through the shared Playwright server action', async () => {
    mocks.findProgrammableIntegrationMock.mockResolvedValue({
      id: 'integration-playwright',
      slug: 'playwright-programmable',
      name: 'Playwright (Programmable)',
    });
    mocks.listProgrammableConnectionsMock.mockResolvedValue([{ id: 'connection-1' }]);

    const response = await GET_handler(
      new NextRequest('http://localhost/api/playwright/programmable/connections'),
      {} as never
    );

    expect(mocks.listProgrammableConnectionsMock).toHaveBeenCalledWith('integration-playwright');
    await expect(response.json()).resolves.toEqual([{ id: 'connection-1' }]);
  });

  it('creates connections through the shared Playwright server action', async () => {
    mocks.requireProgrammableIntegrationMock.mockResolvedValue({
      id: 'integration-playwright',
      slug: 'playwright-programmable',
      name: 'Playwright (Programmable)',
    });
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: { name: 'Programmable Browser' },
    });
    mocks.createProgrammableConnectionMock.mockResolvedValue({ id: 'connection-2' });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/playwright/programmable/connections', {
        method: 'POST',
      }),
      {} as never
    );

    expect(mocks.createProgrammableConnectionMock).toHaveBeenCalledWith({
      integrationId: 'integration-playwright',
      data: { name: 'Programmable Browser' },
    });
    await expect(response.json()).resolves.toEqual({ id: 'connection-2' });
  });
});
