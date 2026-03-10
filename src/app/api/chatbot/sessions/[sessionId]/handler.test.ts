import { describe, expect, it } from 'vitest';

import { GET_handler } from './handler';

describe('chatbot session by-id handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof GET_handler).toBe('function');
  });
});
