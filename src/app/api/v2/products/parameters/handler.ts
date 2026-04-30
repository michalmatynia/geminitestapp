import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { CachedProductService } from '@/features/products/server';
import { getParameterRepository } from '@/features/products/server';
import {
  PRODUCT_PARAMETER_LINKABLE_SELECTOR_TYPES,
  productParameterLinkedTitleTermTypeSchema,
} from '@/shared/contracts/products/parameters';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { conflictError } from '@/shared/errors/app-error';
import { freshQuerySchema } from '@/shared/validations/product-metadata-api-schemas';

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

const normalizeOptionalParameterCatalogId = (value: unknown): unknown => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  const lowered = trimmed.toLowerCase();
  return lowered === 'undefined' || lowered === 'null' ? undefined : trimmed;
};

export const querySchema = z.object({
  catalogId: z.preprocess(
    normalizeOptionalParameterCatalogId,
    z.string().min(1).max(128).optional()
  ),
  fresh: freshQuerySchema.default(false),
});

const resolveParametersQueryInput = (
  req: Request,
  ctx: ApiHandlerContext
): Record<string, unknown> => ({
  ...Object.fromEntries(new URL(req.url).searchParams.entries()),
  ...((ctx.query ?? {}) as Record<string, unknown>),
});

const normalizeOptionLabels = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const labels: string[] = [];
  input.forEach((entry: unknown) => {
    if (typeof entry !== 'string') return;
    const normalized = entry.trim();
    const key = normalized.toLowerCase();
    if (normalized.length === 0 || seen.has(key)) return;
    seen.add(key);
    labels.push(normalized);
  });
  return labels;
};

export const productParameterCreateSchema = z
  .object({
    name_en: z.string().min(1, 'English name is required'),
    name_pl: z.string().optional().nullable(),
    name_de: z.string().optional().nullable(),
    catalogId: z.string().min(1, 'Catalog ID is required'),
    selectorType: selectorTypeSchema.default('text'),
    optionLabels: z.array(z.string()).optional().default([]),
    linkedTitleTermType: productParameterLinkedTitleTermTypeSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const normalizedOptionLabels = normalizeOptionLabels(value.optionLabels);
    if (
      SELECTOR_TYPES_REQUIRING_OPTIONS.has(value.selectorType) &&
      normalizedOptionLabels.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['optionLabels'],
        message: 'At least one option label is required for this selector type.',
      });
    }
    if (
      value.linkedTitleTermType !== null &&
      value.linkedTitleTermType !== undefined &&
      !LINKABLE_SELECTOR_TYPES.has(value.selectorType)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['linkedTitleTermType'],
        message: 'Only text and textarea parameters can sync from English Title terms.',
      });
    }
  });

/**
 * GET /api/v2/products/parameters
 * Fetches all product parameters (flat list).
 * Query params:
 * - catalogId: Filter by catalog (optional)
 */
export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = querySchema.parse(resolveParametersQueryInput(req, _ctx));
  const catalogId = query.catalogId ?? '';

  const forceFresh = query.fresh === true;
  const parameters = forceFresh || catalogId === ''
    ? await (async () => {
      const repository = await getParameterRepository();
      return repository.listParameters(catalogId === '' ? {} : { catalogId });
    })()
    : await CachedProductService.listParameters({ catalogId });

  return NextResponse.json(parameters);
}

/**
 * POST /api/v2/products/parameters
 * Creates a new product parameter.
 */
export async function postHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as z.infer<typeof productParameterCreateSchema>;
  const { catalogId } = data;
  const nameEn = data.name_en;

  const repository = await getParameterRepository();
  const existing = await repository.findByName(catalogId, nameEn);

  if (existing) {
    throw conflictError('A parameter with this name already exists in this catalog', {
      name_en: nameEn,
      catalogId,
    });
  }

  const parameter = await repository.createParameter({
    name: nameEn,
    name_en: nameEn,
    name_pl: data.name_pl ?? null,
    name_de: data.name_de ?? null,
    catalogId,
    selectorType: data.selectorType,
    optionLabels: normalizeOptionLabels(data.optionLabels),
    linkedTitleTermType: data.linkedTitleTermType ?? null,
  });

  CachedProductService.invalidateAll();

  return NextResponse.json(parameter, { status: 201 });
}
