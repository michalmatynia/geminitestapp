import { describe, expect, it } from 'vitest';

import {
  productValidatorImportOperationSchema,
  productValidatorImportRequestSchema,
  productValidatorImportResultSchema,
} from '@/shared/contracts/validator-import';

const buildPattern = (overrides: Record<string, unknown> = {}) => ({
  label: 'Trim whitespace',
  target: 'name',
  regex: '\\s+',
  message: 'Collapse whitespace before saving.',
  code: 'pattern.trim-whitespace',
  ...overrides,
});

const buildSequence = (overrides: Record<string, unknown> = {}) => ({
  code: 'sequence.name-cleanup',
  label: 'Name cleanup',
  debounceMs: 200,
  steps: [
    {
      patternCode: 'pattern.trim-whitespace',
      order: 0,
    },
  ],
  ...overrides,
});

describe('validator import contract runtime', () => {
  it('applies defaults and accepts valid requests with declared sequences', () => {
    const parsed = productValidatorImportRequestSchema.parse({
      version: 1,
      patterns: [
        buildPattern({
          sequenceCode: 'sequence.name-cleanup',
          sequenceOrder: 0,
          sequenceLabel: 'Name cleanup',
        }),
      ],
      sequences: [buildSequence()],
    });

    expect(parsed.scope).toBe('products');
    expect(parsed.mode).toBe('upsert');
    expect(parsed.sequences?.[0]?.code).toBe('sequence.name-cleanup');
  });

  it('rejects duplicate pattern codes', () => {
    const result = productValidatorImportRequestSchema.safeParse({
      version: 1,
      patterns: [buildPattern(), buildPattern({ id: 'pattern-2' })],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Duplicate pattern code: pattern.trim-whitespace',
          path: ['patterns', 1, 'code'],
        }),
      ])
    );
  });

  it('rejects duplicate sequence codes', () => {
    const result = productValidatorImportRequestSchema.safeParse({
      version: 1,
      patterns: [buildPattern()],
      sequences: [buildSequence(), buildSequence({ label: 'Duplicate sequence' })],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Duplicate sequence code: sequence.name-cleanup',
          path: ['sequences', 1, 'code'],
        }),
      ])
    );
  });

  it('rejects sequence steps that reference unknown patterns', () => {
    const result = productValidatorImportRequestSchema.safeParse({
      version: 1,
      patterns: [buildPattern()],
      sequences: [
        buildSequence({
          steps: [
            {
              patternCode: 'pattern.unknown',
              order: 0,
            },
          ],
        }),
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Sequence step references unknown pattern code: pattern.unknown',
          path: ['sequences', 0, 'steps', 0, 'patternCode'],
        }),
      ])
    );
  });

  it('rejects duplicate pattern references within the same sequence', () => {
    const result = productValidatorImportRequestSchema.safeParse({
      version: 1,
      patterns: [
        buildPattern(),
        buildPattern({
          code: 'pattern.normalize-dashes',
          label: 'Normalize dashes',
          regex: '-+',
        }),
      ],
      sequences: [
        buildSequence({
          steps: [
            {
              patternCode: 'pattern.trim-whitespace',
              order: 0,
            },
            {
              patternCode: 'pattern.trim-whitespace',
              order: 1,
            },
          ],
        }),
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message:
            'Sequence step pattern code is duplicated within sequence: pattern.trim-whitespace',
          path: ['sequences', 0, 'steps', 1, 'patternCode'],
        }),
      ])
    );
  });

  it('rejects pattern sequenceCode references that do not match declared sequences', () => {
    const result = productValidatorImportRequestSchema.safeParse({
      version: 1,
      patterns: [
        buildPattern({
          sequenceCode: 'sequence.missing',
        }),
      ],
      sequences: [buildSequence()],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Pattern sequenceCode does not match any declared sequence: sequence.missing',
          path: ['patterns', 0, 'sequenceCode'],
        }),
      ])
    );
  });

  it('parses import operations and result payloads with semantic audit summaries', () => {
    const operation = productValidatorImportOperationSchema.parse({
      code: 'pattern.trim-whitespace',
      label: 'Update pattern',
      action: 'update',
      patternId: 'pattern-1',
      reason: 'Pattern already exists',
      semanticAudit: {
        recordedAt: '2026-03-30T10:00:00.000Z',
        source: 'import',
        trigger: 'update',
        transition: 'recognized',
        previous: null,
        current: {
          version: 2,
          operation: 'normalize',
        },
        summary: 'Pattern preserved existing semantic metadata.',
      },
    });

    const result = productValidatorImportResultSchema.parse({
      ok: true,
      dryRun: false,
      scope: 'products',
      mode: 'append',
      summary: {
        createCount: 1,
        updateCount: 1,
        deleteCount: 0,
        skipCount: 0,
      },
      operations: [operation],
      errors: [],
    });

    expect(result.operations[0]?.semanticAudit?.summary).toContain('semantic metadata');
    expect(result.summary.updateCount).toBe(1);
  });
});
