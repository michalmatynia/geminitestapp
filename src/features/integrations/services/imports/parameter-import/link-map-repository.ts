import 'server-only';

import { ObjectId } from 'mongodb';

import { getProductDataProvider } from '@/features/products/services/product-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import type { Filter } from 'mongodb';

type Provider = 'mongodb' | 'prisma';

type SettingDoc = {
  _id: string | ObjectId;
  key?: string;
  value?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

type ParameterLinkMap = Record<string, Record<string, string>>;

const SETTINGS_KEY = 'base_import_parameter_link_map';

const toMongoId = (id: string): string | ObjectId => {
  if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
  return id;
};

const resolveProvider = async (): Promise<Provider> => {
  const provider = await getProductDataProvider();
  return provider as Provider;
};

const readSettingsValue = async (): Promise<string | null> => {
  const provider = await resolveProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const doc = await mongo.collection<SettingDoc>('settings').findOne({
      $or: [{ _id: toMongoId(SETTINGS_KEY) }, { key: SETTINGS_KEY }],
    } as Filter<SettingDoc>);
    return typeof doc?.value === 'string' ? doc.value : null;
  }
  const row = await prisma.setting.findUnique({
    where: { key: SETTINGS_KEY },
    select: { value: true },
  });
  return row?.value ?? null;
};

const writeSettingsValue = async (value: string): Promise<void> => {
  const provider = await resolveProvider();
  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    await mongo.collection<SettingDoc>('settings').updateOne(
      { $or: [{ _id: toMongoId(SETTINGS_KEY) }, { key: SETTINGS_KEY }] } as Filter<SettingDoc>,
      {
        $set: {
          key: SETTINGS_KEY,
          value,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          _id: SETTINGS_KEY,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
    return;
  }
  await prisma.setting.upsert({
    where: { key: SETTINGS_KEY },
    update: { value },
    create: { key: SETTINGS_KEY, value },
  });
};

const parseLinkMap = (raw: string | null): ParameterLinkMap => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const normalized: ParameterLinkMap = {};
    Object.entries(parsed as Record<string, unknown>).forEach(
      ([catalogId, value]: [string, unknown]) => {
        const normalizedCatalogId = catalogId.trim();
        if (!normalizedCatalogId) return;
        if (!value || typeof value !== 'object' || Array.isArray(value)) return;
        const map: Record<string, string> = {};
        Object.entries(value as Record<string, unknown>).forEach(
          ([baseParameterId, parameterId]: [string, unknown]) => {
            const normalizedBaseId = baseParameterId.trim();
            const normalizedParameterId =
              typeof parameterId === 'string' ? parameterId.trim() : '';
            if (!normalizedBaseId || !normalizedParameterId) return;
            map[normalizedBaseId] = normalizedParameterId;
          }
        );
        normalized[normalizedCatalogId] = map;
      }
    );
    return normalized;
  } catch {
    return {};
  }
};

export const getCatalogParameterLinks = async (
  catalogId: string
): Promise<Record<string, string>> => {
  const normalizedCatalogId = catalogId.trim();
  if (!normalizedCatalogId) return {};
  const all = parseLinkMap(await readSettingsValue());
  return all[normalizedCatalogId] ?? {};
};

export const mergeCatalogParameterLinks = async (input: {
  catalogId: string;
  links: Record<string, string>;
}): Promise<void> => {
  const normalizedCatalogId = input.catalogId.trim();
  if (!normalizedCatalogId) return;
  const nextEntries = Object.entries(input.links).reduce(
    (acc: Record<string, string>, [baseParameterId, parameterId]: [string, string]) => {
      const normalizedBase = baseParameterId.trim();
      const normalizedParameterId = parameterId.trim();
      if (!normalizedBase || !normalizedParameterId) return acc;
      acc[normalizedBase] = normalizedParameterId;
      return acc;
    },
    {}
  );
  if (Object.keys(nextEntries).length === 0) return;
  const all = parseLinkMap(await readSettingsValue());
  const previous = all[normalizedCatalogId] ?? {};
  all[normalizedCatalogId] = { ...previous, ...nextEntries };
  await writeSettingsValue(JSON.stringify(all));
};
