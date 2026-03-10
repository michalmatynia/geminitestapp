import { describe, expect, it } from 'vitest';

import { POST_handler } from './handler';

describe('ai-paths run resume handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof POST_handler).toBe('function');
  });
});
