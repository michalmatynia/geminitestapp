import { describe, expect, it } from 'vitest';

import { DELETE_handler, GET_handler, deleteQuerySchema, listQuerySchema } from './handler';

describe('product ai-jobs handler module', () => {
  it('exports the supported handlers and query schemas', () => {
    expect(typeof GET_handler).toBe('function');
    expect(typeof DELETE_handler).toBe('function');
    expect(typeof listQuerySchema.safeParse).toBe('function');
    expect(typeof deleteQuerySchema.safeParse).toBe('function');
  });
});
