import { describe, expect, it } from 'vitest';

import { postExportToBaseHandler } from './handler';

describe('integration product export-to-base handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof postExportToBaseHandler).toBe('function');
  });
});
