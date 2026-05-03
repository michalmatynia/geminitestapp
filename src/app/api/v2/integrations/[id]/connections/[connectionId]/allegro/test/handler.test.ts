import { describe, expect, it } from 'vitest';

import { postHandler } from './handler';

describe('integration allegro test handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof postHandler).toBe('function');
  });
});
