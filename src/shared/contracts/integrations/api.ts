import { z } from 'zod';

import { integrationConnectionActionTargetSchema } from './session-testing';

export const integrationBaseApiPayloadSchema = z.object({
  method: z.string().trim().min(1),
  parameters: z.unknown().optional(),
});

export type IntegrationBaseApiPayload = z.infer<typeof integrationBaseApiPayloadSchema>;

export const integrationBaseApiRequestSchema = integrationConnectionActionTargetSchema.extend(
  integrationBaseApiPayloadSchema.shape
);

export type IntegrationBaseApiRequest = z.infer<typeof integrationBaseApiRequestSchema>;

export const integrationBaseApiResponseSchema = z.object({
  data: z.unknown().optional(),
});

export type IntegrationBaseApiResponse = z.infer<typeof integrationBaseApiResponseSchema>;

export const integrationAllegroApiMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

export type IntegrationAllegroApiMethod = z.infer<typeof integrationAllegroApiMethodSchema>;

export const integrationAllegroApiPayloadSchema = z.object({
  method: integrationAllegroApiMethodSchema,
  path: z.string().trim().min(1),
  body: z.unknown().optional(),
});

export type IntegrationAllegroApiPayload = z.infer<typeof integrationAllegroApiPayloadSchema>;

export const integrationAllegroApiRequestSchema = integrationConnectionActionTargetSchema.extend(
  integrationAllegroApiPayloadSchema.shape
);

export type IntegrationAllegroApiRequest = z.infer<typeof integrationAllegroApiRequestSchema>;

export const integrationAllegroApiResponseSchema = z.object({
  status: z.number().int(),
  statusText: z.string(),
  data: z.unknown().optional(),
  refreshed: z.boolean().optional(),
});

export type IntegrationAllegroApiResponse = z.infer<typeof integrationAllegroApiResponseSchema>;

export const integrationDisconnectResponseSchema = z.object({
  ok: z.boolean(),
});

export type IntegrationDisconnectResponse = z.infer<typeof integrationDisconnectResponseSchema>;
