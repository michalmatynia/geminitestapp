import 'server-only';

import { randomUUID } from 'crypto';

import type { ProductSimpleParameter } from '@/shared/contracts/products/parameters';
import type { MongoTimestampedStringSettingDocument } from '@/shared/contracts/settings';
import { conflictError, notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/product-mongo-client';
import { PRODUCT_SIMPLE_PARAMETERS_SETTING_KEY } from '@/shared/lib/products/constants';
import { getProductDataProvider } from '@/shared/lib/products/services/product-provider';

import type { Filter } from 'mongodb';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

type SimpleParameterCreateInput = {
  catalogId: string;
  name_en: string;
  name_pl?: string | null;
  name_de?: string | null;
};

type SimpleParameterUpdateInput = {
  catalogId?: string;
  name_en?: string;
  name_pl?: string | null;
  name_de?: string | null;
};

type ListSimpleParametersInput = { catalogId?: string | null; search?: string };

const SIMPLE_PARAMETER_TYPES = new Set<NonNullable<ProductSimpleParameter['type']>>([
  'text', 'textarea', 'radio', 'select', 'dropdown', 'checkbox', 'checklist',
]);
const LINKED_TITLE_TERM_TYPES = new Set(['size', 'material', 'theme']);

const toMongoSettingFilter = (key: string): Filter<MongoTimestampedStringSettingDocument> => ({
  $or: [{ _id: key }, { key }],
});

const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const toNullableTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeNameKey = (value: string): string => value.trim().toLowerCase();

const normalizeSimpleParameterType = (value: unknown): ProductSimpleParameter['type'] | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase() as NonNullable<ProductSimpleParameter['type']>;
  return SIMPLE_PARAMETER_TYPES.has(normalized) ? normalized : undefined;
};

const normalizeLinkedTitleTermType = (
  value: unknown
): ProductSimpleParameter['linkedTitleTermType'] | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  return LINKED_TITLE_TERM_TYPES.has(normalized)
    ? (normalized as ProductSimpleParameter['linkedTitleTermType'])
    : undefined;
};

const normalizeStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map((entry: unknown): string => toTrimmedString(entry))
    .filter((entry: string): boolean => entry.length > 0);
  return normalized.length > 0 ? normalized : undefined;
};

const resolveFallbackString = (value: unknown, fallback: string): string => {
  const normalized = toTrimmedString(value);
  return normalized.length > 0 ? normalized : fallback;
};

const buildOptionalParsedSimpleParameterFields = (
  record: Record<string, unknown>
): Partial<ProductSimpleParameter> => {
  const type = normalizeSimpleParameterType(record['type']);
  const options = normalizeStringArray(record['options']);
  const defaultValue = toTrimmedString(record['defaultValue']);
  const label = toTrimmedString(record['label']);
  const linkedTitleTermType = normalizeLinkedTitleTermType(record['linkedTitleTermType']);

  return {
    ...(label.length > 0 ? { label } : {}),
    ...(type !== undefined ? { type } : {}),
    ...(options !== undefined ? { options } : {}),
    ...(defaultValue.length > 0 ? { defaultValue } : {}),
    ...(linkedTitleTermType !== undefined ? { linkedTitleTermType } : {}),
  };
};

const buildParsedSimpleParameter = (
  record: Record<string, unknown>,
  nowIso: string
): ProductSimpleParameter | null => {
  const id = toTrimmedString(record['id']);
  const catalogId = toTrimmedString(record['catalogId']);
  const nameEn = toTrimmedString(record['name_en']);
  if (id.length === 0 || catalogId.length === 0 || nameEn.length === 0) return null;

  const createdAtRaw = toTrimmedString(record['createdAt']);
  const updatedAtRaw = toTrimmedString(record['updatedAt']);

  return {
    id,
    name: resolveFallbackString(record['name'], nameEn),
    catalogId,
    name_en: nameEn,
    name_pl: toNullableTrimmedString(record['name_pl']),
    name_de: toNullableTrimmedString(record['name_de']),
    ...buildOptionalParsedSimpleParameterFields(record),
    createdAt: createdAtRaw.length > 0 ? createdAtRaw : nowIso,
    updatedAt: updatedAtRaw.length > 0 ? updatedAtRaw : nowIso,
  };
};

const parseSimpleParameters = (value: string | null): ProductSimpleParameter[] => {
  if (value === null || value.length === 0) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.reduce((acc: ProductSimpleParameter[], entry: unknown) => {
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
        return acc;
      }
      const record = entry as Record<string, unknown>;
      const nowIso = new Date().toISOString();
      const parameter = buildParsedSimpleParameter(record, nowIso);
      if (parameter !== null) acc.push(parameter);
      return acc;
    }, []);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return [];
  }
};

const readSimpleParametersRaw = async (): Promise<string | null> => {
  await getProductDataProvider();
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoTimestampedStringSettingDocument>('settings')
    .findOne(toMongoSettingFilter(PRODUCT_SIMPLE_PARAMETERS_SETTING_KEY));
  return typeof doc?.value === 'string' ? doc.value : null;
};

