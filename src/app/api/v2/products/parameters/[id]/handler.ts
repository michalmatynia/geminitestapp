import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { CachedProductService } from '@/features/products/server';
import { getParameterRepository } from '@/features/products/server';
import {
  PRODUCT_PARAMETER_LINKABLE_SELECTOR_TYPES,
  productParameterLinkedTitleTermTypeSchema,
} from '@/shared/contracts/products/parameters';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { conflictError, notFoundError } from '@/shared/errors/app-error';

const SELECTOR_TYPES = [
  'text',
  'textarea',
  'radio',
  'select',
  'dropdown',
  'checkbox',
  'checklist',
] as const;
const selectorTypeSchema = z.enum(SELECTOR_TYPES);
const SELECTOR_TYPES_REQUIRING_OPTIONS = new Set<(typeof SELECTOR_TYPES)[number]>([
  'radio',
  'select',
  'dropdown',
  'checklist',
]);
const LINKABLE_SELECTOR_TYPES = new Set<(typeof SELECTOR_TYPES)[number]>(
  PRODUCT_PARAMETER_LINKABLE_SELECTOR_TYPES
);

const normalizeOptionLabels = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const labels: string[] = [];
  input.forEach((entry: unknown) => {
    if (typeof entry !== 'string') return;
    const normalized = entry.trim();
    if (!normalized || seen.has(normalized.toLowerCase())) return;
    seen.add(normalized.toLowerCase());
    labels.push(normalized);
  });
  return labels;
};

export const productParameterUpdateSchema = z.object({
  name_en: z.string().min(1).optional(),
  name_pl: z.string().optional().nullable(),
  name_de: z.string().optional().nullable(),
  catalogId: z.string().min(1).optional(),
  selectorType: selectorTypeSchema.optional(),
  optionLabels: z.array(z.string()).optional(),
  linkedTitleTermType: productParameterLinkedTitleTermTypeSchema.optional(),
});

/**
 * PUT /api/v2/products/parameters/[id]
 * Updates a product parameter.
 */
export async function PUT_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;
  const data = ctx.body as z.infer<typeof productParameterUpdateSchema>;
  const { name_en, catalogId } = data;

  const repository = await getParameterRepository();
  const current = await repository.getParameterById(id);

  if (!current) {
    throw notFoundError('Parameter not found', { parameterId: id });
  }

  const nextCatalogId = catalogId ?? current.catalogId;
  const nextSelectorType = data.selectorType ?? current.selectorType;
  const nextOptionLabels =
    data.optionLabels !== undefined
      ? normalizeOptionLabels(data.optionLabels)
      : current.optionLabels;
  const nextLinkedTitleTermType =
    data.linkedTitleTermType !== undefined
      ? data.linkedTitleTermType
      : current.linkedTitleTermType ?? null;

  if (SELECTOR_TYPES_REQUIRING_OPTIONS.has(nextSelectorType) && nextOptionLabels.length === 0) {
    throw conflictError('Selector type requires at least one option label.', {
      selectorType: nextSelectorType,
      parameterId: id,
    });
  }
  if (nextLinkedTitleTermType && !LINKABLE_SELECTOR_TYPES.has(nextSelectorType)) {
    throw conflictError('Only text and textarea parameters can sync from English Title terms.', {
      selectorType: nextSelectorType,
      parameterId: id,
      linkedTitleTermType: nextLinkedTitleTermType,
    });
  }

  if (name_en !== undefined) {
    const existing = await repository.findByName(nextCatalogId, name_en);
    if (existing && existing.id !== id) {
      throw conflictError('A parameter with this name already exists in this catalog', {
        name_en,
        catalogId: nextCatalogId,
      });
    }
  }

  const parameter = await repository.updateParameter(id, {
    ...(data.name_en !== undefined && { name_en: data.name_en }),
    ...(data.name_pl !== undefined && { name_pl: data.name_pl }),
    ...(data.name_de !== undefined && { name_de: data.name_de }),
    ...(data.selectorType !== undefined && { selectorType: data.selectorType }),
    ...(data.optionLabels !== undefined && { optionLabels: nextOptionLabels }),
    ...(data.linkedTitleTermType !== undefined && {
      linkedTitleTermType: data.linkedTitleTermType,
    }),
  });

  CachedProductService.invalidateAll();

  return NextResponse.json(parameter);
}

/**
 * DELETE /api/v2/products/parameters/[id]
 * Deletes a product parameter.
 */
export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const repository = await getParameterRepository();
  const parameter = await repository.getParameterById(params.id);
  if (!parameter) {
    throw notFoundError('Parameter not found', { parameterId: params.id });
  }

  await repository.deleteParameter(parameter.id);
  const db = await getMongoDb();
  const parameterId = parameter.id;
  await Promise.all([
    db.collection('products').updateMany(
      { 'parameters.parameterId': parameterId },
      {
        $pull: {
          parameters: {
            parameterId,
          },
        },
      }
    ),
    db.collection('product_drafts').updateMany(
      { 'parameters.parameterId': parameterId },
      {
        $pull: {
          parameters: {
            parameterId,
          },
        },
      }
    ),
  ]);
  CachedProductService.invalidateAll();
  return NextResponse.json({ success: true });
}
