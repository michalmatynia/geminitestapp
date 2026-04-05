import { z } from 'zod';

export const sessionCookieSameSiteSchema = z
  .enum(['lax', 'strict', 'none', 'Lax', 'Strict', 'None'])
  .transform((value) => value.toLowerCase() as 'lax' | 'strict' | 'none');

export const sessionCookieSchema = z.object({
  name: z.string(),
  value: z.string(),
  domain: z.string().optional(),
  path: z.string().optional(),
  expires: z.number().optional(),
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
  sameSite: sessionCookieSameSiteSchema.optional(),
});

export type SessionCookie = z.infer<typeof sessionCookieSchema>;

export const sessionOriginLocalStorageEntrySchema = z.object({
  name: z.string(),
  value: z.string(),
});

export type SessionOriginLocalStorageEntry = z.infer<typeof sessionOriginLocalStorageEntrySchema>;

export const sessionOriginSchema = z.object({
  origin: z.string(),
  localStorage: z.array(sessionOriginLocalStorageEntrySchema),
});

export type SessionOrigin = z.infer<typeof sessionOriginSchema>;

export const playwrightStorageStateSchema = z.object({
  cookies: z.array(sessionCookieSchema),
  origins: z.array(sessionOriginSchema),
});

export type PlaywrightStorageState = z.infer<typeof playwrightStorageStateSchema>;

export const sessionPayloadSchema = playwrightStorageStateSchema.partial().extend({
  updatedAt: z.string().optional(),
  error: z.string().optional(),
});

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

export const imageUrlDiagnosticSchema = z.object({
  url: z.string(),
  status: z.enum(['ok', 'error', 'pending', 'missing']),
  error: z.string().nullable().optional(),
  size: z.number().nullable().optional(),
  mimetype: z.string().nullable().optional(),
  dimensions: z
    .object({
      width: z.number(),
      height: z.number(),
    })
    .nullable()
    .optional(),
});

export type ImageUrlDiagnostic = z.infer<typeof imageUrlDiagnosticSchema>;

export const imageExportDiagnosticsSchema = z.object({
  listingId: z.string(),
  productId: z.string(),
  checkedAt: z.string(),
  images: z.array(imageUrlDiagnosticSchema),
});

export type ImageExportDiagnostics = z.infer<typeof imageExportDiagnosticsSchema>;

export const testStatusSchema = z.enum(['pending', 'ok', 'failed']);

export type TestStatus = z.infer<typeof testStatusSchema>;

export const testLogEntrySchema = z.object({
  step: z.string(),
  status: testStatusSchema,
  timestamp: z.string(),
  detail: z.string().optional(),
});

export type TestLogEntry = z.infer<typeof testLogEntrySchema>;

export const testConnectionResponseSchema = z
  .object({
    ok: z.boolean(),
    steps: z.array(testLogEntrySchema),
    inventoryCount: z.number().optional(),
    profile: z.unknown().optional(),
    sessionReady: z.boolean().optional(),
  })
  .passthrough();

export type TestConnectionResponse = z.infer<typeof testConnectionResponseSchema>;

export const integrationConnectionActionTargetSchema = z.object({
  integrationId: z.string().trim().min(1),
  connectionId: z.string().trim().min(1),
});

export type IntegrationConnectionActionTarget = z.infer<
  typeof integrationConnectionActionTargetSchema
>;

export const integrationConnectionTestTypeSchema = z.enum(['test', 'base/test', 'allegro/test']);

export type IntegrationConnectionTestType = z.infer<typeof integrationConnectionTestTypeSchema>;

export const integrationConnectionTestModeSchema = z.enum([
  'auto',
  'manual',
  'quicklist_preflight',
]);

export type IntegrationConnectionTestMode = z.infer<typeof integrationConnectionTestModeSchema>;

export const integrationConnectionTestRequestSchema = z.object({
  mode: integrationConnectionTestModeSchema.optional().catch(undefined),
  manualTimeoutMs: z.number().int().positive().optional().catch(undefined),
  productId: z.string().trim().min(1).optional().catch(undefined),
});

export type IntegrationConnectionTestRequest = z.infer<typeof integrationConnectionTestRequestSchema>;

export const integrationConnectionTestVariablesSchema =
  integrationConnectionActionTargetSchema.extend({
    type: integrationConnectionTestTypeSchema.optional(),
    body: z.record(z.string(), z.unknown()).optional(),
    timeoutMs: z.number().int().positive().optional(),
  });

export type IntegrationConnectionTestVariables = z.infer<
  typeof integrationConnectionTestVariablesSchema
>;
