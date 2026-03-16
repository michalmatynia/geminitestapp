import { describe, expect, it } from 'vitest';

import { GET } from './route-handler';

describe('agentcreator agent run snapshots route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof GET).toBe('function');
  });
});
