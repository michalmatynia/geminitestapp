import { describe, expect, it } from 'vitest';

import { getHandler, postHandler, productCustomFieldCreateSchema, querySchema } from './handler';

describe('product custom-fields handler module', () => {
  it('exports the supported handlers and schemas', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof postHandler).toBe('function');
    expect(typeof querySchema.safeParse).toBe('function');
    expect(typeof productCustomFieldCreateSchema.safeParse).toBe('function');
  });
});
