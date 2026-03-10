import type {
  CategoryMappingAssignment,
  CategoryMapping,
  CategoryMappingWithDetails,
  CategoryMappingCreateInput,
  CategoryMappingUpdateInput,
} from '@/shared/contracts/integrations';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';

import { mongoCategoryMappingImpl } from './category-mapping/mongo-impl';
import { prismaCategoryMappingImpl } from './category-mapping/prisma-impl';

export type CategoryMappingRepository = {
  create: (input: CategoryMappingCreateInput) => Promise<CategoryMapping>;
  update: (id: string, input: CategoryMappingUpdateInput) => Promise<CategoryMapping>;
  delete: (id: string) => Promise<void>;
  getById: (id: string) => Promise<CategoryMapping | null>;
  listByConnection: (
    connectionId: string,
    catalogId?: string
  ) => Promise<CategoryMappingWithDetails[]>;
  getByExternalCategory: (
    connectionId: string,
    externalCategoryId: string,
    catalogId: string
  ) => Promise<CategoryMapping | null>;
  bulkUpsert: (
    connectionId: string,
    catalogId: string,
    mappings: CategoryMappingAssignment[]
  ) => Promise<number>;
  deleteByConnection: (connectionId: string) => Promise<number>;
};

export const categoryMappingRepository: CategoryMappingRepository = {
  async create(input: CategoryMappingCreateInput): Promise<CategoryMapping> {
    const provider = await getAppDbProvider();
    if (provider === 'mongodb') return mongoCategoryMappingImpl.create(input);
    return prismaCategoryMappingImpl.create(input);
  },

  async update(id: string, input: CategoryMappingUpdateInput): Promise<CategoryMapping> {
    const provider = await getAppDbProvider();
    if (provider === 'mongodb') return mongoCategoryMappingImpl.update(id, input);
    return prismaCategoryMappingImpl.update(id, input);
  },

  async delete(id: string): Promise<void> {
    const provider = await getAppDbProvider();
    if (provider === 'mongodb') return mongoCategoryMappingImpl.delete(id);
    return prismaCategoryMappingImpl.delete(id);
  },

  async getById(id: string): Promise<CategoryMapping | null> {
    const provider = await getAppDbProvider();
    if (provider === 'mongodb') return mongoCategoryMappingImpl.getById(id);
    return prismaCategoryMappingImpl.getById(id);
  },

  async listByConnection(
    connectionId: string,
    catalogId?: string
  ): Promise<CategoryMappingWithDetails[]> {
    const provider = await getAppDbProvider();
    if (provider === 'mongodb')
      return mongoCategoryMappingImpl.listByConnection(connectionId, catalogId);
    return prismaCategoryMappingImpl.listByConnection(connectionId, catalogId);
  },

  async getByExternalCategory(
    connectionId: string,
    externalCategoryId: string,
    catalogId: string
  ): Promise<CategoryMapping | null> {
    const provider = await getAppDbProvider();
    if (provider === 'mongodb')
      return mongoCategoryMappingImpl.getByExternalCategory(
        connectionId,
        externalCategoryId,
        catalogId
      );
    return prismaCategoryMappingImpl.getByExternalCategory(
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
    const provider = await getAppDbProvider();
    if (provider === 'mongodb')
      return mongoCategoryMappingImpl.bulkUpsert(connectionId, catalogId, mappings);
    return prismaCategoryMappingImpl.bulkUpsert(connectionId, catalogId, mappings);
  },

  async deleteByConnection(connectionId: string): Promise<number> {
    const provider = await getAppDbProvider();
    if (provider === 'mongodb') return mongoCategoryMappingImpl.deleteByConnection(connectionId);
    return prismaCategoryMappingImpl.deleteByConnection(connectionId);
  },
};

export const getCategoryMappingRepository = (): CategoryMappingRepository =>
  categoryMappingRepository;
