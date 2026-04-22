import { describe, expect, it } from 'vitest';

import { postHandler } from './handler';

describe('integration listing sync-base-images handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof postHandler).toBe('function');
  });
});
