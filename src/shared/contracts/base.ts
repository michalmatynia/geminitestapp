import { z } from 'zod';

/**
 * Foundation schemas used across all contracts
 */

export const localizedSchema = z.record(z.string(), z.string().nullable());

export const dtoBaseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const namedDtoSchema = dtoBaseSchema.extend({
  name: z.string(),
  description: z.string().nullable().optional(),
});
