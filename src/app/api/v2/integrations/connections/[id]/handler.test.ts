import { describe, expect, it } from 'vitest';

import { DELETE_handler, PUT_handler, deleteQuerySchema } from './handler';

describe('integration connection by-id handler module', () => {
  it('exports the supported handlers and query schema', () => {
    expect(typeof PUT_handler).toBe('function');
    expect(typeof DELETE_handler).toBe('function');
    expect(typeof deleteQuerySchema.safeParse).toBe('function');
  });
});
