import { describe, expect, it } from 'vitest';

import { GET, POST } from './route-handler';

describe('integration product listings route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof GET).toBe('function');
    expect(typeof POST).toBe('function');
  });
});
