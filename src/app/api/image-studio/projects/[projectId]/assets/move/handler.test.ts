import { describe, expect, it } from 'vitest';

import { postHandler } from './handler';

describe('image-studio project assets move handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof postHandler).toBe('function');
  });
});
