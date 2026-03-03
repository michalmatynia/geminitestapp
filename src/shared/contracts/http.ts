import { z } from 'zod';

/**
 * HTTP and API Envelope DTOs
 */

export const apiEnvelopeSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export type ApiEnvelopeDto<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

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

export type PaginationDto = z.infer<typeof paginationSchema>;

export const paginatedResponseSchema = z.object({
  data: z.array(z.unknown()),
  pagination: paginationSchema,
  total: z.number().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
});

export type PaginatedResponseDto<T> = {
  data: T[];
  pagination: PaginationDto;
  total?: number;
  page?: number;
  limit?: number;
};
