import { describe, expect, it } from 'vitest';

import { POST } from './route';

describe('integration image sync-base all route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof POST).toBe('function');
  });
});
