import 'server-only';


import type { ProductStudioConfig } from '@/shared/contracts/products/studio';
import type { MongoTimestampedStringSettingDocument } from '@/shared/contracts/settings';
import { internalError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


type ProductStudioConfigInput = {
  projectId?: string | null | undefined;
  sourceSlotByImageIndex?: Record<string, string> | null | undefined;
  sourceSlotHistoryByImageIndex?: Record<string, string[]> | null | undefined;
};

const SETTINGS_COLLECTION = 'settings';
const PRODUCT_STUDIO_CONFIG_KEY_PREFIX = 'product_studio_config_';

const normalizeProductId = (value: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw internalError('Product id is required for product studio config.');
  }
  return normalized;
};

const normalizeProjectId = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeSourceSlotByImageIndex = (
  input: Record<string, unknown> | null | undefined
): Record<string, string> => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};

  const next: Record<string, string> = {};
  for (const [rawIndex, rawSlotId] of Object.entries(input)) {
    const index = Number.parseInt(rawIndex, 10);
    if (!Number.isFinite(index) || index < 0) continue;
    if (typeof rawSlotId !== 'string') continue;
    const slotId = rawSlotId.trim();
    if (!slotId) continue;
    next[String(index)] = slotId;
  }

  return next;
};

const normalizeSourceSlotHistoryByImageIndex = (
  input: Record<string, unknown> | null | undefined
): Record<string, string[]> => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};

  const next: Record<string, string[]> = {};
  for (const [rawIndex, rawSlotIds] of Object.entries(input)) {
    const index = Number.parseInt(rawIndex, 10);
    if (!Number.isFinite(index) || index < 0) continue;
    if (!Array.isArray(rawSlotIds)) continue;
    const deduped = new Set<string>();
    rawSlotIds.forEach((rawSlotId: unknown) => {
      if (typeof rawSlotId !== 'string') return;
      const slotId = rawSlotId.trim();
      if (!slotId) return;
      deduped.add(slotId);
    });
    const ordered = Array.from(deduped);
    if (ordered.length > 0) {
      next[String(index)] = ordered;
    }
  }

  return next;
};

const createDefaultConfig = (): ProductStudioConfig => ({
  projectId: null,
  sourceSlotByImageIndex: {},
  sourceSlotHistoryByImageIndex: {},
  updatedAt: new Date().toISOString(),
});

const toConfig = (raw: string | null): ProductStudioConfig => {
  if (!raw) return createDefaultConfig();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return createDefaultConfig();
    }

    const objectValue = parsed as Record<string, unknown>;
    const updatedAtRaw = objectValue['updatedAt'];
    const updatedAt =
      typeof updatedAtRaw === 'string' && updatedAtRaw.trim()
        ? updatedAtRaw.trim()
        : new Date().toISOString();

    return {
      projectId: normalizeProjectId(
        typeof objectValue['projectId'] === 'string' ? objectValue['projectId'] : null
      ),
      sourceSlotByImageIndex: normalizeSourceSlotByImageIndex(
        objectValue['sourceSlotByImageIndex'] as Record<string, unknown> | null
      ),
      sourceSlotHistoryByImageIndex: normalizeSourceSlotHistoryByImageIndex(
        objectValue['sourceSlotHistoryByImageIndex'] as Record<string, unknown> | null
      ),
      updatedAt,
    };
  } catch (error) {
    void ErrorSystem.captureException(error);
    return createDefaultConfig();
  }
};

const toStorageValue = (config: ProductStudioConfig): string =>
  JSON.stringify({
    projectId: config.projectId,
    sourceSlotByImageIndex: config.sourceSlotByImageIndex,
    sourceSlotHistoryByImageIndex: config.sourceSlotHistoryByImageIndex,
    updatedAt: config.updatedAt,
  });

const buildConfigKey = (productId: string): string =>
  `${PRODUCT_STUDIO_CONFIG_KEY_PREFIX}${normalizeProductId(productId)}`;

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const row = await mongo
    .collection<MongoTimestampedStringSettingDocument>(SETTINGS_COLLECTION)
    .findOne({ $or: [{ key }, { _id: key }] }, { projection: { value: 1 } });

  return typeof row?.value === 'string' ? row.value : null;
};

