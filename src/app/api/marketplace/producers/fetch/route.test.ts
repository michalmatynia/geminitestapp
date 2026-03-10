import { describe, expect, it } from 'vitest';

import { POST } from './route';

describe('marketplace producers fetch route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof POST).toBe('function');
  });
});
