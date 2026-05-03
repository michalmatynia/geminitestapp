import { describe, expect, it } from 'vitest';

import { deleteHandler, getHandler, deleteQuerySchema, listQuerySchema } from './handler';

describe('product ai-jobs handler module', () => {
  it('exports the supported handlers and query schemas', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof deleteHandler).toBe('function');
    expect(typeof listQuerySchema.safeParse).toBe('function');
    expect(typeof deleteQuerySchema.safeParse).toBe('function');
  });
});
