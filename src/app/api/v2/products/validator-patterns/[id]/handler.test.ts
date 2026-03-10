import { describe, expect, it } from 'vitest';

import { deleteValidatorPatternByIdHandler, putValidatorPatternByIdHandler, updatePatternSchema } from './handler';

describe('validator-patterns by-id handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof putValidatorPatternByIdHandler).toBe('function');
    expect(typeof deleteValidatorPatternByIdHandler).toBe('function');
    expect(typeof updatePatternSchema.safeParse).toBe('function');
  });
});
