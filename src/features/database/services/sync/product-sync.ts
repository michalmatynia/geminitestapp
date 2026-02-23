import type { Prisma } from '@prisma/client';
import type { MongoProductDoc } from '../database-sync-types';
import type { SyncHandler } from './types';

export const syncProducts: SyncHandler = async ({ mongo, prisma, normalizeId, toDate }) => {
  const availableProducerIds = new Set<string>(
    (await prisma.producer.findMany({ select: { id: true } }))
      .map((entry: { id: string }) => entry.id)
  );
  const warnings: string[] = [];
  const docs = (await mongo.collection('products').find({}).toArray()) as unknown as MongoProductDoc[];
  const data = docs
    .map((doc: MongoProductDoc) => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
      if (!id) return null;
      const producers = Array.isArray(doc.producers)
        ? doc.producers ?? []
        : [];
      return {
        id,
        sku: doc.sku ?? null,
        baseProductId: doc.baseProductId ?? null,
        defaultPriceGroupId: doc.defaultPriceGroupId ?? null,
        ean: doc.ean ?? null,
        gtin: doc.gtin ?? null,
        asin: doc.asin ?? null,
        name_en: doc.name_en ?? null,
        name_pl: doc.name_pl ?? null,
        name_de: doc.name_de ?? null,
        description_en: doc.description_en ?? null,
        description_pl: doc.description_pl ?? null,
        description_de: doc.description_de ?? null,
        supplierName: doc.supplierName ?? null,
        supplierLink: doc.supplierLink ?? null,
        priceComment: doc.priceComment ?? null,
        stock: doc.stock ?? null,
        price: doc.price ?? null,
        sizeLength: doc.sizeLength ?? null,
        sizeWidth: doc.sizeWidth ?? null,
        weight: doc.weight ?? null,
        length: doc.length ?? null,
        parameters: doc.parameters ?? [],
        imageLinks: doc.imageLinks ?? [],
        imageBase64s: doc.imageBase64s ?? [],
        createdAt: doc.createdAt ?? new Date(),
        updatedAt: doc.updatedAt ?? new Date(),
        images: Array.isArray(doc.images)
          ? doc.images ?? []
          : [],
        catalogs: Array.isArray(doc.catalogs)
          ? doc.catalogs ?? []
          : [],
        categories: ((): Array<{ categoryId: string; assignedAt: Date }> => {
          const categoryId = doc.categoryId;
          const categories = (Array.isArray(doc.categories) ? doc.categories : []).map(c => ({
            categoryId: c.categoryId,
            assignedAt: toDate(c.assignedAt) ?? new Date()
          }));
          if (categoryId && !categories.some((c) => c.categoryId === categoryId)) {
            return [{ categoryId, assignedAt: new Date() }, ...categories];
          }
          return categories;
        })(),
        tags: Array.isArray(doc.tags)
          ? doc.tags ?? []
          : [],
        producers: producers.filter((p) => {
          if (!availableProducerIds.has(p.producerId)) {
            warnings.push(`Product ${id}: missing producer ${p.producerId}`);
            return false;
          }
          return true;
        }),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  await prisma.productImage.deleteMany();
  await prisma.productCatalog.deleteMany();
  await prisma.productCategoryAssignment.deleteMany();
  await prisma.productTagAssignment.deleteMany();
  await prisma.productProducerAssignment.deleteMany();
  await prisma.productListing.deleteMany();
  await prisma.productAiJob.deleteMany();
  const deleted = await prisma.product.deleteMany();

  const productData = data.map(({ images: _i, catalogs: _cat, categories: _c, tags: _t, producers: _p, ...rest }) => rest);
  const created = productData.length
    ? await prisma.product.createMany({ data: productData as Prisma.ProductCreateManyInput[] })
    : { count: 0 };

  const imageRows = data.flatMap((product) =>
    product.images.map((image) => ({
      productId: product.id,
      imageFileId: image.imageFileId,
      assignedAt: toDate(image.assignedAt) ?? new Date(),
    }))
  ) as Prisma.ProductImageCreateManyInput[];
  if (imageRows.length) {
    await prisma.productImage.createMany({ data: imageRows });
  }

  const catalogRows = data.flatMap((product) =>
    product.catalogs.map((catalog) => ({
      productId: product.id,
      catalogId: catalog.catalogId,
      assignedAt: toDate(catalog.assignedAt) ?? new Date(),
    }))
  ) as Prisma.ProductCatalogCreateManyInput[];
  if (catalogRows.length) {
    await prisma.productCatalog.createMany({ data: catalogRows });
  }

  const categoryRows = data.flatMap((product) =>
    product.categories.map((category) => ({
      productId: product.id,
      categoryId: category.categoryId,
      assignedAt: toDate(category.assignedAt) ?? new Date(),
    }))
  ) as Prisma.ProductCategoryAssignmentCreateManyInput[];
  if (categoryRows.length) {
    await prisma.productCategoryAssignment.createMany({ data: categoryRows });
  }

  const tagRows = data.flatMap((product) =>
    product.tags.map((tag) => ({
      productId: product.id,
      tagId: tag.tagId,
      assignedAt: toDate(tag.assignedAt) ?? new Date(),
    }))
  ) as Prisma.ProductTagAssignmentCreateManyInput[];
  if (tagRows.length) {
    await prisma.productTagAssignment.createMany({ data: tagRows });
  }

  const producerRows: Prisma.ProductProducerAssignmentCreateManyInput[] = [];
  const producerKeys = new Set<string>();
  data.forEach((product) => {
    product.producers.forEach((producer) => {
      const key = `${product.id}::${producer.producerId}`;
      if (producerKeys.has(key)) return;
      producerKeys.add(key);
      producerRows.push({
        productId: product.id,
        producerId: producer.producerId,
        assignedAt: toDate(producer.assignedAt) ?? new Date(),
      });
    });
  });
  if (producerRows.length) {
    await prisma.productProducerAssignment.createMany({ data: producerRows });
  }

  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

export const syncProductDrafts: SyncHandler = async ({ mongo, prisma, normalizeId, toDate }) => {
  const docs = await mongo.collection('product_drafts').find({}).toArray();
  const data = docs
    .map((doc: Record<string, unknown>): Prisma.ProductDraftCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
      if (!id) return null;
      return {
        id,
        name: (doc as { name?: string }).name ?? '',
        description: (doc as { description?: string | null }).description ?? null,
        sku: (doc as { sku?: string | null }).sku ?? null,
        ean: (doc as { ean?: string | null }).ean ?? null,
        gtin: (doc as { gtin?: string | null }).gtin ?? null,
        asin: (doc as { asin?: string | null }).asin ?? null,
        name_en: (doc as { name_en?: string | null }).name_en ?? null,
        name_pl: (doc as { name_pl?: string | null }).name_pl ?? null,
        name_de: (doc as { name_de?: string | null }).name_de ?? null,
        description_en: (doc as { description_en?: string | null }).description_en ?? null,
        description_pl: (doc as { description_pl?: string | null }).description_pl ?? null,
        description_de: (doc as { description_de?: string | null }).description_de ?? null,
        weight: (doc as { weight?: number | null }).weight ?? null,
        sizeLength: (doc as { sizeLength?: number | null }).sizeLength ?? null,
        sizeWidth: (doc as { sizeWidth?: number | null }).sizeWidth ?? null,
        length: (doc as { length?: number | null }).length ?? null,
        price: (doc as { price?: number | null }).price ?? null,
        supplierName: (doc as { supplierName?: string | null }).supplierName ?? null,
        supplierLink: (doc as { supplierLink?: string | null }).supplierLink ?? null,
        priceComment: (doc as { priceComment?: string | null }).priceComment ?? null,
        stock: (doc as { stock?: number | null }).stock ?? null,
        catalogIds: ((doc as { catalogIds?: unknown[] }).catalogIds ?? []) as Prisma.InputJsonValue,
        categoryId: (doc as { categoryId?: string | null }).categoryId ?? null,
        tagIds: ((doc as { tagIds?: unknown[] }).tagIds ?? []) as Prisma.InputJsonValue,
        producerIds: ((doc as { producerIds?: unknown[] }).producerIds ?? []) as Prisma.InputJsonValue,
        parameters: ((doc as { parameters?: unknown[] }).parameters ?? []) as Prisma.InputJsonValue,
        defaultPriceGroupId: (doc as { defaultPriceGroupId?: string | null }).defaultPriceGroupId ?? null,
        active: (doc as { active?: boolean | null }).active ?? true,
        icon: (doc as { icon?: string | null }).icon ?? null,
        iconColorMode: (doc as { iconColorMode?: string | null }).iconColorMode === 'custom' ? 'custom' : 'theme',
        iconColor:
          typeof (doc as { iconColor?: string | null }).iconColor === 'string'
          && /^#[0-9a-fA-F]{6}$/.test(((doc as { iconColor?: string | null }).iconColor as string).trim())
            ? ((doc as { iconColor?: string | null }).iconColor as string).trim().toLowerCase()
            : null,
        imageLinks: ((doc as { imageLinks?: unknown[] }).imageLinks ?? []) as Prisma.InputJsonValue,
        baseProductId: (doc as { baseProductId?: string | null }).baseProductId ?? null,
        createdAt: toDate((doc as { createdAt?: Date }).createdAt) ?? new Date(),
        updatedAt: toDate((doc as { updatedAt?: Date }).updatedAt) ?? new Date(),
      };
    })
    .filter((item): item is Prisma.ProductDraftCreateManyInput => item !== null);
  const deleted = await prisma.productDraft.deleteMany();
  const created = data.length ? await prisma.productDraft.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

// --- Prisma to Mongo handlers ---

export const syncProductsPrismaToMongo: SyncHandler = async ({ mongo, prisma, toObjectIdMaybe }) => {
  const [rows, catalogRows] = await Promise.all([
    prisma.product.findMany({
      include: {
        images: { include: { imageFile: true } },
        catalogs: { include: { catalog: true } },
        categories: true,
        tags: true,
        producers: true,
      },
    }),
    prisma.catalog.findMany({ include: { languages: true } }),
  ]);
  const catalogLanguageMap = new Map(
    catalogRows.map((catalog) => [
      catalog.id,
      catalog.languages
        .sort((a, b) => a.position - b.position)
        .map((entry: { languageId: string }) => entry.languageId),
    ])
  );
  const docs = rows.map((product) => {
    const categoryId = product.categories?.categoryId ?? null;
    return {
      _id: toObjectIdMaybe(product.id),
      id: product.id,
      sku: product.sku ?? null,
      baseProductId: product.baseProductId ?? null,
      defaultPriceGroupId: product.defaultPriceGroupId ?? null,
      ean: product.ean ?? null,
      gtin: product.gtin ?? null,
      asin: product.asin ?? null,
      name_en: product.name_en ?? null,
      name_pl: product.name_pl ?? null,
      name_de: product.name_de ?? null,
      description_en: product.description_en ?? null,
      description_pl: product.description_pl ?? null,
      description_de: product.description_de ?? null,
      supplierName: product.supplierName ?? null,
      supplierLink: product.supplierLink ?? null,
      priceComment: product.priceComment ?? null,
      stock: product.stock ?? null,
      price: product.price ?? null,
      sizeLength: product.sizeLength ?? null,
      sizeWidth: product.sizeWidth ?? null,
      weight: product.weight ?? null,
      length: product.length ?? null,
      parameters: product.parameters ?? [],
      imageLinks: product.imageLinks ?? [],
      imageBase64s: product.imageBase64s ?? [],
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      images: product.images.map((image) => ({
        productId: image.productId,
        imageFileId: image.imageFileId,
        assignedAt: image.assignedAt,
        imageFile: {
          id: image.imageFile.id,
          filename: image.imageFile.filename,
          filepath: image.imageFile.filepath,
          mimetype: image.imageFile.mimetype,
          size: image.imageFile.size,
          width: image.imageFile.width ?? null,
          height: image.imageFile.height ?? null,
          tags: image.imageFile.tags ?? [],
          createdAt: image.imageFile.createdAt,
          updatedAt: image.imageFile.updatedAt,
        },
      })),
      catalogs: product.catalogs.map((entry) => ({
        productId: entry.productId,
        catalogId: entry.catalogId,
        assignedAt: entry.assignedAt,
        catalog: {
          id: entry.catalog.id,
          name: entry.catalog.name,
          description: entry.catalog.description ?? null,
          isDefault: entry.catalog.isDefault,
          defaultLanguageId: entry.catalog.defaultLanguageId ?? null,
          defaultPriceGroupId: entry.catalog.defaultPriceGroupId ?? null,
          priceGroupIds: entry.catalog.priceGroupIds ?? [],
          createdAt: entry.catalog.createdAt,
          updatedAt: entry.catalog.updatedAt,
          languageIds: catalogLanguageMap.get(entry.catalog.id) ?? [],
        },
      })),
      categoryId,
      categories: categoryId
        ? [
          {
            productId: product.id,
            categoryId,
            assignedAt: new Date(),
          },
        ]
        : [],
      tags: product.tags.map((entry) => ({
        productId: product.id,
        tagId: entry.tagId,
        assignedAt: entry.assignedAt,
      })),
      producers: product.producers.map((entry) => ({
        productId: product.id,
        producerId: entry.producerId,
        assignedAt: entry.assignedAt,
      })),
    };
  });
  const collection = mongo.collection('products');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
};

export const syncProductDraftsPrismaToMongo: SyncHandler = async ({ mongo, prisma, toObjectIdMaybe }) => {
  const rows = await prisma.productDraft.findMany();
  const docs = rows.map((row) => ({
    _id: toObjectIdMaybe(row.id),
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    sku: row.sku ?? null,
    ean: row.ean ?? null,
    gtin: row.gtin ?? null,
    asin: row.asin ?? null,
    name_en: row.name_en ?? null,
    name_pl: row.name_pl ?? null,
    name_de: row.name_de ?? null,
    description_en: row.description_en ?? null,
    description_pl: row.description_pl ?? null,
    description_de: row.description_de ?? null,
    weight: row.weight ?? null,
    sizeLength: row.sizeLength ?? null,
    sizeWidth: row.sizeWidth ?? null,
    length: row.length ?? null,
    price: row.price ?? null,
    supplierName: row.supplierName ?? null,
    supplierLink: row.supplierLink ?? null,
    priceComment: row.priceComment ?? null,
    stock: row.stock ?? null,
    catalogIds: row.catalogIds ?? [],
    categoryId: row.categoryId ?? null,
    tagIds: row.tagIds ?? [],
    producerIds: row.producerIds ?? [],
    parameters: row.parameters ?? [],
    defaultPriceGroupId: row.defaultPriceGroupId ?? null,
    active: row.active,
    icon: row.icon ?? null,
    iconColorMode: row.iconColorMode,
    iconColor: row.iconColor ?? null,
    imageLinks: row.imageLinks ?? [],
    baseProductId: row.baseProductId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection('product_drafts');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return { sourceCount: rows.length, targetDeleted: deleted.deletedCount ?? 0, targetInserted: docs.length };
};
