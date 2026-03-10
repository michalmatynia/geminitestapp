import { describe, expect, it } from 'vitest';

import { POST } from './route';

describe('agentcreator agent run controls route module', () => {
  it('exports the supported HTTP handlers', () => {
    expect(typeof POST).toBe('function');
  });
});
