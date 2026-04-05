import 'server-only';

import { randomUUID } from 'crypto';

import { PRODUCT_DRAFT_OPEN_FORM_TAB_OPTIONS } from '@/shared/contracts/products/drafts';
import { type ProductDraft, type CreateProductDraftInput, type UpdateProductDraftInput, type ProductDraftOpenFormTab, type ProductParameterValue } from '@/shared/contracts/products';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

type MongoDraftDoc = {
  _id: string;
  name?: string;
  description?: string | null;
  sku?: string | null;
  ean?: string | null;
  gtin?: string | null;
  asin?: string | null;
  name_en?: string | null;
  name_pl?: string | null;
  name_de?: string | null;
  description_en?: string | null;
  description_pl?: string | null;
  description_de?: string | null;
  weight?: number | null;
  sizeLength?: number | null;
  sizeWidth?: number | null;
  length?: number | null;
  price?: number | null;
  supplierName?: string | null;
  supplierLink?: string | null;
  priceComment?: string | null;
  stock?: number | null;
  catalogIds?: string[];
  categoryId?: string | null;
  tagIds?: string[];
  producerIds?: string[];
  parameters?: ProductParameterValue[];
  defaultPriceGroupId?: string | null;
  active?: boolean;
  validatorEnabled?: boolean;
  formatterEnabled?: boolean;
  icon?: string | null;
  iconColorMode?: 'theme' | 'custom' | null;
  iconColor?: string | null;
  openProductFormTab?: string | null;
  imageLinks?: string[];
  baseProductId?: string | null;
  importSource?: 'base' | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  value.forEach((entry: unknown) => {
    if (typeof entry !== 'string') return;
    const trimmed = entry.trim();
    if (!trimmed) return;
    unique.add(trimmed);
  });
  return Array.from(unique);
};

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const normalizeIconColorMode = (value: unknown): 'theme' | 'custom' =>
  value === 'custom' ? 'custom' : 'theme';

const normalizeIconColor = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!HEX_COLOR_PATTERN.test(trimmed)) return null;
  return trimmed.toLowerCase();
};

const openProductFormTabOptions = new Set<string>(PRODUCT_DRAFT_OPEN_FORM_TAB_OPTIONS);

const normalizeOpenProductFormTab = (value: unknown): ProductDraftOpenFormTab => {
  if (typeof value !== 'string') return 'general';
  const trimmed = value.trim();
  if (!openProductFormTabOptions.has(trimmed)) return 'general';
  return trimmed as ProductDraftOpenFormTab;
};

// MongoDB implementation
const listDrafts_Mongo = async (): Promise<ProductDraft[]> => {
  const mongo = await getMongoDb();
  const drafts = await mongo
    .collection<MongoDraftDoc>('product_drafts')
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return drafts.map((draft: MongoDraftDoc) => ({
    id: String(draft._id),
    name: draft.name || '',
    description: draft.description || null,
    sku: draft.sku || null,
    ean: draft.ean || null,
    gtin: draft.gtin || null,
    asin: draft.asin || null,
    name_en: draft.name_en || null,
    name_pl: draft.name_pl || null,
    name_de: draft.name_de || null,
    description_en: draft.description_en || null,
    description_pl: draft.description_pl || null,
    description_de: draft.description_de || null,
    weight: draft.weight || null,
    sizeLength: draft.sizeLength || null,
    sizeWidth: draft.sizeWidth || null,
    length: draft.length || null,
    price: draft.price || null,
    supplierName: draft.supplierName || null,
    supplierLink: draft.supplierLink || null,
    priceComment: draft.priceComment || null,
    stock: draft.stock || null,
    catalogIds: Array.isArray(draft.catalogIds) ? draft.catalogIds : [],
    categoryId: typeof draft.categoryId === 'string' ? draft.categoryId : null,
    tagIds: Array.isArray(draft.tagIds) ? draft.tagIds : [],
    producerIds: normalizeStringArray(draft.producerIds),
    parameters: Array.isArray(draft.parameters) ? draft.parameters : [],
    defaultPriceGroupId: draft.defaultPriceGroupId || null,
    active: draft.active ?? true,
    validatorEnabled: draft.validatorEnabled ?? true,
    formatterEnabled: draft.formatterEnabled ?? false,
    icon: draft.icon || null,
    iconColorMode: normalizeIconColorMode(draft.iconColorMode),
    iconColor: normalizeIconColor(draft.iconColor),
    openProductFormTab: normalizeOpenProductFormTab(draft.openProductFormTab),
    imageLinks: Array.isArray(draft.imageLinks) ? draft.imageLinks : [],
    baseProductId: draft.baseProductId || null,
    importSource: draft.importSource ?? null,
    createdAt: (draft.createdAt || new Date()).toISOString(),
    updatedAt: (draft.updatedAt || new Date()).toISOString(),
  }));
};

