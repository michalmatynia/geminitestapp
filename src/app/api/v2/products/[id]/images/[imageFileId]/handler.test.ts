import { describe, expect, it } from 'vitest';

import { DELETE_handler } from './handler';

describe('product image delete handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof DELETE_handler).toBe('function');
  });
});
