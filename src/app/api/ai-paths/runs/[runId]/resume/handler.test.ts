import { describe, expect, it } from 'vitest';

import { postHandler } from './handler';

describe('ai-paths run resume handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof postHandler).toBe('function');
  });
});
