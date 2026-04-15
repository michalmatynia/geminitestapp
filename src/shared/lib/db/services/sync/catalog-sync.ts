import { type BatchCountResult } from '@/shared/contracts/base';
import type {
  MongoPriceGroupDoc,
  MongoCatalogDoc,
  MongoCategoryDoc,
  MongoTagDoc,
  MongoProducerDoc,
  MongoProductParameterDoc,
} from '../database-sync-types';
import type { DatabaseSyncHandler } from './types';
import type { Prisma } from '@prisma/client';

type MongoRecordWithStringId<TDoc> = Omit<TDoc, '_id'> & { _id: string };

type EntityWithId = { id: string };

type PriceGroupSeed = {
  id: string;
  groupId: string;
  isDefault: boolean;
  name: string;
  description: string | null;
  currencyId: string;
  type: string;
  basePriceField: string;
  sourceGroupId: string | null;
  priceMultiplier: number;
  addToPrice: number;
  createdAt: Date;
  updatedAt: Date;
};

type CatalogSeed = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  defaultLanguageId: string | null;
  defaultPriceGroupId: string | null;
  priceGroupIds: string[];
  createdAt: Date;
  updatedAt: Date;
  languageIds: string[];
};

type ProductCategorySeed = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  parentId: string | null;
  catalogId: string;
  createdAt: Date;
  updatedAt: Date;
};

type ProductTagSeed = {
  id: string;
  name: string;
  color: string | null;
  catalogId: string;
  createdAt: Date;
  updatedAt: Date;
};

