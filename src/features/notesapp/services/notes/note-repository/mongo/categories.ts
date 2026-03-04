import { randomUUID } from 'crypto';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { Filter, UpdateFilter } from 'mongodb';

import type { CategoryDocument, NoteDocument } from '../../types/mongo-note-types';
import type {
  CategoryRecord,
  CategoryWithChildren,
  CategoryCreateInput,
  CategoryUpdateInput,
} from '@/shared/contracts/notes';
import { notFoundError } from '@/shared/errors/app-error';

const categoryCollectionName = 'categories';
const noteCollectionName = 'notes';

const toCategoryRecord = (doc: CategoryDocument): CategoryRecord => ({
  id: doc.id ?? doc._id,
  name: doc.name,
  description: doc.description ?? null,
  color: doc.color ?? null,
  parentId: doc.parentId ?? null,
  notebookId: doc.notebookId ?? null,
  themeId: doc.themeId ?? null,
  sortIndex: doc.sortIndex ?? null,
  createdAt: typeof doc.createdAt === 'string' ? doc.createdAt : doc.createdAt.toISOString(),
  updatedAt:
    typeof doc.updatedAt === 'string' ? doc.updatedAt : (doc.updatedAt?.toISOString() ?? null),
});

const buildCategoryTree = (categories: CategoryRecord[]): CategoryWithChildren[] => {
  const categoryMap: Record<string, CategoryWithChildren> = {};
  categories.forEach((category) => {
    categoryMap[category.id] = { ...category, children: [], notes: [] };
  });

  const rootCategories: CategoryWithChildren[] = [];
  categories.forEach((category) => {
    const current = categoryMap[category.id];
    if (!current) return;
    if (!category.parentId) {
      rootCategories.push(current);
      return;
    }

    const parent = categoryMap[category.parentId];
    if (parent) {
      parent.children.push(current);
      return;
    }

    rootCategories.push(current);
  });

  return rootCategories;
};

type MongoCategoryImpl = {
  getAllCategories: (notebookId: string) => Promise<CategoryRecord[]>;
  getCategoryById: (id: string) => Promise<CategoryRecord | null>;
  getCategoryTree: (notebookId: string) => Promise<CategoryWithChildren[]>;
  createCategory: (data: CategoryCreateInput) => Promise<CategoryRecord>;
  updateCategory: (id: string, data: CategoryUpdateInput) => Promise<CategoryRecord>;
  deleteCategory: (id: string) => Promise<void>;
};

export const mongoCategoryImpl: MongoCategoryImpl = {
  async getAllCategories(notebookId: string): Promise<CategoryRecord[]> {
    const db = await getMongoDb();
    const collection = db.collection<CategoryDocument>(categoryCollectionName);
    const docs = await collection.find({ notebookId }).sort({ name: 1 }).toArray();
    return docs.map((doc) => toCategoryRecord(doc));
  },

  async getCategoryById(id: string): Promise<CategoryRecord | null> {
    const db = await getMongoDb();
    const collection = db.collection<CategoryDocument>(categoryCollectionName);
    const doc = await collection.findOne({
      $or: [{ id }, { _id: id }],
    } as Filter<CategoryDocument>);
    return doc ? toCategoryRecord(doc) : null;
  },

  async getCategoryTree(notebookId: string): Promise<CategoryWithChildren[]> {
    const categories = await mongoCategoryImpl.getAllCategories(notebookId);
    return buildCategoryTree(categories);
  },

  async createCategory(data: CategoryCreateInput): Promise<CategoryRecord> {
    const db = await getMongoDb();
    const collection = db.collection<CategoryDocument>(categoryCollectionName);
    const id = randomUUID();
    const now = new Date();
    const doc: CategoryDocument = {
      _id: id,
      id,
      name: data.name,
      color: data.color ?? null,
      parentId: data.parentId ?? null,
      notebookId: data.notebookId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await collection.insertOne(doc);
    return toCategoryRecord(doc);
  },

  async updateCategory(id: string, data: CategoryUpdateInput): Promise<CategoryRecord> {
    const db = await getMongoDb();
    const collection = db.collection<CategoryDocument>(categoryCollectionName);
    const now = new Date();
    const update: UpdateFilter<CategoryDocument> = {
      $set: {
        updatedAt: now.toISOString(),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
      },
    };
    const result = await collection.findOneAndUpdate(
      { $or: [{ id }, { _id: id }] } as Filter<CategoryDocument>,
      update,
      { returnDocument: 'after' }
    );
    if (!result) throw notFoundError('Category not found');

    const category = toCategoryRecord(result);
    await db
      .collection<NoteDocument>(noteCollectionName)
      .updateMany(
        { 'categories.categoryId': category.id } as Filter<NoteDocument>,
        { $set: { 'categories.$.category': category } } as UpdateFilter<NoteDocument>
      );

    return category;
  },

  async deleteCategory(id: string): Promise<void> {
    const db = await getMongoDb();
    const collection = db.collection<CategoryDocument>(categoryCollectionName);
    const result = await collection.deleteOne({
      $or: [{ id }, { _id: id }],
    } as Filter<CategoryDocument>);
    if (result.deletedCount === 0) throw notFoundError('Category not found');

    // Update children parentId to null
    await collection.updateMany(
      { parentId: id } as Filter<CategoryDocument>,
      { $set: { parentId: null } } as UpdateFilter<CategoryDocument>
    );

    // Remove from notes
    await db
      .collection<NoteDocument>(noteCollectionName)
      .updateMany(
        {} as Filter<NoteDocument>,
        { $pull: { categories: { categoryId: id } } } as UpdateFilter<NoteDocument>
      );
  },
};
