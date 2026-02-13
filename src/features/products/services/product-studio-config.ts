import 'server-only';

import { Prisma } from '@prisma/client';

import {
  DEFAULT_PRODUCT_STUDIO_SEQUENCING,
  normalizeProductStudioSequencing,
  type ProductStudioSequencingConfig,
} from '@/features/products/types/product-studio';
import { internalError } from '@/shared/errors/app-error';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

type SettingDocument = {
  _id?: string;
  key?: string;
  value?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ProductStudioConfig = {
  projectId: string | null;
  sourceSlotByImageIndex: Record<string, string>;
  sequencing: ProductStudioSequencingConfig;
  updatedAt: string;
};

type ProductStudioConfigInput = {
  projectId?: string | null | undefined;
  sourceSlotByImageIndex?: Record<string, string> | null | undefined;
  sequencing?: unknown;
};

const SETTINGS_COLLECTION = 'settings';
const PRODUCT_STUDIO_CONFIG_KEY_PREFIX = 'product_studio_config_';

const canUsePrismaSettings = (): boolean =>
  Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;

const isPrismaMissingTableError = (
  error: unknown
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === 'P2021' || error.code === 'P2022');

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

const createDefaultConfig = (): ProductStudioConfig => ({
  projectId: null,
  sourceSlotByImageIndex: {},
  sequencing: { ...DEFAULT_PRODUCT_STUDIO_SEQUENCING },
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
        typeof objectValue['projectId'] === 'string'
          ? objectValue['projectId']
          : null
      ),
      sourceSlotByImageIndex: normalizeSourceSlotByImageIndex(
        objectValue['sourceSlotByImageIndex'] as Record<string, unknown> | null
      ),
      sequencing: normalizeProductStudioSequencing(objectValue['sequencing']),
      updatedAt,
    };
  } catch {
    return createDefaultConfig();
  }
};

const toStorageValue = (config: ProductStudioConfig): string =>
  JSON.stringify({
    projectId: config.projectId,
    sourceSlotByImageIndex: config.sourceSlotByImageIndex,
    sequencing: config.sequencing,
    updatedAt: config.updatedAt,
  });

const buildConfigKey = (productId: string): string =>
  `${PRODUCT_STUDIO_CONFIG_KEY_PREFIX}${normalizeProductId(productId)}`;

const readPrismaSetting = async (key: string): Promise<string | null> => {
  if (!canUsePrismaSettings()) return null;
  try {
    const row = await prisma.setting.findUnique({
      where: { key },
      select: { value: true },
    });
    return row?.value ?? null;
  } catch (error) {
    if (isPrismaMissingTableError(error)) return null;
    throw error;
  }
};

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const row = await mongo
    .collection<SettingDocument>(SETTINGS_COLLECTION)
    .findOne(
      { $or: [{ key }, { _id: key }] },
      { projection: { value: 1 } }
    );

  return typeof row?.value === 'string' ? row.value : null;
};

const readSettingWithProviderFallback = async (
  key: string
): Promise<string | null> => {
  const provider = await getAppDbProvider();

  if (provider === 'mongodb') {
    const mongoValue = await readMongoSetting(key);
    if (mongoValue !== null) return mongoValue;
    return await readPrismaSetting(key);
  }

  const prismaValue = await readPrismaSetting(key);
  if (prismaValue !== null) return prismaValue;
  return await readMongoSetting(key);
};

const writePrismaSetting = async (key: string, value: string): Promise<void> => {
  if (!canUsePrismaSettings()) return;
  try {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  } catch (error) {
    if (isPrismaMissingTableError(error)) return;
    throw error;
  }
};

const writeMongoSetting = async (key: string, value: string): Promise<void> => {
  if (!process.env['MONGODB_URI']) return;
  const mongo = await getMongoDb();
  const now = new Date();
  await mongo.collection<SettingDocument>(SETTINGS_COLLECTION).updateOne(
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
  const tasks: Array<Promise<void>> = [];
  if (canUsePrismaSettings()) {
    tasks.push(writePrismaSetting(key, value));
  }
  if (process.env['MONGODB_URI']) {
    tasks.push(writeMongoSetting(key, value));
  }

  if (tasks.length === 0) {
    throw internalError('No database provider is available for product studio config.');
  }

  const results = await Promise.allSettled(tasks);
  if (results.some((result) => result.status === 'fulfilled')) return;

  const firstError = results.find((result) => result.status === 'rejected');
  if (firstError?.status === 'rejected') {
    throw firstError.reason;
  }

  throw internalError('Failed to persist product studio config.');
};

export async function getProductStudioConfig(
  productId: string
): Promise<ProductStudioConfig> {
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
    input.projectId !== undefined
      ? normalizeProjectId(input.projectId)
      : existing.projectId;
  const projectChanged = nextProjectId !== existing.projectId;

  const nextSourceSlotByImageIndex =
    input.sourceSlotByImageIndex !== undefined
      ? normalizeSourceSlotByImageIndex(input.sourceSlotByImageIndex)
      : projectChanged
        ? {}
        : existing.sourceSlotByImageIndex;
  const nextSequencing =
    input.sequencing !== undefined
      ? normalizeProductStudioSequencing(input.sequencing)
      : existing.sequencing;

  const next: ProductStudioConfig = {
    projectId: nextProjectId,
    sourceSlotByImageIndex: nextSourceSlotByImageIndex,
    sequencing: nextSequencing,
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

  const normalizedSlotId =
    typeof sourceSlotId === 'string' ? sourceSlotId.trim() : '';
  if (!normalizedSlotId) {
    delete nextSourceMap[String(normalizedIndex)];
  } else {
    nextSourceMap[String(normalizedIndex)] = normalizedSlotId;
  }

  return await setProductStudioConfig(productId, {
    sourceSlotByImageIndex: nextSourceMap,
  });
}
