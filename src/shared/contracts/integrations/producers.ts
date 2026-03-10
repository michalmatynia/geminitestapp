import { z } from 'zod';

import { dtoBaseSchema, type IdNameDto } from '../base';
import { producerSchema, type Producer } from '../products';

import type { ExternalTagSyncInput as ExternalProducerSyncInput } from './listings';

export const externalProducerSchema = dtoBaseSchema.extend({
  connectionId: z.string(),
  externalId: z.string(),
  name: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  fetchedAt: z.string(),
});

export interface ExternalProducer {
  id: string;
  connectionId: string;
  externalId: string;
  name: string;
  metadata: Record<string, unknown> | null;
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
}

export const producerMappingSchema = dtoBaseSchema.extend({
  connectionId: z.string(),
  externalProducerId: z.string(),
  internalProducerId: z.string(),
  isActive: z.boolean(),
});

export interface ProducerMapping {
  id: string;
  connectionId: string;
  externalProducerId: string;
  internalProducerId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export const producerMappingWithDetailsSchema = producerMappingSchema.extend({
  externalProducer: externalProducerSchema,
  internalProducer: producerSchema.nullable(),
});

export interface ProducerMappingWithDetails extends ProducerMapping {
  externalProducer: ExternalProducer;
  internalProducer: Producer | null;
}

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

export interface ProducerMappingCreateInput {
  connectionId: string;
  externalProducerId: string;
  internalProducerId: string;
}

export const producerMappingUpdateInputSchema = z.object({
  externalProducerId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export interface ProducerMappingUpdateInput {
  externalProducerId?: string;
  isActive?: boolean;
}

export const bulkProducerMappingItemSchema = z.object({
  internalProducerId: z.string().trim().min(1),
  externalProducerId: z.string().trim().min(1).nullable(),
});

export type BulkProducerMappingItem = z.infer<typeof bulkProducerMappingItemSchema>;

export const bulkProducerMappingRequestSchema = z.object({
  connectionId: z.string().trim().min(1),
  mappings: z.array(bulkProducerMappingItemSchema).min(1),
});

export type BulkProducerMappingRequest = z.infer<typeof bulkProducerMappingRequestSchema>;
