import { describe, expect, it } from 'vitest';

import { DELETE_handler, GET_handler, POST_handler } from './handler';

describe('system logs handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof GET_handler).toBe('function');
    expect(typeof POST_handler).toBe('function');
    expect(typeof DELETE_handler).toBe('function');
  });
});
