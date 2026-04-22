import { describe, expect, it } from 'vitest';

import { getHandler } from './handler';

describe('base import run-by-id handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof getHandler).toBe('function');
  });
});
