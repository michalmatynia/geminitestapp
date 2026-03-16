import { describe, expect, it } from 'vitest';

import { DELETE, GET, POST } from './route-handler';

describe('chatbot agent route module', () => {
  it('exports the supported HTTP handlers', () => {
    expect(typeof GET).toBe('function');
    expect(typeof POST).toBe('function');
    expect(typeof DELETE).toBe('function');
  });
});
