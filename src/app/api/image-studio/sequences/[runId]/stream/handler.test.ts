import { describe, expect, it } from 'vitest';

import { GET_handler } from './handler';

describe('image-studio sequence stream handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof GET_handler).toBe('function');
  });
});
