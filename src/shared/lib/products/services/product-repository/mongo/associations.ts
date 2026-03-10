import { Collection, Document, AnyBulkWriteOperation, UpdateFilter, Filter } from 'mongodb';

import type { ImageFile } from '@/shared/contracts/files';
import { ProductImageRecord } from '@/shared/contracts/products';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { mongoImageFileRepository } from '@/shared/lib/files/services/image-file-service';
import { mongoCatalogRepository } from '@/shared/lib/products/services/catalog-repository/mongo-catalog-repository';

import { ProductDocument } from '../mongo-product-repository-mappers';
import {
  buildProductIdFilter,
  normalizeLookupId,
  normalizeImageFileIds,
  buildLookupFilterForIds,
  resolveLookupDocumentId,
} from '../mongo-product-repository.helpers';

export const mongoProductAssociationsImpl = {
  async getProductImages(
    productId: string,
    getCollection: () => Promise<Collection<ProductDocument>>
  ) {
    const collection = await getCollection();
    const doc = await collection.findOne(buildProductIdFilter(productId), {
      projection: {
        _id: 1,
        id: 1,
        updatedAt: 1,
        images: 1,
      },
    });
    if (!doc || !Array.isArray(doc['images']) || doc['images'].length === 0) {
      return [];
    }

    const fallbackProductId = normalizeLookupId(doc['id'] ?? doc._id) || productId;
    const fallbackAssignedAt =
      doc['updatedAt'] instanceof Date ? doc['updatedAt'].toISOString() : new Date().toISOString();

    type PartialEntry = Omit<ProductImageRecord, 'imageFile'> & { imageFile?: ImageFile };
    const parsedEntries: PartialEntry[] = [];
    const images = doc['images'] as Array<{
      productId?: string;
      imageFileId: string;
      assignedAt?: string | Date;
      imageFile?: ImageFile;
    }>;

    images.forEach((rawImage) => {
      if (!rawImage || typeof rawImage !== 'object') return;
      let assignedAt = fallbackAssignedAt;
      if (rawImage.assignedAt instanceof Date) {
        assignedAt = rawImage.assignedAt.toISOString();
      } else if (typeof rawImage.assignedAt === 'string' && rawImage.assignedAt.length > 0) {
        assignedAt = rawImage.assignedAt;
      }
      parsedEntries.push({
        productId: rawImage.productId || fallbackProductId,
        imageFileId: rawImage.imageFileId,
        assignedAt,
        imageFile: rawImage.imageFile,
      });
    });

    const missingImageFileIds = parsedEntries.filter((e) => !e.imageFile).map((e) => e.imageFileId);

    if (missingImageFileIds.length > 0) {
      const imageFiles = await mongoImageFileRepository.findImageFilesByIds(missingImageFileIds);
      const imageFileMap = new Map<string, ImageFile>(
        (imageFiles as ImageFile[]).map((f) => [f.id, f])
      );
      parsedEntries.forEach((entry) => {
        if (!entry.imageFile) {
          entry.imageFile = imageFileMap.get(entry.imageFileId);
        }
      });
    }

    return parsedEntries.filter((e): e is ProductImageRecord => !!e.imageFile);
  },

  async addProductImages(
    productId: string,
    imageFileIds: string[],
    getCollection: () => Promise<Collection<ProductDocument>>
  ) {
    const collection = await getCollection();
    const normalizedIds = normalizeImageFileIds(imageFileIds);
    if (normalizedIds.length === 0) return;

    const imageFiles = (await mongoImageFileRepository.findImageFilesByIds(
      normalizedIds
    )) as ImageFile[];
    const now = new Date().toISOString();

    const newImages = imageFiles.map((file) => ({
      productId,
      imageFileId: file.id,
      assignedAt: now,
      imageFile: {
        id: file.id,
        filepath: file.filepath,
      },
    }));

    await collection.updateOne(buildProductIdFilter(productId), {
      $push: { images: { $each: newImages } },
      $set: { updatedAt: new Date() },
    } as UpdateFilter<ProductDocument>);
  },

  async replaceProductImages(
    productId: string,
    imageFileIds: string[],
    getCollection: () => Promise<Collection<ProductDocument>>
  ) {
    const collection = await getCollection();
    const normalizedIds = normalizeImageFileIds(imageFileIds);
    const imageFiles = (await mongoImageFileRepository.findImageFilesByIds(
      normalizedIds
    )) as ImageFile[];
    const now = new Date().toISOString();

    const newImages = imageFiles.map((file) => ({
      productId,
      imageFileId: file.id,
      assignedAt: now,
      imageFile: {
        id: file.id,
        filepath: file.filepath,
      },
    }));

    await collection.updateOne(buildProductIdFilter(productId), {
      $set: {
        images: newImages,
        updatedAt: new Date(),
      },
    } as unknown as UpdateFilter<ProductDocument>);
  },

  async removeProductImage(
    productId: string,
    imageFileId: string,
    getCollection: () => Promise<Collection<ProductDocument>>
  ) {
    const collection = await getCollection();
    await collection.updateOne(buildProductIdFilter(productId), {
      $pull: { images: { imageFileId } },
      $set: { updatedAt: new Date() },
    } as UpdateFilter<ProductDocument>);
  },

  async countProductsByImageFileId(
    imageFileId: string,
    getCollection: () => Promise<Collection<ProductDocument>>
  ) {
    const collection = await getCollection();
    return collection.countDocuments({
      'images.imageFileId': imageFileId,
    } as Filter<ProductDocument>);
  },

  async replaceProductCatalogs(
    productId: string,
    catalogIds: string[],
    getCollection: () => Promise<Collection<ProductDocument>>
  ) {
    const collection = await getCollection();
    const catalogs = await mongoCatalogRepository.getCatalogsByIds(catalogIds);
    const now = new Date().toISOString();

    const newCatalogs = (catalogs as Array<{ id: string }>).map((c) => ({
      productId,
      catalogId: c.id,
      assignedAt: now,
      catalog: { id: c.id },
    }));

    await collection.updateOne(buildProductIdFilter(productId), {
      $set: {
        catalogs: newCatalogs,
        updatedAt: new Date(),
      },
    } as unknown as UpdateFilter<ProductDocument>);
  },

  async replaceProductCategory(
    productId: string,
    categoryId: string | null,
    getCollection: () => Promise<Collection<ProductDocument>>
  ) {
    const collection = await getCollection();
    await collection.updateOne(buildProductIdFilter(productId), {
      $set: {
        categoryId: categoryId || null,
        updatedAt: new Date(),
      },
      $unset: {
        categories: '',
      },
    } as UpdateFilter<ProductDocument>);
  },

  async replaceProductTags(
    productId: string,
    tagIds: string[],
    getCollection: () => Promise<Collection<ProductDocument>>
  ) {
    const collection = await getCollection();
    const db = await getMongoDb();
    const tags = await db
      .collection('product_tags')
      .find(buildLookupFilterForIds(tagIds))
      .toArray();
    const now = new Date().toISOString();

    const newTags = tags.map((t: Document) => ({
      productId,
      tagId: resolveLookupDocumentId(t),
      assignedAt: now,
    }));

    await collection.updateOne(buildProductIdFilter(productId), {
      $set: {
        tags: newTags,
        updatedAt: new Date(),
      },
    } as unknown as UpdateFilter<ProductDocument>);
  },

  async replaceProductProducers(
    productId: string,
    producerIds: string[],
    getCollection: () => Promise<Collection<ProductDocument>>
  ) {
    const collection = await getCollection();
    const db = await getMongoDb();
    const producers = await db
      .collection('product_producers')
      .find(buildLookupFilterForIds(producerIds))
      .toArray();
    const now = new Date().toISOString();

    const newProducers = producers.map((p: Document) => ({
      productId,
      producerId: resolveLookupDocumentId(p),
      assignedAt: now,
    }));

    await collection.updateOne(buildProductIdFilter(productId), {
      $set: {
        producers: newProducers,
        updatedAt: new Date(),
      },
    } as unknown as UpdateFilter<ProductDocument>);
  },

  async replaceProductNotes(
    productId: string,
    noteIds: string[],
    getCollection: () => Promise<Collection<ProductDocument>>
  ) {
    const collection = await getCollection();
    await collection.updateOne(buildProductIdFilter(productId), {
      $set: {
        noteIds,
        updatedAt: new Date(),
      },
    } as unknown as UpdateFilter<ProductDocument>);
  },

  async bulkReplaceProductCatalogs(
    productIds: string[],
    catalogIds: string[],
    getCollection: () => Promise<Collection<ProductDocument>>
  ) {
    const collection = await getCollection();
    const catalogs = await mongoCatalogRepository.getCatalogsByIds(catalogIds);
    const now = new Date().toISOString();

    const bulkOps = productIds.map((pid) => ({
      updateOne: {
        filter: buildProductIdFilter(pid),
        update: {
          $set: {
            catalogs: (catalogs as Array<{ id: string }>).map((c) => ({
              productId: pid,
              catalogId: c.id,
              assignedAt: now,
              catalog: { id: c.id },
            })),
            updatedAt: new Date(),
          },
        },
      },
    }));

    if (bulkOps.length > 0) {
      await collection.bulkWrite(bulkOps as unknown as AnyBulkWriteOperation<ProductDocument>[]);
    }
  },

  async bulkAddProductCatalogs(
    productIds: string[],
    catalogIds: string[],
    getCollection: () => Promise<Collection<ProductDocument>>
  ) {
    const collection = await getCollection();
    const catalogs = await mongoCatalogRepository.getCatalogsByIds(catalogIds);
    const now = new Date().toISOString();

    const bulkOps = productIds.map((pid) => ({
      updateOne: {
        filter: buildProductIdFilter(pid),
        update: {
          $addToSet: {
            catalogs: {
              $each: (catalogs as Array<{ id: string }>).map((c) => ({
                productId: pid,
                catalogId: c.id,
                assignedAt: now,
                catalog: { id: c.id },
              })),
            },
          },
          $set: { updatedAt: new Date() },
        },
      },
    }));

    if (bulkOps.length > 0) {
      await collection.bulkWrite(bulkOps as unknown as AnyBulkWriteOperation<ProductDocument>[]);
    }
  },

  async bulkRemoveProductCatalogs(
    productIds: string[],
    catalogIds: string[],
    getCollection: () => Promise<Collection<ProductDocument>>
  ) {
    const collection = await getCollection();
    const bulkOps: AnyBulkWriteOperation<ProductDocument>[] = productIds.map((pid) => ({
      updateOne: {
        filter: buildProductIdFilter(pid),
        update: {
          $pull: {
            catalogs: { catalogId: { $in: catalogIds } },
          } as unknown as UpdateFilter<ProductDocument>,
          $set: { updatedAt: new Date() },
        },
      },
    }));

    if (bulkOps.length > 0) {
      await collection.bulkWrite(bulkOps);
    }
  },
};
