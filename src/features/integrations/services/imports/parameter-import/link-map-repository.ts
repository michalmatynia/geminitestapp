import 'server-only';

import { ObjectId } from 'mongodb';

import { getProductDataProvider } from '@/shared/lib/products/services/product-provider';
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

type LinkScopeInput = {
  connectionId?: string | null;
  inventoryId?: string | null;
};

type ParameterLinkMap = Record<string, Record<string, Record<string, string>>>;

const SETTINGS_KEY = 'base_import_parameter_link_map';
const DEFAULT_SCOPE_KEY = '__global__';
const SCOPE_SEPARATOR = '::';

const toMongoId = (id: string): string | ObjectId => {
  if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
  return id;
};

const normalizeOptionalId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const buildScopeKey = (scope?: LinkScopeInput): string => {
  const connectionId = normalizeOptionalId(scope?.connectionId);
  const inventoryId = normalizeOptionalId(scope?.inventoryId);
  if (!connectionId || !inventoryId) return DEFAULT_SCOPE_KEY;
  return `${connectionId}${SCOPE_SEPARATOR}${inventoryId}`;
};

const normalizeLinkEntries = (raw: unknown): Record<string, string> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  return Object.entries(raw as Record<string, unknown>).reduce(
    (acc: Record<string, string>, [baseParameterId, parameterId]: [string, unknown]) => {
      const normalizedBase = baseParameterId.trim();
      const normalizedParameterId = normalizeOptionalId(parameterId);
      if (!normalizedBase || !normalizedParameterId) return acc;
      acc[normalizedBase] = normalizedParameterId;
      return acc;
    },
    {}
  );
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
      ([topLevelKey, topLevelValue]: [string, unknown]) => {
        const normalizedTopLevelKey = topLevelKey.trim();
        if (!normalizedTopLevelKey) return;
        if (!topLevelValue || typeof topLevelValue !== 'object' || Array.isArray(topLevelValue)) {
          return;
        }

        const topEntries = Object.entries(topLevelValue as Record<string, unknown>);

        const scopeBucket: Record<string, Record<string, string>> = {};
        topEntries.forEach(([catalogId, catalogLinksRaw]: [string, unknown]) => {
          const normalizedCatalogId = catalogId.trim();
          if (!normalizedCatalogId) return;
          const links = normalizeLinkEntries(catalogLinksRaw);
          if (Object.keys(links).length === 0) return;
          scopeBucket[normalizedCatalogId] = links;
        });
        if (Object.keys(scopeBucket).length > 0) {
          normalized[normalizedTopLevelKey] = scopeBucket;
        }
      }
    );

    return normalized;
  } catch {
    return {};
  }
};

const serializeLinkMap = (map: ParameterLinkMap): string => JSON.stringify(map);

export const getCatalogParameterLinks = async (input: {
  catalogId: string;
  connectionId?: string | null;
  inventoryId?: string | null;
}): Promise<Record<string, string>> => {
  const normalizedCatalogId = input.catalogId.trim();
  if (!normalizedCatalogId) return {};
  const all = parseLinkMap(await readSettingsValue());
  const scopeKey = buildScopeKey(input);
  const scopedLinks =
    all[scopeKey]?.[normalizedCatalogId] ??
    (scopeKey !== DEFAULT_SCOPE_KEY ? all[DEFAULT_SCOPE_KEY]?.[normalizedCatalogId] : undefined);
  return scopedLinks ?? {};
};

export const mergeCatalogParameterLinks = async (input: {
  catalogId: string;
  connectionId?: string | null;
  inventoryId?: string | null;
  links: Record<string, string>;
}): Promise<void> => {
  const normalizedCatalogId = input.catalogId.trim();
  if (!normalizedCatalogId) return;
  const nextEntries = normalizeLinkEntries(input.links);
  if (Object.keys(nextEntries).length === 0) return;

  const all = parseLinkMap(await readSettingsValue());
  const scopeKey = buildScopeKey(input);
  if (!all[scopeKey]) all[scopeKey] = {};
  const previous = all[scopeKey][normalizedCatalogId] ?? {};
  all[scopeKey][normalizedCatalogId] = { ...previous, ...nextEntries };
  await writeSettingsValue(serializeLinkMap(all));
};
