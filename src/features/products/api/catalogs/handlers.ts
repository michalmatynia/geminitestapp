import { type AnyBulkWriteOperation } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCatalogRepository, getProductDataProvider } from '@/features/products/server';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { normalizeCatalogLanguageSelection } from '@/shared/lib/products/services/catalog-language-normalization';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { normalizeCatalogPriceGroupSelection } from './price-group-normalization';

const catalogSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  languageIds: z.array(z.string().trim().min(1)).optional(),
  defaultLanguageId: z.string().trim().min(1).optional(),
  priceGroupIds: z.array(z.string().trim().min(1)).optional(),
  defaultPriceGroupId: z.string().trim().min(1).optional(),
  isDefault: z.boolean().optional(),
});

export async function getCatalogsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const provider = await getProductDataProvider();
  let catalogs = await (await getCatalogRepository(provider)).listCatalogs();

  if (provider === 'mongodb' && catalogs.length > 0) {
    try {
      const mongo = await getMongoDb();
      const mongoLanguages = await mongo
        .collection<{ id: string; code: string }>('languages')
        .find({}, { projection: { id: 1, code: 1 } })
        .toArray();
      const languageCodeById = new Map<string, string>();
      mongoLanguages.forEach((language: { id: string; code: string }) => {
        if (language.id) languageCodeById.set(language.id, language.code);
        if (language.code) languageCodeById.set(language.code, language.code);
      });

      const collection = mongo.collection<{ _id: string; id: string }>('catalogs');
      const bulkOps: AnyBulkWriteOperation<{ _id: string; id: string }>[] = [];
      const updatedCatalogs = catalogs.map((catalog: CatalogRecord) => {
        const nextLanguageIds =
          catalog.languageIds?.map(
            (languageId: string) => languageCodeById.get(languageId) ?? languageId
          ) ?? [];
        const nextDefaultLanguageId = catalog.defaultLanguageId
          ? (languageCodeById.get(catalog.defaultLanguageId) ?? catalog.defaultLanguageId)
          : null;

        const languageIdsChanged =
          nextLanguageIds.length !== (catalog.languageIds?.length ?? 0) ||
          nextLanguageIds.some(
            (languageId: string, index: number) => languageId !== catalog.languageIds?.[index]
          );
        const defaultChanged = nextDefaultLanguageId !== catalog.defaultLanguageId;

        if (languageIdsChanged || defaultChanged) {
          bulkOps.push({
            updateOne: {
              filter: { $or: [{ _id: catalog.id }, { id: catalog.id }] },
              update: {
                $set: {
                  languageIds: nextLanguageIds,
                  defaultLanguageId: nextDefaultLanguageId,
                  updatedAt: new Date(),
                },
              },
            },
          });
        }

        return {
          ...catalog,
          languageIds: nextLanguageIds,
          defaultLanguageId: nextDefaultLanguageId,
        };
      });

      if (bulkOps.length > 0) {
        await collection.bulkWrite(bulkOps);
      }
      catalogs = updatedCatalogs;
    } catch (error: unknown) {
      logClientError(error);
      void logSystemEvent({
        level: 'warn',
        message: 'Failed to normalize catalog language IDs',
        source: 'catalogs.GET',
        error,
        request: req,
        requestId: ctx.requestId,
        context: { provider },
      });
    }
  }
  return NextResponse.json(catalogs);
}

export async function postCatalogsHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const parsed = await parseJsonBody(req, catalogSchema, {
    logPrefix: 'catalogs.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  const provider = await getProductDataProvider();
  const normalizedLanguages = await normalizeCatalogLanguageSelection({
    provider,
    languageIds: data.languageIds ?? [],
    defaultLanguageId: data.defaultLanguageId ?? null,
  });
  const normalizedPriceGroups = await normalizeCatalogPriceGroupSelection(provider, {
    priceGroupIds: data.priceGroupIds ?? [],
    defaultPriceGroupId: data.defaultPriceGroupId ?? null,
  });

  if (normalizedLanguages.languageIds.length === 0) {
    throw badRequestError('Select at least one language.', {
      field: 'languageIds',
    });
  }
  if (
    !normalizedLanguages.defaultLanguageId ||
    !normalizedLanguages.languageIds.includes(normalizedLanguages.defaultLanguageId)
  ) {
    throw badRequestError('Default language must be one of the selected languages.', {
      field: 'defaultLanguageId',
    });
  }
  if (normalizedPriceGroups.priceGroupIds.length === 0) {
    throw badRequestError('Select at least one price group.', {
      field: 'priceGroupIds',
    });
  }
  if (
    !normalizedPriceGroups.defaultPriceGroupId ||
    !normalizedPriceGroups.priceGroupIds.includes(normalizedPriceGroups.defaultPriceGroupId)
  ) {
    throw badRequestError('Default price group must be one of the selected price groups.', {
      field: 'defaultPriceGroupId',
    });
  }
  const catalogRepository = await getCatalogRepository(provider);
  const existingCatalogs = await catalogRepository.listCatalogs();
  const shouldBeDefault = existingCatalogs.length === 0 ? true : (data.isDefault ?? false);
  const catalog = await catalogRepository.createCatalog({
    name: data.name,
    description: data.description ?? null,
    isDefault: shouldBeDefault,
    languageIds: normalizedLanguages.languageIds,
    defaultLanguageId: normalizedLanguages.defaultLanguageId,
    priceGroupIds: normalizedPriceGroups.priceGroupIds,
    defaultPriceGroupId: normalizedPriceGroups.defaultPriceGroupId,
  });
  return NextResponse.json(catalog);
}
