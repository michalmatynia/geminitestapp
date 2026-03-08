import { NextRequest, NextResponse } from 'next/server';

import { getCategoryRepository, getParameterRepository } from '@/features/products/server';
import type { ProductCategory, ProductParameter } from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import type { DescriptionContextQuery } from '@/shared/validations/product-metadata-api-schemas';

type DescriptionContextCategory = {
  id: string;
  name: string;
  name_en: string | null;
  name_pl: string | null;
  name_de: string | null;
  parentId: string | null;
  sortIndex: number | null;
};

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
  categories: DescriptionContextCategory[];
};

const buildEmptyPayload = (
  catalogId: string | null,
  categoryId: string | null
): DescriptionContextPayload => ({
  catalogId,
  categoryId,
  categoryName: null,
  parameters: [],
  categories: [],
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
  categories: DescriptionContextCategory[],
  categoryId: string
): string | null => {
  const match = categories.find(
    (category: DescriptionContextCategory): boolean => category.id === categoryId
  );
  if (!match) return null;
  const preferredName = [match.name_en, match.name, match.name_pl, match.name_de].find(
    (value: string | null): value is string => Boolean(value?.trim())
  );
  return preferredName?.trim() ?? null;
};

const toDescriptionContextCategory = (category: ProductCategory): DescriptionContextCategory => ({
  id: category.id,
  name: category.name,
  name_en: category.name_en ?? null,
  name_pl: category.name_pl ?? null,
  name_de: category.name_de ?? null,
  parentId: category.parentId,
  sortIndex: category.sortIndex ?? null,
});

export async function GET_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const query = ctx.query as DescriptionContextQuery | undefined;
  const catalogId = query?.catalogId ?? '';
  const categoryId = query?.categoryId ?? '';
  const includeCategories = query?.includeCategories ?? true;

  if (!catalogId) {
    return NextResponse.json(buildEmptyPayload(null, categoryId || null));
  }

  const parameterRepository = await getParameterRepository();
  const shouldFetchCategories = includeCategories || Boolean(categoryId);

  const [parameters, categories] = await Promise.all([
    parameterRepository.listParameters({ catalogId }),
    shouldFetchCategories
      ? (async (): Promise<DescriptionContextCategory[]> => {
        const categoryRepository = await getCategoryRepository();
        const categoryList = await categoryRepository.listCategories({ catalogId });
        return categoryList.map(toDescriptionContextCategory);
      })()
      : Promise.resolve<DescriptionContextCategory[]>([]),
  ]);

  const categoryName = categoryId ? resolveCategoryName(categories, categoryId) : null;

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
    categories: includeCategories ? categories : [],
  };

  return NextResponse.json(payload);
}
