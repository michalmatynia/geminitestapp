import { describe, expect, it } from 'vitest';

import { POST_handler, previewOrdersImportSchema } from './handler';

describe('product orders-import preview handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof POST_handler).toBe('function');
    expect(typeof previewOrdersImportSchema.safeParse).toBe('function');
  });
});
