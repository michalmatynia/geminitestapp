import { describe, expect, it } from 'vitest';

import { getHandler } from './handler';

describe('integration base inventories handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof getHandler).toBe('function');
  });
});
