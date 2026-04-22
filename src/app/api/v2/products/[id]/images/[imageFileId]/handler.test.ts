import { describe, expect, it } from 'vitest';

import { deleteHandler } from './handler';

describe('product image delete handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof deleteHandler).toBe('function');
  });
});
