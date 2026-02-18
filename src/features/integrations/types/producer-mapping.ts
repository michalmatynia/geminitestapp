import type {
  ExternalProducerDto,
  ProducerMappingDto as ProducerMappingDtoContract,
  ProducerMappingWithDetailsDto as ProducerMappingWithDetailsDtoContract,
} from '@/shared/contracts/integrations';
import type { ProducerDto as Producer } from '@/shared/contracts/products';

export type ExternalProducer = ExternalProducerDto;

export type ProducerMapping = ProducerMappingDtoContract;

export type ProducerMappingWithDetails = Omit<ProducerMappingWithDetailsDtoContract, 'internalProducer'> & {
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
