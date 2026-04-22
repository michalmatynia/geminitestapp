import { describe, expect, it } from 'vitest';

import { deleteHandler } from './handler';

describe('note file-slot handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof deleteHandler).toBe('function');
  });
});
