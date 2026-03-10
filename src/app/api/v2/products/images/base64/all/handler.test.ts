import { describe, expect, it } from 'vitest';

import { POST_handler } from './handler';

describe('product images base64 all handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof POST_handler).toBe('function');
  });
});
