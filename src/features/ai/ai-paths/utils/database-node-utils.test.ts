import { describe, expect, it } from 'vitest';

import { normalizeSchemaType } from './database-node-utils';

describe('normalizeSchemaType', () => {
  it('maps known scalar aliases to canonical types', () => {
    expect(normalizeSchemaType(' int ')).toBe('number');
    expect(normalizeSchemaType('BOOL')).toBe('boolean');
    expect(normalizeSchemaType('json')).toBe('Record<string, unknown>');
  });

  it('falls back to the trimmed input when no alias matches', () => {
    expect(normalizeSchemaType('ObjectId')).toBe('ObjectId');
  });

  it('returns unknown for empty input', () => {
    expect(normalizeSchemaType('   ')).toBe('unknown');
  });
});
