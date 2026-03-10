import { describe, expect, it } from 'vitest';

import { GET, PATCH } from './route';

describe('auth user security route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof GET).toBe('function');
    expect(typeof PATCH).toBe('function');
  });
});
