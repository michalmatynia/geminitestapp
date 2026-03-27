import { describe, expect, it } from 'vitest';

import { POST } from './route-handler';

describe('product orders-import import route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof POST).toBe('function');
  });
});
