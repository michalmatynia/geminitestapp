import { describe, expect, it } from 'vitest';

import {
  evaluateWriteOutcome,
  resolveWriteTemplateGuardrail,
} from '@/features/ai/ai-paths/lib/core/runtime/handlers/integration-database-write-guardrails';

describe('resolveWriteTemplateGuardrail', () => {
  it('detects missing and empty template values for nested, value, and current tokens', () => {
    const result = resolveWriteTemplateGuardrail({
      templates: [
        {
          name: 'updateTemplate',
          template:
            '{"id":"{{entityId}}","title":"{{value.title}}","sku":"{{current.sku}}","p":"{{bundle.parameters}}"}',
        },
      ],
      templateContext: {
        value: { title: '' },
        bundle: {},
      },
      currentValue: { sku: '' },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected write template guardrail failure.');
    }
    expect(result.guardrailMeta.missingTokens).toEqual(
      expect.arrayContaining(['entityId', 'bundle.parameters']),
    );
    expect(result.guardrailMeta.emptyTokens).toEqual(
      expect.arrayContaining(['value.title', 'current.sku']),
    );
  });

  it('passes when all template tokens resolve to non-empty values', () => {
    const result = resolveWriteTemplateGuardrail({
      templates: [
        {
          name: 'queryTemplate',
          template: '{"id":"{{entityId}}","sku":"{{value.sku}}"}',
        },
      ],
      templateContext: {
        entityId: 'product-1',
        value: { sku: 'ABC' },
      },
      currentValue: { sku: 'ABC' },
    });

    expect(result).toEqual({ ok: true });
  });
});

describe('evaluateWriteOutcome', () => {
  it('marks zero-affected updates as failed under fail policy', () => {
    const result = evaluateWriteOutcome({
      operation: 'update',
      action: 'updateOne',
      result: { matchedCount: 0, modifiedCount: 0 },
      policy: 'fail',
    });

    expect(result.isZeroAffected).toBe(true);
    expect(result.writeOutcome).toEqual(
      expect.objectContaining({
        status: 'failed',
        code: 'zero_affected',
      }),
    );
  });

  it('marks zero-affected updates as warning under warn policy', () => {
    const result = evaluateWriteOutcome({
      operation: 'update',
      action: 'updateOne',
      result: { matchedCount: 0, modifiedCount: 0 },
      policy: 'warn',
    });

    expect(result.isZeroAffected).toBe(true);
    expect(result.writeOutcome).toEqual(
      expect.objectContaining({
        status: 'warning',
        code: 'zero_affected',
      }),
    );
  });
});

