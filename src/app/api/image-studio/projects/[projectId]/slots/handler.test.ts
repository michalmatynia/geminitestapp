import { describe, expect, it } from 'vitest';

import { getHandler, postHandler } from './handler';

describe('image-studio project slots handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof postHandler).toBe('function');
  });
});
