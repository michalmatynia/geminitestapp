import { describe, expect, it } from 'vitest';

import { postHandler } from './handler';

describe('base import run cancel handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof postHandler).toBe('function');
  });
});
