import { describe, expect, it } from 'vitest';

import { DELETE, PUT } from './route';

describe('cms domain by-id route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof PUT).toBe('function');
    expect(typeof DELETE).toBe('function');
  });
});
