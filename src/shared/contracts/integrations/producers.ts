import { z } from 'zod';

import { dtoBaseSchema, type IdNameDto } from '../base';
import { producerSchema } from '../products';

import type { ExternalTagSyncInput as ExternalProducerSyncInput } from './listings';

export const externalProducerSchema = dtoBaseSchema.extend({
  connectionId: z.string(),
  externalId: z.string(),
  name: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  fetchedAt: z.string(),
});

export type ExternalProducer = z.infer<typeof externalProducerSchema>;

export const producerMappingSchema = dtoBaseSchema.extend({
  connectionId: z.string(),
  externalProducerId: z.string(),
  internalProducerId: z.string(),
  isActive: z.boolean(),
});

export type ProducerMapping = z.infer<typeof producerMappingSchema>;

export const producerMappingWithDetailsSchema = producerMappingSchema.extend({
  externalProducer: externalProducerSchema,
  internalProducer: producerSchema.nullable(),
});

export type ProducerMappingWithDetails = z.infer<typeof producerMappingWithDetailsSchema>;

export const baseProducerFromApiSchema = z.object({
  manufacturer_id: z.union([z.number(), z.string()]).optional(),
  producer_id: z.union([z.number(), z.string()]).optional(),
  id: z.union([z.number(), z.string()]).optional(),
  name: z.string().optional(),
});

export type BaseProducerFromApi = z.infer<typeof baseProducerFromApiSchema>;

export type { IdNameDto as BaseProducer };

export type { ExternalProducerSyncInput };

export const producerMappingCreateInputSchema = z.object({
  connectionId: z.string(),
  externalProducerId: z.string(),
  internalProducerId: z.string(),
});

export type ProducerMappingCreateInput = z.infer<typeof producerMappingCreateInputSchema>;

export const producerMappingUpdateInputSchema = z.object({
  externalProducerId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type ProducerMappingUpdateInput = z.infer<typeof producerMappingUpdateInputSchema>;

export const producerMappingAssignmentSchema = z.object({
  internalProducerId: z.string().trim().min(1),
  externalProducerId: z.string().trim().min(1).nullable(),
});

export type ProducerMappingAssignment = z.infer<typeof producerMappingAssignmentSchema>;

export const bulkProducerMappingItemSchema = producerMappingAssignmentSchema;

export type BulkProducerMappingItem = ProducerMappingAssignment;

export const bulkProducerMappingRequestSchema = z.object({
  connectionId: z.string().trim().min(1),
  mappings: z.array(producerMappingAssignmentSchema).min(1),
});

export type BulkProducerMappingRequest = z.infer<typeof bulkProducerMappingRequestSchema>;
