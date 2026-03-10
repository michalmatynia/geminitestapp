import { describe, expect, it } from 'vitest';

import { DELETE } from './route';

describe('agentcreator teaching collection document route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof DELETE).toBe('function');
  });
});
