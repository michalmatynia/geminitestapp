import { describe, expect, it } from 'vitest';

import { DELETE_handler, POST_handler, deleteQuerySchema } from './handler';

describe('image-studio project folders handler module', () => {
  it('exports the supported handlers and query schema', () => {
    expect(typeof POST_handler).toBe('function');
    expect(typeof DELETE_handler).toBe('function');
    expect(typeof deleteQuerySchema.safeParse).toBe('function');
  });
});
