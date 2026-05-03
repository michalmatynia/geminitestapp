import { describe, expect, it } from 'vitest';

import { getHandler } from './handler';

describe('kangur learner activity stream handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof getHandler).toBe('function');
  });
});
