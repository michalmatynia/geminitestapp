

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  enforceAiPathsActionRateLimit,
  ensureAiPathsPermission,
  requireAiPathsAccessOrInternal,
} from '@/features/ai/ai-paths/server';
import { noteUpdateSchema } from '@/features/notesapp/public';
import { noteService } from '@/features/notesapp/server';
import { parseJsonBody } from '@/features/products/server';
import { productUpdateSchema } from '@/features/products/server';
import { getProductRepository } from '@/features/products/server';
import { getProductDataProvider } from '@/features/products/services/product-provider';
import type {
  ProductParameterValue,
  ProductSimpleParameterValue,
} from '@/features/products/types';
import {
  mergeProductParameterValues,
  splitProductParameterValues,
} from '@/features/products/utils/parameter-partition';
import { badRequestError, notFoundError, validationError } from '@/shared/errors/app-error';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import { NoteUpdateInput } from '@/shared/types/domain/notes';
import { removeUndefined } from '@/shared/utils';

const updateSchema = z.object({
  entityType: z.enum(['product', 'note', 'custom']),
  entityId: z.string().trim().optional(),
  updates: z.record(z.string(), z['unknown']()).optional(),
  mode: z.enum(['replace', 'append']).optional(),
});

const mergeAppendValue = (current: unknown, next: unknown): unknown => {
  if (next === undefined) return undefined;
  if (current === undefined || current === null) return next;
  if (Array.isArray(current)) {
    const currentArr = current as unknown[];
    if (Array.isArray(next)) {
      return [...currentArr, ...(next as unknown[])];
    }
    return [...currentArr, next];
  }
  if (typeof current === 'string' && typeof next === 'string') {
    if (!current) return next;
    if (!next) return current;
    return `${current}\n${next}`;
  }
  if (
    current &&
    typeof current === 'object' &&
    next &&
    typeof next === 'object' &&
    !Array.isArray(next)
  ) {
    return { ...(current as Record<string, unknown>), ...(next as Record<string, unknown>) };
  }
  return next;
};

const applyAppendMode = (
  updates: Record<string, unknown>,
  current: Record<string, unknown>
): Record<string, unknown> => {
  const next: Record<string, unknown> = {};
  Object.entries(updates).forEach(([key, value]: [string, unknown]) => {
    next[key] = mergeAppendValue(current[key], value);
  });
  return next;
};

const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeSimpleParameterUpdates = (
  value: unknown
): ProductSimpleParameterValue[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.reduce(
    (acc: ProductSimpleParameterValue[], entry: unknown) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return acc;
      }
      const record = entry as Record<string, unknown>;
      const parameterId =
        toTrimmedString(record['parameterId']) || toTrimmedString(record['id']);
      if (!parameterId || seen.has(parameterId)) return acc;
      const inferredValue = toTrimmedString(record['value']);
      if (!inferredValue) return acc;
      seen.add(parameterId);
      acc.push({
        parameterId,
        value: inferredValue,
      });
      return acc;
    },
    []
  );
};