const readSettingWithProviderFallback = async (key: string): Promise<string | null> => {
  return readMongoSetting(key);
};

const writeMongoSetting = async (key: string, value: string): Promise<void> => {
  if (!process.env['MONGODB_URI']) return;
  const mongo = await getMongoDb();
  const now = new Date();
  await mongo
    .collection<MongoTimestampedStringSettingDocument>(SETTINGS_COLLECTION)
    .updateOne(
      { key },
      {
        $set: {
          key,
          value,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );
};

const writeSetting = async (key: string, value: string): Promise<void> => {
  if (!process.env['MONGODB_URI']) {
    throw internalError('No database provider is available for product studio config.');
  }
  await writeMongoSetting(key, value);
};

const listMongoProductStudioConfigs = async (): Promise<Array<{ key: string; value: string }>> => {
  if (!process.env['MONGODB_URI']) return [];
  const mongo = await getMongoDb();
  const rows = await mongo
    .collection<MongoTimestampedStringSettingDocument>(SETTINGS_COLLECTION)
    .find(
      {
        $or: [
          { key: { $regex: `^${PRODUCT_STUDIO_CONFIG_KEY_PREFIX}` } },
          { _id: { $regex: `^${PRODUCT_STUDIO_CONFIG_KEY_PREFIX}` } },
        ],
      },
      {
        projection: {
          _id: 1,
          key: 1,
          value: 1,
        },
      }
    )
    .toArray();

  return rows
    .map((row) => {
      const keyCandidate =
        typeof row.key === 'string' ? row.key : typeof row._id === 'string' ? row._id : '';
      const key = keyCandidate.trim();
      if (!key.startsWith(PRODUCT_STUDIO_CONFIG_KEY_PREFIX)) return null;
      if (typeof row.value !== 'string') return null;
      return {
        key,
        value: row.value,
      };
    })
    .filter((entry): entry is { key: string; value: string } => Boolean(entry));
};

const listProductStudioConfigSettings = async (): Promise<
  Array<{ key: string; value: string }>
> => {
  return listMongoProductStudioConfigs();
};

export async function getProductStudioConfig(productId: string): Promise<ProductStudioConfig> {
  const key = buildConfigKey(productId);
  const raw = await readSettingWithProviderFallback(key);
  return toConfig(raw);
}

export async function setProductStudioConfig(
  productId: string,
  input: ProductStudioConfigInput
): Promise<ProductStudioConfig> {
  const key = buildConfigKey(productId);
  const existing = await getProductStudioConfig(productId);

  const nextProjectId =
    input.projectId !== undefined ? normalizeProjectId(input.projectId) : existing.projectId;
  const projectChanged = nextProjectId !== existing.projectId;

  const nextSourceSlotByImageIndex =
    input.sourceSlotByImageIndex !== undefined
      ? normalizeSourceSlotByImageIndex(input.sourceSlotByImageIndex)
      : projectChanged
        ? {}
        : existing.sourceSlotByImageIndex;
  const nextSourceSlotHistoryByImageIndex =
    input.sourceSlotHistoryByImageIndex !== undefined
      ? normalizeSourceSlotHistoryByImageIndex(input.sourceSlotHistoryByImageIndex)
      : projectChanged
        ? {}
        : existing.sourceSlotHistoryByImageIndex;

  const next: ProductStudioConfig = {
    projectId: nextProjectId,
    sourceSlotByImageIndex: nextSourceSlotByImageIndex,
    sourceSlotHistoryByImageIndex: nextSourceSlotHistoryByImageIndex,
    updatedAt: new Date().toISOString(),
  };

  await writeSetting(key, toStorageValue(next));
  return next;
}

export async function setProductStudioProject(
  productId: string,
  projectId: string | null | undefined
): Promise<ProductStudioConfig> {
  return await setProductStudioConfig(productId, { projectId });
}

export async function setProductStudioSourceSlot(
  productId: string,
  imageSlotIndex: number,
  sourceSlotId: string | null | undefined
): Promise<ProductStudioConfig> {
  const normalizedIndex = Number.isFinite(imageSlotIndex)
    ? Math.max(0, Math.floor(imageSlotIndex))
    : 0;
  const existing = await getProductStudioConfig(productId);

  const nextSourceMap: Record<string, string> = {
    ...existing.sourceSlotByImageIndex,
  };
  const nextSourceHistoryMap: Record<string, string[]> = {
    ...existing.sourceSlotHistoryByImageIndex,
  };

  const normalizedSlotId = typeof sourceSlotId === 'string' ? sourceSlotId.trim() : '';
  const historyKey = String(normalizedIndex);
  if (!normalizedSlotId) {
    delete nextSourceMap[historyKey];
    delete nextSourceHistoryMap[historyKey];
  } else {
    nextSourceMap[historyKey] = normalizedSlotId;
    const currentHistory = Array.isArray(nextSourceHistoryMap[historyKey])
      ? nextSourceHistoryMap[historyKey]
      : [];
    const deduped = [
      normalizedSlotId,
      ...currentHistory.filter((entry) => entry !== normalizedSlotId),
    ].slice(0, 50);
    nextSourceHistoryMap[historyKey] = deduped;
  }

  return await setProductStudioConfig(productId, {
    sourceSlotByImageIndex: nextSourceMap,
    sourceSlotHistoryByImageIndex: nextSourceHistoryMap,
  });
}

export type ProductStudioSourceSlotPruneResult = {
  projectId: string;
  deletedSlotIds: string[];
  touchedProducts: number;
  updatedProducts: string[];
};

export async function pruneProductStudioSourceSlotsForProject(params: {
  projectId: string;
  deletedSlotIds: string[];
}): Promise<ProductStudioSourceSlotPruneResult> {
  const normalizedProjectId = normalizeProjectId(params.projectId);
  if (!normalizedProjectId) {
    return {
      projectId: '',
      deletedSlotIds: [],
      touchedProducts: 0,
      updatedProducts: [],
    };
  }

  const deletedSlotIdSet = new Set(
    (Array.isArray(params.deletedSlotIds) ? params.deletedSlotIds : [])
      .filter((value): value is string => typeof value === 'string')
      .map((value: string) => value.trim())
      .filter(Boolean)
  );
  if (deletedSlotIdSet.size === 0) {
    return {
      projectId: normalizedProjectId,
      deletedSlotIds: [],
      touchedProducts: 0,
      updatedProducts: [],
    };
  }

  const settings = await listProductStudioConfigSettings();
  const updatedProducts: string[] = [];

  for (const setting of settings) {
    const productId = setting.key.startsWith(PRODUCT_STUDIO_CONFIG_KEY_PREFIX)
      ? setting.key.slice(PRODUCT_STUDIO_CONFIG_KEY_PREFIX.length)
      : '';
    if (!productId) continue;

    const config = toConfig(setting.value);
    if (normalizeProjectId(config.projectId) !== normalizedProjectId) continue;

    let changed = false;
    const nextSourceByIndex: Record<string, string> = {};
    Object.entries(config.sourceSlotByImageIndex).forEach(([index, slotId]) => {
      const normalizedSlotId = slotId.trim();
      if (!normalizedSlotId || deletedSlotIdSet.has(normalizedSlotId)) {
        changed = true;
        return;
      }
      nextSourceByIndex[index] = normalizedSlotId;
    });

    const nextHistoryByIndex: Record<string, string[]> = {};
    Object.entries(config.sourceSlotHistoryByImageIndex).forEach(([index, slotIds]) => {
      const filtered = slotIds
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && !deletedSlotIdSet.has(value));
      if (filtered.length !== slotIds.length) {
        changed = true;
      }
      if (filtered.length > 0) {
        nextHistoryByIndex[index] = filtered;
      } else if (slotIds.length > 0) {
        changed = true;
      }
    });

    if (!changed) continue;

    const nextConfig: ProductStudioConfig = {
      ...config,
      sourceSlotByImageIndex: nextSourceByIndex,
      sourceSlotHistoryByImageIndex: nextHistoryByIndex,
      updatedAt: new Date().toISOString(),
    };
    await writeSetting(setting.key, toStorageValue(nextConfig));
    updatedProducts.push(productId);
  }

  return {
    projectId: normalizedProjectId,
    deletedSlotIds: Array.from(deletedSlotIdSet),
    touchedProducts: updatedProducts.length,
    updatedProducts,
  };
}
