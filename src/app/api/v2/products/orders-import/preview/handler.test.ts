import { describe, expect, it } from 'vitest';

import { postHandler, previewOrdersImportSchema } from './handler';

describe('product orders-import preview handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof postHandler).toBe('function');
    expect(typeof previewOrdersImportSchema.safeParse).toBe('function');
  });
});
