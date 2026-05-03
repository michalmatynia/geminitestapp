import { describe, expect, it } from 'vitest';

import { getHandler } from './handler';

describe('kangur duels lobby stream handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof getHandler).toBe('function');
  });
});
