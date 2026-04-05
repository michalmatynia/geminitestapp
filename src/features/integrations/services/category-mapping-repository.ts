import type { CategoryMappingAssignment } from '@/shared/contracts/integrations/base-com';
import type { CategoryMapping, CategoryMappingWithDetails, CategoryMappingCreateInput, CategoryMappingUpdateInput } from '@/shared/contracts/integrations/listings';
import type { CategoryMappingRepository } from '@/shared/contracts/integrations/repositories';

import { mongoCategoryMappingImpl } from './category-mapping/mongo-impl';

export const categoryMappingRepository: CategoryMappingRepository = {
  async create(input: CategoryMappingCreateInput): Promise<CategoryMapping> {
    return mongoCategoryMappingImpl.create(input);
  },

  async update(id: string, input: CategoryMappingUpdateInput): Promise<CategoryMapping> {
    return mongoCategoryMappingImpl.update(id, input);
  },

  async delete(id: string): Promise<void> {
    return mongoCategoryMappingImpl.delete(id);
  },

  async getById(id: string): Promise<CategoryMapping | null> {
    return mongoCategoryMappingImpl.getById(id);
  },

  async listByConnection(
    connectionId: string,
    catalogId?: string
  ): Promise<CategoryMappingWithDetails[]> {
    return mongoCategoryMappingImpl.listByConnection(connectionId, catalogId);
  },

  async getByExternalCategory(
    connectionId: string,
    externalCategoryId: string,
    catalogId: string
  ): Promise<CategoryMapping | null> {
    return mongoCategoryMappingImpl.getByExternalCategory(
      connectionId,
      externalCategoryId,
      catalogId
    );
  },

  async bulkUpsert(
    connectionId: string,
    catalogId: string,
    mappings: CategoryMappingAssignment[]
  ): Promise<number> {
    return mongoCategoryMappingImpl.bulkUpsert(connectionId, catalogId, mappings);
  },

  async deleteByConnection(connectionId: string): Promise<number> {
    return mongoCategoryMappingImpl.deleteByConnection(connectionId);
  },
};

export const getCategoryMappingRepository = (): CategoryMappingRepository =>
  categoryMappingRepository;
