import { describe, expect, it } from 'vitest';

import { GET } from './route';

describe('agentcreator agent run stream route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof GET).toBe('function');
  });
});
