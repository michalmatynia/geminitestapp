import { describe, expect, it } from 'vitest';

import { GET } from './route-handler';

describe('databases engine managed route handler module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof GET).toBe('function');
  });
});
