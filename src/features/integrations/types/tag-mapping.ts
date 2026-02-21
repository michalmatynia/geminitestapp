import type {
  ExternalTag,
  ExternalTagSyncInputDto,
  TagMapping,
  TagMappingCreateInputDto,
  TagMappingUpdateInputDto,
  TagMappingWithDetails,
} from '@/shared/contracts/integrations';

export type {
  ExternalTag,
  TagMapping,
  TagMappingWithDetails,
};

export type TagMappingCreateInput = TagMappingCreateInputDto;
export type TagMappingUpdateInput = TagMappingUpdateInputDto;
export type ExternalTagSyncInput = ExternalTagSyncInputDto;
