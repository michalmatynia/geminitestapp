import { describe, expect, it } from 'vitest';

import { postTestConnectionHandler } from './handler';

describe('integration connection test handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof postTestConnectionHandler).toBe('function');
  });
});
