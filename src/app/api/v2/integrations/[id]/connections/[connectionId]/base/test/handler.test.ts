import { describe, expect, it } from 'vitest';

import { POST_handler } from './handler';

describe('integration base test handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof POST_handler).toBe('function');
  });
});
