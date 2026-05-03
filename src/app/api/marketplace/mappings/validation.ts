import { getExternalCategoryRepository, getIntegrationRepository } from '@/features/integrations/server';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

const TRADERA_MARKETPLACE_SLUGS = new Set(['tradera']);

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

type CategoryMappingTarget = {
  externalCategoryId: string;
  internalCategoryId: string | null;
};

export const assertCategoryMappingsCanBeSaved = async ({
  connectionId,
  mappings,
}: {
  connectionId: string;
  mappings: CategoryMappingTarget[];
}): Promise<void> => {
  const activeMappings = mappings.filter(
    (mapping) =>
      toTrimmedString(mapping.externalCategoryId).length > 0 &&
      toTrimmedString(mapping.internalCategoryId).length > 0
  );
  if (activeMappings.length === 0) {
    return;
  }

  const integrationRepo = await getIntegrationRepository();
  const connection = await integrationRepo.getConnectionById(connectionId);
  if (!connection) {
    throw notFoundError('Connection not found');
  }

  const integration = await integrationRepo.getIntegrationById(connection.integrationId);
  if (!integration) {
    throw notFoundError('Integration not found');
  }

  const integrationSlug = toTrimmedString(integration.slug).toLowerCase();
  if (!TRADERA_MARKETPLACE_SLUGS.has(integrationSlug)) {
    return;
  }

  const externalCategoryRepo = getExternalCategoryRepository();
  const uniqueExternalIds = [...new Set(activeMappings.map((mapping) => mapping.externalCategoryId.trim()))];
  const categories = await Promise.all(
    uniqueExternalIds.map(async (externalId) => [
      externalId,
      await externalCategoryRepo.getByExternalId(connectionId, externalId),
    ] as const)
  );
  const categoriesByExternalId = new Map(categories);

  for (const mapping of activeMappings) {
    const externalCategoryId = mapping.externalCategoryId.trim();
    const category = categoriesByExternalId.get(externalCategoryId) ?? null;

    if (!category) {
      throw badRequestError(
        'The selected Tradera category is missing from fetched marketplace categories. Fetch Tradera categories again and remap it before saving.',
        {
          connectionId,
          externalCategoryId,
        }
      );
    }

    if (category.isLeaf === false) {
      const categoryLabel = toTrimmedString(category.path) || toTrimmedString(category.name);
      throw badRequestError(
        `Tradera mappings must target the deepest category. "${categoryLabel}" still has child categories. Choose a leaf Tradera category and save again.`,
        {
          connectionId,
          externalCategoryId,
          externalCategoryName: category.name,
          externalCategoryPath: category.path,
        }
      );
    }
  }
};
