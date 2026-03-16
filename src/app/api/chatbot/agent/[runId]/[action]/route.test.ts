import { describe, expect, it } from 'vitest';

import { GET, POST } from './route-handler';

describe('chatbot agent run action route module', () => {
  it('exports the supported HTTP handlers', () => {
    expect(typeof GET).toBe('function');
    expect(typeof POST).toBe('function');
  });
});
