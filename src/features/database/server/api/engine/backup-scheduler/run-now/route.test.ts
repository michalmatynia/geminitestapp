import { describe, expect, it } from 'vitest';

import { POST } from './route-handler';

describe('databases backup-scheduler run-now route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof POST).toBe('function');
  });
});
