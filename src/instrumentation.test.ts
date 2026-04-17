/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';

import { shouldSkipNodeInstrumentation } from './instrumentation';

describe('shouldSkipNodeInstrumentation', () => {
  it('defaults to disabled', () => {
    expect(shouldSkipNodeInstrumentation({} as NodeJS.ProcessEnv)).toBe(false);
  });

  it('treats truthy values as enabled', () => {
    expect(
      shouldSkipNodeInstrumentation({
        SKIP_NEXT_NODE_INSTRUMENTATION: 'true',
      } as NodeJS.ProcessEnv)
    ).toBe(true);
    expect(
      shouldSkipNodeInstrumentation({
        SKIP_NEXT_NODE_INSTRUMENTATION: '1',
      } as NodeJS.ProcessEnv)
    ).toBe(true);
  });

  it('treats falsy values as disabled', () => {
    expect(
      shouldSkipNodeInstrumentation({
        SKIP_NEXT_NODE_INSTRUMENTATION: 'false',
      } as NodeJS.ProcessEnv)
    ).toBe(false);
  });
});
