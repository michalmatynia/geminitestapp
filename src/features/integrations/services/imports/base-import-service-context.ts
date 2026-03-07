import 'server-only';

import { resolveBaseConnectionToken } from '@/features/integrations/services/base-token-resolver';
import {
  fetchBaseProductDetails,
  type BaseProductRecord,
} from '@/features/integrations/services/imports/base-client';
import {
  BASE_DETAILS_BATCH_SIZE,
  BASE_INTEGRATION_SLUGS,
  addCurrencyCandidate,
  toStringId,
  type BaseConnectionContext,
  type PriceGroupLookup,
} from './base-import-service-shared';
import { getIntegrationRepository } from '@/features/integrations/services/integration-repository';
import type { getProductDataProvider } from '@/shared/lib/products/services/product-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

type ProductDataProvider = Awaited<ReturnType<typeof getProductDataProvider>>;

export const resolvePriceGroupContext = async (
  provider: ProductDataProvider,
  preferredPriceGroupId?: string | null
): Promise<{ defaultPriceGroupId: string | null; preferredCurrencies: string[] }> => {
  const projectedFields = {
    id: 1,
    groupId: 1,
    currencyId: 1,
    currencyCode: 1,
  } as const;

  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const priceGroupCollection = mongo.collection<PriceGroupLookup>('price_groups');
    const byId = preferredPriceGroupId?.trim()
      ? await priceGroupCollection.findOne(
        { id: preferredPriceGroupId.trim() },
        { projection: projectedFields }
      )
      : null;
    const fallbackDefault = byId
      ? null
      : await priceGroupCollection.findOne({ isDefault: true }, { projection: projectedFields });
    const resolved = byId ?? fallbackDefault;
    if (!resolved?.id) {
      return { defaultPriceGroupId: null, preferredCurrencies: [] };
    }

    const preferredCurrencies = new Set<string>();
    addCurrencyCandidate(preferredCurrencies, resolved.currencyCode);
    addCurrencyCandidate(preferredCurrencies, resolved.groupId);
    addCurrencyCandidate(preferredCurrencies, resolved.currencyId);

    if (resolved.currencyId) {
      try {
        const currency = await mongo
          .collection<{ id?: string; code?: string }>('currencies')
          .findOne(
            {
              $or: [{ id: resolved.currencyId }, { code: resolved.currencyId }],
            },
            { projection: { code: 1, id: 1 } }
          );
        addCurrencyCandidate(preferredCurrencies, currency?.code);
      } catch {
        // Currency lookup is optional during import.
      }
    }

    return {
      defaultPriceGroupId: resolved.id,
      preferredCurrencies: Array.from(preferredCurrencies),
    };
  }

  const byId = preferredPriceGroupId?.trim()
    ? await prisma.priceGroup.findUnique({
      where: { id: preferredPriceGroupId.trim() },
      select: {
        id: true,
        groupId: true,
        currencyId: true,
        currency: { select: { code: true } },
      },
    })
    : null;
  const fallbackDefault = byId
    ? null
    : await prisma.priceGroup.findFirst({
      where: { isDefault: true },
      select: {
        id: true,
        groupId: true,
        currencyId: true,
        currency: { select: { code: true } },
      },
    });
  const resolved = byId ?? fallbackDefault;
  if (!resolved?.id) {
    return { defaultPriceGroupId: null, preferredCurrencies: [] };
  }

  const preferredCurrencies = new Set<string>();
  addCurrencyCandidate(preferredCurrencies, resolved.currency?.code);
  addCurrencyCandidate(preferredCurrencies, resolved.groupId);
  addCurrencyCandidate(preferredCurrencies, resolved.currencyId);

  return {
    defaultPriceGroupId: resolved.id,
    preferredCurrencies: Array.from(preferredCurrencies),
  };
};

const normalizeLanguageCode = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
  return normalized.length > 0 ? normalized : null;
};

