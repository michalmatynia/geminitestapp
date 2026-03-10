import { describe, expect, it } from 'vitest';

import { GET_handler, PUT_handler } from './handler';

describe('product studio handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof GET_handler).toBe('function');
    expect(typeof PUT_handler).toBe('function');
  });
});
