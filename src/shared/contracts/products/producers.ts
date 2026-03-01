import { z } from 'zod';
import { namedDtoSchema } from '../base';

/**
 * Producer Contract
 */
export const producerSchema = namedDtoSchema.extend({
  website: z.string().nullable(),
});

export type ProducerDto = z.infer<typeof producerSchema>;
export type Producer = ProducerDto;

export const createProducerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  website: z.string().trim().nullable().optional(),
});

export type CreateProducerDto = z.infer<typeof createProducerSchema>;

export const updateProducerSchema = z.object({
  name: z.string().min(1).optional(),
  website: z.string().trim().nullable().optional(),
});

export type UpdateProducerDto = z.infer<typeof updateProducerSchema>;
