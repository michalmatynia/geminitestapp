import { z } from 'zod';

import { baseImportPreflightIssueSchema } from './base-com';

export const baseProductRecordSchema = z.record(z.string(), z.unknown());

export type BaseProductRecord = z.infer<typeof baseProductRecordSchema>;

export const importParameterCacheSchema = z.object({
  key: z.string(),
  value: z.unknown(),
  expiresAt: z.number(),
});

export type ImportParameterCache = z.infer<typeof importParameterCacheSchema>;

export const baseApiResponseSchema = z
  .object({
    status: z.string().optional(),
    error_code: z.string().optional(),
    error_message: z.string().optional(),
  })
  .catchall(z.unknown());

export type BaseApiResponse = z.infer<typeof baseApiResponseSchema>;

export const baseApiRawResultSchema = z.object({
  ok: z.boolean(),
  statusCode: z.number(),
  payload: baseApiResponseSchema.nullable(),
  error: z.string().optional(),
});

export type BaseApiRawResult = z.infer<typeof baseApiRawResultSchema>;

export const priceGroupLookupSchema = z.object({
  id: z.string(),
  groupId: z.string().nullable().optional(),
  currencyId: z.string().nullable().optional(),
  currencyCode: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
});

export type PriceGroupLookup = z.infer<typeof priceGroupLookupSchema>;

export const baseConnectionContextSchema = z.object({
  baseIntegrationId: z.string().nullable(),
  connectionId: z.string().nullable(),
  token: z.string().nullable(),
  issue: baseImportPreflightIssueSchema.nullable(),
});

export type BaseConnectionContext = z.infer<typeof baseConnectionContextSchema>;
