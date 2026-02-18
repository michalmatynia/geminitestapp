import type {
  ExternalTagDto,
  TagMappingDto as TagMappingDtoContract,
  TagMappingWithDetailsDto as TagMappingWithDetailsDtoContract,
  BaseTagDto,
  ExternalTagSyncInputDto,
  TagMappingCreateInputDto,
  TagMappingUpdateInputDto,
} from '@/shared/contracts/integrations';
import type { ProductTagDto as ProductTag } from '@/shared/contracts/products';

export type ExternalTag = ExternalTagDto;

export type TagMapping = TagMappingDtoContract;

export type TagMappingWithDetails = Omit<TagMappingWithDetailsDtoContract, 'internalTag'> & {
  internalTag: ProductTag;
};

export type BaseTag = BaseTagDto;

export type ExternalTagSyncInput = ExternalTagSyncInputDto;

export type TagMappingCreateInput = TagMappingCreateInputDto;

export type TagMappingUpdateInput = TagMappingUpdateInputDto;
