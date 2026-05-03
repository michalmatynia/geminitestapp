import { describe, expect, it } from 'vitest';

import { deleteHandler, putHandler, productCustomFieldUpdateSchema } from './handler';

describe('product custom-fields by-id handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof putHandler).toBe('function');
    expect(typeof deleteHandler).toBe('function');
    expect(typeof productCustomFieldUpdateSchema.safeParse).toBe('function');
  });
});
