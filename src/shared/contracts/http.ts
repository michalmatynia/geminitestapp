import { z } from 'zod';
import { type ApiEnvelopeDto } from './api-envelope';

/**
 * HTTP and API Envelope DTOs
 */

export const apiEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export type ApiEnvelope<T = unknown> = ApiEnvelopeDto<T, string>;

export const httpResultSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), data: z.unknown() }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

export type HttpResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type ApiPayloadResult<T> = {
  ok: boolean;
  payload: T;
};

export const paginationSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export type Pagination = z.infer<typeof paginationSchema>;

export const paginatedResponseSchema = z.object({
  data: z.array(z.unknown()),
  pagination: paginationSchema,
  total: z.number().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
});

export type PaginatedResponse<T> = {
  data: T[];
  pagination: Pagination;
  total?: number;
  page?: number;
  limit?: number;
};
