import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  assertSettingsManageAccess: vi.fn(),
}));

vi.mock('../../auth/server', () => ({
  assertSettingsManageAccess: mocks.assertSettingsManageAccess,
}));

describe('database access', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.assertSettingsManageAccess.mockReset().mockResolvedValue(undefined);
    process.env['AI_PATHS_INTERNAL_TOKEN'] = 'test-token';
  });

  it('uses standard database access checks for non-internal requests', async () => {
    const { assertDatabaseEngineManageAccessOrAiPathsInternal } = await import('./access');

    await expect(
      assertDatabaseEngineManageAccessOrAiPathsInternal(
        new Request('http://localhost/api/databases') as never
      )
    ).resolves.toEqual({ isInternal: false });

    expect(mocks.assertSettingsManageAccess).toHaveBeenCalledTimes(1);
  });

  it('allows internal AI-path requests for allowlisted collections', async () => {
    const { assertDatabaseEngineManageAccessOrAiPathsInternal } = await import('./access');

    await expect(
      assertDatabaseEngineManageAccessOrAiPathsInternal(new Request('http://localhost/api/databases', {
        headers: { 'x-ai-paths-internal': 'test-token' },
      }) as never, {
        collection: 'product_categories',
      })
    ).resolves.toEqual({ isInternal: true });

    expect(mocks.assertSettingsManageAccess).not.toHaveBeenCalled();
  });

  it('rejects internal AI-path requests for non-allowlisted collections', async () => {
    const { assertDatabaseEngineManageAccessOrAiPathsInternal } = await import('./access');

    await expect(
      assertDatabaseEngineManageAccessOrAiPathsInternal(new Request('http://localhost/api/databases', {
        headers: { 'x-ai-paths-internal': 'test-token' },
      }) as never, {
        collection: 'secret_collection',
      })
    ).rejects.toMatchObject({
      message: 'Forbidden.',
    });

    expect(mocks.assertSettingsManageAccess).not.toHaveBeenCalled();
  });
});
