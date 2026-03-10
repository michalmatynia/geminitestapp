import { describe, expect, it } from 'vitest';

import { POST } from './route';

describe('case resolver extract-pdf route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof POST).toBe('function');
  });
});
