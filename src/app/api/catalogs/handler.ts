

import { type Filter } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logSystemEvent } from '@/features/observability/server';
import { getCatalogRepository } from '@/features/products/server';
import { getProductDataProvider } from '@/features/products/server';
import { normalizeCatalogLanguageSelection } from '@/features/products/services/catalog-language-normalization';
import type { CatalogRecord } from '@/shared/contracts/products';
import { badRequestError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { ApiHandlerContext } from '@/shared/contracts/ui';


const catalogSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  languageIds: z.array(z.string().trim().min(1)).optional(),
  defaultLanguageId: z.string().trim().min(1).optional(),
  priceGroupIds: z.array(z.string().trim().min(1)).optional(),
  defaultPriceGroupId: z.string().trim().min(1).optional(),
  isDefault: z.boolean().optional(),
});

/**
 * GET /api/catalogs
 * Fetches all catalogs.
 */
export async function GET_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
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

      const missingIds = new Set<string>();
      catalogs.forEach((catalog: CatalogRecord) => {
        (catalog.languageIds ?? []).forEach((languageId: string) => {
          if (!languageCodeById.has(languageId)) {
            missingIds.add(languageId);
          }
        });
        if (
          catalog.defaultLanguageId &&
          !languageCodeById.has(catalog.defaultLanguageId)
        ) {
          missingIds.add(catalog.defaultLanguageId);
        }
      });

      const collection = mongo.collection<{ _id: string; id: string }>('catalogs');
      catalogs = await Promise.all(
        catalogs.map(async (catalog: CatalogRecord) => {
          const nextLanguageIds =
            catalog.languageIds?.map(
              (languageId: string) => languageCodeById.get(languageId) ?? languageId
            ) ?? [];
          const nextDefaultLanguageId = catalog.defaultLanguageId
            ? languageCodeById.get(catalog.defaultLanguageId) ??
              catalog.defaultLanguageId
            : null;

          const languageIdsChanged =
            nextLanguageIds.length !== (catalog.languageIds?.length ?? 0) ||
            nextLanguageIds.some(
              (languageId: string, index: number) => languageId !== catalog.languageIds?.[index]
            );
          const defaultChanged =
            nextDefaultLanguageId !== catalog.defaultLanguageId;

          if (languageIdsChanged || defaultChanged) {
            const filter: Filter<{ _id: string; id: string }> = { $or: [{ _id: catalog.id }, { id: catalog.id }] };
            await collection.updateOne(
              filter,
              {
                $set: {
                  languageIds: nextLanguageIds,
                  defaultLanguageId: nextDefaultLanguageId,
                  updatedAt: new Date(),
                },
              }
            );
          }

          return {
            ...catalog,
            languageIds: nextLanguageIds,
            defaultLanguageId: nextDefaultLanguageId,
          };
        })
      );
    } catch (error: unknown) {
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

/**
 * POST /api/catalogs
 * Creates a catalog.
 */
export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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

  if (normalizedLanguages.languageIds.length === 0) {
    throw badRequestError('Select at least one language.', {
      field: 'languageIds',
    });
  }
  if (
    !normalizedLanguages.defaultLanguageId ||
    !normalizedLanguages.languageIds.includes(normalizedLanguages.defaultLanguageId)
  ) {
    throw badRequestError(
      'Default language must be one of the selected languages.',
      { field: 'defaultLanguageId' }
    );
  }
  if (!data.priceGroupIds || data.priceGroupIds.length === 0) {
    throw badRequestError('Select at least one price group.', {
      field: 'priceGroupIds',
    });
  }
  if (
    !data.defaultPriceGroupId ||
    !data.priceGroupIds.includes(data.defaultPriceGroupId)
  ) {
    throw badRequestError(
      'Default price group must be one of the selected price groups.',
      { field: 'defaultPriceGroupId' }
    );
  }
  const catalogRepository = await getCatalogRepository(provider);
  const existingCatalogs = await catalogRepository.listCatalogs();
  const shouldBeDefault =
    existingCatalogs.length === 0 ? true : data.isDefault ?? false;
  const catalog = await catalogRepository.createCatalog({
    name: data.name,
    description: data.description ?? null,
    isDefault: shouldBeDefault,
    languageIds: normalizedLanguages.languageIds,
    defaultLanguageId: normalizedLanguages.defaultLanguageId,
    priceGroupIds: data.priceGroupIds ?? [],
    defaultPriceGroupId: data.defaultPriceGroupId ?? null,
  });
  return NextResponse.json(catalog);
}
