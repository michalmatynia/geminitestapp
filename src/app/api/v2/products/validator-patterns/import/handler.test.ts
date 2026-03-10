import { describe, expect, it } from 'vitest';

import { postValidatorPatternsImportHandler, postValidatorPatternsImportSchema } from './handler';

describe('validator-patterns import handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof postValidatorPatternsImportHandler).toBe('function');
    expect(typeof postValidatorPatternsImportSchema.safeParse).toBe('function');
  });
});
