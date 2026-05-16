import 'server-only';

import { randomUUID } from 'crypto';

import { ObjectId, type Filter } from 'mongodb';

import {
  PRODUCT_DRAFT_KIND_OPTIONS,
  PRODUCT_DRAFT_OPEN_FORM_TAB_OPTIONS,
} from '@/shared/contracts/products/drafts';
import { type ProductDraft, type CreateProductDraftInput, type UpdateProductDraftInput, type ProductDraftKind, type ProductDraftOpenFormTab } from '@/shared/contracts/products';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { MongoDraftDoc } from './draft-repository.types';

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  value.forEach((entry: unknown) => {
    if (typeof entry !== 'string') return;
    const trimmed = entry.trim();
    if (trimmed === '') return;
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
  if (HEX_COLOR_PATTERN.test(trimmed) === false) return null;
  return trimmed.toLowerCase();
};

const openProductFormTabOptions = new Set<string>(PRODUCT_DRAFT_OPEN_FORM_TAB_OPTIONS);
const draftKindOptions = new Set<string>(PRODUCT_DRAFT_KIND_OPTIONS);

const normalizeDraftKind = (value: unknown): ProductDraftKind => {
  if (typeof value !== 'string') return 'standard';
  const trimmed = value.trim();
  if (draftKindOptions.has(trimmed) === false) return 'standard';
  return trimmed as ProductDraftKind;
};

const normalizeNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeOpenProductFormTab = (value: unknown): ProductDraftOpenFormTab => {
  if (typeof value !== 'string') return 'general';
  const trimmed = value.trim();
  if (openProductFormTabOptions.has(trimmed) === false) return 'general';
  return trimmed as ProductDraftOpenFormTab;
};

const MONGO_OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

const buildDraftIdFilter = (id: string): Filter<MongoDraftDoc> => {
  const trimmed = id.trim();
  const stringMongoIdFilter: Filter<MongoDraftDoc> = { _id: trimmed };
  const domainIdFilter: Filter<MongoDraftDoc> = { id: trimmed };
  const filters: Filter<MongoDraftDoc>[] = [stringMongoIdFilter, domainIdFilter];

  if (MONGO_OBJECT_ID_PATTERN.test(trimmed) && ObjectId.isValid(trimmed)) {
    const objectIdFilter: Filter<MongoDraftDoc> = { _id: new ObjectId(trimmed) };
    filters.push(objectIdFilter);
  }

  return { $or: filters };
};

const nullable = <T,>(value: T | null | undefined): T | null => value ?? null;
const optionalArray = <T,>(value: T[] | undefined): T[] => value ?? [];
const docDateIso = (value: Date | undefined): string => (value ?? new Date()).toISOString();

const mapMongoDocLocalization = (doc: MongoDraftDoc): Partial<ProductDraft> => ({
  name_en: doc.name_en ?? null,
  name_pl: doc.name_pl ?? null,
  name_de: doc.name_de ?? null,
  description_en: doc.description_en ?? null,
  description_pl: doc.description_pl ?? null,
  description_de: doc.description_de ?? null,
});

const mapMongoDocPhysical = (doc: MongoDraftDoc): Partial<ProductDraft> => ({
  weight: doc.weight ?? null,
  sizeLength: doc.sizeLength ?? null,
  sizeWidth: doc.sizeWidth ?? null,
  length: doc.length ?? null,
});

const mapMongoDocSupplier = (doc: MongoDraftDoc): Partial<ProductDraft> => ({
  price: doc.price ?? null,
  supplierName: doc.supplierName ?? null,
  supplierLink: doc.supplierLink ?? null,
  priceComment: doc.priceComment ?? null,
  stock: doc.stock ?? null,
});

const mapMongoDocIdentity = (
  doc: MongoDraftDoc
): Pick<ProductDraft, 'id' | 'name' | 'draftKind' | 'scrapeProfileId' | 'description'> => ({
  id: String(doc.id ?? doc._id),
  name: doc.name ?? '',
  draftKind: normalizeDraftKind(doc.draftKind),
  scrapeProfileId: normalizeNullableString(doc.scrapeProfileId),
  description: nullable(doc.description),
});

const mapMongoDocIdentifiers = (doc: MongoDraftDoc): Partial<ProductDraft> => ({
  sku: nullable(doc.sku),
  ean: nullable(doc.ean),
  gtin: nullable(doc.gtin),
  asin: nullable(doc.asin),
  defaultPriceGroupId: nullable(doc.defaultPriceGroupId),
});

const mapMongoDocRelations = (doc: MongoDraftDoc): Partial<ProductDraft> => ({
  catalogIds: optionalArray(doc.catalogIds),
  categoryId: typeof doc.categoryId === 'string' ? doc.categoryId : null,
  tagIds: optionalArray(doc.tagIds),
  producerIds: normalizeStringArray(doc.producerIds),
  parameters: optionalArray(doc.parameters),
});

const mapMongoDocSettings = (doc: MongoDraftDoc): Partial<ProductDraft> => ({
  active: doc.active ?? true,
  validatorEnabled: doc.validatorEnabled ?? true,
  formatterEnabled: doc.formatterEnabled ?? false,
  icon: nullable(doc.icon),
  iconColorMode: normalizeIconColorMode(doc.iconColorMode),
  iconColor: normalizeIconColor(doc.iconColor),
  openProductFormTab: normalizeOpenProductFormTab(doc.openProductFormTab),
});

const mapMongoDocAssets = (doc: MongoDraftDoc): Partial<ProductDraft> => ({
  imageLinks: optionalArray(doc.imageLinks),
  baseProductId: nullable(doc.baseProductId),
  importSource: nullable(doc.importSource),
  createdAt: docDateIso(doc.createdAt),
  updatedAt: docDateIso(doc.updatedAt),
});

const mapMongoDocToDraft = (doc: MongoDraftDoc): ProductDraft => {
  const draft: ProductDraft = {
    ...mapMongoDocIdentity(doc),
    ...mapMongoDocIdentifiers(doc),
    ...mapMongoDocLocalization(doc),
    ...mapMongoDocPhysical(doc),
    ...mapMongoDocSupplier(doc),
    ...mapMongoDocRelations(doc),
    ...mapMongoDocSettings(doc),
    ...mapMongoDocAssets(doc),
  };
  return draft;
};

const listDraftsMongo = async (): Promise<ProductDraft[]> => {
  const mongo = await getMongoDb();
  const drafts = await mongo
    .collection<MongoDraftDoc>('product_drafts')
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return drafts.map(mapMongoDocToDraft);
};

const getDraftMongo = async (id: string): Promise<ProductDraft | null> => {
  const mongo = await getMongoDb();
  const draft = await mongo
    .collection<MongoDraftDoc>('product_drafts')
    .findOne(buildDraftIdFilter(id));

  if (draft === null) return null;
  return mapMongoDocToDraft(draft);
};

const buildCreateDraftDocLocalization = (input: CreateProductDraftInput): Partial<MongoDraftDoc> => ({
  name_en: input.name_en ?? null,
  name_pl: input.name_pl ?? null,
  name_de: input.name_de ?? null,
  description_en: input.description_en ?? null,
  description_pl: input.description_pl ?? null,
  description_de: input.description_de ?? null,
});

const buildCreateDraftDocPhysical = (input: CreateProductDraftInput): Partial<MongoDraftDoc> => ({
  weight: input.weight ?? null,
  sizeLength: input.sizeLength ?? null,
  sizeWidth: input.sizeWidth ?? null,
  length: input.length ?? null,
});

const buildCreateDraftDocSupplier = (input: CreateProductDraftInput): Partial<MongoDraftDoc> => ({
  price: input.price ?? null,
  supplierName: input.supplierName ?? null,
  supplierLink: input.supplierLink ?? null,
  priceComment: input.priceComment ?? null,
  stock: input.stock ?? null,
});

const buildCreateDraftDocIdentity = (
  input: CreateProductDraftInput,
  id: string
): Partial<MongoDraftDoc> => ({
  _id: id,
  ...input,
  draftKind: normalizeDraftKind(input.draftKind),
  scrapeProfileId: normalizeNullableString(input.scrapeProfileId),
  description: nullable(input.description),
});

const buildCreateDraftDocIdentifiers = (input: CreateProductDraftInput): Partial<MongoDraftDoc> => ({
  sku: nullable(input.sku),
  ean: nullable(input.ean),
  gtin: nullable(input.gtin),
  asin: nullable(input.asin),
  defaultPriceGroupId: nullable(input.defaultPriceGroupId),
});

const buildCreateDraftDocRelations = (input: CreateProductDraftInput): Partial<MongoDraftDoc> => ({
  catalogIds: optionalArray(input.catalogIds),
  categoryId: nullable(input.categoryId),
  tagIds: optionalArray(input.tagIds),
  producerIds: normalizeStringArray(input.producerIds),
  parameters: optionalArray(input.parameters),
});

const buildCreateDraftDocSettings = (input: CreateProductDraftInput): Partial<MongoDraftDoc> => ({
  validatorEnabled: input.validatorEnabled ?? true,
  formatterEnabled: input.formatterEnabled ?? false,
  icon: nullable(input.icon),
  iconColorMode: normalizeIconColorMode(input.iconColorMode),
  iconColor: normalizeIconColor(input.iconColor),
  openProductFormTab: normalizeOpenProductFormTab(input.openProductFormTab),
});

const buildCreateDraftDoc = (input: CreateProductDraftInput, id: string, now: Date): MongoDraftDoc => {
  const draft: MongoDraftDoc = {
    ...buildCreateDraftDocIdentity(input, id),
    ...buildCreateDraftDocIdentifiers(input),
    ...buildCreateDraftDocLocalization(input),
    ...buildCreateDraftDocPhysical(input),
    ...buildCreateDraftDocSupplier(input),
    ...buildCreateDraftDocRelations(input),
    ...buildCreateDraftDocSettings(input),
    baseProductId: nullable(input.baseProductId),
    importSource: nullable(input.importSource),
    imageLinks: optionalArray(input.imageLinks),
    _id: id,
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  return draft;
};

const createDraftMongo = async (input: CreateProductDraftInput): Promise<ProductDraft> => {
  const mongo = await getMongoDb();
  const now = new Date();
  const id = randomUUID();
  const draft = buildCreateDraftDoc(input, id, now);

  await mongo.collection<MongoDraftDoc>('product_drafts').insertOne(draft);
  return mapMongoDocToDraft(draft);
};

const normalizeUpdateCategoryId = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const updatePayloadTransforms: Partial<
  Record<keyof UpdateProductDraftInput, (value: unknown) => unknown>
> = {
  categoryId: normalizeUpdateCategoryId,
  draftKind: normalizeDraftKind,
  scrapeProfileId: normalizeNullableString,
  producerIds: normalizeStringArray,
  iconColorMode: normalizeIconColorMode,
  iconColor: normalizeIconColor,
  openProductFormTab: normalizeOpenProductFormTab,
};

const getUpdatePayload = (
  input: UpdateProductDraftInput
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  const keys = Object.keys(input) as (keyof UpdateProductDraftInput)[];
  keys.forEach((key) => {
    const val = input[key];
    const transform = updatePayloadTransforms[key];
    if (val !== undefined) payload[key] = transform !== undefined ? transform(val) : val;
  });
  return payload;
};

const updateDraftMongo = async (
  id: string,
  input: UpdateProductDraftInput
): Promise<ProductDraft | null> => {
  const mongo = await getMongoDb();
  const now = new Date();
  const updatePayload = getUpdatePayload(input);

  const result = await mongo.collection<MongoDraftDoc>('product_drafts').findOneAndUpdate(
    buildDraftIdFilter(id),
    {
      $set: {
        ...updatePayload,
        updatedAt: now,
      },
    },
    { returnDocument: 'after' }
  );

  if (result === null) return null;

  const doc =
    (typeof result === 'object' && 'value' in result)
      ? (result.value as MongoDraftDoc | null)
      : (result as MongoDraftDoc | null);

  if (doc === null) return null;
  return mapMongoDocToDraft(doc);
};

const deleteDraftMongo = async (id: string): Promise<boolean> => {
  const mongo = await getMongoDb();
  const result = await mongo
    .collection<MongoDraftDoc>('product_drafts')
    .deleteOne(buildDraftIdFilter(id));
  return result.deletedCount > 0;
};

// Public API
export const listDrafts = async (): Promise<ProductDraft[]> => listDraftsMongo();

export const getDraft = async (id: string): Promise<ProductDraft | null> => getDraftMongo(id);

export const createDraft = async (input: CreateProductDraftInput): Promise<ProductDraft> =>
  createDraftMongo(input);

export const updateDraft = async (
  id: string,
  input: UpdateProductDraftInput
): Promise<ProductDraft | null> => updateDraftMongo(id, input);

export const deleteDraft = async (id: string): Promise<boolean> => deleteDraftMongo(id);
