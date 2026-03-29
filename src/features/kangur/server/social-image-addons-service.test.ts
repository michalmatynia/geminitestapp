import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  enqueuePlaywrightNodeRunMock: vi.fn(),
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

vi.mock('@/features/ai/server', () => ({
  enqueuePlaywrightNodeRun: (...args: unknown[]) =>
    mocks.enqueuePlaywrightNodeRunMock(...args),
  readPlaywrightNodeArtifact: (...args: unknown[]) =>
    mocks.readPlaywrightNodeArtifactMock(...args),
}));

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
    mocks.enqueuePlaywrightNodeRunMock.mockResolvedValue({
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
      forwardCookies: 'session=abc123',
    });

    expect(mocks.enqueuePlaywrightNodeRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
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
                  domain: 'kangur.app',
                  path: '/',
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
});
