import { NextRequest, NextResponse } from 'next/server';

import { getParameterRepository } from '@/features/products/server';
import type { ProductParameterDto as ProductParameter } from '@/shared/contracts/products';
import { badRequestError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import type { CatalogIdQuery } from '@/shared/validations/product-metadata-api-schemas';

type PublicProductParameter = {
  id: string;
  name: string;
  name_en: string;
  name_pl: string | null;
  name_de: string | null;
  selectorType: ProductParameter['selectorType'];
  optionLabels: string[];
};

const normalizeOptionLabels = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const labels: string[] = [];
  input.forEach((entry: unknown) => {
    if (typeof entry !== 'string') return;
    const normalized = entry.trim();
    if (!normalized) return;
    const lower = normalized.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);
    labels.push(normalized);
  });
  return labels;
};

const toPublicProductParameter = (
  parameter: ProductParameter
): PublicProductParameter => ({
  id: parameter.id,
  name: parameter.name,
  name_en: parameter.name_en,
  name_pl: parameter.name_pl,
  name_de: parameter.name_de,
  selectorType: parameter.selectorType,
  optionLabels: normalizeOptionLabels(parameter.optionLabels),
});

/**
 * GET /api/public/products/parameters
 * Returns catalog-scoped product parameter metadata for public automation/runtime usage.
 */
export async function GET_handler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = ctx.query as CatalogIdQuery | undefined;
  const catalogId =
    query?.catalogId ??
    new URL(req.url).searchParams.get('catalogId')?.trim() ??
    '';

  if (!catalogId) {
    throw badRequestError('catalogId query parameter is required');
  }

  const repository = await getParameterRepository();
  const parameters = await repository.listParameters({ catalogId });

  return NextResponse.json(parameters.map(toPublicProductParameter));
}
