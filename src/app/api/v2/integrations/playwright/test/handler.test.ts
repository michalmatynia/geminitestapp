import { describe, expect, it } from 'vitest';

import { POST_handler } from './handler';

describe('playwright test handler', () => {
  it('exports a POST handler', () => {
    expect(typeof POST_handler).toBe('function');
  });
});
