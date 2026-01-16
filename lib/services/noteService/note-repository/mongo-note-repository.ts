import { randomUUID } from "crypto";
import type { Filter, WithId, UpdateFilter } from "mongodb";
import { getMongoDb } from "@/lib/db/mongo-client";
import type {
  NoteWithRelations as NoteRecord,
  NoteFilters,
  TagRecord,
  CategoryRecord,
  CategoryWithChildren,
  NotebookRecord,
  NotebookCreateInput,
  NotebookUpdateInput,
  NoteFileRecord,
  NoteFileCreateInput,
  ThemeRecord,
  ThemeCreateInput,
  ThemeUpdateInput,
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

type RelatedNoteEmbedded = {
  id: string;
  title: string;
  color: string | null;
};

type NoteRelationFromEmbedded = {
  sourceNoteId: string;
  targetNoteId: string;
  assignedAt: Date;
  targetNote: RelatedNoteEmbedded;
};

type NoteRelationToEmbedded = {
  sourceNoteId: string;
  targetNoteId: string;
  assignedAt: Date;
  sourceNote: RelatedNoteEmbedded;
};

type NoteDocument = Omit<NoteRecord, "tags" | "categories" | "relationsFrom" | "relationsTo"> & {
  _id: string;
  tags: NoteTagEmbedded[];
  categories: NoteCategoryEmbedded[];
  relationsFrom?: NoteRelationFromEmbedded[];
  relationsTo?: NoteRelationToEmbedded[];
};

type TagDocument = TagRecord & { _id: string };
type CategoryDocument = CategoryRecord & { _id: string };
type NotebookDocument = NotebookRecord & { _id: string };
type NoteFileDocument = NoteFileRecord & { _id: string };
type ThemeDocument = ThemeRecord & { _id: string };

const noteCollectionName = "notes";
const tagCollectionName = "tags";
const categoryCollectionName = "categories";
const notebookCollectionName = "notebooks";
const noteFileCollectionName = "noteFiles";
const themeCollectionName = "themes";

const toNoteResponse = (doc: WithId<NoteDocument>): NoteRecord => ({
  id: doc.id ?? doc._id,
  title: doc.title,
  content: doc.content,
  color: doc.color ?? null,
  isPinned: doc.isPinned ?? false,
  isArchived: doc.isArchived ?? false,
  isFavorite: doc.isFavorite ?? false,
  notebookId: doc.notebookId ?? null,
  createdAt: doc.createdAt ?? new Date(),
  updatedAt: doc.updatedAt ?? new Date(),
  tags: Array.isArray(doc.tags) ? doc.tags : [],
  categories: Array.isArray(doc.categories) ? doc.categories : [],
  relationsFrom: Array.isArray(doc.relationsFrom) ? doc.relationsFrom : [],
  relationsTo: Array.isArray(doc.relationsTo) ? doc.relationsTo : [],
});

const toTagResponse = (doc: WithId<TagDocument>): TagRecord => ({
  id: doc.id ?? doc._id,
  name: doc.name,
  color: doc.color ?? null,
  notebookId: doc.notebookId ?? null,
  createdAt: doc.createdAt ?? new Date(),
  updatedAt: doc.updatedAt ?? new Date(),
});

const toCategoryResponse = (doc: WithId<CategoryDocument>): CategoryRecord => ({
  id: doc.id ?? doc._id,
  name: doc.name,
  description: doc.description ?? null,
  color: doc.color ?? null,
  parentId: doc.parentId ?? null,
  notebookId: doc.notebookId ?? null,
  themeId: doc.themeId ?? null,
  createdAt: doc.createdAt ?? new Date(),
  updatedAt: doc.updatedAt ?? new Date(),
});

const toNotebookResponse = (doc: WithId<NotebookDocument>): NotebookRecord => ({
  id: doc.id ?? doc._id,
  name: doc.name,
  color: doc.color ?? null,
  defaultThemeId: doc.defaultThemeId ?? null,
  createdAt: doc.createdAt ?? new Date(),
  updatedAt: doc.updatedAt ?? new Date(),
});

const toThemeResponse = (doc: WithId<ThemeDocument>): ThemeRecord => ({
  id: doc.id ?? doc._id,
  name: doc.name,
  notebookId: doc.notebookId ?? null,
  textColor: doc.textColor,
  backgroundColor: doc.backgroundColor,
  markdownHeadingColor: doc.markdownHeadingColor,
  markdownLinkColor: doc.markdownLinkColor,
  markdownCodeBackground: doc.markdownCodeBackground,
  markdownCodeText: doc.markdownCodeText,
  relatedNoteBorderWidth: doc.relatedNoteBorderWidth,
  relatedNoteBorderColor: doc.relatedNoteBorderColor,
  relatedNoteBackgroundColor: doc.relatedNoteBackgroundColor,
  relatedNoteTextColor: doc.relatedNoteTextColor,
  createdAt: doc.createdAt ?? new Date(),
  updatedAt: doc.updatedAt ?? new Date(),
});

const toNoteFileResponse = (doc: WithId<NoteFileDocument>): NoteFileRecord => ({
  id: doc.id ?? doc._id,
  noteId: doc.noteId,
  slotIndex: doc.slotIndex,
  filename: doc.filename,
  filepath: doc.filepath,
  mimetype: doc.mimetype,
  size: doc.size,
  width: doc.width ?? null,
  height: doc.height ?? null,
  createdAt: doc.createdAt ?? new Date(),
  updatedAt: doc.updatedAt ?? new Date(),
});

const buildTree = (
  categories: CategoryRecord[],
  notes: NoteRecord[] = []
): CategoryWithChildren[] => {
  const categoryMap: Record<string, CategoryWithChildren> = {};
  categories.forEach((cat) => {
    categoryMap[cat.id] = { ...cat, children: [], notes: [] };
  });

  // Distribute notes to their respective categories
  notes.forEach((note) => {
    note.categories.forEach((nc) => {
      if (categoryMap[nc.categoryId]) {
        categoryMap[nc.categoryId].notes.push(note);
      }
    });
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

const buildIncomingRelationsMap = (
  notes: NoteRecord[]
): Map<string, NoteRelationToEmbedded[]> => {
  const incoming = new Map<string, NoteRelationToEmbedded[]>();

  notes.forEach((note) => {
    note.relationsFrom?.forEach((rel) => {
      const targetId = rel.targetNote?.id ?? rel.targetNoteId;
      if (!targetId) return;
      const relation: NoteRelationToEmbedded = {
        sourceNoteId: note.id,
        targetNoteId: targetId,
        assignedAt: rel.assignedAt ?? new Date(),
        sourceNote: {
          id: note.id,
          title: note.title,
          color: note.color ?? null,
        },
      };
      const existing = incoming.get(targetId) ?? [];
      existing.push(relation);
      incoming.set(targetId, existing);
    });
  });

  return incoming;
};

const buildSearchFilter = (filters: NoteFilters = {}): Filter<NoteDocument> => {
  const filter: Filter<NoteDocument> = {};
  if (filters.notebookId) {
    filter.notebookId = filters.notebookId;
  }

  if (filters.search) {
    const regex = { $regex: filters.search, $options: "i" };
    const searchScope = filters.searchScope || "both";

    if (searchScope === "both") {
      filter.$or = [{ title: regex }, { content: regex }];
    } else if (searchScope === "title") {
      filter.title = regex;
    } else if (searchScope === "content") {
      filter.content = regex;
    }
  }

  if (typeof filters.isPinned === "boolean") {
    filter.isPinned = filters.isPinned;
  }

  if (typeof filters.isArchived === "boolean") {
    filter.isArchived = filters.isArchived;
  }

  if (typeof filters.isFavorite === "boolean") {
    filter.isFavorite = filters.isFavorite;
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
  async getOrCreateDefaultNotebook(): Promise<NotebookRecord> {
    const db = await getMongoDb();
    const collection = db.collection<NotebookDocument>(notebookCollectionName);
    const existing = await collection.find({}).sort({ createdAt: 1 }).limit(1).toArray();
    const notebook = existing[0]
      ? toNotebookResponse(existing[0] as WithId<NotebookDocument>)
      : toNotebookResponse(
          (await (async () => {
            const id = randomUUID();
            const now = new Date();
            const doc: NotebookDocument = {
              _id: id,
              id,
              name: "Default",
              color: "#3b82f6",
              defaultThemeId: null,
              createdAt: now,
              updatedAt: now,
            };
            await collection.insertOne(doc);
            return doc as WithId<NotebookDocument>;
          })())
        );

    const noteCollection = db.collection<NoteDocument>(noteCollectionName);
    const tagCollection = db.collection<TagDocument>(tagCollectionName);
    const categoryCollection = db.collection<CategoryDocument>(categoryCollectionName);
    await noteCollection.updateMany(
      { $or: [{ notebookId: { $exists: false } }, { notebookId: null }] },
      { $set: { notebookId: notebook.id } }
    );
    await tagCollection.updateMany(
      { $or: [{ notebookId: { $exists: false } }, { notebookId: null }] },
      { $set: { notebookId: notebook.id } }
    );
    await categoryCollection.updateMany(
      { $or: [{ notebookId: { $exists: false } }, { notebookId: null }] },
      { $set: { notebookId: notebook.id } }
    );

    return notebook;
  },

  // Note CRUD operations
  async getAll(filters = {}) {
    const db = await getMongoDb();
    const resolvedNotebookId =
      filters.notebookId ?? (await mongoNoteRepository.getOrCreateDefaultNotebook()).id;
    const effectiveFilters = { ...filters, notebookId: resolvedNotebookId };
    const collection = db.collection<NoteDocument>(noteCollectionName);
    const searchFilter = buildSearchFilter(effectiveFilters);
    const docs = await collection.find(searchFilter).sort({ updatedAt: -1 }).toArray();
    const notes = docs.map(toNoteResponse);
    const noteIds = notes.map((note) => note.id);
    const noteFileCollection = db.collection<NoteFileDocument>(noteFileCollectionName);
    const noteFiles = noteIds.length
      ? await noteFileCollection
          .find({ noteId: { $in: noteIds } })
          .sort({ slotIndex: 1 })
          .toArray()
      : [];
    const filesByNoteId = new Map<string, NoteFileRecord[]>();
    noteFiles.forEach((fileDoc) => {
      const record = toNoteFileResponse(fileDoc);
      const list = filesByNoteId.get(record.noteId) ?? [];
      list.push(record);
      filesByNoteId.set(record.noteId, list);
    });
    const incomingMap = buildIncomingRelationsMap(notes);
    return notes.map((note) => ({
      ...note,
      files: filesByNoteId.get(note.id) ?? [],
      relationsTo: incomingMap.get(note.id) ?? [],
    }));
  },

  async getById(id) {
    const db = await getMongoDb();
    const collection = db.collection<NoteDocument>(noteCollectionName);
    const doc = await collection.findOne({ $or: [{ id }, { _id: id }] });
    if (!doc) return null;
    const note = toNoteResponse(doc);
    const noteFileCollection = db.collection<NoteFileDocument>(noteFileCollectionName);
    const noteFiles = await noteFileCollection
      .find({ noteId: note.id })
      .sort({ slotIndex: 1 })
      .toArray();
    const incomingDocs = await collection
      .find({ "relationsFrom.targetNoteId": note.id })
      .toArray();
    const relationsTo: NoteRelationToEmbedded[] = incomingDocs
      .map((incoming) => {
        const relation = incoming.relationsFrom?.find(
          (rel) =>
            rel.targetNoteId === note.id || rel.targetNote?.id === note.id
        );
        if (!relation) return null;
        const sourceId = incoming.id ?? incoming._id;
        return {
          sourceNoteId: sourceId,
          targetNoteId: note.id,
          assignedAt: relation.assignedAt ?? new Date(),
          sourceNote: {
            id: sourceId,
            title: incoming.title,
            color: incoming.color ?? null,
          },
        };
      })
      .filter((rel): rel is NoteRelationToEmbedded => rel !== null);
    return { ...note, files: noteFiles.map(toNoteFileResponse), relationsTo };
  },

  async create(data) {
    const db = await getMongoDb();
    const collection = db.collection<NoteDocument>(noteCollectionName);

    const id = randomUUID();
    const now = new Date();
    const resolvedNotebookId =
      data.notebookId ?? (await mongoNoteRepository.getOrCreateDefaultNotebook()).id;

    // Fetch tags if provided
    let tags: NoteTagEmbedded[] = [];
    if (data.tagIds && data.tagIds.length > 0) {
      const tagCollection = db.collection<TagDocument>(tagCollectionName);
      const tagDocs = await tagCollection
        .find({
          $or: data.tagIds.map((tagId) => ({ $or: [{ id: tagId }, { _id: tagId }] })),
          notebookId: resolvedNotebookId,
        })
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
        .find({
          $or: data.categoryIds.map((catId) => ({ $or: [{ id: catId }, { _id: catId }] })),
          notebookId: resolvedNotebookId,
        })
        .toArray();
      categories = categoryDocs.map((cat) => ({
        noteId: id,
        categoryId: cat.id ?? cat._id,
        assignedAt: now,
        category: toCategoryResponse(cat),
      }));
    }

    // Fetch related notes if provided
    let relationsFrom: NoteRelationFromEmbedded[] = [];
    if (data.relatedNoteIds && data.relatedNoteIds.length > 0) {
      const relatedNoteDocs = await collection
        .find({
          $or: data.relatedNoteIds.map((noteId) => ({ $or: [{ id: noteId }, { _id: noteId }] })),
          notebookId: resolvedNotebookId,
        })
        .toArray();
      relationsFrom = relatedNoteDocs.map((note) => ({
        sourceNoteId: id,
        targetNoteId: note.id ?? note._id,
        assignedAt: now,
        targetNote: {
          id: note.id ?? note._id,
          title: note.title,
          color: note.color ?? null,
        },
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
      isFavorite: data.isFavorite ?? false,
      notebookId: resolvedNotebookId,
      createdAt: now,
      updatedAt: now,
      tags,
      categories,
      relationsFrom,
      relationsTo: [],
    };

    await collection.insertOne(doc);
    return toNoteResponse(doc as WithId<NoteDocument>);
  },

  async update(id, data) {
    const db = await getMongoDb();
    const collection = db.collection<NoteDocument>(noteCollectionName);

    const setFields: Partial<NoteDocument> = {
      updatedAt: new Date(),
    };
    if (data.title !== undefined) setFields.title = data.title;
    if (data.content !== undefined) setFields.content = data.content;
    if (data.color !== undefined) setFields.color = data.color;
    if (data.isPinned !== undefined) setFields.isPinned = data.isPinned;
    if (data.isArchived !== undefined) setFields.isArchived = data.isArchived;
    if (data.isFavorite !== undefined) setFields.isFavorite = data.isFavorite;
    if (data.notebookId !== undefined) setFields.notebookId = data.notebookId ?? null;


    // Handle tags update
    if (data.tagIds !== undefined) {
      let tags: NoteTagEmbedded[] = [];
      if (data.tagIds.length > 0) {
        const now = new Date();
        const resolvedNotebookId =
          data.notebookId ?? (await mongoNoteRepository.getOrCreateDefaultNotebook()).id;
        const tagCollection = db.collection<TagDocument>(tagCollectionName);
        const tagDocs = await tagCollection
          .find({
            $or: data.tagIds.map((tagId) => ({
              $or: [{ id: tagId }, { _id: tagId }],
            })),
            notebookId: resolvedNotebookId,
          })
          .toArray();
        tags = tagDocs.map((tag) => ({
          noteId: id,
          tagId: tag.id ?? tag._id,
          assignedAt: now,
          tag: toTagResponse(tag),
        }));
      }
      setFields.tags = tags;
    }

    // Handle categories update
    if (data.categoryIds !== undefined) {
      let categories: NoteCategoryEmbedded[] = [];
      if (data.categoryIds.length > 0) {
        const now = new Date();
        const resolvedNotebookId =
          data.notebookId ?? (await mongoNoteRepository.getOrCreateDefaultNotebook()).id;
        const categoryCollection = db.collection<CategoryDocument>(
          categoryCollectionName
        );
        const categoryDocs = await categoryCollection
          .find({
            $or: data.categoryIds.map((catId) => ({
              $or: [{ id: catId }, { _id: catId }],
            })),
            notebookId: resolvedNotebookId,
          })
          .toArray();
        categories = categoryDocs.map((cat) => ({
          noteId: id,
          categoryId: cat.id ?? cat._id,
          assignedAt: now,
          category: toCategoryResponse(cat),
        }));
      }
      setFields.categories = categories;
    }

    // Handle related notes update
    if (data.relatedNoteIds !== undefined) {
      let relationsFrom: NoteRelationFromEmbedded[] = [];
      if (data.relatedNoteIds.length > 0) {
        const now = new Date();
        const resolvedNotebookId =
          data.notebookId ?? (await mongoNoteRepository.getOrCreateDefaultNotebook()).id;
        const relatedNoteDocs = await collection
          .find({
            $or: data.relatedNoteIds.map((noteId) => ({
              $or: [{ id: noteId }, { _id: noteId }],
            })),
            notebookId: resolvedNotebookId,
          })
          .toArray();
        relationsFrom = relatedNoteDocs.map((note) => ({
          sourceNoteId: id,
          targetNoteId: note.id ?? note._id,
          assignedAt: now,
          targetNote: {
            id: note.id ?? note._id,
            title: note.title,
            color: note.color ?? null,
          },
        }));
      }
      setFields.relationsFrom = relationsFrom;
    }

    const updateDoc: UpdateFilter<NoteDocument> = {
      $set: setFields,
    };
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
    const noteFileCollection = db.collection<NoteFileDocument>(noteFileCollectionName);
    await noteFileCollection.deleteMany({ noteId: id });
    const result = await collection.deleteOne({ $or: [{ id }, { _id: id }] });
    return result.deletedCount > 0;
  },

  // Tag operations
  async getAllTags(notebookId?: string | null) {
    const db = await getMongoDb();
    const collection = db.collection<TagDocument>(tagCollectionName);
    const resolvedNotebookId =
      notebookId ?? (await mongoNoteRepository.getOrCreateDefaultNotebook()).id;
    const docs = await collection
      .find({ notebookId: resolvedNotebookId })
      .sort({ name: 1 })
      .toArray();
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
    const resolvedNotebookId =
      data.notebookId ?? (await mongoNoteRepository.getOrCreateDefaultNotebook()).id;

    const doc: TagDocument = {
      _id: id,
      id,
      name: data.name,
      color: data.color ?? "#3b82f6",
      notebookId: resolvedNotebookId,
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(doc);
    return toTagResponse(doc as WithId<TagDocument>);
  },

  async updateTag(id, data) {
    const db = await getMongoDb();
    const collection = db.collection<TagDocument>(tagCollectionName);

    const updateDoc: UpdateFilter<TagDocument> = {
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
    const pullTags: UpdateFilter<NoteDocument> = {
      $pull: { tags: { tagId: id } },
    };
    await noteCollection.updateMany({ "tags.tagId": id }, pullTags);
    
    return result.deletedCount > 0;
  },

  // Category operations
  async getAllCategories(notebookId?: string | null) {
    const db = await getMongoDb();
    const collection = db.collection<CategoryDocument>(categoryCollectionName);
    const resolvedNotebookId =
      notebookId ?? (await mongoNoteRepository.getOrCreateDefaultNotebook()).id;
    const docs = await collection
      .find({ notebookId: resolvedNotebookId })
      .sort({ name: 1 })
      .toArray();
    return docs.map(toCategoryResponse);
  },

  async getCategoryById(id) {
    const db = await getMongoDb();
    const collection = db.collection<CategoryDocument>(categoryCollectionName);
    const doc = await collection.findOne({ $or: [{ id }, { _id: id }] });
    return doc ? toCategoryResponse(doc) : null;
  },

  async getCategoryTree(notebookId?: string | null) {
    const db = await getMongoDb();
    const collection = db.collection<CategoryDocument>(categoryCollectionName);
    const resolvedNotebookId =
      notebookId ?? (await mongoNoteRepository.getOrCreateDefaultNotebook()).id;
    const docs = await collection
      .find({ notebookId: resolvedNotebookId })
      .sort({ name: 1 })
      .toArray();
    const categories = docs.map(toCategoryResponse);

    // Fetch all notes that have categories to populate the tree
    const noteCollection = db.collection<NoteDocument>(noteCollectionName);
    const noteDocs = await noteCollection
      .find({ "categories.0": { $exists: true }, notebookId: resolvedNotebookId })
      .toArray();
    const notes = noteDocs.map(toNoteResponse);

    return buildTree(categories, notes);
  },

  async createCategory(data) {
    const db = await getMongoDb();
    const collection = db.collection<CategoryDocument>(categoryCollectionName);

    const id = randomUUID();
    const now = new Date();
    const resolvedNotebookId =
      data.notebookId ?? (await mongoNoteRepository.getOrCreateDefaultNotebook()).id;

    const doc: CategoryDocument = {
      _id: id,
      id,
      name: data.name,
      description: data.description ?? null,
      color: data.color ?? "#10b981",
      parentId: data.parentId ?? null,
      themeId: data.themeId ?? null,
      notebookId: resolvedNotebookId,
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(doc);
    return toCategoryResponse(doc as WithId<CategoryDocument>);
  },

  async updateCategory(id, data) {
    const db = await getMongoDb();
    const collection = db.collection<CategoryDocument>(categoryCollectionName);

    const updateDoc: UpdateFilter<CategoryDocument> = {
      $set: {
        updatedAt: new Date(),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
        ...(data.themeId !== undefined && { themeId: data.themeId }),
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

  async deleteCategory(id, recursive) {
    const db = await getMongoDb();
    const collection = db.collection<CategoryDocument>(categoryCollectionName);
    const noteCollection = db.collection<NoteDocument>(noteCollectionName);

    // Get the category to find its parent
    const category = await collection.findOne({ $or: [{ id }, { _id: id }] });
    if (!category) return false;

    if (recursive) {
      // Recursively collect all descendant category IDs
      const collectDescendantIds = async (categoryId: string): Promise<string[]> => {
        const children = await collection
          .find({ parentId: categoryId })
          .toArray();

        const ids = [categoryId];
        for (const child of children) {
          const childId = child.id ?? child._id;
          const descendantIds = await collectDescendantIds(childId);
          ids.push(...descendantIds);
        }
        return ids;
      };

      const categoryIds = await collectDescendantIds(id);

      // Delete all notes that belong to any of these categories
      await noteCollection.deleteMany({
        "categories.categoryId": { $in: categoryIds },
      });

      // Delete all categories (in reverse order to handle children first)
      for (const catId of categoryIds.reverse()) {
        await collection.deleteOne({ $or: [{ id: catId }, { _id: catId }] });
      }
    } else {
      // Move children to parent (or null if deleting root folder)
      await collection.updateMany(
        { parentId: id },
        { $set: { parentId: category.parentId } }
      );

      // Delete the category
      await collection.deleteOne({ $or: [{ id }, { _id: id }] });

      // Remove category from all notes
      const pullCategories: UpdateFilter<NoteDocument> = {
        $pull: { categories: { categoryId: id } },
      };
      await noteCollection.updateMany(
        { "categories.categoryId": id },
        pullCategories
      );
    }

    return true;
  },

  async getAllNotebooks(): Promise<NotebookRecord[]> {
    const db = await getMongoDb();
    const collection = db.collection<NotebookDocument>(notebookCollectionName);
    await mongoNoteRepository.getOrCreateDefaultNotebook();
    const docs = await collection.find({}).sort({ createdAt: 1 }).toArray();
    return docs.map(toNotebookResponse);
  },

  async getNotebookById(id: string): Promise<NotebookRecord | null> {
    const db = await getMongoDb();
    const collection = db.collection<NotebookDocument>(notebookCollectionName);
    const doc = await collection.findOne({ $or: [{ id }, { _id: id }] });
    return doc ? toNotebookResponse(doc) : null;
  },

  async createNotebook(data: NotebookCreateInput): Promise<NotebookRecord> {
    const db = await getMongoDb();
    const collection = db.collection<NotebookDocument>(notebookCollectionName);
    const id = randomUUID();
    const now = new Date();
    const doc: NotebookDocument = {
      _id: id,
      id,
      name: data.name,
      color: data.color ?? "#3b82f6",
      defaultThemeId: data.defaultThemeId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await collection.insertOne(doc);
    return toNotebookResponse(doc as WithId<NotebookDocument>);
  },

  async updateNotebook(id: string, data: NotebookUpdateInput): Promise<NotebookRecord | null> {
    const db = await getMongoDb();
    const collection = db.collection<NotebookDocument>(notebookCollectionName);
    const updateDoc: UpdateFilter<NotebookDocument> = {
      $set: {
        updatedAt: new Date(),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.defaultThemeId !== undefined && { defaultThemeId: data.defaultThemeId }),
      },
    };
    const result = await collection.findOneAndUpdate(
      { $or: [{ id }, { _id: id }] },
      updateDoc,
      { returnDocument: "after" }
    );
    if (!result) return null;
    return toNotebookResponse(result);
  },

  async deleteNotebook(id: string): Promise<boolean> {
    const db = await getMongoDb();
    const collection = db.collection<NotebookDocument>(notebookCollectionName);
    const noteCollection = db.collection<NoteDocument>(noteCollectionName);
    const tagCollection = db.collection<TagDocument>(tagCollectionName);
    const categoryCollection = db.collection<CategoryDocument>(categoryCollectionName);
    const themeCollection = db.collection<ThemeDocument>(themeCollectionName);

    await noteCollection.deleteMany({ notebookId: id });
    await tagCollection.deleteMany({ notebookId: id });
    await categoryCollection.deleteMany({ notebookId: id });
    await themeCollection.deleteMany({ notebookId: id });

    const result = await collection.deleteOne({ $or: [{ id }, { _id: id }] });
    return result.deletedCount > 0;
  },

  async getAllThemes(notebookId?: string | null): Promise<ThemeRecord[]> {
    const db = await getMongoDb();
    const collection = db.collection<ThemeDocument>(themeCollectionName);
    const resolvedNotebookId =
      notebookId ?? (await mongoNoteRepository.getOrCreateDefaultNotebook()).id;
    const docs = await collection
      .find({ notebookId: resolvedNotebookId })
      .sort({ name: 1 })
      .toArray();
    return docs.map(toThemeResponse);
  },

  async getThemeById(id: string): Promise<ThemeRecord | null> {
    const db = await getMongoDb();
    const collection = db.collection<ThemeDocument>(themeCollectionName);
    const doc = await collection.findOne({ $or: [{ id }, { _id: id }] });
    return doc ? toThemeResponse(doc) : null;
  },

  async createTheme(data: ThemeCreateInput): Promise<ThemeRecord> {
    const db = await getMongoDb();
    const collection = db.collection<ThemeDocument>(themeCollectionName);
    const resolvedNotebookId =
      data.notebookId ?? (await mongoNoteRepository.getOrCreateDefaultNotebook()).id;
    const id = randomUUID();
    const now = new Date();
    const doc: ThemeDocument = {
      _id: id,
      id,
      name: data.name,
      notebookId: resolvedNotebookId,
      textColor: data.textColor ?? "#e5e7eb",
      backgroundColor: data.backgroundColor ?? "#111827",
      markdownHeadingColor: data.markdownHeadingColor ?? "#ffffff",
      markdownLinkColor: data.markdownLinkColor ?? "#60a5fa",
      markdownCodeBackground: data.markdownCodeBackground ?? "#1f2937",
      markdownCodeText: data.markdownCodeText ?? "#e5e7eb",
      relatedNoteBorderWidth: data.relatedNoteBorderWidth ?? 1,
      relatedNoteBorderColor: data.relatedNoteBorderColor ?? "#374151",
      relatedNoteBackgroundColor:
        data.relatedNoteBackgroundColor ?? "#1f2937",
      relatedNoteTextColor: data.relatedNoteTextColor ?? "#e5e7eb",
      createdAt: now,
      updatedAt: now,
    };
    await collection.insertOne(doc);
    return toThemeResponse(doc as WithId<ThemeDocument>);
  },

  async updateTheme(id: string, data: ThemeUpdateInput): Promise<ThemeRecord | null> {
    const db = await getMongoDb();
    const collection = db.collection<ThemeDocument>(themeCollectionName);
    const updateDoc: UpdateFilter<ThemeDocument> = {
      $set: {
        updatedAt: new Date(),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.notebookId !== undefined && { notebookId: data.notebookId }),
        ...(data.textColor !== undefined && { textColor: data.textColor }),
        ...(data.backgroundColor !== undefined && { backgroundColor: data.backgroundColor }),
        ...(data.markdownHeadingColor !== undefined && { markdownHeadingColor: data.markdownHeadingColor }),
        ...(data.markdownLinkColor !== undefined && { markdownLinkColor: data.markdownLinkColor }),
        ...(data.markdownCodeBackground !== undefined && { markdownCodeBackground: data.markdownCodeBackground }),
        ...(data.markdownCodeText !== undefined && { markdownCodeText: data.markdownCodeText }),
        ...(data.relatedNoteBorderWidth !== undefined && { relatedNoteBorderWidth: data.relatedNoteBorderWidth }),
        ...(data.relatedNoteBorderColor !== undefined && { relatedNoteBorderColor: data.relatedNoteBorderColor }),
        ...(data.relatedNoteBackgroundColor !== undefined && { relatedNoteBackgroundColor: data.relatedNoteBackgroundColor }),
        ...(data.relatedNoteTextColor !== undefined && { relatedNoteTextColor: data.relatedNoteTextColor }),
      },
    };
    const result = await collection.findOneAndUpdate(
      { $or: [{ id }, { _id: id }] },
      updateDoc,
      { returnDocument: "after" }
    );
    if (!result) return null;
    return toThemeResponse(result);
  },

  async deleteTheme(id: string): Promise<boolean> {
    const db = await getMongoDb();
    const collection = db.collection<ThemeDocument>(themeCollectionName);
    const result = await collection.deleteOne({ $or: [{ id }, { _id: id }] });
    return result.deletedCount > 0;
  },

  async createNoteFile(_data: NoteFileCreateInput): Promise<NoteFileRecord> {
    const db = await getMongoDb();
    const collection = db.collection<NoteFileDocument>(noteFileCollectionName);
    const id = randomUUID();
    const now = new Date();
    await collection.deleteMany({
      noteId: _data.noteId,
      slotIndex: _data.slotIndex,
    });
    const doc: NoteFileDocument = {
      _id: id,
      id,
      noteId: _data.noteId,
      slotIndex: _data.slotIndex,
      filename: _data.filename,
      filepath: _data.filepath,
      mimetype: _data.mimetype,
      size: _data.size,
      width: _data.width ?? null,
      height: _data.height ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await collection.insertOne(doc);
    return toNoteFileResponse(doc as WithId<NoteFileDocument>);
  },

  async getNoteFiles(_noteId: string): Promise<NoteFileRecord[]> {
    const db = await getMongoDb();
    const collection = db.collection<NoteFileDocument>(noteFileCollectionName);
    const docs = await collection
      .find({ noteId: _noteId })
      .sort({ slotIndex: 1 })
      .toArray();
    return docs.map(toNoteFileResponse);
  },

  async deleteNoteFile(_noteId: string, _slotIndex: number): Promise<boolean> {
    const db = await getMongoDb();
    const collection = db.collection<NoteFileDocument>(noteFileCollectionName);
    const result = await collection.deleteOne({
      noteId: _noteId,
      slotIndex: _slotIndex,
    });
    return result.deletedCount > 0;
  },
};
