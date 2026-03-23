import { describe, expect, it } from 'vitest';

import { shouldStartKangurSocialQueues } from './queue-init';

describe('shouldStartKangurSocialQueues', () => {
  it('defaults to disabled outside production', () => {
    expect(
      shouldStartKangurSocialQueues({
        NODE_ENV: 'development',
      } as NodeJS.ProcessEnv)
    ).toBe(false);
  });

  it('defaults to enabled in production', () => {
    expect(
      shouldStartKangurSocialQueues({
        NODE_ENV: 'production',
      } as NodeJS.ProcessEnv)
    ).toBe(true);
  });

  it('honors explicit enable outside production', () => {
    expect(
      shouldStartKangurSocialQueues({
        NODE_ENV: 'development',
        ENABLE_KANGUR_SOCIAL_WORKERS: 'true',
      } as NodeJS.ProcessEnv)
    ).toBe(true);
  });

  it('honors explicit disable even in production', () => {
    expect(
      shouldStartKangurSocialQueues({
        NODE_ENV: 'production',
        DISABLE_KANGUR_SOCIAL_WORKERS: 'true',
      } as NodeJS.ProcessEnv)
    ).toBe(false);
  });
});
