import { describe, expect, it } from 'vitest';

import { deleteHandler, getHandler, putHandler } from './handler';

describe('cms theme by-id handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof putHandler).toBe('function');
    expect(typeof deleteHandler).toBe('function');
  });
});
