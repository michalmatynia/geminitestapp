import { describe, expect, it } from 'vitest';

import { GET } from './route-handler';

describe('chatbot agent run asset route module', () => {
  it('exports the supported HTTP handlers', () => {
    expect(typeof GET).toBe('function');
  });
});
