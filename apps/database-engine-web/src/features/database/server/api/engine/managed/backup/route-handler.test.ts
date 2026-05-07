import { describe, expect, it } from 'vitest';

import { POST } from './route-handler';

describe('databases engine managed backup route handler module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof POST).toBe('function');
  });
});
