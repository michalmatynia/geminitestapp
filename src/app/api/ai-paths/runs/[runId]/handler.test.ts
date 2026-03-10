import { describe, expect, it } from 'vitest';

import { DELETE_handler, GET_handler } from './handler';

describe('ai-paths run-by-id handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof GET_handler).toBe('function');
    expect(typeof DELETE_handler).toBe('function');
  });
});