const getDraft_Mongo = async (id: string): Promise<ProductDraft | null> => {
  const mongo = await getMongoDb();
  const draft = await mongo.collection<MongoDraftDoc>('product_drafts').findOne({ _id: id });

  if (!draft) return null;

  return {
    id: String(draft._id),
    name: draft.name || '',
    description: draft.description || null,
    sku: draft.sku || null,
    ean: draft.ean || null,
    gtin: draft.gtin || null,
    asin: draft.asin || null,
    name_en: draft.name_en || null,
    name_pl: draft.name_pl || null,
    name_de: draft.name_de || null,
    description_en: draft.description_en || null,
    description_pl: draft.description_pl || null,
    description_de: draft.description_de || null,
    weight: draft.weight || null,
    sizeLength: draft.sizeLength || null,
    sizeWidth: draft.sizeWidth || null,
    length: draft.length || null,
    price: draft.price || null,
    supplierName: draft.supplierName || null,
    supplierLink: draft.supplierLink || null,
    priceComment: draft.priceComment || null,
    stock: draft.stock || null,
    catalogIds: Array.isArray(draft.catalogIds) ? draft.catalogIds : [],
    categoryId: typeof draft.categoryId === 'string' ? draft.categoryId : null,
    tagIds: Array.isArray(draft.tagIds) ? draft.tagIds : [],
    producerIds: normalizeStringArray(draft.producerIds),
    parameters: Array.isArray(draft.parameters) ? draft.parameters : [],
    defaultPriceGroupId: draft.defaultPriceGroupId || null,
    active: draft.active ?? true,
    validatorEnabled: draft.validatorEnabled ?? true,
    formatterEnabled: draft.formatterEnabled ?? false,
    icon: draft.icon || null,
    iconColorMode: normalizeIconColorMode(draft.iconColorMode),
    iconColor: normalizeIconColor(draft.iconColor),
    openProductFormTab: normalizeOpenProductFormTab(draft.openProductFormTab),
    imageLinks: Array.isArray(draft.imageLinks) ? draft.imageLinks : [],
    baseProductId: draft.baseProductId || null,
    importSource: draft.importSource ?? null,
    createdAt: (draft.createdAt || new Date()).toISOString(),
    updatedAt: (draft.updatedAt || new Date()).toISOString(),
  };
};

