import { NextRequest, NextResponse } from 'next/server';

import {
  getCategoryRepository,
  getParameterRepository,
} from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import type {
  ProductCategory,
  ProductParameter,
} from '@/shared/types/domain/products';

type DescriptionContextPayload = {
  catalogId: string | null;
  categoryId: string | null;
  categoryName: string | null;
  parameters: Array<{
    id: string;
    name_en: string;
    name_pl: string | null;
    name_de: string | null;
    selectorType: ProductParameter['selectorType'];
    optionLabels: string[];
  }>;
};

const normalizeQueryValue = (value: string | null): string => {
  const normalized = value?.trim() ?? '';
  if (!normalized) return '';
  const lowered = normalized.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null') return '';
  return normalized;
};

const buildEmptyPayload = (
  catalogId: string | null,
  categoryId: string | null
): DescriptionContextPayload => ({
  catalogId,
  categoryId,
  categoryName: null,
  parameters: [],
});

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

const resolveCategoryName = (
  categories: ProductCategory[],
  categoryId: string
): string | null => {
  const match = categories.find(
    (category: ProductCategory): boolean => category.id === categoryId
  );
  if (!match) return null;
  const preferredName = [
    typeof match.name_en === 'string' ? match.name_en : null,
    typeof match.name === 'string' ? match.name : null,
    typeof match.name_pl === 'string' ? match.name_pl : null,
    typeof match.name_de === 'string' ? match.name_de : null,
  ].find((value: string | null): value is string => Boolean(value?.trim()));
  return preferredName?.trim() ?? null;
};

export async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const catalogId = normalizeQueryValue(searchParams.get('catalogId'));
  const categoryId = normalizeQueryValue(searchParams.get('categoryId'));

  if (!catalogId) {
    return NextResponse.json(buildEmptyPayload(null, categoryId || null));
  }

  const parameterRepository = await getParameterRepository();
  const [parameters, categoryName] = await Promise.all([
    parameterRepository.listParameters({ catalogId }),
    categoryId
      ? (async (): Promise<string | null> => {
        const categoryRepository = await getCategoryRepository();
        const categories = await categoryRepository.listCategories({ catalogId });
        return resolveCategoryName(categories, categoryId);
      })()
      : Promise.resolve(null),
  ]);

  const payload: DescriptionContextPayload = {
    catalogId,
    categoryId: categoryId || null,
    categoryName,
    parameters: parameters.map(
      (parameter: ProductParameter): DescriptionContextPayload['parameters'][number] => ({
        id: parameter.id,
        name_en: parameter.name_en,
        name_pl: parameter.name_pl,
        name_de: parameter.name_de,
        selectorType: parameter.selectorType,
        optionLabels: normalizeOptionLabels(parameter.optionLabels),
      })
    ),
  };

  return NextResponse.json(payload);
}
