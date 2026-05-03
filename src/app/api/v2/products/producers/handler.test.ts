import { describe, expect, it } from 'vitest';

import { getHandler, postHandler, producerCreateSchema } from './handler';

describe('product producers handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof postHandler).toBe('function');
    expect(typeof producerCreateSchema.safeParse).toBe('function');
  });
});
