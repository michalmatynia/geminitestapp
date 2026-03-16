import { describe, expect, it } from 'vitest';

import { GET, PUT } from './route-handler';

describe('product validator-settings route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof GET).toBe('function');
    expect(typeof PUT).toBe('function');
  });
});
