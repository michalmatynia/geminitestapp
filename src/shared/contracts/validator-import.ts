import { z } from 'zod';

import { createProductValidationPatternSchema } from './products';

export const validatorImportScopeSchema = z.enum([
  'products',
  'image-studio',
  'prompt-exploder',
  'case-resolver-prompt-exploder',
]);

export type ValidatorImportScope = z.infer<typeof validatorImportScopeSchema>;

export const validatorImportModeSchema = z.enum(['append', 'upsert', 'replace_scope']);

export type ValidatorImportMode = z.infer<typeof validatorImportModeSchema>;

export const validatorSemanticCodeSchema = z
  .string()
  .trim()
  .min(1)
  .regex(
    /^[a-zA-Z0-9._:-]+$/,
    'Semantic code must contain only letters, numbers, dot, underscore, colon, or dash.'
  );

export type ValidatorSemanticCode = z.infer<typeof validatorSemanticCodeSchema>;

export const productValidatorImportSequenceStepSchema = z.object({
  patternCode: validatorSemanticCodeSchema,
  order: z.number().int().min(0),
});

export type ProductValidatorImportSequenceStep = z.infer<
  typeof productValidatorImportSequenceStepSchema
>;

export const productValidatorImportSequenceSchema = z.object({
  code: validatorSemanticCodeSchema,
  label: z.string().trim().min(1),
  debounceMs: z.number().int().min(0).max(30_000).default(0),
  steps: z.array(productValidatorImportSequenceStepSchema).min(1),
});

export type ProductValidatorImportSequence = z.infer<typeof productValidatorImportSequenceSchema>;

export const productValidatorImportPatternSchema = createProductValidationPatternSchema.extend({
  id: z.string().trim().min(1).optional(),
  code: validatorSemanticCodeSchema,
  sequenceCode: validatorSemanticCodeSchema.nullable().optional(),
  sequenceOrder: z.number().int().min(0).nullable().optional(),
  sequenceLabel: z.string().trim().nullable().optional(),
  sequenceDebounceMs: z.number().int().min(0).max(30_000).optional(),
});

export type ProductValidatorImportPattern = z.infer<typeof productValidatorImportPatternSchema>;

export const productValidatorImportMetadataSchema = z.object({
  source: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  createdAt: z.string().trim().optional(),
});

export type ProductValidatorImportMetadata = z.infer<typeof productValidatorImportMetadataSchema>;

export const productValidatorImportRequestSchema = z
  .object({
    version: z.literal(1),
    scope: validatorImportScopeSchema.default('products'),
    mode: validatorImportModeSchema.default('upsert'),
    dryRun: z.boolean().optional(),
    metadata: productValidatorImportMetadataSchema.optional(),
    patterns: z.array(productValidatorImportPatternSchema).min(1),
    sequences: z.array(productValidatorImportSequenceSchema).optional(),
  })
  .superRefine((value, ctx) => {
    const patternCodes = new Map<string, number>();
    value.patterns.forEach((pattern, index) => {
      const count = patternCodes.get(pattern.code) ?? 0;
      patternCodes.set(pattern.code, count + 1);
      if (count > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate pattern code: ${pattern.code}`,
          path: ['patterns', index, 'code'],
        });
      }
    });

    const sequenceCodes = new Map<string, number>();
    const definedSequenceCodes = new Set<string>();

    for (const [sequenceIndex, sequence] of (value.sequences ?? []).entries()) {
      const count = sequenceCodes.get(sequence.code) ?? 0;
      sequenceCodes.set(sequence.code, count + 1);
      if (count > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate sequence code: ${sequence.code}`,
          path: ['sequences', sequenceIndex, 'code'],
        });
      }
      definedSequenceCodes.add(sequence.code);

      const stepPatternCodes = new Set<string>();
      for (const [stepIndex, step] of sequence.steps.entries()) {
        if (!patternCodes.has(step.patternCode)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Sequence step references unknown pattern code: ${step.patternCode}`,
            path: ['sequences', sequenceIndex, 'steps', stepIndex, 'patternCode'],
          });
          continue;
        }
        if (stepPatternCodes.has(step.patternCode)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Sequence step pattern code is duplicated within sequence: ${step.patternCode}`,
            path: ['sequences', sequenceIndex, 'steps', stepIndex, 'patternCode'],
          });
        }
        stepPatternCodes.add(step.patternCode);
      }
    }

    for (const [patternIndex, pattern] of value.patterns.entries()) {
      const sequenceCode = pattern.sequenceCode?.trim() ?? null;
      if (!sequenceCode) continue;
      if ((value.sequences?.length ?? 0) > 0 && !definedSequenceCodes.has(sequenceCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Pattern sequenceCode does not match any declared sequence: ${sequenceCode}`,
          path: ['patterns', patternIndex, 'sequenceCode'],
        });
      }
    }
  });

export type ProductValidatorImportRequest = z.infer<typeof productValidatorImportRequestSchema>;

export const productValidatorImportActionSchema = z.enum(['create', 'update', 'delete', 'skip']);

export type ProductValidatorImportAction = z.infer<typeof productValidatorImportActionSchema>;

export const productValidatorImportOperationSchema = z.object({
  code: validatorSemanticCodeSchema.optional(),
  label: z.string(),
  action: productValidatorImportActionSchema,
  patternId: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
});

export type ProductValidatorImportOperation = z.infer<typeof productValidatorImportOperationSchema>;

export const productValidatorImportErrorSchema = z.object({
  code: z.string().nullable().optional(),
  message: z.string(),
  path: z.string().optional(),
});

export type ProductValidatorImportError = z.infer<typeof productValidatorImportErrorSchema>;

export const productValidatorImportSummarySchema = z.object({
  createCount: z.number().int().min(0),
  updateCount: z.number().int().min(0),
  deleteCount: z.number().int().min(0),
  skipCount: z.number().int().min(0),
});

export type ProductValidatorImportSummary = z.infer<typeof productValidatorImportSummarySchema>;

export const productValidatorImportResultSchema = z.object({
  ok: z.boolean(),
  dryRun: z.boolean(),
  scope: validatorImportScopeSchema,
  mode: validatorImportModeSchema,
  summary: productValidatorImportSummarySchema,
  operations: z.array(productValidatorImportOperationSchema),
  errors: z.array(productValidatorImportErrorSchema),
});

export type ProductValidatorImportResult = z.infer<typeof productValidatorImportResultSchema>;