const writeSimpleParametersRaw = async (value: string): Promise<void> => {
  await getProductDataProvider();
  const mongo = await getMongoDb();
  await mongo
    .collection<MongoTimestampedStringSettingDocument>('settings')
    .updateOne(
      toMongoSettingFilter(PRODUCT_SIMPLE_PARAMETERS_SETTING_KEY),
      {
        $set: {
          key: PRODUCT_SIMPLE_PARAMETERS_SETTING_KEY,
          value,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
};

const readSimpleParameters = async (): Promise<ProductSimpleParameter[]> =>
  parseSimpleParameters(await readSimpleParametersRaw());

const writeSimpleParameters = async (items: ProductSimpleParameter[]): Promise<void> =>
  await writeSimpleParametersRaw(JSON.stringify(items));

const sortSimpleParameters = (items: ProductSimpleParameter[]): ProductSimpleParameter[] =>
  [...items].sort((a: ProductSimpleParameter, b: ProductSimpleParameter) =>
    (a.name_en ?? '').localeCompare(b.name_en ?? '', undefined, { sensitivity: 'base' })
  );

export async function listSimpleParameters(
  input: ListSimpleParametersInput
): Promise<ProductSimpleParameter[]> {
  const catalogId = toTrimmedString(input.catalogId);
  const search = toTrimmedString(input.search).toLowerCase();

  const all = await readSimpleParameters();
  const filtered = all.filter((parameter: ProductSimpleParameter) => {
    if (catalogId.length > 0 && parameter.catalogId !== catalogId) return false;
    if (search.length === 0) return true;
    const values = [parameter.name_en ?? '', parameter.name_pl ?? '', parameter.name_de ?? ''];
    return values.some((value: string) => value.toLowerCase().includes(search));
  });
  return sortSimpleParameters(filtered);
}

export async function createSimpleParameter(
  input: SimpleParameterCreateInput
): Promise<ProductSimpleParameter> {
  const catalogId = toTrimmedString(input.catalogId);
  const nameEn = toTrimmedString(input.name_en);
  if (catalogId.length === 0 || nameEn.length === 0) {
    throw conflictError('Catalog and English name are required.');
  }

  const all = await readSimpleParameters();
  const duplicate = all.find(
    (item: ProductSimpleParameter): boolean =>
      item.catalogId === catalogId &&
      normalizeNameKey(item.name_en ?? '') === normalizeNameKey(nameEn)
  );
  if (duplicate !== undefined) {
    throw conflictError('A parameter with this name already exists in this catalog', {
      catalogId,
      name_en: nameEn,
    });
  }

  const now = new Date().toISOString();
  const created: ProductSimpleParameter = {
    id:
      typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : randomUUID(),
    name: nameEn,
    catalogId,
    name_en: nameEn,
    name_pl: toNullableTrimmedString(input.name_pl),
    name_de: toNullableTrimmedString(input.name_de),
    createdAt: now,
    updatedAt: now,
  };

  await writeSimpleParameters([...all, created]);
  return created;
}

const resolveUpdatedSimpleParameterText = (
  value: string | undefined,
  fallback: string | null | undefined
): string => {
  if (value === undefined) return fallback ?? '';
  return resolveFallbackString(value, fallback ?? '');
};

const findDuplicateSimpleParameter = (
  all: ProductSimpleParameter[],
  input: {
    catalogId: string;
    excludeId: string;
    nameEn: string;
  }
): ProductSimpleParameter | undefined =>
  all.find(
    (item: ProductSimpleParameter): boolean =>
      item.id !== input.excludeId &&
      item.catalogId === input.catalogId &&
      normalizeNameKey(item.name_en ?? '') === normalizeNameKey(input.nameEn)
  );

const buildUpdatedSimpleParameter = ({
  current,
  input,
  nextCatalogId,
  nextNameEn,
}: {
  current: ProductSimpleParameter;
  input: SimpleParameterUpdateInput;
  nextCatalogId: string;
  nextNameEn: string;
}): ProductSimpleParameter => ({
  ...current,
  catalogId: nextCatalogId,
  name_en: nextNameEn,
  ...(input.name_pl !== undefined ? { name_pl: toNullableTrimmedString(input.name_pl) } : {}),
  ...(input.name_de !== undefined ? { name_de: toNullableTrimmedString(input.name_de) } : {}),
  updatedAt: new Date().toISOString(),
});

export async function updateSimpleParameter(
  id: string,
  input: SimpleParameterUpdateInput
): Promise<ProductSimpleParameter> {
  const normalizedId = toTrimmedString(id);
  if (normalizedId.length === 0) {
    throw notFoundError('Parameter not found', { parameterId: id });
  }

  const all = await readSimpleParameters();
  const current = all.find((item: ProductSimpleParameter): boolean => item.id === normalizedId);
  if (current === undefined) {
    throw notFoundError('Parameter not found', { parameterId: normalizedId });
  }

  const nextCatalogId = resolveUpdatedSimpleParameterText(input.catalogId, current.catalogId);
  const nextNameEn = resolveUpdatedSimpleParameterText(input.name_en, current.name_en);

  const duplicate = findDuplicateSimpleParameter(all, {
    catalogId: nextCatalogId,
    excludeId: normalizedId,
    nameEn: nextNameEn,
  });
  if (duplicate !== undefined) {
    throw conflictError('A parameter with this name already exists in this catalog', {
      catalogId: nextCatalogId,
      name_en: nextNameEn,
    });
  }

  const updated = buildUpdatedSimpleParameter({ current, input, nextCatalogId, nextNameEn });

  const next = all.map((item: ProductSimpleParameter): ProductSimpleParameter =>
    item.id === normalizedId ? updated : item
  );
  await writeSimpleParameters(next);
  return updated;
}

export async function deleteSimpleParameter(id: string): Promise<void> {
  const normalizedId = toTrimmedString(id);
  if (normalizedId.length === 0) {
    throw notFoundError('Parameter not found', { parameterId: id });
  }

  const all = await readSimpleParameters();
  const exists = all.some((item: ProductSimpleParameter): boolean => item.id === normalizedId);
  if (exists === false) {
    throw notFoundError('Parameter not found', { parameterId: normalizedId });
  }

  const next = all.filter((item: ProductSimpleParameter): boolean => item.id !== normalizedId);
  await writeSimpleParameters(next);
}
