import { describe, expect, it } from 'vitest';

import { getHandler, putHandler } from './handler';

describe('product studio handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof putHandler).toBe('function');
  });
});
