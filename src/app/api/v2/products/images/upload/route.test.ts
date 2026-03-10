import { describe, expect, it } from 'vitest';

import { POST } from './route';

describe('product images upload route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof POST).toBe('function');
  });
});
