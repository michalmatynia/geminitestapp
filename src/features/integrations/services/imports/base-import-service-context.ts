import 'server-only';

import { resolveBaseConnectionToken } from '@/features/integrations/services/base-token-resolver';
import {
  callBaseApi,
  fetchBaseProductDetails,
  fetchBaseProductById,
  isBaseProductRecordSparse,
  type BaseProductRecord,
} from '@/features/integrations/services/imports/base-client';
import { getIntegrationRepository } from '@/features/integrations/services/integration-repository';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { getProductDataProvider } from '@/shared/lib/products/services/product-provider';

import {
  BASE_DETAILS_BATCH_SIZE,
  BASE_INTEGRATION_SLUGS,
  addCurrencyCandidate,
  toStringId,
  type BaseConnectionContext,
  type PriceGroupLookup,
} from './base-import-service-shared';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


type ProductDataProvider = Awaited<ReturnType<typeof getProductDataProvider>>;

const normalizePriceIdentifier = (value: unknown): string | null => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const compact = String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return compact.length > 0 ? compact : null;
};

const matchesPreferredPriceIdentifier = (
  identifier: string,
  preferredSet: Set<string>
): boolean => {
  for (const preferred of preferredSet) {
    if (identifier === preferred) {
      return true;
    }
    if (preferred.length === 3) {
      if (identifier.startsWith(preferred) || identifier.endsWith(preferred)) {
        return true;
      }
    }
  }
  return false;
};

const resolveBaseInventoryPriceGroupIdentifiers = async (input: {
  token?: string | null;
  inventoryId?: string | null;
  preferredIdentifiers: string[];
}): Promise<string[]> => {
  const token = input.token?.trim() ?? '';
  const inventoryId = input.inventoryId?.trim() ?? '';
  if (!token || !inventoryId) return [];

  const preferredSet = new Set(
    input.preferredIdentifiers
      .map((value: string): string | null => normalizePriceIdentifier(value))
      .filter((value: string | null): value is string => Boolean(value))
  );
  if (preferredSet.size === 0) return [];

  try {
    const payload = await callBaseApi(token, 'getInventoryPriceGroups', {
      inventory_id: inventoryId,
    });
    const priceGroups = Array.isArray(payload['price_groups']) ? payload['price_groups'] : [];
    const matched = new Set<string>();

    priceGroups.forEach((entry: unknown) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
      const record = entry as Record<string, unknown>;
      const candidateIdentifiers = [
        record['price_group_id'],
        record['id'],
        record['name'],
        record['currency'],
        record['currency_code'],
        record['code'],
      ]
        .map((value: unknown): string | null => normalizePriceIdentifier(value))
        .filter((value: string | null): value is string => Boolean(value));

      const matches = candidateIdentifiers.some((identifier: string): boolean =>
        matchesPreferredPriceIdentifier(identifier, preferredSet)
      );
      if (!matches) return;

      const priceGroupId = normalizePriceIdentifier(record['price_group_id'] ?? record['id']);
      if (priceGroupId) {
        matched.add(priceGroupId);
      }
    });

    return Array.from(matched);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return [];
  }
};

export const resolvePriceGroupContext = async (
  provider: ProductDataProvider,
  preferredPriceGroupId?: string | null,
  options?: {
    baseToken?: string | null;
    inventoryId?: string | null;
  }
): Promise<{ defaultPriceGroupId: string | null; preferredCurrencies: string[] }> => {
  void provider;
  const projectedFields = {
    id: 1,
    groupId: 1,
    currencyId: 1,
    currencyCode: 1,
  } as const;

  const mongo = await getMongoDb();
  const priceGroupCollection = mongo.collection<PriceGroupLookup>('price_groups');
  const normalizedPreferredPriceGroupId = preferredPriceGroupId?.trim() ?? '';
  const byId = normalizedPreferredPriceGroupId
    ? await priceGroupCollection.findOne(
        {
          $or: [
            { id: normalizedPreferredPriceGroupId },
            { groupId: normalizedPreferredPriceGroupId },
          ],
        },
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
    } catch (error) {
      void ErrorSystem.captureException(error);
    
      // Currency lookup is optional during import.
    }
  }

  const basePriceGroupIdentifiers = await resolveBaseInventoryPriceGroupIdentifiers({
    token: options?.baseToken,
    inventoryId: options?.inventoryId,
    preferredIdentifiers: Array.from(preferredCurrencies),
  });
  basePriceGroupIdentifiers.forEach((identifier: string) => {
    preferredCurrencies.add(identifier);
  });

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
  void provider;
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

  // For sparse records (no name in any language), attempt a richer single-product fetch.
  // This catches cases where the batch endpoint omits extended attributes.
  const sparseIds: string[] = [];
  for (const [id, record] of map.entries()) {
    if (isBaseProductRecordSparse(record)) {
      sparseIds.push(id);
    }
  }

  if (sparseIds.length > 0) {
    await Promise.all(
      sparseIds.map(async (id) => {
        try {
          const enriched = await fetchBaseProductById(token, inventoryId, id);
          if (enriched && !isBaseProductRecordSparse(enriched)) {
            map.set(id, enriched);
          }
        } catch {
          // Enrichment is best-effort; keep the sparse record
        }
      })
    );
  }

  return map;
};
