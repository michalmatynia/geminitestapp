import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findProgrammableIntegrationMock: vi.fn(),
}));

vi.mock('@/features/playwright/server/programmable-storage', () => ({
  findPlaywrightProgrammableIntegration: (...args: unknown[]) =>
    mocks.findProgrammableIntegrationMock(...args),
}));

import { GET_handler } from './handler';

describe('playwright programmable integration handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the programmable integration when it exists', async () => {
    mocks.findProgrammableIntegrationMock.mockResolvedValue({
      id: 'integration-playwright',
      slug: 'playwright-programmable',
      name: 'Playwright (Programmable)',
    });

    const response = await GET_handler(new Request('http://localhost/api/playwright/programmable'), {} as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'integration-playwright',
      slug: 'playwright-programmable',
      name: 'Playwright (Programmable)',
    });
  });

  it('returns null when the programmable integration is missing', async () => {
    mocks.findProgrammableIntegrationMock.mockResolvedValue(null);

    const response = await GET_handler(new Request('http://localhost/api/playwright/programmable'), {} as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toBeNull();
  });
});
