import { describe, expect, it } from 'vitest';

import { DELETE, GET, PATCH, POST } from './[[...path]]/route';

describe('kangur route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof GET).toBe('function');
    expect(typeof POST).toBe('function');
    expect(typeof PATCH).toBe('function');
    expect(typeof DELETE).toBe('function');
  });
});
