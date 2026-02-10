import type { Producer } from '@/features/products/types';

export type ExternalProducer = {
  id: string;
  connectionId: string;
  externalId: string;
  name: string;
  metadata: Record<string, unknown> | null;
  fetchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type ProducerMapping = {
  id: string;
  connectionId: string;
  externalProducerId: string;
  internalProducerId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ProducerMappingWithDetails = ProducerMapping & {
  externalProducer: ExternalProducer;
  internalProducer: Producer;
};

export type BaseProducerFromApi = {
  manufacturer_id?: number | string;
  producer_id?: number | string;
  id?: number | string;
  name?: string;
};

export type BaseProducer = {
  id: string;
  name: string;
};

export type ExternalProducerSyncInput = {
  connectionId: string;
  externalId: string;
  name: string;
  metadata?: Record<string, unknown>;
};

export type ProducerMappingCreateInput = {
  connectionId: string;
  externalProducerId: string;
  internalProducerId: string;
};

export type ProducerMappingUpdateInput = {
  externalProducerId?: string;
  isActive?: boolean;
};
