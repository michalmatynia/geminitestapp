import { describe, expect, it } from 'vitest';

import { POST_handler, importOrdersImportSchema } from './handler';

describe('product orders-import import handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof POST_handler).toBe('function');
    expect(typeof importOrdersImportSchema.safeParse).toBe('function');
  });
});
