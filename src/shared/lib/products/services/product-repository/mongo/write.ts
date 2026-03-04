/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { randomUUID } from 'crypto';
import { ProductDocument, toProductResponse } from '../mongo-product-repository-mappers';
import { ProductCreateInput, ProductUpdateInput, ProductRecord } from '@/shared/contracts/products';
import {
  buildProductIdFilter,
  normalizeProductParameterValues,
} from '../mongo-product-repository.helpers';

export const mongoProductWriteImpl = {
  async createProduct(
    data: ProductCreateInput,
    getCollection: () => Promise<any>
  ): Promise<ProductRecord> {
    const collection = await getCollection();
    const id = data.id || randomUUID();
    const now = new Date();

    const doc: ProductDocument = {
      _id: id,
      id,
      sku: data.sku,
      baseProductId: data.baseProductId || null,
      defaultPriceGroupId: data.defaultPriceGroupId || null,
      ean: data.ean || null,
      gtin: data.gtin || null,
      asin: data.asin || null,
      name_en: data.name_en || null,
      name_pl: data.name_pl || null,
      name_de: data.name_de || null,
      description_en: data.description_en || null,
      description_pl: data.description_pl || null,
      description_de: data.description_de || null,
      supplierName: data.supplierName || null,
      supplierLink: data.supplierLink || null,
      priceComment: data.priceComment || null,
      stock: data.stock ?? 0,
      price: data.price ?? 0,
      sizeLength: data.sizeLength ?? null,
      sizeWidth: data.sizeWidth ?? null,
      weight: data.weight ?? null,
      length: data.length ?? null,
      published: true,
      categoryId: data.categoryId || null,
      catalogId: (data as any).catalogId || 'default',
      createdAt: now,
      updatedAt: now,
      images: [],
      catalogs: [],
      tags: [],
      producers: [],
      parameters: normalizeProductParameterValues(data.parameters),
      imageLinks: data.imageLinks || [],
      imageBase64s: data.imageBase64s || [],
      noteIds: data.noteIds || [],
    };

    await collection.insertOne(doc);
    return toProductResponse(doc);
  },

  async updateProduct(
    id: string,
    data: ProductUpdateInput,
    getCollection: () => Promise<any>
  ): Promise<ProductRecord | null> {
    const collection = await getCollection();
    const filter = buildProductIdFilter(id);
    const now = new Date();

    const updates: any = {
      $set: {
        updatedAt: now,
      },
    };

    if (data.sku !== undefined) updates.$set.sku = data.sku;
    if (data.baseProductId !== undefined) updates.$set.baseProductId = data.baseProductId;
    if (data.defaultPriceGroupId !== undefined)
      updates.$set.defaultPriceGroupId = data.defaultPriceGroupId;
    if (data.ean !== undefined) updates.$set.ean = data.ean;
    if (data.gtin !== undefined) updates.$set.gtin = data.gtin;
    if (data.asin !== undefined) updates.$set.asin = data.asin;

    if (data.name_en !== undefined) {
      updates.$set.name_en = data.name_en;
    }
    if (data.name_pl !== undefined) {
      updates.$set.name_pl = data.name_pl;
    }
    if (data.name_de !== undefined) {
      updates.$set.name_de = data.name_de;
    }

    if (data.description_en !== undefined) {
      updates.$set.description_en = data.description_en;
    }
    if (data.description_pl !== undefined) {
      updates.$set.description_pl = data.description_pl;
    }
    if (data.description_de !== undefined) {
      updates.$set.description_de = data.description_de;
    }

    if (data.supplierName !== undefined) updates.$set.supplierName = data.supplierName;
    if (data.supplierLink !== undefined) updates.$set.supplierLink = data.supplierLink;
    if (data.priceComment !== undefined) updates.$set.priceComment = data.priceComment;
    if (data.stock !== undefined) updates.$set.stock = data.stock;
    if (data.price !== undefined) updates.$set.price = data.price;
    if (data.sizeLength !== undefined) updates.$set.sizeLength = data.sizeLength;
    if (data.sizeWidth !== undefined) updates.$set.sizeWidth = data.sizeWidth;
    if (data.weight !== undefined) updates.$set.weight = data.weight;
    if (data.length !== undefined) updates.$set.length = data.length;
    if (data.categoryId !== undefined) {
      updates.$set.categoryId = data.categoryId;
    }
    if (data.parameters !== undefined)
      updates.$set.parameters = normalizeProductParameterValues(data.parameters);
    if (data.imageLinks !== undefined) updates.$set.imageLinks = data.imageLinks;
    if (data.imageBase64s !== undefined) updates.$set.imageBase64s = data.imageBase64s;
    if (data.noteIds !== undefined) updates.$set.noteIds = data.noteIds;

    const result = await collection.findOneAndUpdate(filter, updates, {
      returnDocument: 'after',
    });

    if (!result) return null;
    return toProductResponse(result);
  },

  async deleteProduct(
    id: string,
    getCollection: () => Promise<any>
  ): Promise<ProductRecord | null> {
    const collection = await getCollection();
    const filter = buildProductIdFilter(id);
    const doc = await collection.findOne(filter);
    if (!doc) return null;

    await collection.deleteOne(filter);
    return toProductResponse(doc);
  },

  async bulkCreateProducts(
    data: ProductCreateInput[],
    createProduct: (d: any) => Promise<any>
  ): Promise<number> {
    if (data.length === 0) return 0;
    let count = 0;
    for (const item of data) {
      await createProduct(item);
      count += 1;
    }
    return count;
  },

  async duplicateProduct(
    id: string,
    newSku: string,
    getProductById: (id: string) => Promise<any>,
    createProduct: (d: any) => Promise<any>
  ): Promise<ProductRecord | null> {
    const product = await getProductById(id);
    if (!product) return null;

    const { id: _id, createdAt: _c, updatedAt: _u, sku: _s, ...rest } = product;
    return await createProduct({
      ...rest,
      sku: newSku,
    });
  },
};
