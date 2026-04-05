import type { CategoryMapping, CategoryMappingUpdateInput } from '@/shared/contracts/integrations/listings';
import type { CategoryMappingRepository } from '@/shared/contracts/integrations/repositories';
import { notFoundError } from '@/shared/errors/app-error';

type CategoryMappingByIdRepository = Pick<CategoryMappingRepository, 'getById' | 'update' | 'delete'>;

export const requireCategoryMappingById = async (
  repo: Pick<CategoryMappingByIdRepository, 'getById'>,
  id: string
): Promise<CategoryMapping> => {
  const mapping = await repo.getById(id);
  if (!mapping) {
    throw notFoundError('Mapping not found');
  }
  return mapping;
};

export const buildCategoryMappingUpdatePayload = (
  input: CategoryMappingUpdateInput
): CategoryMappingUpdateInput => ({
  ...(input.internalCategoryId !== undefined
    ? { internalCategoryId: input.internalCategoryId }
    : {}),
  ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
});

export const updateCategoryMappingById = async (
  repo: CategoryMappingByIdRepository,
  id: string,
  input: CategoryMappingUpdateInput
): Promise<CategoryMapping> => {
  await requireCategoryMappingById(repo, id);
  return repo.update(id, buildCategoryMappingUpdatePayload(input));
};

export const deleteCategoryMappingById = async (
  repo: CategoryMappingByIdRepository,
  id: string
): Promise<{ success: true }> => {
  await requireCategoryMappingById(repo, id);
  await repo.delete(id);
  return { success: true };
};