type ProducerSeed = {
  id: string;
  name: string;
  website: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ProductParameterSeed = {
  id: string;
  catalogId: string;
  name_en: string;
  name_pl: string | null;
  name_de: string | null;
  selectorType: string;
  optionLabels: string[];
  createdAt: Date;
  updatedAt: Date;
};

type PriceGroupRow = PriceGroupSeed;
type CatalogRow = Omit<CatalogSeed, 'languageIds'> & {
  languages: Array<{ languageId: string; position: number }>;
};
type ProductCategoryRow = ProductCategorySeed;
type ProductTagRow = ProductTagSeed;
type ProducerRow = ProducerSeed;
type ProductParameterRow = ProductParameterSeed;

export const syncPriceGroups: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const currencyRows = (await prisma.currency.findMany({
    select: { id: true },
  })) as EntityWithId[];
  const availableCurrencyIds = new Set<string>(
    currencyRows.map((entry) => entry.id)
  );
  const warnings: string[] = [];
  const docs = (await mongo
    .collection('price_groups')
    .find({})
    .toArray()) as MongoPriceGroupDoc[];
  const availableGroupIds = new Set<string>(
    docs
      .map((doc: MongoPriceGroupDoc) => normalizeId(doc as Record<string, unknown>))
      .filter((id: string | null): id is string => Boolean(id))
  );
  const data = docs
    .map((doc: MongoPriceGroupDoc): PriceGroupSeed | null => {
      const id = normalizeId(doc as Record<string, unknown>);
      if (!id) return null;
      const rawCurrencyId = doc.currencyId ?? 'PLN';
      const resolvedCurrencyId = availableCurrencyIds.has(rawCurrencyId)
        ? rawCurrencyId
        : availableCurrencyIds.has('PLN')
          ? 'PLN'
          : null;
      if (!resolvedCurrencyId) {
        warnings.push(`Skipped price group ${id}: missing currency ${rawCurrencyId}`);
        return null;
      }
      const rawSourceGroupId = doc.sourceGroupId ?? null;
      const resolvedSourceGroupId =
        rawSourceGroupId && availableGroupIds.has(rawSourceGroupId) ? rawSourceGroupId : null;
      if (rawSourceGroupId && !resolvedSourceGroupId) {
        warnings.push(`Price group ${id}: missing source group ${rawSourceGroupId}`);
      }
      return {
        id,
        groupId: doc.groupId ?? id,
        isDefault: Boolean(doc.isDefault),
        name: doc.name ?? id,
        description: doc.description ?? null,
        currencyId: resolvedCurrencyId,
        type: doc.type ?? 'standard',
        basePriceField: doc.basePriceField ?? 'price',
        sourceGroupId: resolvedSourceGroupId,
        priceMultiplier: doc.priceMultiplier ?? 1,
        addToPrice: doc.addToPrice ?? 0,
        createdAt: (doc.createdAt as Date) ?? new Date(),
        updatedAt: (doc.updatedAt as Date) ?? new Date(),
      };
    })
    .filter((item): item is PriceGroupSeed => item !== null);
  const deleted = (await prisma.priceGroup.deleteMany()) as BatchCountResult;
  const created: BatchCountResult = data.length
    ? ((await prisma.priceGroup.createMany({
      data: data as Prisma.PriceGroupCreateManyInput[],
    })) as BatchCountResult)
    : { count: 0 };
  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

export const syncCatalogs: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const languageRows = (await prisma.language.findMany({
    select: { id: true },
  })) as EntityWithId[];
  const availableLanguageIds = new Set<string>(
    languageRows.map((entry) => entry.id)
  );
  const priceGroupRows = (await prisma.priceGroup.findMany({
    select: { id: true },
  })) as EntityWithId[];
  const availablePriceGroupIds = new Set<string>(
    priceGroupRows.map((entry) => entry.id)
  );
  const warnings: string[] = [];
  const docs = (await mongo
    .collection('catalogs')
    .find({})
    .toArray()) as MongoCatalogDoc[];
  const data = docs
    .map((doc: MongoCatalogDoc): CatalogSeed | null => {
      const id = normalizeId(doc as Record<string, unknown>);
      if (!id) return null;
      const rawDefaultLanguageId = doc.defaultLanguageId ?? null;
      const resolvedDefaultLanguageId =
        rawDefaultLanguageId && availableLanguageIds.has(rawDefaultLanguageId)
          ? rawDefaultLanguageId
          : null;
      if (rawDefaultLanguageId && !resolvedDefaultLanguageId) {
        warnings.push(`Catalog ${id}: missing default language ${rawDefaultLanguageId}`);
      }
      const rawDefaultPriceGroupId = doc.defaultPriceGroupId ?? null;
      const resolvedDefaultPriceGroupId =
        rawDefaultPriceGroupId && availablePriceGroupIds.has(rawDefaultPriceGroupId)
          ? rawDefaultPriceGroupId
          : null;
      if (rawDefaultPriceGroupId && !resolvedDefaultPriceGroupId) {
        warnings.push(`Catalog ${id}: missing default price group ${rawDefaultPriceGroupId}`);
      }
      const rawLanguageIds = doc.languageIds ?? [];
      const languageIds = rawLanguageIds.filter((languageId) =>
        availableLanguageIds.has(languageId)
      );
      if (rawLanguageIds.length !== languageIds.length) {
        warnings.push(
          `Catalog ${id}: filtered ${rawLanguageIds.length - languageIds.length} missing languages`
        );
      }
      const rawPriceGroupIds = doc.priceGroupIds ?? [];
      const priceGroupIds = rawPriceGroupIds.filter((priceGroupId) =>
        availablePriceGroupIds.has(priceGroupId)
      );
      if (rawPriceGroupIds.length !== priceGroupIds.length) {
        warnings.push(
          `Catalog ${id}: filtered ${rawPriceGroupIds.length - priceGroupIds.length} missing price groups`
        );
      }
      return {
        id,
        name: doc.name ?? id,
        description: doc.description ?? null,
        isDefault: Boolean(doc.isDefault),
        defaultLanguageId: resolvedDefaultLanguageId,
        defaultPriceGroupId: resolvedDefaultPriceGroupId,
        priceGroupIds,
        createdAt: (doc.createdAt as Date) ?? new Date(),
        updatedAt: (doc.updatedAt as Date) ?? new Date(),
        languageIds,
      };
    })
    .filter((item): item is CatalogSeed => item !== null);
  const deleted = (await prisma.catalog.deleteMany()) as BatchCountResult;
  const created: BatchCountResult = data.length
    ? ((await prisma.catalog.createMany({
      data: data.map(({ languageIds: _, ...rest }) => rest) as Prisma.CatalogCreateManyInput[],
    })) as BatchCountResult)
    : { count: 0 };

  const catalogLanguages = data.flatMap((catalog) =>
    catalog.languageIds.map((languageId: string, index: number) => ({
      catalogId: catalog.id,
      languageId,
      position: index,
    }))
  ) as Prisma.CatalogLanguageCreateManyInput[];
  await prisma.catalogLanguage.deleteMany();
  if (catalogLanguages.length) {
    await prisma.catalogLanguage.createMany({ data: catalogLanguages });
  }

  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

export const syncProductCategories: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = (await mongo
    .collection('product_categories')
    .find({})
    .toArray()) as MongoCategoryDoc[];
  const data = docs
    .map((doc: MongoCategoryDoc): ProductCategorySeed | null => {
      const id = normalizeId(doc as Record<string, unknown>);
      if (!id) return null;
      return {
        id,
        name: doc.name_en ?? id,
        description: doc.description_en ?? null,
        color: null,
        parentId: doc.parentId ?? null,
        catalogId: doc.catalogId ?? '',
        createdAt: (doc.createdAt as Date) ?? new Date(),
        updatedAt: (doc.updatedAt as Date) ?? new Date(),
      };
    })
    .filter((item): item is ProductCategorySeed => item !== null);
  const deleted = (await prisma.productCategory.deleteMany()) as BatchCountResult;
  const created: BatchCountResult = data.length
    ? ((await prisma.productCategory.createMany({
      data: data as Prisma.ProductCategoryCreateManyInput[],
    })) as BatchCountResult)
    : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncProductTags: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = (await mongo
    .collection('product_tags')
    .find({})
    .toArray()) as MongoTagDoc[];
  const data = docs
    .map((doc: MongoTagDoc): ProductTagSeed | null => {
      const id = normalizeId(doc as Record<string, unknown>);
      if (!id) return null;
      return {
        id,
        name: doc.name ?? id,
        color: null,
        catalogId: '',
        createdAt: (doc.createdAt as Date) ?? new Date(),
        updatedAt: (doc.updatedAt as Date) ?? new Date(),
      };
    })
    .filter((item): item is ProductTagSeed => item !== null);
  const deleted = (await prisma.productTag.deleteMany()) as BatchCountResult;
  const created: BatchCountResult = data.length
    ? ((await prisma.productTag.createMany({
      data: data as Prisma.ProductTagCreateManyInput[],
    })) as BatchCountResult)
    : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncProductProducers: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId, toDate }) => {
  const docs = (await mongo
    .collection('product_producers')
    .find({})
    .toArray()) as MongoProducerDoc[];
  const warnings: string[] = [];
  const seenNames = new Set<string>();
  const data = docs
    .map((doc: MongoProducerDoc): ProducerSeed | null => {
      const id = normalizeId(doc as Record<string, unknown>);
      if (!id) return null;
      const rawName = typeof doc.name === 'string' ? (doc.name.trim() ?? '') : '';
      const name = rawName || id;
      const nameKey = name.toLowerCase();
      if (seenNames.has(nameKey)) {
        warnings.push(`Skipped duplicate producer name: ${name}`);
        return null;
      }
      seenNames.add(nameKey);
      return {
        id,
        name,
        website: doc.website ?? null,
        createdAt: toDate(doc.createdAt) ?? new Date(),
        updatedAt: toDate(doc.updatedAt) ?? new Date(),
      };
    })
    .filter((item): item is ProducerSeed => item !== null);
  await prisma.productProducerAssignment.deleteMany();
  const deleted = (await prisma.producer.deleteMany()) as BatchCountResult;
  const created: BatchCountResult = data.length
    ? ((await prisma.producer.createMany({
      data: data as Prisma.ProducerCreateManyInput[],
    })) as BatchCountResult)
    : { count: 0 };
  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

export const syncProductParameters: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = (await mongo
    .collection('product_parameters')
    .find({})
    .toArray()) as MongoProductParameterDoc[];
  const data = docs
    .map((doc: MongoProductParameterDoc): ProductParameterSeed | null => {
      const id = normalizeId(doc as Record<string, unknown>);
      if (!id) return null;
      return {
        id,
        catalogId: doc.catalogId ?? '',
        name_en: doc.name_en ?? '',
        name_pl: doc.name_pl ?? null,
        name_de: doc.name_de ?? null,
        selectorType: doc.selectorType ?? 'text',
        optionLabels: doc.optionLabels ?? [],
        createdAt: (doc.createdAt as Date) ?? new Date(),
        updatedAt: (doc.updatedAt as Date) ?? new Date(),
      };
    })
    .filter((item): item is ProductParameterSeed => item !== null);
  const deleted = (await prisma.productParameter.deleteMany()) as BatchCountResult;
  const created: BatchCountResult = data.length
    ? ((await prisma.productParameter.createMany({
      data: data as Prisma.ProductParameterCreateManyInput[],
    })) as BatchCountResult)
    : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

// --- Prisma to Mongo handlers ---

export const syncPriceGroupsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.priceGroup.findMany()) as PriceGroupRow[];
  const docs: MongoRecordWithStringId<MongoPriceGroupDoc>[] = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    groupId: row.groupId,
    isDefault: row.isDefault,
    name: row.name,
    description: row.description ?? null,
    currencyId: row.currencyId,
    type: row.type,
    basePriceField: row.basePriceField,
    sourceGroupId: row.sourceGroupId ?? null,
    priceMultiplier: row.priceMultiplier,
    addToPrice: row.addToPrice,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection<MongoRecordWithStringId<MongoPriceGroupDoc>>('price_groups');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncCatalogsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.catalog.findMany({
    include: { languages: true },
  })) as CatalogRow[];
  const docs: MongoRecordWithStringId<MongoCatalogDoc>[] = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    isDefault: row.isDefault,
    defaultLanguageId: row.defaultLanguageId ?? null,
    defaultPriceGroupId: row.defaultPriceGroupId ?? null,
    priceGroupIds: row.priceGroupIds ?? [],
    languageIds: row.languages
      .sort((a, b) => a.position - b.position)
      .map((entry) => entry.languageId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection<MongoRecordWithStringId<MongoCatalogDoc>>('catalogs');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncProductCategoriesPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.productCategory.findMany()) as ProductCategoryRow[];
  const docs: MongoRecordWithStringId<MongoCategoryDoc>[] = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    color: row.color ?? null,
    parentId: row.parentId ?? null,
    catalogId: row.catalogId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection<MongoRecordWithStringId<MongoCategoryDoc>>(
    'product_categories'
  );
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncProductTagsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.productTag.findMany()) as ProductTagRow[];
  const docs: MongoRecordWithStringId<MongoTagDoc>[] = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    name: row.name,
    color: row.color ?? null,
    catalogId: row.catalogId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection<MongoRecordWithStringId<MongoTagDoc>>('product_tags');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncProductProducersPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.producer.findMany()) as ProducerRow[];
  const docs: MongoRecordWithStringId<MongoProducerDoc>[] = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    name: row.name,
    website: row.website ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection<MongoRecordWithStringId<MongoProducerDoc>>(
    'product_producers'
  );
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncProductParametersPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.productParameter.findMany()) as ProductParameterRow[];
  const docs: MongoRecordWithStringId<MongoProductParameterDoc>[] = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    catalogId: row.catalogId,
    name_en: row.name_en,
    name_pl: row.name_pl,
    name_de: row.name_de,
    selectorType: row.selectorType,
    optionLabels: row.optionLabels,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection<MongoRecordWithStringId<MongoProductParameterDoc>>(
    'product_parameters'
  );
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};
