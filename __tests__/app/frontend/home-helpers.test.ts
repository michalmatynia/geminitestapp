import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth/server', () => ({
  getUserPreferences: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

describe('shouldApplyFrontPageAppSelection', () => {
  const originalValue = process.env['ENABLE_FRONT_PAGE_APP_REDIRECT'];

  beforeEach(() => {
    vi.resetModules();
    delete process.env['ENABLE_FRONT_PAGE_APP_REDIRECT'];
  });

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env['ENABLE_FRONT_PAGE_APP_REDIRECT'];
    } else {
      process.env['ENABLE_FRONT_PAGE_APP_REDIRECT'] = originalValue;
    }
  });

  it('defaults to enabled when the env flag is unset', async () => {
    const { shouldApplyFrontPageAppSelection } = await import('@/app/(frontend)/home/home-helpers');

    expect(shouldApplyFrontPageAppSelection()).toBe(true);
  });

  it.each(['false', '0'])('returns false when the env flag is %s', async (value) => {
    process.env['ENABLE_FRONT_PAGE_APP_REDIRECT'] = value;

    const { shouldApplyFrontPageAppSelection } = await import('@/app/(frontend)/home/home-helpers');

    expect(shouldApplyFrontPageAppSelection()).toBe(false);
  });
});
