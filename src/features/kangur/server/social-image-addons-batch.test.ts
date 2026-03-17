import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  enqueuePlaywrightNodeRunMock: vi.fn(),
  readPlaywrightNodeArtifactMock: vi.fn(),
  getDiskPathFromPublicPathMock: vi.fn(),
  uploadToConfiguredStorageMock: vi.fn(),
  upsertKangurSocialImageAddonMock: vi.fn(),
  findLatestAddonByPresetIdMock: vi.fn(),
  sharpMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('fs/promises', () => ({ default: { mkdir: vi.fn(), writeFile: vi.fn() } }));

vi.mock('sharp', () => ({
  default: (...args: unknown[]) => mocks.sharpMock(...args),
}));

vi.mock('@/features/ai/ai-paths/services/playwright-node-runner', () => ({
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
  findLatestAddonByPresetId: (...args: unknown[]) =>
    mocks.findLatestAddonByPresetIdMock(...args),
}));

vi.mock('@/features/kangur/shared/utils/observability/error-system', () => ({
  ErrorSystem: { logInfo: vi.fn(), captureException: vi.fn() },
}));

vi.mock('@/features/kangur/shared/social-capture-presets', () => ({
  KANGUR_SOCIAL_CAPTURE_PRESETS: [
    {
      id: 'game',
      title: 'Kangur Game Home',
      path: '/kangur/game',
      description: 'Learner home and quick-start hub.',
    },
    {
      id: 'lessons',
      title: 'Lessons Library',
      path: '/kangur/lessons',
      description: 'Lesson catalog and progress overview.',
    },
  ],
}));

import { createKangurSocialImageAddonsBatch } from './social-image-addons-batch';

const fakeBuffer = Buffer.from('fake-png-data');

const makeCompletedRun = (presetIds: string[]) => ({
  runId: 'run-123',
  status: 'completed',
  result: {
    outputs: {
      capture_results: presetIds.map((id) => ({ id, status: 'ok' })),
    },
  },
  artifacts: presetIds.map((id) => ({
    name: id,
    path: `/artifacts/${id}.png`,
  })),
  error: null,
});

describe('createKangurSocialImageAddonsBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sharpMock.mockReturnValue({
      metadata: vi.fn().mockResolvedValue({ width: 1280, height: 720 }),
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
    mocks.findLatestAddonByPresetIdMock.mockResolvedValue(null);
    mocks.getDiskPathFromPublicPathMock.mockReturnValue('/tmp/test.png');
  });

  it('throws when baseUrl is empty', async () => {
    await expect(
      createKangurSocialImageAddonsBatch({ baseUrl: '' })
    ).rejects.toThrow(/Base URL is required/);
  });

  it('captures all presets when presetIds is not specified', async () => {
    mocks.enqueuePlaywrightNodeRunMock.mockResolvedValue(
      makeCompletedRun(['game', 'lessons'])
    );

    const result = await createKangurSocialImageAddonsBatch({
      baseUrl: 'https://kangur.app',
    });

    expect(result.addons).toHaveLength(2);
    expect(result.failures).toHaveLength(0);
    expect(result.runId).toBe('run-123');
  });

  it('filters presets by presetIds when provided', async () => {
    mocks.enqueuePlaywrightNodeRunMock.mockResolvedValue(
      makeCompletedRun(['game'])
    );

    const result = await createKangurSocialImageAddonsBatch({
      baseUrl: 'https://kangur.app',
      presetIds: ['game'],
    });

    expect(result.addons).toHaveLength(1);
    expect(result.addons[0]?.presetId).toBe('game');
  });

  it('throws when no presets match the provided ids', async () => {
    await expect(
      createKangurSocialImageAddonsBatch({
        baseUrl: 'https://kangur.app',
        presetIds: ['nonexistent'],
      })
    ).rejects.toThrow(/No capture presets selected/);
  });

  it('throws when Playwright run fails', async () => {
    mocks.enqueuePlaywrightNodeRunMock.mockResolvedValue({
      runId: 'run-fail',
      status: 'failed',
      error: 'Browser crashed.',
      artifacts: [],
      result: null,
    });

    await expect(
      createKangurSocialImageAddonsBatch({ baseUrl: 'https://kangur.app' })
    ).rejects.toThrow('Browser crashed.');
  });

  it('records failure when artifact is missing for a preset', async () => {
    mocks.enqueuePlaywrightNodeRunMock.mockResolvedValue({
      runId: 'run-partial',
      status: 'completed',
      result: {
        outputs: {
          capture_results: [
            { id: 'game', status: 'ok' },
            { id: 'lessons', status: 'failed', reason: 'timeout' },
          ],
        },
      },
      artifacts: [{ name: 'game', path: '/artifacts/game.png' }],
      error: null,
    });

    const result = await createKangurSocialImageAddonsBatch({
      baseUrl: 'https://kangur.app',
    });

    expect(result.addons).toHaveLength(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toEqual({
      id: 'lessons',
      reason: 'timeout',
    });
  });

  it('links previousAddonId when a previous addon exists for the preset', async () => {
    const previousAddon = {
      id: 'prev-addon-id',
      presetId: 'game',
      title: 'Previous Game',
    };
    mocks.findLatestAddonByPresetIdMock.mockImplementation((presetId: string) =>
      presetId === 'game' ? Promise.resolve(previousAddon) : Promise.resolve(null)
    );
    mocks.enqueuePlaywrightNodeRunMock.mockResolvedValue(
      makeCompletedRun(['game', 'lessons'])
    );

    const result = await createKangurSocialImageAddonsBatch({
      baseUrl: 'https://kangur.app',
    });

    const gameAddon = result.addons.find((a: any) => a.presetId === 'game');
    const lessonsAddon = result.addons.find((a: any) => a.presetId === 'lessons');
    expect(gameAddon?.previousAddonId).toBe('prev-addon-id');
    expect(lessonsAddon?.previousAddonId).toBeNull();
  });

  it('records failure when artifact read returns null', async () => {
    mocks.enqueuePlaywrightNodeRunMock.mockResolvedValue(
      makeCompletedRun(['game'])
    );
    mocks.readPlaywrightNodeArtifactMock.mockResolvedValue(null);

    const result = await createKangurSocialImageAddonsBatch({
      baseUrl: 'https://kangur.app',
      presetIds: ['game'],
    });

    expect(result.addons).toHaveLength(0);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]?.reason).toBe('artifact_read_failed');
  });
});
