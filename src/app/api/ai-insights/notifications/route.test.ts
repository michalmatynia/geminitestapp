import { describe, expect, it } from 'vitest';

import { DELETE, GET } from './route';

describe('ai insights notifications route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof GET).toBe('function');
    expect(typeof DELETE).toBe('function');
  });
});
