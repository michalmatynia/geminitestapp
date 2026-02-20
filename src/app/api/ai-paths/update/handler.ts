

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
} from '@/shared/contracts/products';
import { badRequestError, notFoundError, validationError } from '@/shared/errors/app-error';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { NoteUpdateInput } from '@/shared/contracts/notes';
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

const LEGACY_SIMPLE_PARAMETER_PREFIX = 'sp:';

const normalizeLegacySimpleParameterUpdates = (
  value: unknown
): ProductParameterValue[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.reduce(
    (acc: ProductParameterValue[], entry: unknown) => {
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

const decodeLegacySimpleParameterId = (parameterId: string): string => {
  const normalized = toTrimmedString(parameterId);
  if (!normalized) return '';
  if (!normalized.startsWith(LEGACY_SIMPLE_PARAMETER_PREFIX)) {
    return normalized;
  }
  return normalized.slice(LEGACY_SIMPLE_PARAMETER_PREFIX.length).trim();
};

const normalizeExistingParameterValues = (
  input: unknown
): ProductParameterValue[] => {
  if (!Array.isArray(input)) return [];
  return input.reduce(
    (acc: ProductParameterValue[], entry: unknown) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return acc;
      }
      const record = entry as Record<string, unknown>;
      const parameterId = toTrimmedString(record['parameterId']);
      if (!parameterId) return acc;
      const value = typeof record['value'] === 'string' ? record['value'] : '';
      const valuesByLanguage =
        record['valuesByLanguage'] &&
        typeof record['valuesByLanguage'] === 'object' &&
        !Array.isArray(record['valuesByLanguage'])
          ? (record['valuesByLanguage'] as Record<string, string>)
          : undefined;
      acc.push({
        parameterId,
        value,
        ...(valuesByLanguage ? { valuesByLanguage } : {}),
      });
      return acc;
    },
    []
  );
};

const mergeLegacySimpleParameterInferenceWithExisting = (args: {
  existingParameters: ProductParameterValue[];
  inferredSimpleParameters: ProductParameterValue[];
}): ProductParameterValue[] => {
  if (!Array.isArray(args.existingParameters) || args.existingParameters.length === 0) {
    return [];
  }
  if (!Array.isArray(args.inferredSimpleParameters) || args.inferredSimpleParameters.length === 0) {
    return args.existingParameters;
  }

  const inferredById = new Map<string, string>();
  args.inferredSimpleParameters.forEach((entry: ProductParameterValue) => {
    const decodedId = decodeLegacySimpleParameterId(entry.parameterId);
    const inferredValue = toTrimmedString(entry.value);
    if (!decodedId || !inferredValue || inferredById.has(decodedId)) return;
    inferredById.set(decodedId, inferredValue);
  });
  if (inferredById.size === 0) {
    return args.existingParameters;
  }

  return args.existingParameters.map((entry: ProductParameterValue) => {
    const currentValue = toTrimmedString(entry.value);
    if (currentValue) return entry;
    const decodedId = decodeLegacySimpleParameterId(entry.parameterId);
    if (!decodedId) return entry;
    const inferredValue = inferredById.get(decodedId);
    if (!inferredValue) return entry;
    return {
      ...entry,
      value: inferredValue,
    };
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
    const preparedRaw =
      mode === 'append' && existing
        ? applyAppendMode(normalizedUpdates, existing as unknown as Record<string, unknown>)
        : normalizedUpdates;
    const prepared = { ...preparedRaw } as Record<string, unknown>;
    if (prepared['parameters'] === undefined && prepared['simpleParameters'] !== undefined) {
      const existingProduct =
        existing ?? (await productRepository.getProductById(entityId as string));
      if (!existingProduct) {
        throw notFoundError('Product not found', { productId: entityId });
      }
      const inferredSimpleParameters = normalizeLegacySimpleParameterUpdates(
        prepared['simpleParameters']
      );
      prepared['parameters'] = mergeLegacySimpleParameterInferenceWithExisting({
        existingParameters: normalizeExistingParameterValues(existingProduct.parameters),
        inferredSimpleParameters,
      });
    }
    const validated = productUpdateSchema.safeParse(prepared);
    if (!validated.success) {
      throw validationError('Invalid product update', {
        issues: validated.error.flatten(),
      });
    }
    const updateData = removeUndefined(validated.data);
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
