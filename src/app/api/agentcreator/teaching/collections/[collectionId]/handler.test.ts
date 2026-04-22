import { describe, expect, it } from 'vitest';

import { deleteHandler, patchHandler } from './handler';

describe('agentcreator teaching collection-by-id handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof patchHandler).toBe('function');
    expect(typeof deleteHandler).toBe('function');
  });
});
