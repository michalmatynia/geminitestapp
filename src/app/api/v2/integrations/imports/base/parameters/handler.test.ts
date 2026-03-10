import { describe, expect, it } from 'vitest';

import { getBaseImportParametersHandler, postBaseImportParametersHandler } from './handler';

describe('base import parameters handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof getBaseImportParametersHandler).toBe('function');
    expect(typeof postBaseImportParametersHandler).toBe('function');
  });
});
