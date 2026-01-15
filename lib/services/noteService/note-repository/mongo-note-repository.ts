import { randomUUID } from "crypto";
import type { Filter, WithId } from "mongodb";
import { getMongoDb } from "@/lib/db/mongo-client";
import type {
  NoteWithRelations as NoteRecord,
  NoteFilters,
  TagRecord,
  CategoryRecord,
  CategoryWithChildren,
} from "@/types/notes";
import type { NoteRepository } from "@/types/services/note-repository";

// Helper types for documents in MongoDB
type NoteTagEmbedded = {
  noteId: string;
  tagId: string;
  assignedAt: Date;
  tag: TagRecord;
};

type NoteCategoryEmbedded = {
  noteId: string;
  categoryId: string;
  assignedAt: Date;
  category: CategoryRecord;
};

type NoteDocument = Omit<NoteRecord, "tags" | "categories"> & {
  _id: string;
  tags: NoteTagEmbedded[];
  categories: NoteCategoryEmbedded[];
};

type TagDocument = TagRecord & { _id: string };
type CategoryDocument = CategoryRecord & { _id: string };

const noteCollectionName = "notes";
const tagCollectionName = "tags";
const categoryCollectionName = "categories";

const toNoteResponse = (doc: WithId<NoteDocument>): NoteRecord => ({
  id: doc.id ?? doc._id,
  title: doc.title,
  content: doc.content,
  color: doc.color ?? null,
  isPinned: doc.isPinned ?? false,
  isArchived: doc.isArchived ?? false,
  createdAt: doc.createdAt ?? new Date(),
  updatedAt: doc.updatedAt ?? new Date(),
  tags: Array.isArray(doc.tags) ? doc.tags : [],
  categories: Array.isArray(doc.categories) ? doc.categories : [],
});

const toTagResponse = (doc: WithId<TagDocument>): TagRecord => ({
  id: doc.id ?? doc._id,
  name: doc.name,
  color: doc.color ?? null,
  createdAt: doc.createdAt ?? new Date(),
  updatedAt: doc.updatedAt ?? new Date(),
});

const toCategoryResponse = (doc: WithId<CategoryDocument>): CategoryRecord => ({
  id: doc.id ?? doc._id,
  name: doc.name,
  description: doc.description ?? null,
  color: doc.color ?? null,
  parentId: doc.parentId ?? null,
  createdAt: doc.createdAt ?? new Date(),
  updatedAt: doc.updatedAt ?? new Date(),
});

const buildTree = (categories: CategoryRecord[]): CategoryWithChildren[] => {
  const categoryMap: Record<string, CategoryWithChildren> = {};
  categories.forEach((cat) => {
    categoryMap[cat.id] = { ...cat, children: [], notes: [] };
  });

  const rootCategories: CategoryWithChildren[] = [];

  categories.forEach((cat) => {
    if (cat.parentId && categoryMap[cat.parentId]) {
      categoryMap[cat.parentId].children.push(categoryMap[cat.id]);
    } else {
      rootCategories.push(categoryMap[cat.id]);
    }
  });

  return rootCategories;
};

const buildSearchFilter = (filters: NoteFilters = {}): Filter<NoteDocument> => {
  const filter: Filter<NoteDocument> = {};

  if (filters.search) {
    const regex = { $regex: filters.search, $options: "i" };
    filter.$or = [{ title: regex }, { content: regex }];
  }

  if (typeof filters.isPinned === "boolean") {
    filter.isPinned = filters.isPinned;
  }

  if (typeof filters.isArchived === "boolean") {
    filter.isArchived = filters.isArchived;
  }

  if (filters.tagIds && filters.tagIds.length > 0) {
    filter["tags.tagId"] = { $in: filters.tagIds };
  }

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    filter["categories.categoryId"] = { $in: filters.categoryIds };
  }

  return filter;
};

