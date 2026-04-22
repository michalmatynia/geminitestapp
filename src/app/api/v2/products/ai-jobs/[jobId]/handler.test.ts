import { describe, expect, it } from 'vitest';

import { deleteHandler, getHandler, postHandler } from './handler';

describe('product ai-jobs by-id handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof postHandler).toBe('function');
    expect(typeof deleteHandler).toBe('function');
  });
});
