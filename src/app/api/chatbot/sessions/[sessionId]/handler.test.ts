import { describe, expect, it } from 'vitest';

import { getHandler } from './handler';

describe('chatbot session by-id handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof getHandler).toBe('function');
  });
});
