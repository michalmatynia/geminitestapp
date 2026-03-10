import { describe, expect, it } from 'vitest';

import { POST_handler } from './handler';

describe('product categories migrate handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof POST_handler).toBe('function');
  });
});