export const resolveCatalogLanguageContext = async (
  provider: ProductDataProvider,
  catalog: {
    languageIds?: string[];
    defaultLanguageId?: string | null;
  }
): Promise<{ languageCodes: string[]; defaultLanguageCode: string | null }> => {
  const catalogLanguageIds = Array.isArray(catalog.languageIds)
    ? catalog.languageIds
      .map((id: string) => (typeof id === 'string' ? id.trim() : ''))
      .filter((id: string): boolean => id.length > 0)
    : [];
  const defaultLanguageId = catalog.defaultLanguageId?.trim() ?? '';

  const idsToResolve = Array.from(
    new Set(
      [...catalogLanguageIds, defaultLanguageId].filter((id: string): boolean => id.length > 0)
    )
  );
  if (idsToResolve.length === 0) {
    return { languageCodes: [], defaultLanguageCode: null };
  }

  const idToCode = new Map<string, string>();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const languageRows = await mongo
      .collection<{ id?: string; code?: string }>('languages')
      .find(
        {
          $or: [{ id: { $in: idsToResolve } }, { code: { $in: idsToResolve } }],
        },
        { projection: { id: 1, code: 1 } }
      )
      .toArray();
    languageRows.forEach((row: { id?: string; code?: string }) => {
      const id = row.id?.trim();
      const code = normalizeLanguageCode(row.code);
      if (!id || !code) return;
      idToCode.set(id, code);
      idToCode.set(id.toLowerCase(), code);
      idToCode.set(code, code);
    });
  } else {
    const languageRows = await prisma.language.findMany({
      where: {
        OR: [{ id: { in: idsToResolve } }, { code: { in: idsToResolve } }],
      },
      select: { id: true, code: true },
    });
    languageRows.forEach((row: { id: string; code: string }) => {
      const id = row.id?.trim();
      const code = normalizeLanguageCode(row.code);
      if (!id || !code) return;
      idToCode.set(id, code);
      idToCode.set(id.toLowerCase(), code);
      idToCode.set(code, code);
    });
  }

  const languageCodes = Array.from(
    new Set(
      catalogLanguageIds
        .map((id: string) => {
          const normalizedId = id.trim();
          const mapped =
            idToCode.get(normalizedId) ??
            idToCode.get(normalizedId.toLowerCase()) ??
            normalizeLanguageCode(normalizedId);
          return mapped ?? '';
        })
        .filter((code: string): boolean => code.length > 0)
    )
  );

  const defaultLanguageCode = defaultLanguageId
    ? (idToCode.get(defaultLanguageId) ??
      idToCode.get(defaultLanguageId.toLowerCase()) ??
      normalizeLanguageCode(defaultLanguageId))
    : (languageCodes[0] ?? null);

  return {
    languageCodes,
    defaultLanguageCode: defaultLanguageCode ?? null,
  };
};

export const resolveBaseConnectionContext = async (
  requestedConnectionId: string
): Promise<BaseConnectionContext> => {
  const normalizedConnectionId =
    typeof requestedConnectionId === 'string' ? requestedConnectionId.trim() : null;
  if (!normalizedConnectionId) {
    return {
      baseIntegrationId: null,
      connectionId: null,
      token: null,
      issue: {
        code: 'MISSING_CONNECTION',
        severity: 'error',
        message: 'Base.com connection is required.',
      },
    };
  }

  const integrationRepo = await getIntegrationRepository();
  const integrations = await integrationRepo.listIntegrations();
  const baseIntegration = integrations.find((integration) =>
    BASE_INTEGRATION_SLUGS.has((integration.slug ?? '').trim().toLowerCase())
  );

  if (!baseIntegration) {
    return {
      baseIntegrationId: null,
      connectionId: normalizedConnectionId,
      token: null,
      issue: {
        code: 'MISSING_CONNECTION',
        severity: 'error',
        message: 'Base.com integration is not configured.',
      },
    };
  }

  const connection = await integrationRepo.getConnectionByIdAndIntegration(
    normalizedConnectionId,
    baseIntegration.id
  );

  if (!connection) {
    return {
      baseIntegrationId: baseIntegration.id,
      connectionId: normalizedConnectionId,
      token: null,
      issue: {
        code: 'MISSING_CONNECTION',
        severity: 'error',
        message: 'Selected Base.com connection was not found.',
      },
    };
  }

  const tokenResolution = resolveBaseConnectionToken({
    baseApiToken: connection.baseApiToken,
  });
  if (!tokenResolution.token) {
    return {
      baseIntegrationId: baseIntegration.id,
      connectionId: normalizedConnectionId,
      token: null,
      issue: {
        code: 'MISSING_CONNECTION',
        severity: 'error',
        message:
          tokenResolution.error ??
          'Base.com connection has no valid API token. Re-save the connection.',
      },
    };
  }

  return {
    baseIntegrationId: baseIntegration.id,
    connectionId: normalizedConnectionId,
    token: tokenResolution.token,
    issue: null,
  };
};

export const fetchDetailsMap = async (
  token: string,
  inventoryId: string,
  ids: string[]
): Promise<Map<string, BaseProductRecord>> => {
  const map = new Map<string, BaseProductRecord>();
  for (let index = 0; index < ids.length; index += BASE_DETAILS_BATCH_SIZE) {
    const batch = ids.slice(index, index + BASE_DETAILS_BATCH_SIZE);
    if (batch.length === 0) continue;
    const records = await fetchBaseProductDetails(token, inventoryId, batch);
    records.forEach((record: BaseProductRecord) => {
      const recordId =
        toStringId(record['base_product_id']) ??
        toStringId(record['product_id']) ??
        toStringId(record['id']);
      if (recordId) {
        map.set(recordId, record);
      }
    });
  }
  return map;
};
