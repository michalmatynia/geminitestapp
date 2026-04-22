import { describe, expect, it } from 'vitest';

import { deleteHandler, putHandler, producerUpdateSchema } from './handler';

describe('product producers by-id handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof putHandler).toBe('function');
    expect(typeof deleteHandler).toBe('function');
    expect(typeof producerUpdateSchema.safeParse).toBe('function');
  });
});
