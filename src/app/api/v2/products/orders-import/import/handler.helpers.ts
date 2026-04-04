import type { BaseOrderImportPersistResponse } from '@/shared/contracts/products';
import { badRequestError } from '@/shared/errors/app-error';

const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);

type BaseIntegrationLike = {
  id: string;
  slug?: string | null;
};

export const isBaseOrderImportIntegrationSlug = (slug: unknown): boolean =>
  typeof slug === 'string' && BASE_INTEGRATION_SLUGS.has(slug.trim().toLowerCase());

export const resolveBaseOrderImportIntegrationId = (integrations: BaseIntegrationLike[]): string => {
  const integration = integrations.find((entry) => isBaseOrderImportIntegrationSlug(entry.slug));
  if (!integration) {
    throw badRequestError('Base.com integration is not configured.');
  }
  return integration.id;
};

export const assertBaseOrderImportConnectionExists = async (
  connectionId: string,
  integrationRepository: {
    listIntegrations: () => Promise<BaseIntegrationLike[]>;
    getConnectionByIdAndIntegration: (
      connectionId: string,
      integrationId: string
    ) => Promise<unknown>;
  }
): Promise<void> => {
  const integrationId = resolveBaseOrderImportIntegrationId(
    await integrationRepository.listIntegrations()
  );
  const connection = await integrationRepository.getConnectionByIdAndIntegration(
    connectionId,
    integrationId
  );
  if (!connection) {
    throw badRequestError('Selected Base.com connection was not found.');
  }
};

export const buildBaseOrderImportPersistResponse = (importResult: {
  createdCount: number;
  updatedCount: number;
  syncedAt: string;
  results: BaseOrderImportPersistResponse['results'];
}): BaseOrderImportPersistResponse => ({
  importedCount: importResult.createdCount + importResult.updatedCount,
  createdCount: importResult.createdCount,
  updatedCount: importResult.updatedCount,
  syncedAt: importResult.syncedAt,
  results: importResult.results,
});