const mergeSimpleParameterInferenceWithExisting = (args: {
  existingParameters: ProductParameterValue[] | null | undefined;
  inferredSimpleParameters: ProductSimpleParameterValue[];
}): ProductParameterValue[] => {
  const existingSplit = splitProductParameterValues(args.existingParameters ?? []);
  if (existingSplit.simpleParameterValues.length === 0) {
    return mergeProductParameterValues({
      customFieldValues: existingSplit.customFieldValues,
      simpleParameterValues: [],
    });
  }

  const nextSimpleValues = existingSplit.simpleParameterValues.map(
    (entry: ProductSimpleParameterValue): ProductSimpleParameterValue => ({
      parameterId: entry.parameterId,
      value: typeof entry.value === 'string' ? entry.value : '',
    })
  );
  const existingIndexById = new Map<string, number>();
  nextSimpleValues.forEach((entry: ProductSimpleParameterValue, index: number) => {
    const id = toTrimmedString(entry.parameterId);
    if (!id || existingIndexById.has(id)) return;
    existingIndexById.set(id, index);
  });

  args.inferredSimpleParameters.forEach((entry: ProductSimpleParameterValue) => {
    const parameterId = toTrimmedString(entry.parameterId);
    if (!parameterId) return;
    const existingIndex = existingIndexById.get(parameterId);
    if (existingIndex === undefined) return;
    const currentValue = toTrimmedString(nextSimpleValues[existingIndex]?.value);
    if (currentValue) return;
    nextSimpleValues[existingIndex] = {
      parameterId,
      value: toTrimmedString(entry.value),
    };
  });

  return mergeProductParameterValues({
    customFieldValues: existingSplit.customFieldValues,
    simpleParameterValues: nextSimpleValues,
  });
};

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { access, isInternal } = await requireAiPathsAccessOrInternal(req);
  if (!isInternal) {
    await enforceAiPathsActionRateLimit(access, 'entity-update');
  }
  const parsed = await parseJsonBody(req, updateSchema, {
    logPrefix: 'ai-paths.update',
  });
  if (!parsed.ok) return parsed.response;

  const data = parsed.data;
  const { entityType, entityId, updates, mode } = data;
  const normalizedUpdates =
    updates && typeof updates === 'object' ? updates : {};

  if (Object.keys(normalizedUpdates).length === 0) {
    throw badRequestError('No updates provided');
  }

  if (entityType !== 'custom' && !entityId?.trim()) {
    throw badRequestError('Entity id is required');
  }

  if (entityType === 'custom') {
    return NextResponse.json({
      ok: true,
      entityType,
      entityId: entityId ?? null,
      updates: normalizedUpdates,
      note: 'Custom entities are not persisted yet.',
    });
  }

  if (entityType === 'product') {
    ensureAiPathsPermission(access, 'products.manage', 'Forbidden.');
    const appProvider = await getAppDbProvider();
    const productProvider = await getProductDataProvider();
    if (appProvider === 'prisma' && productProvider === 'mongodb') {
      throw badRequestError(
        'Product updates are blocked: product_db_provider is MongoDB while app_db_provider is Prisma.'
      );
    }
    const productRepository = await getProductRepository();
    const existing =
      mode === 'append' ? await productRepository.getProductById(entityId as string) : null;
    if (mode === 'append' && !existing) {
      throw notFoundError('Product not found', { productId: entityId });
    }
    const prepared =
      mode === 'append' && existing
        ? applyAppendMode(normalizedUpdates, existing as unknown as Record<string, unknown>)
        : normalizedUpdates;
    const validated = productUpdateSchema.safeParse(prepared);
    if (!validated.success) {
      throw validationError('Invalid product update', {
        issues: validated.error.flatten(),
      });
    }
    let updateData = removeUndefined(validated.data);
    if (
      updateData.simpleParameters !== undefined &&
      updateData.parameters === undefined
    ) {
      const existingProduct =
        existing ?? await productRepository.getProductById(entityId as string);
      if (!existingProduct) {
        throw notFoundError('Product not found', { productId: entityId });
      }
      const inferredSimpleParameters = normalizeSimpleParameterUpdates(
        updateData.simpleParameters
      );
      const mergedParameters = mergeSimpleParameterInferenceWithExisting({
        existingParameters: Array.isArray(existingProduct.parameters)
          ? (existingProduct.parameters as ProductParameterValue[])
          : [],
        inferredSimpleParameters,
      });
      const { simpleParameters: _simpleParameters, ...rest } = updateData;
      updateData = {
        ...rest,
        parameters: mergedParameters,
      };
    }
    if (Object.keys(updateData).length === 0) {
      throw badRequestError('No valid product fields to update');
    }
    const updated = await productRepository.updateProduct(
      entityId as string,
      updateData
    );
    if (!updated) {
      throw notFoundError('Product not found', { productId: entityId });
    }
    return NextResponse.json({
      ok: true,
      entityType,
      entityId,
      updates: updateData,
    });
  }

  if (entityType === 'note') {
    ensureAiPathsPermission(access, 'notes.manage', 'Forbidden.');
    const existing =
      mode === 'append' ? await noteService.getById(entityId as string) : null;
    if (mode === 'append' && !existing) {
      throw notFoundError('Note not found', { noteId: entityId });
    }
    const prepared =
      mode === 'append' && existing
        ? applyAppendMode(normalizedUpdates, existing as unknown as Record<string, unknown>)
        : normalizedUpdates;
    const validated = noteUpdateSchema.safeParse(prepared);
    if (!validated.success) {
      throw validationError('Invalid note update', {
        issues: validated.error.flatten(),
      });
    }
    const updateData = removeUndefined(validated.data);
    if (Object.keys(updateData).length === 0) {
      throw badRequestError('No valid note fields to update');
    }
    const updated = await noteService.update(entityId as string, updateData as NoteUpdateInput);
    if (!updated) {
      throw notFoundError('Note not found', { noteId: entityId });
    }
    return NextResponse.json({
      ok: true,
      entityType,
      entityId,
      updates: updateData,
    });
  }

  throw badRequestError('Unsupported entity type');
}
