import { describe, expect, it } from 'vitest';

import {
  parseRuntimeConfigForEvaluation,
  validateAndNormalizeRuntimeConfig,
} from '@/features/products/validations/validator-runtime-config';

describe('validator-runtime-config', () => {
  it('returns null when runtime is disabled', () => {
    const result = validateAndNormalizeRuntimeConfig({
      runtimeEnabled: false,
      runtimeType: 'database_query',
      runtimeConfig: '{"operation":"query"}',
    });

    expect(result).toBeNull();
  });

  it('normalizes valid database runtime config', () => {
    const normalized = validateAndNormalizeRuntimeConfig({
      runtimeEnabled: true,
      runtimeType: 'database_query',
      runtimeConfig: JSON.stringify({
        version: 1,
        operation: 'query',
        payload: {
          collection: 'products',
          filter: { sku: 'KEYCHA001' },
          limit: 1,
        },
      }),
    });

    expect(normalized).not.toBeNull();
    const parsed = JSON.parse(normalized ?? '{}') as Record<string, unknown>;
    expect(parsed['operation']).toBe('query');
  });

  it('rejects mismatched database action payload for query operation', () => {
    expect(() =>
      validateAndNormalizeRuntimeConfig({
        runtimeEnabled: true,
        runtimeType: 'database_query',
        runtimeConfig: JSON.stringify({
          operation: 'query',
          payload: {
            collection: 'products',
            action: 'find',
          },
        }),
      })
    ).toThrowError(/Invalid database runtimeConfig/i);
  });

  it('parses runtime config for evaluation and rejects invalid objects', () => {
    const valid = parseRuntimeConfigForEvaluation({
      runtimeType: 'ai_prompt',
      runtimeConfig: JSON.stringify({
        version: 1,
        promptTemplate: 'Return JSON',
      }),
    });
    const invalid = parseRuntimeConfigForEvaluation({
      runtimeType: 'database_query',
      runtimeConfig: '{"operation":"query","payload":[]}',
    });

    expect(valid).not.toBeNull();
    expect(invalid).toBeNull();
  });

  it('rejects legacy root-level database payload aliases', () => {
    expect(() =>
      validateAndNormalizeRuntimeConfig({
        runtimeEnabled: true,
        runtimeType: 'database_query',
        runtimeConfig: JSON.stringify({
          operation: 'query',
          collection: 'products',
          query: { sku: 'KEYCHA001' },
        }),
      })
    ).toThrowError(/Invalid database runtimeConfig/i);
  });

  it('rejects legacy payload.query alias for database runtime config', () => {
    expect(() =>
      validateAndNormalizeRuntimeConfig({
        runtimeEnabled: true,
        runtimeType: 'database_query',
        runtimeConfig: JSON.stringify({
          operation: 'query',
          payload: {
            collection: 'products',
            query: { sku: 'KEYCHA001' },
          },
        }),
      })
    ).toThrowError(/Invalid database runtimeConfig/i);
  });

  it('rejects legacy replacementPath and expected aliases in AI runtime config', () => {
    expect(() =>
      validateAndNormalizeRuntimeConfig({
        runtimeEnabled: true,
        runtimeType: 'ai_prompt',
        runtimeConfig: JSON.stringify({
          promptTemplate: 'Return JSON',
          replacementPath: 'parsed.replacementValue',
          expected: true,
        }),
      })
    ).toThrowError(/Invalid AI runtimeConfig/i);
  });
});
