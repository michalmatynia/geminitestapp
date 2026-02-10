import type { ProductTag } from '@/features/products/types';

export type ExternalTag = {
  id: string;
  connectionId: string;
  externalId: string;
  name: string;
  metadata: Record<string, unknown> | null;
  fetchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type TagMapping = {
  id: string;
  connectionId: string;
  externalTagId: string;
  internalTagId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type TagMappingWithDetails = TagMapping & {
  externalTag: ExternalTag;
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
