import type {
  ExternalProducer,
  ExternalProducerSyncInputDto,
  ProducerMapping,
  ProducerMappingCreateInputDto,
  ProducerMappingUpdateInputDto,
  ProducerMappingWithDetails,
} from '@/shared/contracts/integrations';

export type {
  ExternalProducer,
  ProducerMapping,
  ProducerMappingWithDetails,
};

export type ProducerMappingCreateInput = ProducerMappingCreateInputDto;
export type ProducerMappingUpdateInput = ProducerMappingUpdateInputDto;
export type ExternalProducerSyncInput = ExternalProducerSyncInputDto;
