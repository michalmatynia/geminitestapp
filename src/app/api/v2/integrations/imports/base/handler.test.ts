import { describe, expect, it } from 'vitest';

import { POST_handler, postBaseImportsHandler, requestSchema } from './handler';

describe('base imports handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof postBaseImportsHandler).toBe('function');
    expect(typeof POST_handler).toBe('function');
    expect(typeof requestSchema.safeParse).toBe('function');
  });
});
