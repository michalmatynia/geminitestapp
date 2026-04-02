/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';

import { shouldRunNodeStartupBootstrap } from './instrumentation.node';

describe('shouldRunNodeStartupBootstrap', () => {
  it('defaults to disabled in development', () => {
    expect(
      shouldRunNodeStartupBootstrap({
        NODE_ENV: 'development',
      } as NodeJS.ProcessEnv)
    ).toBe(false);
  });

  it('allows an explicit development opt-in', () => {
    expect(
      shouldRunNodeStartupBootstrap({
        NODE_ENV: 'development',
        ENABLE_DEV_STARTUP_BOOTSTRAP: 'true',
      } as NodeJS.ProcessEnv)
    ).toBe(true);
  });

  it('defaults to enabled outside development', () => {
    expect(
      shouldRunNodeStartupBootstrap({
        NODE_ENV: 'test',
      } as NodeJS.ProcessEnv)
    ).toBe(true);
  });
});
