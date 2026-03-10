import { describe, expect, it } from 'vitest';

import {
  getQuerySchema,
  getUserPreferencesHandler,
  patchUserPreferencesHandler,
} from './handler';

describe('user preferences handler module', () => {
  it('exports the supported handlers and query schema', () => {
    expect(typeof getUserPreferencesHandler).toBe('function');
    expect(typeof patchUserPreferencesHandler).toBe('function');
    expect(typeof getQuerySchema.safeParse).toBe('function');
  });
});
