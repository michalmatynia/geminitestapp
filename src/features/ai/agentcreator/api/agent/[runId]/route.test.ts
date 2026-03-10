import { describe, expect, it } from 'vitest';

import { DELETE, GET, POST } from './route';

describe('agentcreator agent run route module', () => {
  it('exports the supported HTTP handlers', () => {
    expect(typeof GET).toBe('function');
    expect(typeof POST).toBe('function');
    expect(typeof DELETE).toBe('function');
  });
});
