import { type NextRequest, NextResponse } from 'next/server';
import { ObjectId, type UpdateFilter } from 'mongodb';
import { z } from 'zod';

import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

const PRODUCT_PARAMETER_BATCH_DELETE_MAX_IDS = 200;

const trimAndNormalizeParameterIds = (ids: unknown[]): string[] => {
  const normalized = ids
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);
  return Array.from(new Set(normalized));
};

export const batchDeleteParametersSchema = z.object({
  parameterIds: z
    .array(z.string().trim())
    .min(1, 'At least one parameter id is required')
    .max(
      PRODUCT_PARAMETER_BATCH_DELETE_MAX_IDS,
      `Cannot delete more than ${PRODUCT_PARAMETER_BATCH_DELETE_MAX_IDS} parameters at once`
    ),
});

const buildIdFilter = (id: string): { [key: string]: unknown }[] => {
  const filters: { [key: string]: unknown }[] = [
    { _id: id },
    { id },
  ];

  if (/^[0-9a-fA-F]{24}$/.test(id)) {
    filters.push({ _id: new ObjectId(id) });
  }

  return filters;
};

const buildParameterFilterFromIds = (ids: string[]): { $or: { [key: string]: unknown }[] } => {
  return {
    $or: ids.flatMap((id) => buildIdFilter(id)),
  };
};

const buildParameterIdInValues = (ids: string[]): Array<string | ObjectId> => {
  const values: Array<string | ObjectId> = [];
  const seen = new Set<string>();

  ids.forEach((id) => {
    const normalized = id.trim();
    if (!normalized) return;
    if (!seen.has(`s:${normalized}`)) {
      values.push(normalized);
      seen.add(`s:${normalized}`);
    }
    if (ObjectId.isValid(normalized) && !seen.has(`o:${normalized}`)) {
      values.push(new ObjectId(normalized));
      seen.add(`o:${normalized}`);
    }
  });

  return values;
};

type ProductParameterReferenceDocument = {
  parameters?: Array<{ parameterId?: string | ObjectId }>;
};

const buildRemoveParametersFromProductsUpdate = (
  parameterIdInValues: Array<string | ObjectId>
): UpdateFilter<ProductParameterReferenceDocument> => ({
  $pull: {
    parameters: {
      parameterId: { $in: parameterIdInValues },
    },
  },
});

/**
 * POST /api/v2/products/parameters/batch
 * Removes all selected product parameters, and strips each removed parameterId from
 * products and product_drafts.
 */
export async function postHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as z.infer<typeof batchDeleteParametersSchema>;
  const normalizedParameterIds = trimAndNormalizeParameterIds(body.parameterIds);

  if (normalizedParameterIds.length === 0) {
    throw badRequestError('At least one parameter id is required');
  }

  if (normalizedParameterIds.length > PRODUCT_PARAMETER_BATCH_DELETE_MAX_IDS) {
    throw badRequestError(
      `Cannot delete more than ${PRODUCT_PARAMETER_BATCH_DELETE_MAX_IDS} parameters at once`
    );
  }

  const db = await getMongoDb();
  const parameterFilter = buildParameterFilterFromIds(normalizedParameterIds);
  const parameterDocs = await db
    .collection('product_parameters')
    .find(parameterFilter)
    .project({ _id: true, id: true })
    .toArray();

  const canonicalParameterIds = Array.from(
    new Set(
      parameterDocs.map(
        (doc) => String((doc as { id?: string | null; _id: unknown }).id ?? doc['_id'])
      )
    )
  );

  if (canonicalParameterIds.length === 0) {
    throw notFoundError('No matching parameters found', {
      parameterIds: normalizedParameterIds,
    });
  }

  const deleteFilter = {
    $or: canonicalParameterIds.flatMap((id) => buildIdFilter(id)),
  };
  const parameterIdInValues = buildParameterIdInValues(canonicalParameterIds);
  const productsCollection = db.collection<ProductParameterReferenceDocument>('products');
  const productDraftsCollection =
    db.collection<ProductParameterReferenceDocument>('product_drafts');

  const removed = await db.collection('product_parameters').deleteMany(deleteFilter);
  const [productsResult, productDraftsResult] = await Promise.all([
    productsCollection.updateMany(
      { 'parameters.parameterId': { $in: parameterIdInValues } },
      buildRemoveParametersFromProductsUpdate(parameterIdInValues)
    ),
    productDraftsCollection.updateMany(
      { 'parameters.parameterId': { $in: parameterIdInValues } },
      buildRemoveParametersFromProductsUpdate(parameterIdInValues)
    ),
  ]);

  return NextResponse.json({
    status: 'ok',
    requested: normalizedParameterIds.length,
    found: canonicalParameterIds.length,
    deleted: removed.deletedCount ?? 0,
    removedProducts: productsResult.modifiedCount ?? 0,
    removedProductDrafts: productDraftsResult.modifiedCount ?? 0,
    invalidIds: normalizedParameterIds.filter(
      (id) =>
        !parameterDocs.some(
          (doc) => String((doc as { id?: string | null; _id: unknown }).id ?? doc['_id']) === id
        )
    ),
  });
}