const createDraft_Mongo = async (input: CreateProductDraftInput): Promise<ProductDraft> => {
  const mongo = await getMongoDb();
  const now = new Date();
  const id = randomUUID();

  const draft: MongoDraftDoc = {
    _id: id,
    ...input,
    description: input.description || null,
    sku: input.sku || null,
    ean: input.ean || null,
    gtin: input.gtin || null,
    asin: input.asin || null,
    name_en: input.name_en || null,
    name_pl: input.name_pl || null,
    name_de: input.name_de || null,
    description_en: input.description_en || null,
    description_pl: input.description_pl || null,
    description_de: input.description_de || null,
    weight: input.weight || null,
    sizeLength: input.sizeLength || null,
    sizeWidth: input.sizeWidth || null,
    length: input.length || null,
    price: input.price || null,
    supplierName: input.supplierName || null,
    supplierLink: input.supplierLink || null,
    priceComment: input.priceComment || null,
    stock: input.stock || null,
    baseProductId: input.baseProductId || null,
    importSource: input.importSource ?? null,
    defaultPriceGroupId: input.defaultPriceGroupId || null,
    catalogIds: input.catalogIds || [],
    categoryId: input.categoryId || null,
    tagIds: input.tagIds || [],
    producerIds: normalizeStringArray(input.producerIds),
    parameters: input.parameters || [],
    validatorEnabled: input.validatorEnabled ?? true,
    formatterEnabled: input.formatterEnabled ?? false,
    icon: input.icon || null,
    iconColorMode: normalizeIconColorMode(input.iconColorMode),
    iconColor: normalizeIconColor(input.iconColor),
    openProductFormTab: normalizeOpenProductFormTab(input.openProductFormTab),
    imageLinks: input.imageLinks || [],
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };

  await mongo.collection<MongoDraftDoc>('product_drafts').insertOne(draft);

  return {
    id,
    name: input.name,
    description: input.description || null,
    sku: input.sku || null,
    ean: input.ean || null,
    gtin: input.gtin || null,
    asin: input.asin || null,
    name_en: input.name_en || null,
    name_pl: input.name_pl || null,
    name_de: input.name_de || null,
    description_en: input.description_en || null,
    description_pl: input.description_pl || null,
    description_de: input.description_de || null,
    weight: input.weight || null,
    sizeLength: input.sizeLength || null,
    sizeWidth: input.sizeWidth || null,
    length: input.length || null,
    price: input.price || null,
    supplierName: input.supplierName || null,
    supplierLink: input.supplierLink || null,
    priceComment: input.priceComment || null,
    stock: input.stock || null,
    catalogIds: draft.catalogIds || [],
    categoryId: draft.categoryId || null,
    tagIds: draft.tagIds || [],
    producerIds: normalizeStringArray(draft.producerIds),
    parameters: draft.parameters || [],
    defaultPriceGroupId: input.defaultPriceGroupId || null,
    active: draft.active ?? true,
    validatorEnabled: draft.validatorEnabled ?? true,
    formatterEnabled: draft.formatterEnabled ?? false,
    icon: draft.icon || null,
    iconColorMode: normalizeIconColorMode(draft.iconColorMode),
    iconColor: normalizeIconColor(draft.iconColor),
    openProductFormTab: normalizeOpenProductFormTab(draft.openProductFormTab),
    imageLinks: draft.imageLinks || [],
    baseProductId: input.baseProductId || null,
    importSource: input.importSource ?? null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
};

const updateDraft_Mongo = async (
  id: string,
  input: UpdateProductDraftInput
): Promise<ProductDraft | null> => {
  const mongo = await getMongoDb();
  const now = new Date();
  const updatePayload: Partial<MongoDraftDoc> = {};

  // Explicitly copy non-undefined values to satisfy exactOptionalPropertyTypes
  (Object.keys(input) as (keyof UpdateProductDraftInput)[]).forEach(
    (key: keyof UpdateProductDraftInput) => {
      const val = input[key];
      if (val !== undefined) {
        (updatePayload as Record<string, unknown>)[key] = val;
      }
    }
  );

  if ('categoryId' in input) {
    const normalized =
      typeof input.categoryId === 'string' && input.categoryId.trim()
        ? input.categoryId.trim()
        : null;
    updatePayload.categoryId = normalized;
  }

  if ('producerIds' in input) {
    updatePayload.producerIds = normalizeStringArray(input.producerIds);
  }

  if ('iconColorMode' in input) {
    updatePayload.iconColorMode = normalizeIconColorMode(input.iconColorMode);
  }

  if ('iconColor' in input) {
    updatePayload.iconColor = normalizeIconColor(input.iconColor);
  }

  if ('openProductFormTab' in input) {
    updatePayload.openProductFormTab = normalizeOpenProductFormTab(input.openProductFormTab);
  }

  const result = await mongo.collection<MongoDraftDoc>('product_drafts').findOneAndUpdate(
    { _id: id },
    {
      $set: {
        ...updatePayload,
        updatedAt: now,
      } as Partial<MongoDraftDoc>,
    },
    { returnDocument: 'after' }
  );

  if (!result) return null;

  // Handle different MongoDB driver versions
  const doc =
    typeof result === 'object' && 'value' in result
      ? (result.value as MongoDraftDoc | null)
      : (result as MongoDraftDoc | null);

  if (!doc) return null;

  return {
    id: String(doc._id),
    name: doc.name || '',
    description: doc.description || null,
    sku: doc.sku || null,
    ean: doc.ean || null,
    gtin: doc.gtin || null,
    asin: doc.asin || null,
    name_en: doc.name_en || null,
    name_pl: doc.name_pl || null,
    name_de: doc.name_de || null,
    description_en: doc.description_en || null,
    description_pl: doc.description_pl || null,
    description_de: doc.description_de || null,
    weight: doc.weight || null,
    sizeLength: doc.sizeLength || null,
    sizeWidth: doc.sizeWidth || null,
    length: doc.length || null,
    price: doc.price || null,
    supplierName: doc.supplierName || null,
    supplierLink: doc.supplierLink || null,
    priceComment: doc.priceComment || null,
    stock: doc.stock || null,
    catalogIds: Array.isArray(doc.catalogIds) ? doc.catalogIds : [],
    categoryId: typeof doc.categoryId === 'string' ? doc.categoryId : null,
    tagIds: Array.isArray(doc.tagIds) ? doc.tagIds : [],
    producerIds: normalizeStringArray(doc.producerIds),
    parameters: Array.isArray(doc.parameters) ? doc.parameters : [],
    defaultPriceGroupId: doc.defaultPriceGroupId || null,
    active: doc.active ?? true,
    validatorEnabled: doc.validatorEnabled ?? true,
    formatterEnabled: doc.formatterEnabled ?? false,
    icon: doc.icon || null,
    iconColorMode: normalizeIconColorMode(doc.iconColorMode),
    iconColor: normalizeIconColor(doc.iconColor),
    openProductFormTab: normalizeOpenProductFormTab(doc.openProductFormTab),
    imageLinks: Array.isArray(doc.imageLinks) ? doc.imageLinks : [],
    baseProductId: doc.baseProductId || null,
    importSource: doc.importSource ?? null,
    createdAt: (doc.createdAt || now).toISOString(),
    updatedAt: now.toISOString(),
  };
};

const deleteDraft_Mongo = async (id: string): Promise<boolean> => {
  const mongo = await getMongoDb();
  const result = await mongo.collection<MongoDraftDoc>('product_drafts').deleteOne({ _id: id });
  return result.deletedCount > 0;
};

// Public API
export const listDrafts = async (): Promise<ProductDraft[]> => listDrafts_Mongo();

export const getDraft = async (id: string): Promise<ProductDraft | null> => getDraft_Mongo(id);

export const createDraft = async (input: CreateProductDraftInput): Promise<ProductDraft> =>
  createDraft_Mongo(input);

export const updateDraft = async (
  id: string,
  input: UpdateProductDraftInput
): Promise<ProductDraft | null> => updateDraft_Mongo(id, input);

export const deleteDraft = async (id: string): Promise<boolean> => deleteDraft_Mongo(id);
