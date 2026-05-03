import { describe, expect, it } from 'vitest';

import { deleteHandler, getHandler, patchHandler } from './handler';

describe('notes by-id handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof patchHandler).toBe('function');
    expect(typeof deleteHandler).toBe('function');
  });
});
