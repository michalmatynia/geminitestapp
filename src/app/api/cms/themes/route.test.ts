import { describe, expect, it } from 'vitest';

import { GET, POST } from './route';

describe('cms themes route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof GET).toBe('function');
    expect(typeof POST).toBe('function');
  });
});
