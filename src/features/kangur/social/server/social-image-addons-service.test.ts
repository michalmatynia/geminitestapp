import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  runPlaywrightEngineTaskMock: vi.fn(),
  readPlaywrightNodeArtifactMock: vi.fn(),
  getDiskPathFromPublicPathMock: vi.fn(),
  uploadToConfiguredStorageMock: vi.fn(),
  upsertKangurSocialImageAddonMock: vi.fn(),
  sharpMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('sharp', () => ({
  default: (...args: unknown[]) => mocks.sharpMock(...args),
}));

vi.mock('@/features/playwright/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/playwright/server')>();
  return {
    ...actual,
    runPlaywrightEngineTask: (input: Record<string, unknown>) =>
      mocks.runPlaywrightEngineTaskMock({
        ...input,
        waitForResult: true,
      }),
    readPlaywrightEngineArtifact: (...args: unknown[]) =>
      mocks.readPlaywrightNodeArtifactMock(...args),
    createSocialCaptureSinglePlaywrightInstance: (input: Record<string, unknown> = {}) => ({
      kind: 'social_capture_single',
      label: 'Kangur social single capture',
      tags: ['kangur', 'social', 'capture', 'single'],
      ...input,
    }),
  };
});

vi.mock('@/features/files/server', () => ({
  getDiskPathFromPublicPath: (...args: unknown[]) =>
    mocks.getDiskPathFromPublicPathMock(...args),
  uploadToConfiguredStorage: (...args: unknown[]) =>
    mocks.uploadToConfiguredStorageMock(...args),
}));

vi.mock('./social-image-addons-repository', () => ({
  upsertKangurSocialImageAddon: (...args: unknown[]) =>
    mocks.upsertKangurSocialImageAddonMock(...args),
}));

vi.mock('@/features/kangur/shared/utils/observability/error-system', () => ({
  ErrorSystem: { logInfo: vi.fn(), captureException: vi.fn() },
}));

import { createKangurSocialImageAddonFromPlaywright } from './social-image-addons-service';

const fakeBuffer = Buffer.from('fake-png-data');

describe('createKangurSocialImageAddonFromPlaywright', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sharpMock.mockReturnValue({
      metadata: vi.fn().mockResolvedValue({ width: 1280, height: 720 }),
    });
    mocks.runPlaywrightEngineTaskMock.mockResolvedValue({
      runId: 'run-123',
      status: 'completed',
      artifacts: [{ name: 'addon', path: '/artifacts/addon.png' }],
      error: null,
    });
    mocks.readPlaywrightNodeArtifactMock.mockResolvedValue({
      content: fakeBuffer,
      mimeType: 'image/png',
    });
    mocks.uploadToConfiguredStorageMock.mockResolvedValue({
      filepath: '/uploads/kangur/social-addons/test.png',
    });
    mocks.upsertKangurSocialImageAddonMock.mockImplementation((addon: unknown) =>
      Promise.resolve(addon)
    );
    mocks.getDiskPathFromPublicPathMock.mockReturnValue('/tmp/test.png');
  });

  it('seeds the requested storefront appearance mode into Playwright for single captures', async () => {
    await createKangurSocialImageAddonFromPlaywright({
      title: 'Hero screenshot',
      sourceUrl: 'https://kangur.app/landing',
      appearanceMode: 'dark',
      forwardCookies:
        'session=abc123; __Host-next-auth.csrf-token=csrf123; __Secure-next-auth.session-token=session456',
    });

    expect(mocks.runPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        instance: expect.objectContaining({
          kind: 'social_capture_single',
        }),
        request: expect.objectContaining({
          input: expect.objectContaining({
            appearanceMode: 'dark',
          }),
          contextOptions: {
            storageState: {
              cookies: [
                {
                  name: 'session',
                  value: 'abc123',
                  url: 'https://kangur.app',
                },
                {
                  name: '__Host-next-auth.csrf-token',
                  value: 'csrf123',
                  url: 'https://kangur.app',
                  secure: true,
                },
                {
                  name: '__Secure-next-auth.session-token',
                  value: 'session456',
                  url: 'https://kangur.app',
                  secure: true,
                },
              ],
              origins: [
                {
                  origin: 'https://kangur.app',
                  localStorage: [
                    {
                      name: 'kangur-storefront-appearance-mode',
                      value: 'dark',
                    },
                  ],
                },
              ],
            },
          },
          script: expect.stringContaining('data-kangur-appearance-mode'),
        }),
      })
    );
    expect(mocks.upsertKangurSocialImageAddonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        captureAppearanceMode: 'dark',
      })
    );
  });

  it('drops secure-prefixed auth cookies for localhost single captures while keeping plain cookies', async () => {
    await createKangurSocialImageAddonFromPlaywright({
      title: 'Hero screenshot',
      sourceUrl: 'http://localhost:3000/landing',
      forwardCookies:
        '__Host-next-auth.csrf-token=csrf123; __Secure-next-auth.session-token=session456; session=abc123',
    });

    expect(mocks.runPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        instance: expect.objectContaining({
          kind: 'social_capture_single',
        }),
        request: expect.objectContaining({
          contextOptions: {
            storageState: {
              cookies: [
                {
                  name: 'session',
                  value: 'abc123',
                  url: 'http://localhost:3000',
                },
              ],
              origins: [],
            },
          },
        }),
      })
    );
  });

  it('passes the trusted self origin host into the Playwright runner policy override', async () => {
    await createKangurSocialImageAddonFromPlaywright({
      title: 'Hero screenshot',
      sourceUrl: 'http://localhost:3000/landing',
      trustedSelfOriginHost: 'localhost:3000',
    });

    expect(mocks.runPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        instance: expect.objectContaining({
          kind: 'social_capture_single',
        }),
        request: expect.objectContaining({
          policyAllowedHosts: ['localhost:3000'],
        }),
      })
    );
  });
});
