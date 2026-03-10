import { describe, expect, it } from 'vitest';

import { DELETE, PATCH } from './route';

describe('note category by-id route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof PATCH).toBe('function');
    expect(typeof DELETE).toBe('function');
  });
});
