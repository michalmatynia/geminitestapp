import { describe, expect, it } from 'vitest';

import {
  databasePreviewRequestSchema,
  databaseTypeSchema,
} from '@/shared/contracts/database';

describe('database contract runtime', () => {
  it('parses valid database types', () => {
    expect(databaseTypeSchema.parse('postgresql')).toBe('postgresql');
    expect(databaseTypeSchema.parse('mongodb')).toBe('mongodb');
  });

  it('rejects invalid database type', () => {
    expect(() => databaseTypeSchema.parse('auto')).toThrow();
  });

  it('parses valid preview request and rejects invalid request type', () => {
    const parsed = databasePreviewRequestSchema.parse({
      type: 'postgresql',
      mode: 'full',
    });
    expect(parsed.type).toBe('postgresql');
    expect(parsed.mode).toBe('full');

    expect(() =>
      databasePreviewRequestSchema.parse({
        type: 'auto',
        mode: 'full',
      })
    ).toThrow();
  });
});
