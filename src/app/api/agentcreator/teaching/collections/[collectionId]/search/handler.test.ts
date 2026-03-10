import { describe, expect, it } from 'vitest';

import { POST_handler } from './handler';

describe('agentcreator teaching collection search handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof POST_handler).toBe('function');
  });
});
