import type {
  ExternalProducerDto,
  ProducerMappingDto as ProducerMappingDtoContract,
  ProducerMappingWithDetailsDto as ProducerMappingWithDetailsDtoContract,
  BaseProducerFromApiDto,
  BaseProducerDto as BaseProducerDtoContract,
  ExternalProducerSyncInputDto,
  ProducerMappingCreateInputDto,
  ProducerMappingUpdateInputDto,
} from '@/shared/contracts/integrations';
import type { ProducerDto as Producer } from '@/shared/contracts/products';

export type ExternalProducer = ExternalProducerDto;

export type ProducerMapping = ProducerMappingDtoContract;

export type ProducerMappingWithDetails = Omit<ProducerMappingWithDetailsDtoContract, 'internalProducer'> & {
  internalProducer: Producer;
};

export type BaseProducerFromApi = BaseProducerFromApiDto;

export type BaseProducer = BaseProducerDtoContract;

export type ExternalProducerSyncInput = ExternalProducerSyncInputDto;

export type ProducerMappingCreateInput = ProducerMappingCreateInputDto;

export type ProducerMappingUpdateInput = ProducerMappingUpdateInputDto;
