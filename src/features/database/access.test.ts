import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  assertSettingsManageAccess: vi.fn(),
  isAiPathsInternalRequest: vi.fn(),
  isCollectionAllowed: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: mocks.assertSettingsManageAccess,
}));

vi.mock('@/features/ai/ai-paths/server/access', () => ({
  isAiPathsInternalRequest: mocks.isAiPathsInternalRequest,
}));

vi.mock('@/features/ai/ai-paths/server/collection-allowlist', () => ({
  isCollectionAllowed: mocks.isCollectionAllowed,
}));

describe('database access', () => {
  beforeEach(() => {
    mocks.assertSettingsManageAccess.mockReset().mockResolvedValue(undefined);
    mocks.isAiPathsInternalRequest.mockReset().mockReturnValue(false);
    mocks.isCollectionAllowed.mockReset().mockReturnValue(true);
  });

  it('uses standard database access checks for non-internal requests', async () => {
    const { assertDatabaseEngineManageAccessOrAiPathsInternal } = await import('./access');

    await expect(
      assertDatabaseEngineManageAccessOrAiPathsInternal({} as never)
    ).resolves.toEqual({ isInternal: false });

    expect(mocks.assertSettingsManageAccess).toHaveBeenCalledTimes(1);
    expect(mocks.isCollectionAllowed).not.toHaveBeenCalled();
  });

  it('allows internal AI-path requests for allowlisted collections', async () => {
    mocks.isAiPathsInternalRequest.mockReturnValue(true);
    mocks.isCollectionAllowed.mockReturnValue(true);

    const { assertDatabaseEngineManageAccessOrAiPathsInternal } = await import('./access');

    await expect(
      assertDatabaseEngineManageAccessOrAiPathsInternal({} as never, {
        collection: 'product_categories',
      })
    ).resolves.toEqual({ isInternal: true });

    expect(mocks.assertSettingsManageAccess).not.toHaveBeenCalled();
    expect(mocks.isCollectionAllowed).toHaveBeenCalledWith('product_categories');
  });

  it('rejects internal AI-path requests for non-allowlisted collections', async () => {
    mocks.isAiPathsInternalRequest.mockReturnValue(true);
    mocks.isCollectionAllowed.mockReturnValue(false);

    const { assertDatabaseEngineManageAccessOrAiPathsInternal } = await import('./access');

    await expect(
      assertDatabaseEngineManageAccessOrAiPathsInternal({} as never, {
        collection: 'secret_collection',
      })
    ).rejects.toMatchObject({
      message: 'Forbidden.',
    });

    expect(mocks.assertSettingsManageAccess).not.toHaveBeenCalled();
    expect(mocks.isCollectionAllowed).toHaveBeenCalledWith('secret_collection');
  });
});
