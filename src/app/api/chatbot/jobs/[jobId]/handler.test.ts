import { describe, expect, it } from 'vitest';

import { deleteHandler, getHandler, postHandler, deleteQuerySchema } from './handler';

describe('chatbot job by-id handler module', () => {
  it('exports the supported handlers and query schema', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof postHandler).toBe('function');
    expect(typeof deleteHandler).toBe('function');
    expect(typeof deleteQuerySchema.safeParse).toBe('function');
  });
});
