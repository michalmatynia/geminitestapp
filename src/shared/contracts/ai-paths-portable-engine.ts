import { z } from 'zod';

import {
  normalizeOptionalQueryString,
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

export const portablePathRemediationDeadLettersQuerySchema = z.object({
  limit: optionalTrimmedQueryString(),
  channel: optionalTrimmedQueryString(),
  endpoint: optionalTrimmedQueryString(),
});

export type PortablePathRemediationDeadLettersQuery = z.infer<
  typeof portablePathRemediationDeadLettersQuerySchema
>;

export const portablePathRemediationDeadLetterReplayHistoryQuerySchema = z.object({
  limit: optionalTrimmedQueryString(),
  from: optionalTrimmedQueryString(),
  to: optionalTrimmedQueryString(),
  includeAttempts: optionalTrimmedQueryString(),
  signed: optionalTrimmedQueryString(),
  format: optionalTrimmedQueryString(),
  cursor: optionalTrimmedQueryString(),
});

export type PortablePathRemediationDeadLetterReplayHistoryQuery = z.infer<
  typeof portablePathRemediationDeadLetterReplayHistoryQuerySchema
>;

export const portablePathJsonSchemaKindQuerySchema = z.object({
  kind: optionalTrimmedQueryString(),
});

export type PortablePathJsonSchemaKindQuery = z.infer<
  typeof portablePathJsonSchemaKindQuerySchema
>;

export const portablePathTrendSnapshotsQuerySchema = z.object({
  limit: optionalTrimmedQueryString(),
  trigger: optionalTrimmedQueryString(),
  from: optionalTrimmedQueryString(),
  to: optionalTrimmedQueryString(),
  cursor: optionalTrimmedQueryString(),
});

export type PortablePathTrendSnapshotsQuery = z.infer<
  typeof portablePathTrendSnapshotsQuerySchema
>;

export const portablePathRemediationWebhookQuerySchema = z.object({
  channel: z.preprocess(
    (value: unknown) => normalizeOptionalQueryString(value)?.toLowerCase(),
    z.enum(['webhook', 'email']).optional()
  ),
  maxSkewSeconds: optionalIntegerQuerySchema(z.number().int().min(1).max(3600)),
});

export type PortablePathRemediationWebhookQuery = z.infer<
  typeof portablePathRemediationWebhookQuerySchema
>;
