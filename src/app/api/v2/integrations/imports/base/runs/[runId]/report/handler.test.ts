import { describe, expect, it } from 'vitest';

import { getHandler } from './handler';

describe('base import run report handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof getHandler).toBe('function');
  });
});
