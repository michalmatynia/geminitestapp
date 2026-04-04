import type { BaseOrderImportStatusesResponse } from '@/shared/contracts/products';
import { baseOrderImportStatusesPayloadSchema } from '@/shared/contracts/products';
import { badRequestError } from '@/shared/errors/app-error';

const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);

type BaseIntegrationLike = {
  id: string;
  slug?: string | null;
};

export const isBaseIntegrationSlug = (slug: unknown): boolean =>
  typeof slug === 'string' && BASE_INTEGRATION_SLUGS.has(slug.trim().toLowerCase());

export const parseBaseOrderImportStatusesConnectionId = (
  connectionId: string | null | undefined
): string => {
  const parsed = baseOrderImportStatusesPayloadSchema.safeParse({
    connectionId: connectionId ?? '',
  });
  if (!parsed.success) {
    throw badRequestError('Connection is required.');
  }
  return parsed.data.connectionId;
};

export const resolveBaseIntegrationId = (integrations: BaseIntegrationLike[]): string => {
  const baseIntegration = integrations.find((integration) => isBaseIntegrationSlug(integration.slug));
  if (!baseIntegration) {
    throw badRequestError('Base.com integration is not configured.');
  }
  return baseIntegration.id;
};

export const requireBaseConnectionToken = (tokenResolution: {
  token?: string | null;
  error?: string | null;
}): string => {
  if (tokenResolution.token) {
    return tokenResolution.token;
  }
  throw badRequestError(
    tokenResolution.error ?? 'Base.com API token is required. Password token fallback is disabled.'
  );
};

export const buildBaseOrderImportStatusesResponse = (
  statuses: BaseOrderImportStatusesResponse['statuses']
): BaseOrderImportStatusesResponse => ({
  statuses,
});
