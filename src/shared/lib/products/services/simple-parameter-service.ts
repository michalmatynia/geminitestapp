import 'server-only';

import { randomUUID } from 'crypto';

import { PRODUCT_SIMPLE_PARAMETERS_SETTING_KEY } from '@/features/products/constants';
import { getProductDataProvider } from '@/shared/lib/products/services/product-provider';
import type { ProductSimpleParameter } from '@/shared/contracts/products';
import { conflictError, notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import type { Filter } from 'mongodb';

type MongoSettingDoc = {
  _id?: string;
  key?: string;
  value?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

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

type ListSimpleParametersInput = {
  catalogId: string;
  search?: string;
};

const toMongoSettingFilter = (key: string): Filter<MongoSettingDoc> => ({
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

const parseSimpleParameters = (value: string | null): ProductSimpleParameter[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.reduce((acc: ProductSimpleParameter[], entry: unknown) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return acc;
      }
      const record = entry as Record<string, unknown>;
      const id = toTrimmedString(record['id']);
      const catalogId = toTrimmedString(record['catalogId']);
      const nameEn = toTrimmedString(record['name_en']);
      if (!id || !catalogId || !nameEn) return acc;

      const createdAtRaw = toTrimmedString(record['createdAt']);
      const updatedAtRaw = toTrimmedString(record['updatedAt']);
      const nowIso = new Date().toISOString();

      acc.push({
        id,
        name: nameEn,
        catalogId,
        name_en: nameEn,
        name_pl: toNullableTrimmedString(record['name_pl']),
        name_de: toNullableTrimmedString(record['name_de']),
        createdAt: createdAtRaw || nowIso,
        updatedAt: updatedAtRaw || nowIso,
      });
      return acc;
    }, []);
  } catch {
    return [];
  }
};

const readSimpleParametersRaw = async (): Promise<string | null> => {
  const provider = await getProductDataProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<MongoSettingDoc>('settings')
      .findOne(toMongoSettingFilter(PRODUCT_SIMPLE_PARAMETERS_SETTING_KEY));
    return typeof doc?.value === 'string' ? doc.value : null;
  }

  const setting = await prisma.setting.findUnique({
    where: { key: PRODUCT_SIMPLE_PARAMETERS_SETTING_KEY },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const writeSimpleParametersRaw = async (value: string): Promise<void> => {
  const provider = await getProductDataProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    await mongo.collection<MongoSettingDoc>('settings').updateOne(
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
    return;
  }

  await prisma.setting.upsert({
    where: { key: PRODUCT_SIMPLE_PARAMETERS_SETTING_KEY },
    update: { value },
    create: {
      key: PRODUCT_SIMPLE_PARAMETERS_SETTING_KEY,
      value,
    },
  });
};

const readSimpleParameters = async (): Promise<ProductSimpleParameter[]> =>
  parseSimpleParameters(await readSimpleParametersRaw());

const writeSimpleParameters = async (items: ProductSimpleParameter[]): Promise<void> => {
  await writeSimpleParametersRaw(JSON.stringify(items));
};

const sortSimpleParameters = (items: ProductSimpleParameter[]): ProductSimpleParameter[] =>
  [...items].sort((a: ProductSimpleParameter, b: ProductSimpleParameter) =>
    a.name_en.localeCompare(b.name_en, undefined, { sensitivity: 'base' })
  );

export async function listSimpleParameters(
  input: ListSimpleParametersInput
): Promise<ProductSimpleParameter[]> {
  const catalogId = toTrimmedString(input.catalogId);
  if (!catalogId) return [];
  const search = toTrimmedString(input.search).toLowerCase();

  const all = await readSimpleParameters();
  const filtered = all.filter((parameter: ProductSimpleParameter) => {
    if (parameter.catalogId !== catalogId) return false;
    if (!search) return true;
    const values = [parameter.name_en, parameter.name_pl ?? '', parameter.name_de ?? ''];
    return values.some((value: string) => value.toLowerCase().includes(search));
  });
  return sortSimpleParameters(filtered);
}

export async function createSimpleParameter(
  input: SimpleParameterCreateInput
): Promise<ProductSimpleParameter> {
  const catalogId = toTrimmedString(input.catalogId);
  const nameEn = toTrimmedString(input.name_en);
  if (!catalogId || !nameEn) {
    throw conflictError('Catalog and English name are required.');
  }

  const all = await readSimpleParameters();
  const duplicate = all.find(
    (item: ProductSimpleParameter): boolean =>
      item.catalogId === catalogId && normalizeNameKey(item.name_en) === normalizeNameKey(nameEn)
  );
  if (duplicate) {
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

export async function updateSimpleParameter(
  id: string,
  input: SimpleParameterUpdateInput
): Promise<ProductSimpleParameter> {
  const normalizedId = toTrimmedString(id);
  if (!normalizedId) {
    throw notFoundError('Parameter not found', { parameterId: id });
  }

  const all = await readSimpleParameters();
  const current = all.find((item: ProductSimpleParameter): boolean => item.id === normalizedId);
  if (!current) {
    throw notFoundError('Parameter not found', { parameterId: normalizedId });
  }

  const nextCatalogId =
    input.catalogId !== undefined
      ? toTrimmedString(input.catalogId) || current.catalogId
      : current.catalogId;
  const nextNameEn =
    input.name_en !== undefined
      ? toTrimmedString(input.name_en) || current.name_en
      : current.name_en;

  const duplicate = all.find(
    (item: ProductSimpleParameter): boolean =>
      item.id !== normalizedId &&
      item.catalogId === nextCatalogId &&
      normalizeNameKey(item.name_en) === normalizeNameKey(nextNameEn)
  );
  if (duplicate) {
    throw conflictError('A parameter with this name already exists in this catalog', {
      catalogId: nextCatalogId,
      name_en: nextNameEn,
    });
  }

  const updated: ProductSimpleParameter = {
    ...current,
    catalogId: nextCatalogId,
    name_en: nextNameEn,
    ...(input.name_pl !== undefined ? { name_pl: toNullableTrimmedString(input.name_pl) } : {}),
    ...(input.name_de !== undefined ? { name_de: toNullableTrimmedString(input.name_de) } : {}),
    updatedAt: new Date().toISOString(),
  };

  const next = all.map(
    (item: ProductSimpleParameter): ProductSimpleParameter =>
      item.id === normalizedId ? updated : item
  );
  await writeSimpleParameters(next);
  return updated;
}

export async function deleteSimpleParameter(id: string): Promise<void> {
  const normalizedId = toTrimmedString(id);
  if (!normalizedId) {
    throw notFoundError('Parameter not found', { parameterId: id });
  }

  const all = await readSimpleParameters();
  const exists = all.some((item: ProductSimpleParameter): boolean => item.id === normalizedId);
  if (!exists) {
    throw notFoundError('Parameter not found', { parameterId: normalizedId });
  }

  const next = all.filter((item: ProductSimpleParameter): boolean => item.id !== normalizedId);
  await writeSimpleParameters(next);
}
