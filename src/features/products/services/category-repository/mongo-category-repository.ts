import { ObjectId } from 'mongodb';

import type { 
  CategoryRepository, 
  CategoryFilters 
} from '@/features/products/types/services/category-repository';
import type { 
  CreateProductCategoryDto, 
  UpdateProductCategoryDto 
} from '@/shared/dtos';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { 
  ProductCategory, 
  ProductCategoryWithChildren 
} from '@/shared/types/domain/products';

import type { Filter, UpdateFilter, Document } from 'mongodb';

const COLLECTION = 'product_categories';

interface ProductCategoryDoc extends Document {
  _id: ObjectId;
  name: string;
  description: string | null;
  color: string | null;
  parentId: ObjectId | null;
  catalogId: string;
  createdAt: Date;
  updatedAt: Date;
}

const toCategoryDomain = (doc: ProductCategoryDoc): ProductCategory => ({
  id: doc._id.toString(),
  name: doc.name,
  description: doc.description ?? null,
  color: doc.color ?? null,
  parentId: doc.parentId?.toString() ?? null,
  catalogId: doc.catalogId?.toString(),
  createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
  updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
});

export const mongoCategoryRepository: CategoryRepository = {
  async listCategories(filters: CategoryFilters): Promise<ProductCategory[]> {
    const db = await getMongoDb();
    const query: Filter<ProductCategoryDoc> = {};
    
    if (filters.catalogId) {
      query.catalogId = filters.catalogId;
    }
    
    if (filters.parentId !== undefined) {
      query.parentId = filters.parentId ? new ObjectId(filters.parentId) : null;
    }
    
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ] as Filter<ProductCategoryDoc>[];
    }

    const categories = await db.collection<ProductCategoryDoc>(COLLECTION).find(query).sort({ name: 1 }).toArray();
    return categories.map(toCategoryDomain);
  },

  async getCategoryTree(catalogId?: string): Promise<ProductCategoryWithChildren[]> {
    const db = await getMongoDb();
    const query: Filter<ProductCategoryDoc> = catalogId ? { catalogId } : {};
    const allCategories = await db.collection<ProductCategoryDoc>(COLLECTION).find(query).toArray();
    
    const categoryMap = new Map<string, ProductCategoryWithChildren>();
    allCategories.forEach(cat => {
      categoryMap.set(cat._id.toString(), { ...toCategoryDomain(cat), children: [] });
    });

    const roots: ProductCategoryWithChildren[] = [];
    categoryMap.forEach(cat => {
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId)!.children.push(cat);
      } else {
        roots.push(cat);
      }
    });

    return roots;
  },

  async getCategoryById(id: string): Promise<ProductCategory | null> {
    const db = await getMongoDb();
    const doc = await db.collection<ProductCategoryDoc>(COLLECTION).findOne({ _id: new ObjectId(id) });
    return doc ? toCategoryDomain(doc) : null;
  },

  async getCategoryWithChildren(id: string): Promise<ProductCategoryWithChildren | null> {
    const db = await getMongoDb();
    const cat = await this.getCategoryById(id);
    if (!cat) return null;

    const children = await db.collection<ProductCategoryDoc>(COLLECTION).find({ parentId: new ObjectId(id) }).toArray();
    return {
      ...cat,
      children: children.map(toCategoryDomain).map(c => ({ ...c, children: [] })),
    };
  },

  async createCategory(data: CreateProductCategoryDto): Promise<ProductCategory> {
    const db = await getMongoDb();
    const now = new Date();
    const doc: Omit<ProductCategoryDoc, '_id'> = {
      name: data.name,
      description: data.description ?? null,
      color: data.color ?? null,
      parentId: data.parentId ? new ObjectId(data.parentId) : null,
      catalogId: data.catalogId,
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection<Omit<ProductCategoryDoc, '_id'>>(COLLECTION).insertOne(doc);
    return toCategoryDomain({ ...doc, _id: result.insertedId } as ProductCategoryDoc);
  },

  async updateCategory(id: string, data: UpdateProductCategoryDto): Promise<ProductCategory> {
    const db = await getMongoDb();
    
    const set: Partial<ProductCategoryDoc> = {
      updatedAt: new Date(),
    };
    
    if (data.name !== undefined) set.name = data.name;
    if (data.description !== undefined) set.description = data.description;
    if (data.color !== undefined) set.color = data.color;
    if (data.parentId !== undefined) {
      set.parentId = data.parentId ? new ObjectId(data.parentId) : null;
    }

    await db.collection<ProductCategoryDoc>(COLLECTION).updateOne(
      { _id: new ObjectId(id) }, 
      { $set: set } as UpdateFilter<ProductCategoryDoc>
    );
    
    const updated = await this.getCategoryById(id);
    if (!updated) throw new Error('Failed to update category');
    return updated;
  },

  async deleteCategory(id: string): Promise<void> {
    const db = await getMongoDb();
    await db.collection<ProductCategoryDoc>(COLLECTION).deleteOne({ _id: new ObjectId(id) });
  },

  async findByName(catalogId: string, name: string, parentId: string | null = null): Promise<ProductCategory | null> {
    const db = await getMongoDb();
    const query: Filter<ProductCategoryDoc> = {
      catalogId,
      name,
      parentId: parentId ? new ObjectId(parentId) : null,
    };
    const doc = await db.collection<ProductCategoryDoc>(COLLECTION).findOne(query);
    return doc ? toCategoryDomain(doc) : null;
  },

  async isDescendant(categoryId: string, targetId: string): Promise<boolean> {
    if (categoryId === targetId) return true;
    const db = await getMongoDb();
    const children = await db
      .collection<ProductCategoryDoc>(COLLECTION)
      .find({ parentId: new ObjectId(categoryId) })
      .project<{ _id: ObjectId }>({ _id: 1 })
      .toArray();
    for (const child of children) {
      if (await this.isDescendant(child._id.toString(), targetId)) {
        return true;
      }
    }
    return false;
  },
};