import { describe, expect, it } from 'vitest';

import { DELETE, GET, PUT } from './route';

describe('product metadata by-type and id route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof GET).toBe('function');
    expect(typeof PUT).toBe('function');
    expect(typeof DELETE).toBe('function');
  });
});
