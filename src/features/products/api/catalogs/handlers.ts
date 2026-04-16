import { type AnyBulkWriteOperation, type Collection } from 'mongodb';
import { type NextRequest, NextResponse } from 'next/server';
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

function buildLanguageCodeMap(mongoLanguages: { id: string; code: string }[]): Map<string, string> {
  const languageCodeById = new Map<string, string>();
  mongoLanguages.forEach((language) => {
    if (typeof language.id === 'string' && language.id !== '') {
      languageCodeById.set(language.id, language.code);
    }
    if (typeof language.code === 'string' && language.code !== '') {
      languageCodeById.set(language.code, language.code);
    }
  });
  return languageCodeById;
}

function resolveNextDefaultLanguageId(catalog: CatalogRecord, languageCodeById: Map<string, string>): string | null {
  const current = catalog.defaultLanguageId;
  if (typeof current !== 'string' || current === '') return null;
  return languageCodeById.get(current) ?? current;
}

function hasLanguageIdsChanged(nextIds: string[], currentIds: string[]): boolean {
  if (nextIds.length !== currentIds.length) return true;
  return nextIds.some((id, index) => id !== currentIds[index]);
}

function buildCatalogUpdateOp(catalog: CatalogRecord, nextLanguageIds: string[], nextDefaultId: string | null): AnyBulkWriteOperation<{ _id: string; id: string }> {
  return {
    updateOne: {
      filter: { $or: [{ _id: catalog.id }, { id: catalog.id }] },
      update: {
        $set: {
          languageIds: nextLanguageIds,
          defaultLanguageId: nextDefaultId,
          updatedAt: new Date(),
        },
      },
    },
  };
}

async function normalizeMongoCatalogs(catalogs: CatalogRecord[]): Promise<CatalogRecord[]> {
  const mongo = await getMongoDb();
  const mongoLanguages = await mongo.collection<{ id: string; code: string }>('languages').find({}, { projection: { id: 1, code: 1 } }).toArray();
  const languageCodeById = buildLanguageCodeMap(mongoLanguages);

  const bulkOps: AnyBulkWriteOperation<{ _id: string; id: string }>[] = [];
  const updatedCatalogs = catalogs.map((catalog) => {
    const nextLanguageIds = catalog.languageIds.map((id) => languageCodeById.get(id) ?? id);
    const nextDefaultId = resolveNextDefaultLanguageId(catalog, languageCodeById);

    if (hasLanguageIdsChanged(nextLanguageIds, catalog.languageIds) || nextDefaultId !== catalog.defaultLanguageId) {
      bulkOps.push(buildCatalogUpdateOp(catalog, nextLanguageIds, nextDefaultId));
    }

    return { ...catalog, languageIds: nextLanguageIds, defaultLanguageId: nextDefaultId };
  });

  if (bulkOps.length > 0) {
    const collection = mongo.collection<{ _id: string; id: string }>('catalogs') as Collection<{ _id: string; id: string }>;
    await collection.bulkWrite(bulkOps);
  }
  return updatedCatalogs;
}

export async function getCatalogsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const provider = await getProductDataProvider();
  let catalogs = await (await getCatalogRepository(provider)).listCatalogs();

  if ((provider as string) === 'mongodb' && catalogs.length > 0) {
    try {
      catalogs = await normalizeMongoCatalogs(catalogs);
    } catch (error: unknown) {
      logClientError(error);
      await logSystemEvent({
        level: 'warn', message: 'Failed to normalize catalog language IDs',
        source: 'catalogs.GET', error, request: req, requestId: ctx.requestId,
        context: { provider },
      });
    }
  }
  return NextResponse.json(catalogs);
}

function validateLanguages(languages: { languageIds: string[], defaultLanguageId: string | null }): void {
  if (languages.languageIds.length === 0) {
    throw badRequestError('Select at least one language.', { field: 'languageIds' });
  }
  const def = languages.defaultLanguageId;
  if (typeof def !== 'string' || def === '' || !languages.languageIds.includes(def)) {
    throw badRequestError('Default language must be one of the selected languages.', { field: 'defaultLanguageId' });
  }
}

function validatePriceGroups(groups: { priceGroupIds: string[], defaultPriceGroupId: string | null }): void {
  if (groups.priceGroupIds.length === 0) {
    throw badRequestError('Select at least one price group.', { field: 'priceGroupIds' });
  }
  const def = groups.defaultPriceGroupId;
  if (typeof def !== 'string' || def === '' || !groups.priceGroupIds.includes(def)) {
    throw badRequestError('Default price group must be one of the selected price groups.', { field: 'defaultPriceGroupId' });
  }
}

export async function postCatalogsHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const parsed = await parseJsonBody(req, catalogSchema, { logPrefix: 'catalogs.POST' });
  if (!parsed.ok) return parsed.response;
  
  const data = parsed.data;
  const provider = await getProductDataProvider();
  
  const normLang = await normalizeCatalogLanguageSelection({ provider, languageIds: data.languageIds ?? [], defaultLanguageId: data.defaultLanguageId ?? null });
  validateLanguages(normLang);

  const normPrice = await normalizeCatalogPriceGroupSelection(provider, { priceGroupIds: data.priceGroupIds ?? [], defaultPriceGroupId: data.defaultPriceGroupId ?? null });
  validatePriceGroups(normPrice);

  const catalogRepository = await getCatalogRepository(provider);
  const existingCatalogs = await catalogRepository.listCatalogs();
  const shouldBeDefault = existingCatalogs.length === 0 || (data.isDefault === true);

  const catalog = await catalogRepository.createCatalog({
    name: data.name,
    description: data.description ?? null,
    isDefault: shouldBeDefault,
    languageIds: normLang.languageIds,
    defaultLanguageId: normLang.defaultLanguageId,
    priceGroupIds: normPrice.priceGroupIds,
    defaultPriceGroupId: normPrice.defaultPriceGroupId,
  });
  return NextResponse.json(catalog);
}