export const mongoNoteRepository: NoteRepository = {
  // Note CRUD operations
  async getAll(filters = {}) {
    const db = await getMongoDb();
    const collection = db.collection<NoteDocument>(noteCollectionName);
    const searchFilter = buildSearchFilter(filters);
    const docs = await collection.find(searchFilter).sort({ updatedAt: -1 }).toArray();
    return docs.map(toNoteResponse);
  },

  async getById(id) {
    const db = await getMongoDb();
    const collection = db.collection<NoteDocument>(noteCollectionName);
    const doc = await collection.findOne({ $or: [{ id }, { _id: id }] });
    return doc ? toNoteResponse(doc) : null;
  },

  async create(data) {
    const db = await getMongoDb();
    const collection = db.collection<NoteDocument>(noteCollectionName);

    const id = randomUUID();
    const now = new Date();

    // Fetch tags if provided
    let tags: NoteTagEmbedded[] = [];
    if (data.tagIds && data.tagIds.length > 0) {
      const tagCollection = db.collection<TagDocument>(tagCollectionName);
      const tagDocs = await tagCollection
        .find({ $or: data.tagIds.map((tagId) => ({ $or: [{ id: tagId }, { _id: tagId }] })) })
        .toArray();
      tags = tagDocs.map((tag) => ({
        noteId: id,
        tagId: tag.id ?? tag._id,
        assignedAt: now,
        tag: toTagResponse(tag),
      }));
    }

    // Fetch categories if provided
    let categories: NoteCategoryEmbedded[] = [];
    if (data.categoryIds && data.categoryIds.length > 0) {
      const categoryCollection = db.collection<CategoryDocument>(categoryCollectionName);
      const categoryDocs = await categoryCollection
        .find({ $or: data.categoryIds.map((catId) => ({ $or: [{ id: catId }, { _id: catId }] })) })
        .toArray();
      categories = categoryDocs.map((cat) => ({
        noteId: id,
        categoryId: cat.id ?? cat._id,
        assignedAt: now,
        category: toCategoryResponse(cat),
      }));
    }

    const doc: NoteDocument = {
      _id: id,
      id,
      title: data.title,
      content: data.content,
      color: data.color ?? "#ffffff",
      isPinned: data.isPinned ?? false,
      isArchived: data.isArchived ?? false,
      createdAt: now,
      updatedAt: now,
      tags,
      categories,
    };

    await collection.insertOne(doc as any);
    return toNoteResponse(doc as WithId<NoteDocument>);
  },

  async update(id, data) {
    const db = await getMongoDb();
    const collection = db.collection<NoteDocument>(noteCollectionName);

    const updateDoc: any = {
      $set: {
        updatedAt: new Date(),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
        ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
      },
    };

    // Handle tags update
    if (data.tagIds) {
      const now = new Date();
      const tagCollection = db.collection<TagDocument>(tagCollectionName);
      const tagDocs = await tagCollection
        .find({ $or: data.tagIds.map((tagId) => ({ $or: [{ id: tagId }, { _id: tagId }] })) })
        .toArray();
      const tags: NoteTagEmbedded[] = tagDocs.map((tag) => ({
        noteId: id,
        tagId: tag.id ?? tag._id,
        assignedAt: now,
        tag: toTagResponse(tag),
      }));
      updateDoc.$set.tags = tags;
    }

    // Handle categories update
    if (data.categoryIds) {
      const now = new Date();
      const categoryCollection = db.collection<CategoryDocument>(categoryCollectionName);
      const categoryDocs = await categoryCollection
        .find({ $or: data.categoryIds.map((catId) => ({ $or: [{ id: catId }, { _id: catId }] })) })
        .toArray();
      const categories: NoteCategoryEmbedded[] = categoryDocs.map((cat) => ({
        noteId: id,
        categoryId: cat.id ?? cat._id,
        assignedAt: now,
        category: toCategoryResponse(cat),
      }));
      updateDoc.$set.categories = categories;
    }

    const result = await collection.findOneAndUpdate(
      { $or: [{ id }, { _id: id }] },
      updateDoc,
      { returnDocument: "after" }
    );

    if (!result) throw new Error("Note not found");
    return toNoteResponse(result);
  },

  async delete(id) {
    const db = await getMongoDb();
    const collection = db.collection<NoteDocument>(noteCollectionName);
    const result = await collection.deleteOne({ $or: [{ id }, { _id: id }] });
    return result.deletedCount > 0;
  },

  // Tag operations
  async getAllTags() {
    const db = await getMongoDb();
    const collection = db.collection<TagDocument>(tagCollectionName);
    const docs = await collection.find({}).sort({ name: 1 }).toArray();
    return docs.map(toTagResponse);
  },

  async getTagById(id) {
    const db = await getMongoDb();
    const collection = db.collection<TagDocument>(tagCollectionName);
    const doc = await collection.findOne({ $or: [{ id }, { _id: id }] });
    return doc ? toTagResponse(doc) : null;
  },

  async createTag(data) {
    const db = await getMongoDb();
    const collection = db.collection<TagDocument>(tagCollectionName);

    const id = randomUUID();
    const now = new Date();

    const doc: TagDocument = {
      _id: id,
      id,
      name: data.name,
      color: data.color ?? "#3b82f6",
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(doc as any);
    return toTagResponse(doc as WithId<TagDocument>);
  },

  async updateTag(id, data) {
    const db = await getMongoDb();
    const collection = db.collection<TagDocument>(tagCollectionName);

    const updateDoc: any = {
      $set: {
        updatedAt: new Date(),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
      },
    };

    const result = await collection.findOneAndUpdate(
      { $or: [{ id }, { _id: id }] },
      updateDoc,
      { returnDocument: "after" }
    );

    if (!result) throw new Error("Tag not found");
    return toTagResponse(result);
  },

  async deleteTag(id) {
    const db = await getMongoDb();
    const collection = db.collection<TagDocument>(tagCollectionName);
    const result = await collection.deleteOne({ $or: [{ id }, { _id: id }] });

    // Remove tag from all notes
    const noteCollection = db.collection<NoteDocument>(noteCollectionName);
    await noteCollection.updateMany(
      { "tags.tagId": id },
      { $pull: { tags: { tagId: id } } as any }
    );
    
    return result.deletedCount > 0;
  },

  // Category operations
  async getAllCategories() {
    const db = await getMongoDb();
    const collection = db.collection<CategoryDocument>(categoryCollectionName);
    const docs = await collection.find({}).sort({ name: 1 }).toArray();
    return docs.map(toCategoryResponse);
  },

  async getCategoryById(id) {
    const db = await getMongoDb();
    const collection = db.collection<CategoryDocument>(categoryCollectionName);
    const doc = await collection.findOne({ $or: [{ id }, { _id: id }] });
    return doc ? toCategoryResponse(doc) : null;
  },

  async getCategoryTree() {
    const db = await getMongoDb();
    const collection = db.collection<CategoryDocument>(categoryCollectionName);
    const docs = await collection.find({}).sort({ name: 1 }).toArray();
    const categories = docs.map(toCategoryResponse);
    return buildTree(categories);
  },

  async createCategory(data) {
    const db = await getMongoDb();
    const collection = db.collection<CategoryDocument>(categoryCollectionName);

    const id = randomUUID();
    const now = new Date();

    const doc: CategoryDocument = {
      _id: id,
      id,
      name: data.name,
      description: data.description ?? null,
      color: data.color ?? "#10b981",
      parentId: data.parentId ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(doc as any);
    return toCategoryResponse(doc as WithId<CategoryDocument>);
  },

  async updateCategory(id, data) {
    const db = await getMongoDb();
    const collection = db.collection<CategoryDocument>(categoryCollectionName);

    const updateDoc: any = {
      $set: {
        updatedAt: new Date(),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
      },
    };

    const result = await collection.findOneAndUpdate(
      { $or: [{ id }, { _id: id }] },
      updateDoc,
      { returnDocument: "after" }
    );

    if (!result) throw new Error("Category not found");
    return toCategoryResponse(result);
  },

  async deleteCategory(id) {
    const db = await getMongoDb();
    const collection = db.collection<CategoryDocument>(categoryCollectionName);

    // Get the category to find its parent
    const category = await collection.findOne({ $or: [{ id }, { _id: id }] });
    if (!category) return false;

    // Move children to parent (or null if deleting root folder)
    await collection.updateMany(
      { parentId: id },
      { $set: { parentId: category.parentId } }
    );

    // Delete the category
    const result = await collection.deleteOne({ $or: [{ id }, { _id: id }] });

    // Remove category from all notes
    const noteCollection = db.collection<NoteDocument>(noteCollectionName);
    await noteCollection.updateMany(
      { "categories.categoryId": id },
      { $pull: { categories: { categoryId: id } } as any }
    );

    return result.deletedCount > 0;
  },
};