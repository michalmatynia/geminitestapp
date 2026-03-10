import { describe, expect, it } from 'vitest';

import { POST_handler } from './handler';

describe('image-studio project variants delete handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof POST_handler).toBe('function');
  });
});
