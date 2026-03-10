import { describe, expect, it } from 'vitest';

import { DELETE_handler, GET_handler, PUT_handler } from './handler';

describe('draft by-id handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof GET_handler).toBe('function');
    expect(typeof PUT_handler).toBe('function');
    expect(typeof DELETE_handler).toBe('function');
  });
});
