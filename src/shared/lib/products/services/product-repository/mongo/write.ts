import { randomUUID } from 'crypto';

import { Collection, UpdateFilter, WithId } from 'mongodb';

import { ProductCreateInput, ProductUpdateInput } from '@/shared/contracts/products/io';
import { ProductRecord, ProductWithImages } from '@/shared/contracts/products/product';

import { ProductDocument, toProductResponse } from '../mongo-product-repository-mappers';
import {
  buildProductIdFilter,
  normalizeProductParameterValues,
} from '../mongo-product-repository.helpers';

export const mongoProductWriteImpl = {
  async createProduct(
    data: ProductCreateInput,
    getCollection: () => Promise<Collection<ProductDocument>>
  ): Promise<ProductRecord> {
    const collection = await getCollection();
    const id = data.id || randomUUID();
    const now = new Date();
    const storageInput = data as ProductCreateInput & { catalogId?: string | null };

    const doc: ProductDocument = {
      _id: id,
      id,
      sku: data.sku,
      baseProductId: data.baseProductId || null,
      importSource: data.importSource ?? null,
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
      shippingGroupId: data.shippingGroupId || null,
      catalogId: storageInput.catalogId || 'default',
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
    return toProductResponse(doc as WithId<ProductDocument>);
  },

  async updateProduct(
    id: string,
    data: ProductUpdateInput,
    getCollection: () => Promise<Collection<ProductDocument>>
  ): Promise<ProductRecord | null> {
    const collection = await getCollection();
    const filter = buildProductIdFilter(id);
    const now = new Date();

    const updates: UpdateFilter<ProductDocument> = {
      $set: {
        updatedAt: now,
      },
    };

    const set = updates.$set as Record<string, unknown>;

    if (data.sku !== undefined) set['sku'] = data.sku;
    if (data.baseProductId !== undefined) set['baseProductId'] = data.baseProductId;
    if (data.importSource !== undefined) set['importSource'] = data.importSource;
    if (data.defaultPriceGroupId !== undefined)
      set['defaultPriceGroupId'] = data.defaultPriceGroupId;
    if (data.ean !== undefined) set['ean'] = data.ean;
    if (data.gtin !== undefined) set['gtin'] = data.gtin;
    if (data.asin !== undefined) set['asin'] = data.asin;

    if (data.name_en !== undefined) {
      set['name_en'] = data.name_en;
    }
    if (data.name_pl !== undefined) {
      set['name_pl'] = data.name_pl;
    }
    if (data.name_de !== undefined) {
      set['name_de'] = data.name_de;
    }

    if (data.description_en !== undefined) {
      set['description_en'] = data.description_en;
    }
    if (data.description_pl !== undefined) {
      set['description_pl'] = data.description_pl;
    }
    if (data.description_de !== undefined) {
      set['description_de'] = data.description_de;
    }

    if (data.supplierName !== undefined) set['supplierName'] = data.supplierName;
    if (data.supplierLink !== undefined) set['supplierLink'] = data.supplierLink;
    if (data.priceComment !== undefined) set['priceComment'] = data.priceComment;
    if (data.stock !== undefined) set['stock'] = data.stock;
    if (data.price !== undefined) set['price'] = data.price;
    if (data.sizeLength !== undefined) set['sizeLength'] = data.sizeLength;
    if (data.sizeWidth !== undefined) set['sizeWidth'] = data.sizeWidth;
    if (data.weight !== undefined) set['weight'] = data.weight;
    if (data.length !== undefined) set['length'] = data.length;
    if (data.categoryId !== undefined) {
      set['categoryId'] = data.categoryId;
    }
    if (data.shippingGroupId !== undefined) {
      set['shippingGroupId'] = data.shippingGroupId;
    }
    if (data.parameters !== undefined)
      set['parameters'] = normalizeProductParameterValues(data.parameters);
    if (data.imageLinks !== undefined) set['imageLinks'] = data.imageLinks;
    if (data.imageBase64s !== undefined) set['imageBase64s'] = data.imageBase64s;
    if (data.noteIds !== undefined) set['noteIds'] = data.noteIds;

    const result = await collection.findOneAndUpdate(filter, updates, {
      returnDocument: 'after',
    });

    if (!result) return null;
    return toProductResponse(result);
  },

  async deleteProduct(
    id: string,
    getCollection: () => Promise<Collection<ProductDocument>>
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
    createProduct: (d: ProductCreateInput) => Promise<ProductRecord>
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
    getProductById: (id: string) => Promise<ProductWithImages | null>,
    createProduct: (d: ProductCreateInput) => Promise<ProductRecord>
  ): Promise<ProductRecord | null> {
    const product = await getProductById(id);
    if (!product) return null;

    const {
      id: _id,
      createdAt: _c,
      updatedAt: _u,
      sku: _s,
      baseProductId: _baseProductId,
      importSource: _importSource,
      images: _i,
      catalogs: _cat,
      tags: _t,
      producers: _p,
      ...rest
    } = product;
    const duplicateInput = {
      ...rest,
      sku: newSku,
      baseProductId: null,
      importSource: null,
    } as ProductCreateInput;
    return await createProduct(duplicateInput);
  },
};
