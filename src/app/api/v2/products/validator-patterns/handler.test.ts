import { describe, expect, it } from 'vitest';

import { createPatternSchema, getValidatorPatternsHandler, postValidatorPatternsHandler } from './handler';

describe('validator-patterns handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof getValidatorPatternsHandler).toBe('function');
    expect(typeof postValidatorPatternsHandler).toBe('function');
    expect(typeof createPatternSchema.safeParse).toBe('function');
  });
});
