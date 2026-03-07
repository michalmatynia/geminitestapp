import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { CachedProductService } from '@/features/products/server';
import { getParameterRepository } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, conflictError } from '@/shared/errors/app-error';
import type { CatalogIdQuery } from '@/shared/validations/product-metadata-api-schemas';

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

export const productParameterCreateSchema = z
  .object({
    name_en: z.string().min(1, 'English name is required'),
    name_pl: z.string().optional().nullable(),
    name_de: z.string().optional().nullable(),
    catalogId: z.string().min(1, 'Catalog ID is required'),
    selectorType: selectorTypeSchema.default('text'),
    optionLabels: z.array(z.string()).optional().default([]),
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
  });

/**
 * GET /api/v2/products/parameters
 * Fetches all product parameters (flat list).
 * Query params:
 * - catalogId: Filter by catalog (required)
 */
export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = _ctx.query as CatalogIdQuery | undefined;
  const catalogId =
    query?.catalogId ?? new URL(req.url).searchParams.get('catalogId')?.trim() ?? '';

  if (!catalogId) {
    throw badRequestError('catalogId query parameter is required');
  }

  const forceFresh = new URL(req.url).searchParams.get('fresh') === '1';
  const parameters = forceFresh
    ? await (async () => {
      const repository = await getParameterRepository();
      return repository.listParameters({ catalogId });
    })()
    : await CachedProductService.listParameters({ catalogId });

  return NextResponse.json(parameters);
}

/**
 * POST /api/v2/products/parameters
 * Creates a new product parameter.
 */
export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as z.infer<typeof productParameterCreateSchema>;
  const { name_en, catalogId } = data;

  const repository = await getParameterRepository();
  const existing = await repository.findByName(catalogId, name_en);

  if (existing) {
    throw conflictError('A parameter with this name already exists in this catalog', {
      name_en,
      catalogId,
    });
  }

  const parameter = await repository.createParameter({
    name: name_en,
    name_en,
    name_pl: data.name_pl ?? null,
    name_de: data.name_de ?? null,
    catalogId,
    selectorType: data.selectorType,
    optionLabels: normalizeOptionLabels(data.optionLabels),
  });

  CachedProductService.invalidateAll();

  return NextResponse.json(parameter, { status: 201 });
}
