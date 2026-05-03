import { describe, expect, it } from 'vitest';

import { postHandler } from './handler';

describe('product image link-to-file handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof postHandler).toBe('function');
  });
});
