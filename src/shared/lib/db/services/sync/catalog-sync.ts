import type {
  MongoPriceGroupDoc,
  MongoCatalogDoc,
  MongoCategoryDoc,
  MongoTagDoc,
  MongoProducerDoc,
  MongoProductParameterDoc,
} from '../database-sync-types';
import type { SyncHandler } from './types';
import type { Prisma } from '@prisma/client';

export const syncPriceGroups: SyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const availableCurrencyIds = new Set<string>(
    (await prisma.currency.findMany({ select: { id: true } })).map(
      (entry: { id: string }) => entry.id
    )
  );
  const warnings: string[] = [];
  const docs = (await mongo
    .collection('price_groups')
    .find({})
    .toArray()) as unknown as MongoPriceGroupDoc[];
  const availableGroupIds = new Set<string>(
    docs
      .map((doc: MongoPriceGroupDoc) => normalizeId(doc as unknown as Record<string, unknown>))
      .filter((id: string | null): id is string => Boolean(id))
  );
  const data = docs
    .map((doc: MongoPriceGroupDoc): Prisma.PriceGroupCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
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
        createdAt: doc.createdAt ?? new Date(),
        updatedAt: doc.updatedAt ?? new Date(),
      };
    })
    .filter((item): item is Prisma.PriceGroupCreateManyInput => item !== null);
  const deleted = await prisma.priceGroup.deleteMany();
  const created = data.length ? await prisma.priceGroup.createMany({ data }) : { count: 0 };
  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

export const syncCatalogs: SyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const availableLanguageIds = new Set<string>(
    (await prisma.language.findMany({ select: { id: true } })).map(
      (entry: { id: string }) => entry.id
    )
  );
  const availablePriceGroupIds = new Set<string>(
    (await prisma.priceGroup.findMany({ select: { id: true } })).map(
      (entry: { id: string }) => entry.id
    )
  );
  const warnings: string[] = [];
  const docs = (await mongo
    .collection('catalogs')
    .find({})
    .toArray()) as unknown as MongoCatalogDoc[];
  const data = docs
    .map((doc: MongoCatalogDoc) => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
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
        createdAt: doc.createdAt ?? new Date(),
        updatedAt: doc.updatedAt ?? new Date(),
        languageIds,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const deleted = await prisma.catalog.deleteMany();
  const created = data.length
    ? await prisma.catalog.createMany({
      data: data.map(({ languageIds: _, ...rest }) => rest) as Prisma.CatalogCreateManyInput[],
    })
    : { count: 0 };

  const catalogLanguages = data.flatMap((catalog) =>
    catalog.languageIds.map((languageId, index) => ({
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

export const syncProductCategories: SyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = (await mongo
    .collection('product_categories')
    .find({})
    .toArray()) as unknown as MongoCategoryDoc[];
  const data = docs
    .map((doc: MongoCategoryDoc): Prisma.ProductCategoryCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
      if (!id) return null;
      return {
        id,
        name: doc.name_en ?? id,
        description: doc.description_en ?? null,
        color: null,
        parentId: doc.parentId ?? null,
        catalogId: doc.catalogId ?? '',
        createdAt: doc.createdAt ?? new Date(),
        updatedAt: doc.updatedAt ?? new Date(),
      };
    })
    .filter((item): item is Prisma.ProductCategoryCreateManyInput => item !== null);
  const deleted = await prisma.productCategory.deleteMany();
  const created = data.length ? await prisma.productCategory.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncProductTags: SyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = (await mongo
    .collection('product_tags')
    .find({})
    .toArray()) as unknown as MongoTagDoc[];
  const data = docs
    .map((doc: MongoTagDoc): Prisma.ProductTagCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
      if (!id) return null;
      return {
        id,
        name: doc.name ?? id,
        color: null,
        catalogId: '',
        createdAt: doc.createdAt ?? new Date(),
        updatedAt: doc.updatedAt ?? new Date(),
      };
    })
    .filter((item): item is Prisma.ProductTagCreateManyInput => item !== null);
  const deleted = await prisma.productTag.deleteMany();
  const created = data.length ? await prisma.productTag.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncProductProducers: SyncHandler = async ({ mongo, prisma, normalizeId, toDate }) => {
  const docs = (await mongo
    .collection('product_producers')
    .find({})
    .toArray()) as unknown as MongoProducerDoc[];
  const warnings: string[] = [];
  const seenNames = new Set<string>();
  const data = docs
    .map((doc: MongoProducerDoc): Prisma.ProducerCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
      if (!id) return null;
      const rawName = typeof doc.name === 'string' ? (doc.name?.trim() ?? '') : '';
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
    .filter((item): item is Prisma.ProducerCreateManyInput => item !== null);
  await prisma.productProducerAssignment.deleteMany();
  const deleted = await prisma.producer.deleteMany();
  const created = data.length ? await prisma.producer.createMany({ data }) : { count: 0 };
  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

export const syncProductParameters: SyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = (await mongo
    .collection('product_parameters')
    .find({})
    .toArray()) as unknown as MongoProductParameterDoc[];
  const data = docs
    .map((doc: MongoProductParameterDoc): Prisma.ProductParameterCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
      if (!id) return null;
      return {
        id,
        catalogId: doc.catalogId ?? '',
        name_en: doc.name_en ?? '',
        name_pl: doc.name_pl ?? null,
        name_de: doc.name_de ?? null,
        selectorType: doc.selectorType ?? 'text',
        optionLabels: doc.optionLabels ?? [],
        createdAt: doc.createdAt ?? new Date(),
        updatedAt: doc.updatedAt ?? new Date(),
      };
    })
    .filter((item): item is Prisma.ProductParameterCreateManyInput => item !== null);
  const deleted = await prisma.productParameter.deleteMany();
  const created = data.length ? await prisma.productParameter.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

// --- Prisma to Mongo handlers ---

export const syncPriceGroupsPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.priceGroup.findMany();
  const docs = rows.map((row) => ({
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
  const collection = mongo.collection('price_groups');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncCatalogsPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.catalog.findMany({ include: { languages: true } });
  const docs = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    isDefault: row.isDefault,
    defaultLanguageId: row.defaultLanguageId ?? null,
    defaultPriceGroupId: row.defaultPriceGroupId ?? null,
    priceGroupIds: row.priceGroupIds ?? [],
    languageIds: row.languages
      .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
      .map((entry: { languageId: string }) => entry.languageId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection('catalogs');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncProductCategoriesPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.productCategory.findMany();
  const docs = rows.map((row) => ({
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
  const collection = mongo.collection('product_categories');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncProductTagsPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.productTag.findMany();
  const docs = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    name: row.name,
    color: row.color ?? null,
    catalogId: row.catalogId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection('product_tags');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncProductProducersPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.producer.findMany();
  const docs = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    name: row.name,
    website: row.website ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection('product_producers');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncProductParametersPrismaToMongo: SyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.productParameter.findMany();
  const docs = rows.map((row) => ({
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
  const collection = mongo.collection('product_parameters');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};
