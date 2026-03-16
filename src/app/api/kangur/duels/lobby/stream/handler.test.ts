import { describe, expect, it } from 'vitest';

import { GET_handler } from './handler';

describe('kangur duels lobby stream handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof GET_handler).toBe('function');
  });
});
