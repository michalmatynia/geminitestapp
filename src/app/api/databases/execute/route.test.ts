import { describe, expect, it } from 'vitest';

import { POST } from './route';

describe('databases execute route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof POST).toBe('function');
  });
});
