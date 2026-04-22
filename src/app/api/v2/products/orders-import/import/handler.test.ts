import { describe, expect, it } from 'vitest';

import { postHandler, importOrdersImportSchema } from './handler';

describe('product orders-import import handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof postHandler).toBe('function');
    expect(typeof importOrdersImportSchema.safeParse).toBe('function');
  });
});
