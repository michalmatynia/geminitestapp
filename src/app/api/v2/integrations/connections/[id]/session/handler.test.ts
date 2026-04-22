import { describe, expect, it } from 'vitest';

import { getHandler } from './handler';

describe('integration connection session handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof getHandler).toBe('function');
  });
});
