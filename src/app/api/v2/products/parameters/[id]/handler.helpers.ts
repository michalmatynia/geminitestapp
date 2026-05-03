import { z } from 'zod';

import type { ProductParameter, ProductParameterUpdateInput } from '@/shared/contracts/products/parameters';
import {
  PRODUCT_PARAMETER_LINKABLE_SELECTOR_TYPES,
  productParameterLinkedTitleTermTypeSchema,
  productParameterSelectorTypeSchema,
} from '@/shared/contracts/products/parameters';
import { conflictError } from '@/shared/errors/app-error';

const SELECTOR_TYPES_REQUIRING_OPTIONS: ReadonlySet<ProductParameter['selectorType']> = new Set([
  'radio',
  'select',
  'dropdown',
  'checklist',
] as const);
const LINKABLE_SELECTOR_TYPES: ReadonlySet<ProductParameter['selectorType']> = new Set(
  PRODUCT_PARAMETER_LINKABLE_SELECTOR_TYPES
);

export const productParameterUpdateSchema = z.object({
  name_en: z.string().min(1).optional(),
  name_pl: z.string().optional().nullable(),
  name_de: z.string().optional().nullable(),
  catalogId: z.string().min(1).optional(),
  selectorType: productParameterSelectorTypeSchema.optional(),
  optionLabels: z.array(z.string()).optional(),
  linkedTitleTermType: productParameterLinkedTitleTermTypeSchema.optional(),
});

export type ProductParameterUpdateBody = z.infer<typeof productParameterUpdateSchema>;

type ProductParameterSnapshot = Pick<
  ProductParameter,
  'id' | 'catalogId' | 'selectorType' | 'optionLabels' | 'linkedTitleTermType'
>;

export type ProductParameterNameLookupInput = {
  catalogId: string;
  nameEn: string;
};

export const normalizeOptionLabels = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const labels: string[] = [];

  input.forEach((entry: unknown) => {
    if (typeof entry !== 'string') return;

    const normalized = entry.trim();
    if (!normalized) return;

    const lookupKey = normalized.toLowerCase();
    if (seen.has(lookupKey)) return;

    seen.add(lookupKey);
    labels.push(normalized);
  });

  return labels;
};

const resolveNextSelectorType = (
  current: ProductParameterSnapshot,
  data: ProductParameterUpdateBody
): ProductParameter['selectorType'] => data.selectorType ?? current.selectorType;

const resolveNextOptionLabels = (
  current: ProductParameterSnapshot,
  data: ProductParameterUpdateBody
): string[] => (data.optionLabels !== undefined ? normalizeOptionLabels(data.optionLabels) : current.optionLabels);

const resolveNextLinkedTitleTermType = (
  current: ProductParameterSnapshot,
  data: ProductParameterUpdateBody
): ProductParameter['linkedTitleTermType'] =>
  data.linkedTitleTermType !== undefined ? data.linkedTitleTermType : current.linkedTitleTermType;

const assertSelectorTypeOptions = (
  selectorType: ProductParameter['selectorType'],
  optionLabels: string[],
  parameterId: string
): void => {
  if (!SELECTOR_TYPES_REQUIRING_OPTIONS.has(selectorType) || optionLabels.length > 0) return;

  throw conflictError('Selector type requires at least one option label.', {
    selectorType,
    parameterId,
  });
};

const assertLinkedTitleTermSupport = (
  selectorType: ProductParameter['selectorType'],
  linkedTitleTermType: ProductParameter['linkedTitleTermType'],
  parameterId: string
): void => {
  if (!linkedTitleTermType || LINKABLE_SELECTOR_TYPES.has(selectorType)) return;

  throw conflictError('Only text and textarea parameters can sync from English Title terms.', {
    selectorType,
    parameterId,
    linkedTitleTermType,
  });
};

export const buildProductParameterNameLookupInput = (
  current: ProductParameterSnapshot,
  data: ProductParameterUpdateBody
): ProductParameterNameLookupInput | null => {
  if (data.name_en === undefined) return null;

  return {
    catalogId: data.catalogId ?? current.catalogId,
    nameEn: data.name_en,
  };
};

export const assertAvailableProductParameterName = (
  existing: Pick<ProductParameter, 'id'> | null,
  parameterId: string,
  lookup: ProductParameterNameLookupInput
): void => {
  if (!existing || existing.id === parameterId) return;

  throw conflictError('A parameter with this name already exists in this catalog', {
    name_en: lookup.nameEn,
    catalogId: lookup.catalogId,
  });
};

export const buildProductParameterUpdateInput = (
  current: ProductParameterSnapshot,
  data: ProductParameterUpdateBody,
  parameterId: string
): ProductParameterUpdateInput => {
  const nextSelectorType = resolveNextSelectorType(current, data);
  const nextOptionLabels = resolveNextOptionLabels(current, data);
  const nextLinkedTitleTermType = resolveNextLinkedTitleTermType(current, data);

  assertSelectorTypeOptions(nextSelectorType, nextOptionLabels, parameterId);
  assertLinkedTitleTermSupport(nextSelectorType, nextLinkedTitleTermType, parameterId);

  return {
    ...(data.name_en !== undefined ? { name_en: data.name_en } : {}),
    ...(data.name_pl !== undefined ? { name_pl: data.name_pl } : {}),
    ...(data.name_de !== undefined ? { name_de: data.name_de } : {}),
    ...(data.selectorType !== undefined ? { selectorType: data.selectorType } : {}),
    ...(data.optionLabels !== undefined ? { optionLabels: nextOptionLabels } : {}),
    ...(data.linkedTitleTermType !== undefined
      ? { linkedTitleTermType: data.linkedTitleTermType }
      : {}),
  };
};
