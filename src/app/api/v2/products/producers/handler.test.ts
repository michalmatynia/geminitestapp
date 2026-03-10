import { describe, expect, it } from 'vitest';

import { GET_handler, POST_handler, producerCreateSchema } from './handler';

describe('product producers handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof GET_handler).toBe('function');
    expect(typeof POST_handler).toBe('function');
    expect(typeof producerCreateSchema.safeParse).toBe('function');
  });
});
