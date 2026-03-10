import { describe, expect, it } from 'vitest';

import { POST_handler } from './handler';

describe('product-sync profile run handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof POST_handler).toBe('function');
  });
});
