import { describe, expect, it } from 'vitest';

import { getHandler } from './handler';

describe('product tags all handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof getHandler).toBe('function');
  });
});
