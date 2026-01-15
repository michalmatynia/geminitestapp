import { randomUUID } from "crypto";
import type { Filter, WithId } from "mongodb";
import { getMongoDb } from "@/lib/db/mongo-client";
import type {
  NoteRecord,
  NoteWithRelations,
  CreateNoteInput,
  UpdateNoteInput,
  NoteFilters,
  TagRecord,
  CategoryRecord,
  CreateTagInput,
  UpdateTagInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  NoteTagRecord,
  NoteCategoryRecord,
} from "@/types/notes";
import type { NoteRepository } from "@/types/services/note-repository";

type NoteDocument = NoteRecord & {
  _id: string;
  tags?: NoteTagRecord[];
  categories?: NoteCategoryRecord[];
};

type TagDocument = TagRecord & { _id: string };
type CategoryDocument = CategoryRecord & { _id: string };

const noteCollectionName = "notes";
const tagCollectionName = "tags";
const categoryCollectionName = "categories";

const toNoteResponse = (doc: WithId<NoteDocument>): NoteWithRelations => ({
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
  createdAt: doc.createdAt ?? new Date(),
  updatedAt: doc.updatedAt ?? new Date(),
});

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
    let tags: NoteTagRecord[] = [];
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
    let categories: NoteCategoryRecord[] = [];
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
      const tags: NoteTagRecord[] = tagDocs.map((tag) => ({
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
      const categories: NoteCategoryRecord[] = categoryDocs.map((cat) => ({
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
    await collection.deleteOne({ $or: [{ id }, { _id: id }] });
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
    await collection.deleteOne({ $or: [{ id }, { _id: id }] });

    // Remove tag from all notes
    const noteCollection = db.collection<NoteDocument>(noteCollectionName);
    await noteCollection.updateMany(
      { "tags.tagId": id },
      { $pull: { tags: { tagId: id } } }
    );
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
    if (!category) return;

    // Move children to parent (or null if deleting root folder)
    await collection.updateMany(
      { parentId: id },
      { $set: { parentId: category.parentId } }
    );

    // Delete the category
    await collection.deleteOne({ $or: [{ id }, { _id: id }] });

    // Remove category from all notes
    const noteCollection = db.collection<NoteDocument>(noteCollectionName);
    await noteCollection.updateMany(
      { "categories.categoryId": id },
      { $pull: { categories: { categoryId: id } } }
    );
  },

  // Tag/Category assignment operations
  async assignTags(noteId, tagIds) {
    const db = await getMongoDb();
    const noteCollection = db.collection<NoteDocument>(noteCollectionName);
    const tagCollection = db.collection<TagDocument>(tagCollectionName);

    const tagDocs = await tagCollection
      .find({ $or: tagIds.map((tagId) => ({ $or: [{ id: tagId }, { _id: tagId }] })) })
      .toArray();

    const now = new Date();
    const tags: NoteTagRecord[] = tagDocs.map((tag) => ({
      noteId,
      tagId: tag.id ?? tag._id,
      assignedAt: now,
      tag: toTagResponse(tag),
    }));

    await noteCollection.updateOne(
      { $or: [{ id: noteId }, { _id: noteId }] },
      { $push: { tags: { $each: tags } }, $set: { updatedAt: now } }
    );
  },

  async removeTags(noteId, tagIds) {
    const db = await getMongoDb();
    const collection = db.collection<NoteDocument>(noteCollectionName);
    await collection.updateOne(
      { $or: [{ id: noteId }, { _id: noteId }] },
      { $pull: { tags: { tagId: { $in: tagIds } } }, $set: { updatedAt: new Date() } }
    );
  },

  async assignCategories(noteId, categoryIds) {
    const db = await getMongoDb();
    const noteCollection = db.collection<NoteDocument>(noteCollectionName);
    const categoryCollection = db.collection<CategoryDocument>(categoryCollectionName);

    const categoryDocs = await categoryCollection
      .find({ $or: categoryIds.map((catId) => ({ $or: [{ id: catId }, { _id: catId }] })) })
      .toArray();

    const now = new Date();
    const categories: NoteCategoryRecord[] = categoryDocs.map((cat) => ({
      noteId,
      categoryId: cat.id ?? cat._id,
      assignedAt: now,
      category: toCategoryResponse(cat),
    }));

    await noteCollection.updateOne(
      { $or: [{ id: noteId }, { _id: noteId }] },
      { $push: { categories: { $each: categories } }, $set: { updatedAt: now } }
    );
  },

  async removeCategories(noteId, categoryIds) {
    const db = await getMongoDb();
    const collection = db.collection<NoteDocument>(noteCollectionName);
    await collection.updateOne(
      { $or: [{ id: noteId }, { _id: noteId }] },
      { $pull: { categories: { categoryId: { $in: categoryIds } } }, $set: { updatedAt: new Date() } }
    );
  },
};
