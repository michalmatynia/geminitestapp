import { describe, expect, it } from 'vitest';

import { postHandler } from './handler';

describe('product-sync profile run handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof postHandler).toBe('function');
  });
});
