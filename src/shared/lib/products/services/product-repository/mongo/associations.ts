/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { 
  buildProductIdFilter, 
  normalizeLookupId, 
  normalizeImageFileIds,
  buildLookupFilterForIds,
  resolveLookupDocumentId,
} from '../mongo-product-repository.helpers';
import { 
  ProductImageRecord, 
} from '@/shared/contracts/products';
import { mongoImageFileRepository } from '@/shared/lib/files/services/image-file-service';
import { mongoCatalogRepository } from '@/shared/lib/products/services/catalog-repository/mongo-catalog-repository';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

export const mongoProductAssociationsImpl = {
  async getProductImages(productId: string, getCollection: () => Promise<any>) {
    const collection = await getCollection();
    const doc = await collection.findOne(buildProductIdFilter(productId), {
      projection: {
        _id: 1,
        id: 1,
        updatedAt: 1,
        images: 1,
      },
    });
    if (!doc || !Array.isArray(doc.images) || doc.images.length === 0) {
      return [];
    }

    const fallbackProductId = normalizeLookupId(doc.id ?? doc._id) || productId;
    const fallbackAssignedAt =
      doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date().toISOString();

    const parsedEntries = doc.images.reduce<ProductImageRecord[]>((acc, rawImage: any) => {
      if (!rawImage || typeof rawImage !== 'object') return acc;
      let assignedAt = fallbackAssignedAt;
      if (rawImage.assignedAt instanceof Date) {
        assignedAt = rawImage.assignedAt.toISOString();
      } else if (typeof rawImage.assignedAt === 'string' && rawImage.assignedAt.length > 0) {
        assignedAt = rawImage.assignedAt;
      }
      acc.push({
        productId: rawImage.productId || fallbackProductId,
        imageFileId: rawImage.imageFileId,
        assignedAt,
        imageFile: rawImage.imageFile,
      });
      return acc;
    }, []);

    const missingImageFileIds = parsedEntries
      .filter((e: ProductImageRecord) => !e.imageFile)
      .map((e: ProductImageRecord) => e.imageFileId);

    if (missingImageFileIds.length > 0) {
      const imageFiles = await mongoImageFileRepository.findImageFilesByIds(missingImageFileIds);
      const imageFileMap = new Map(imageFiles.map((f: any) => [f.id, f]));
      parsedEntries.forEach((entry: ProductImageRecord) => {
        if (!entry.imageFile) {
          entry.imageFile = imageFileMap.get(entry.imageFileId);
        }
      });
    }

    return parsedEntries.filter((e: ProductImageRecord) => !!e.imageFile) as ProductImageRecord[];
  },

  async addProductImages(productId: string, imageFileIds: string[], getCollection: () => Promise<any>) {
    const collection = await getCollection();
    const normalizedIds = normalizeImageFileIds(imageFileIds);
    if (normalizedIds.length === 0) return;

    const imageFiles = await mongoImageFileRepository.findImageFilesByIds(normalizedIds);
    const now = new Date().toISOString();

    const newImages = imageFiles.map((file: any) => ({
      productId,
      imageFileId: file.id,
      assignedAt: now,
      imageFile: {
        id: file.id,
        filepath: file.filepath,
      },
    }));

    await collection.updateOne(buildProductIdFilter(productId), {
      $push: { images: { $each: newImages } } as any,
      $set: { updatedAt: new Date() },
    });
  },

  async replaceProductImages(productId: string, imageFileIds: string[], getCollection: () => Promise<any>) {
    const collection = await getCollection();
    const normalizedIds = normalizeImageFileIds(imageFileIds);
    const imageFiles = await mongoImageFileRepository.findImageFilesByIds(normalizedIds);
    const now = new Date().toISOString();

    const newImages = imageFiles.map((file: any) => ({
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
    });
  },

  async removeProductImage(productId: string, imageFileId: string, getCollection: () => Promise<any>) {
    const collection = await getCollection();
    await collection.updateOne(buildProductIdFilter(productId), {
      $pull: { images: { imageFileId } } as any,
      $set: { updatedAt: new Date() },
    });
  },

  async countProductsByImageFileId(imageFileId: string, getCollection: () => Promise<any>) {
    const collection = await getCollection();
    return collection.countDocuments({ 'images.imageFileId': imageFileId });
  },

  async replaceProductCatalogs(productId: string, catalogIds: string[], getCollection: () => Promise<any>) {
    const collection = await getCollection();
    const catalogs = await mongoCatalogRepository.getCatalogsByIds(catalogIds);
    const now = new Date().toISOString();

    const newCatalogs = catalogs.map((c: any) => ({
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
    });
  },

  async replaceProductCategory(productId: string, categoryId: string | null, getCollection: () => Promise<any>) {
    const collection = await getCollection();
    await collection.updateOne(buildProductIdFilter(productId), {
      $set: {
        categoryId: categoryId || null,
        updatedAt: new Date(),
      },
    });
  },

  async replaceProductTags(productId: string, tagIds: string[], getCollection: () => Promise<any>) {
    const collection = await getCollection();
    const db = await getMongoDb();
    const tags = await db
      .collection('product_tags')
      .find(buildLookupFilterForIds(tagIds))
      .toArray();
    const now = new Date().toISOString();

    const newTags = tags.map((t: any) => ({
      productId,
      tagId: resolveLookupDocumentId(t),
      assignedAt: now,
    }));

    await collection.updateOne(buildProductIdFilter(productId), {
      $set: {
        tags: newTags,
        updatedAt: new Date(),
      },
    });
  },

  async replaceProductProducers(productId: string, producerIds: string[], getCollection: () => Promise<any>) {
    const collection = await getCollection();
    const db = await getMongoDb();
    const producers = await db
      .collection('product_producers')
      .find(buildLookupFilterForIds(producerIds))
      .toArray();
    const now = new Date().toISOString();

    const newProducers = producers.map((p: any) => ({
      productId,
      producerId: resolveLookupDocumentId(p),
      assignedAt: now,
    }));

    await collection.updateOne(buildProductIdFilter(productId), {
      $set: {
        producers: newProducers,
        updatedAt: new Date(),
      },
    });
  },

  async replaceProductNotes(productId: string, noteIds: string[], getCollection: () => Promise<any>) {
    const collection = await getCollection();
    await collection.updateOne(buildProductIdFilter(productId), {
      $set: {
        noteIds,
        updatedAt: new Date(),
      },
    });
  },

  async bulkReplaceProductCatalogs(productIds: string[], catalogIds: string[], getCollection: () => Promise<any>) {
    const collection = await getCollection();
    const catalogs = await mongoCatalogRepository.getCatalogsByIds(catalogIds);
    const now = new Date().toISOString();

    const bulkOps = productIds.map((pid) => ({
      updateOne: {
        filter: buildProductIdFilter(pid),
        update: {
          $set: {
            catalogs: catalogs.map((c: any) => ({
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
      await collection.bulkWrite(bulkOps as any);
    }
  },

  async bulkAddProductCatalogs(productIds: string[], catalogIds: string[], getCollection: () => Promise<any>) {
    const collection = await getCollection();
    const catalogs = await mongoCatalogRepository.getCatalogsByIds(catalogIds);
    const now = new Date().toISOString();

    const bulkOps = productIds.map((pid) => ({
      updateOne: {
        filter: buildProductIdFilter(pid),
        update: {
          $addToSet: {
            catalogs: {
              $each: catalogs.map((c: any) => ({
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
      await collection.bulkWrite(bulkOps as any);
    }
  },

  async bulkRemoveProductCatalogs(productIds: string[], catalogIds: string[], getCollection: () => Promise<any>) {
    const collection = await getCollection();
    const bulkOps = productIds.map((pid) => ({
      updateOne: {
        filter: buildProductIdFilter(pid),
        update: {
          $pull: {
            catalogs: { catalogId: { $in: catalogIds } },
          } as any,
          $set: { updatedAt: new Date() },
        },
      },
    }));

    if (bulkOps.length > 0) {
      await collection.bulkWrite(bulkOps as any);
    }
  },
};
};
