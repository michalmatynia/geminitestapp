import { describe, expect, it } from 'vitest';

import { postHandler } from './handler';

describe('agentcreator teaching collection search handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof postHandler).toBe('function');
  });
});
