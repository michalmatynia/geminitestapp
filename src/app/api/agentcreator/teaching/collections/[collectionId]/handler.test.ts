import { describe, expect, it } from 'vitest';

import { DELETE_handler, PATCH_handler } from './handler';

describe('agentcreator teaching collection-by-id handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof PATCH_handler).toBe('function');
    expect(typeof DELETE_handler).toBe('function');
  });
});
