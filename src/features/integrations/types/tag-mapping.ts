import type {
  ExternalTagDto,
  TagMappingDto as TagMappingDtoContract,
  TagMappingWithDetailsDto as TagMappingWithDetailsDtoContract,
} from '@/shared/contracts/integrations';
import type { ProductTagDto as ProductTag } from '@/shared/contracts/products';

export type ExternalTag = ExternalTagDto;

export type TagMapping = TagMappingDtoContract;

export type TagMappingWithDetails = Omit<TagMappingWithDetailsDtoContract, 'internalTag'> & {
  internalTag: ProductTag;
};

export type BaseTag = {
  id: string;
  name: string;
};

export type ExternalTagSyncInput = {
  connectionId: string;
  externalId: string;
  name: string;
  metadata?: Record<string, unknown>;
};

export type TagMappingCreateInput = {
  connectionId: string;
  externalTagId: string;
  internalTagId: string;
};

export type TagMappingUpdateInput = {
  externalTagId?: string;
  isActive?: boolean;
};
