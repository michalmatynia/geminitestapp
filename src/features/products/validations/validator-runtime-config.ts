// Validator runtime config: zod schemas and runtime validation helpers used to
// safely interpret validator runtime configurations. These schemas are strict
// and used to validate user-provided runtime queries/actions before execution
// to avoid unsafe database operations.
import { z } from 'zod';

import type { ProductValidationRuntimeType } from '@/shared/contracts/products/validation';
import { badRequestError } from '@/shared/errors/app-error';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const runtimeOperatorSchema = z.enum([
  'truthy',
  'falsy',
  'equals',
  'not_equals',
  'contains',
  'starts_with',
  'ends_with',
  'regex',
  'gt',
  'gte',
  'lt',
  'lte',
  'is_empty',
  'is_not_empty',
]);

const dbActionSchema = z.enum(['find', 'findOne', 'countDocuments', 'distinct', 'aggregate']);

const databaseActionPayloadSchema = z
  .object({
    provider: z.enum(['auto', 'mongodb']).optional(),
    collection: z.string().trim().min(1),
    action: dbActionSchema.default('find'),
    filter: z.record(z.string(), z.unknown()).optional(),
    pipeline: z.array(z.record(z.string(), z.unknown())).optional(),
    projection: z.record(z.string(), z.unknown()).optional(),
    sort: z.record(z.string(), z.unknown()).optional(),
    limit: z.number().int().min(1).max(200).optional(),
    idType: z.string().trim().optional(),
    distinctField: z.string().trim().optional(),
  })
  .strict();

const databaseQueryPayloadSchema = z
  .object({
    provider: z.enum(['auto', 'mongodb']).optional(),
    collection: z.string().trim().min(1),
    filter: z.record(z.string(), z.unknown()).optional(),
    query: z.never().optional(),
    projection: z.record(z.string(), z.unknown()).optional(),
    sort: z.record(z.string(), z.unknown()).optional(),
    limit: z.number().int().min(1).max(200).optional(),
    single: z.boolean().optional(),
    idType: z.string().trim().optional(),
  })
  .strict();

const databaseRuntimeConfigSchema = z
  .object({
    version: z.literal(1).optional(),
    operation: z.enum(['query', 'action']).default('query'),
    payload: z.union([databaseQueryPayloadSchema, databaseActionPayloadSchema]),
    resultPath: z.string().trim().optional(),
    operator: runtimeOperatorSchema.optional(),
    operand: z.unknown().optional(),
    flags: z.string().trim().nullable().optional(),
    replacementPaths: z.array(z.string().trim().min(1)).max(20).optional(),
    replacementValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
    messageTemplate: z.string().optional(),
    onError: z.enum(['ignore', 'issue']).optional(),
  })
  .superRefine((value, ctx) => {
    const payload = value.payload;
    if (value.operation === 'action' && !('action' in payload)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Action payload is required when operation is "action".',
      });
    }
    if (value.operation === 'query' && 'action' in payload) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Query payload is required when operation is "query".',
      });
    }
  })
  .strict();

const aiRuntimeConfigSchema = z
  .object({
    version: z.literal(1).optional(),
    model: z.string().trim().min(1).max(200).optional(),
    systemPrompt: z.string().max(10_000).optional(),
    promptTemplate: z.string().max(20_000).optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().min(50).max(4_000).optional(),
    timeoutMs: z.number().int().min(500).max(60_000).optional(),
    responseFormat: z.enum(['json', 'text']).optional(),
    resultPath: z.string().trim().optional(),
    operator: runtimeOperatorSchema.optional(),
    operand: z.unknown().optional(),
    flags: z.string().trim().nullable().optional(),
    messageTemplate: z.string().max(10_000).optional(),
    replacementPaths: z.array(z.string().trim().min(1)).max(20).optional(),
    replacementValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
    onError: z.enum(['ignore', 'issue']).optional(),
  })
  .strict();

const parseRuntimeConfigJson = (rawValue: string): Record<string, unknown> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch (error) {
    logClientError(error);
    throw badRequestError('Invalid runtimeConfig JSON.', {
      detail: error instanceof Error ? error.message : String(error),
    });
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw badRequestError('Runtime config must be a JSON object.');
  }
  return parsed as Record<string, unknown>;
};

export const validateAndNormalizeRuntimeConfig = ({
  runtimeEnabled,
  runtimeType,
  runtimeConfig,
}: {
  runtimeEnabled: boolean;
  runtimeType: ProductValidationRuntimeType;
  runtimeConfig: string | null;
}): string | null => {
  if (!runtimeEnabled || runtimeType === 'none') return null;
  if (!runtimeConfig) {
    throw badRequestError('runtimeConfig is required when runtime is enabled.');
  }

  const parsed = parseRuntimeConfigJson(runtimeConfig);
  if (runtimeType === 'database_query') {
    const result = databaseRuntimeConfigSchema.safeParse(parsed);
    if (!result.success) {
      throw badRequestError('Invalid database runtimeConfig.', {
        issues: result.error.issues.map((issue) => issue.message),
      });
    }
    return JSON.stringify(result.data);
  }

  if (runtimeType === 'ai_prompt') {
    const result = aiRuntimeConfigSchema.safeParse(parsed);
    if (!result.success) {
      throw badRequestError('Invalid AI runtimeConfig.', {
        issues: result.error.issues.map((issue) => issue.message),
      });
    }
    return JSON.stringify(result.data);
  }

  throw badRequestError(`Unsupported runtime type "${runtimeType}".`);
};

export const parseRuntimeConfigForEvaluation = ({
  runtimeType,
  runtimeConfig,
}: {
  runtimeType: ProductValidationRuntimeType;
  runtimeConfig: string | null;
}): Record<string, unknown> | null => {
  if (!runtimeConfig || runtimeType === 'none') return null;
  try {
    const parsed = JSON.parse(runtimeConfig) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    if (runtimeType === 'database_query') {
      const result = databaseRuntimeConfigSchema.safeParse(parsed);
      return result.success ? (result.data as Record<string, unknown>) : null;
    }
    if (runtimeType === 'ai_prompt') {
      const result = aiRuntimeConfigSchema.safeParse(parsed);
      return result.success ? (result.data as Record<string, unknown>) : null;
    }
    return null;
  } catch (error) {
    logClientError(error);
    return null;
  }
};
