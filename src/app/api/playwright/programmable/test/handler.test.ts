import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  parseJsonBodyMock: vi.fn(),
  runPlaywrightProgrammableConnectionTestMock: vi.fn(),
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: (...args: unknown[]) => mocks.parseJsonBodyMock(...args),
}));

vi.mock('@/features/playwright/server', () => ({
  playwrightProgrammableTestPayloadSchema: { safeParse: vi.fn() },
  runPlaywrightProgrammableConnectionTest: (...args: unknown[]) =>
    mocks.runPlaywrightProgrammableConnectionTestMock(...args),
}));

import { POST_handler } from './handler';

describe('playwright programmable test handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses the request and delegates to the shared Playwright server action', async () => {
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        connectionId: 'conn-playwright-1',
        executionMode: 'commit',
        scriptType: 'listing',
      },
    });
    mocks.runPlaywrightProgrammableConnectionTestMock.mockResolvedValue({
      ok: true,
      scriptType: 'listing',
      input: { title: 'Example' },
      result: { ok: true },
    });

    const response = await POST_handler(
      new Request('http://localhost/api/playwright/programmable/test', {
        method: 'POST',
      }) as never,
      {} as never
    );

    expect(mocks.runPlaywrightProgrammableConnectionTestMock).toHaveBeenCalledWith({
      connectionId: 'conn-playwright-1',
      executionMode: 'commit',
      scriptType: 'listing',
    });
    await expect(response.json()).resolves.toEqual({
      ok: true,
      scriptType: 'listing',
      input: { title: 'Example' },
      result: { ok: true },
    });
  });
});
