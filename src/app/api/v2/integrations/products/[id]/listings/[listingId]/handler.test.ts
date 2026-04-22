import { describe, expect, it } from 'vitest';

import { deleteHandler, patchHandler } from './handler';

describe('integration listing-by-id handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof deleteHandler).toBe('function');
    expect(typeof patchHandler).toBe('function');
  });
});
