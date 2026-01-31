import "server-only";

import { randomUUID } from "crypto";
import type { Filter, WithId, UpdateFilter } from "mongodb";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import type {
  NoteWithRelations as NoteRecord,
  NoteFilters,
  NoteCreateInput,
  NoteUpdateInput,
  TagCreateInput,
  TagUpdateInput,
  CategoryCreateInput,
  CategoryUpdateInput,
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
} from "@/shared/types/notes";
import type { NoteRepository } from "@/features/notesapp/services/notes/types/note-repository";
import type {
  NoteTagEmbedded,
  NoteCategoryEmbedded,
  NoteRelationFromEmbedded,
  NoteRelationToEmbedded,
  NoteDocument,
  TagDocument,
  CategoryDocument,
  NotebookDocument,
  NoteFileDocument,
  ThemeDocument,
} from "@/features/notesapp/services/notes/types/mongo-note-types";
import { notFoundError } from "@/shared/errors/app-error";

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
  editorType: doc.editorType ?? "markdown",
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
  categories.forEach((cat: CategoryRecord): void => {
    categoryMap[cat.id] = { ...cat, children: [], notes: [] };
  });

  // Distribute notes to their respective categories
  notes.forEach((note: NoteRecord): void => {
    note.categories.forEach((nc: NoteCategoryEmbedded): void => {
      const category = categoryMap[nc.categoryId];
      if (category) {
        category.notes.push(note);
      }
    });
  });

  const rootCategories: CategoryWithChildren[] = [];

  categories.forEach((cat: CategoryRecord): void => {
    const current = categoryMap[cat.id];
    if (!current) return;

    if (cat.parentId) {
      const parent = categoryMap[cat.parentId];
      if (parent) {
        parent.children.push(current);
      } else {
        rootCategories.push(current);
      }
    } else {
      rootCategories.push(current);
    }
  });

  return rootCategories;
};

const buildIncomingRelationsMap = (
  incomingDocs: NoteDocument[],
  targetNoteIds: Set<string>
): Map<string, NoteRelationToEmbedded[]> => {
  const incoming = new Map<string, NoteRelationToEmbedded[]>();

  incomingDocs.forEach((incomingDoc: NoteDocument): void => {
    const sourceId = incomingDoc.id ?? incomingDoc._id;
    if (!incomingDoc.relationsFrom?.length) return;

    incomingDoc.relationsFrom.forEach((rel: NoteRelationFromEmbedded): void => {
      const targetId = rel.targetNote?.id ?? rel.targetNoteId;
      if (!targetId || !targetNoteIds.has(targetId)) return;

      const relation: NoteRelationToEmbedded = {
        sourceNoteId: sourceId,
        targetNoteId: targetId,
        assignedAt: rel.assignedAt ?? new Date(),
        sourceNote: {
          id: sourceId,
          title: incomingDoc.title,
          color: incomingDoc.color ?? null,
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
      filter.$or = [{ title: regex }, { content: regex }] as Filter<NoteDocument>["$or"];
    } else if (searchScope === "title") {
      filter.title = regex as Filter<NoteDocument>["title"];
    } else if (searchScope === "content") {
      filter.content = regex as Filter<NoteDocument>["content"];
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
    filter["tags.tagId"] = { $in: filters.tagIds } as Filter<NoteDocument>["tags.tagId"];
  }

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    filter["categories.categoryId"] = { $in: filters.categoryIds } as Filter<NoteDocument>["categories.categoryId"];
  }

  return filter;
};

export const mongoNoteRepository: NoteRepository = {
  async getOrCreateDefaultNotebook(): Promise<NotebookRecord> {
    const db = await getMongoDb();
    const collection = db.collection<NotebookDocument>(notebookCollectionName);
    const existing = await collection.find({}).sort({ createdAt: 1 }).limit(1).toArray();
    const notebook = existing[0]
      ? toNotebookResponse(existing[0])
      : toNotebookResponse(
          (await (async (): Promise<WithId<NotebookDocument>> => {
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
      { $or: [{ notebookId: { $exists: false } }, { notebookId: null }] } as Filter<NoteDocument>,
      { $set: { notebookId: notebook.id } } as UpdateFilter<NoteDocument>
    );
    await tagCollection.updateMany(
      { $or: [{ notebookId: { $exists: false } }, { notebookId: null }] } as Filter<TagDocument>,
      { $set: { notebookId: notebook.id } } as UpdateFilter<TagDocument>
    );
    await categoryCollection.updateMany(
      { $or: [{ notebookId: { $exists: false } }, { notebookId: null }] } as Filter<CategoryDocument>,
      { $set: { notebookId: notebook.id } } as UpdateFilter<CategoryDocument>
    );

    return notebook;
  },

  // Note CRUD operations
  async getAll(filters: NoteFilters = {}): Promise<NoteRecord[]> {
    const db = await getMongoDb();
    const resolvedNotebookId =
      filters.notebookId ?? (await mongoNoteRepository.getOrCreateDefaultNotebook()).id;
    const effectiveFilters = { ...filters, notebookId: resolvedNotebookId };
    const collection = db.collection<NoteDocument>(noteCollectionName);
    const searchFilter = buildSearchFilter(effectiveFilters);
    const docs = await collection.find(searchFilter).sort({ updatedAt: -1 }).toArray();
    const notes = docs.map(toNoteResponse);
    const noteIds = notes.map((note: NoteRecord): string => note.id);
    const noteIdSet = new Set(noteIds);
    const noteFileCollection = db.collection<NoteFileDocument>(noteFileCollectionName);
    const noteFiles = noteIds.length
      ? await noteFileCollection
          .find({ noteId: { $in: noteIds } } as Filter<NoteFileDocument>)
          .sort({ slotIndex: 1 })
          .toArray()
      : [];
    const filesByNoteId = new Map<string, NoteFileRecord[]>();
    noteFiles.forEach((fileDoc: WithId<NoteFileDocument>): void => {
      const record = toNoteFileResponse(fileDoc);
      const list = filesByNoteId.get(record.noteId) ?? [];
      list.push(record);
      filesByNoteId.set(record.noteId, list);
    });
    const incomingDocs = noteIds.length
      ? await collection
          .find({ "relationsFrom.targetNoteId": { $in: noteIds } } as Filter<NoteDocument>)
          .toArray()
      : [];
    const incomingMap = buildIncomingRelationsMap(incomingDocs, noteIdSet);
    
    const result = notes.map((note: NoteRecord) => ({
      ...note,
      files: filesByNoteId.get(note.id) ?? [],
      relationsTo: incomingMap.get(note.id) ?? [],
    }));

    if (filters.truncateContent) {
      return result.map((note) => ({
        ...note,
        content: note.content.length > 300 ? note.content.slice(0, 300) + "..." : note.content,
      })) as NoteRecord[];
    }

    return result as NoteRecord[];
  },

  async getById(id: string): Promise<NoteRecord | null> {
    const db = await getMongoDb();
    const collection = db.collection<NoteDocument>(noteCollectionName);
    const doc = await collection.findOne({ $or: [{ id }, { _id: id }] } as Filter<NoteDocument>);
    if (!doc) return null;
    const note = toNoteResponse(doc);
    const noteFileCollection = db.collection<NoteFileDocument>(noteFileCollectionName);
    const noteFiles = await noteFileCollection
      .find({ noteId: note.id } as Filter<NoteFileDocument>)
      .sort({ slotIndex: 1 })
      .toArray();
    const incomingDocs = await collection
      .find({ "relationsFrom.targetNoteId": note.id } as Filter<NoteDocument>)
      .toArray();
    const relationsTo: NoteRelationToEmbedded[] = incomingDocs
      .map((incoming: NoteDocument): NoteRelationToEmbedded | null => {
        const relation = incoming.relationsFrom?.find(
          (rel: NoteRelationFromEmbedded): boolean =>
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
      .filter((rel: NoteRelationToEmbedded | null): rel is NoteRelationToEmbedded => rel !== null);
    return { ...note, files: noteFiles.map(toNoteFileResponse), relationsTo } as NoteRecord;
  },

  async create(data: NoteCreateInput): Promise<NoteRecord> {
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
          $or: data.tagIds.map((tagId: string) => ({ $or: [{ id: tagId }, { _id: tagId }] })),
          notebookId: resolvedNotebookId,
        } as Filter<TagDocument>)
        .toArray();
      tags = tagDocs.map((tag: WithId<TagDocument>): NoteTagEmbedded => ({
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
          $or: data.categoryIds.map((catId: string) => ({ $or: [{ id: catId }, { _id: catId }] })),
          notebookId: resolvedNotebookId,
        } as Filter<CategoryDocument>)
        .toArray();
      categories = categoryDocs.map((cat: WithId<CategoryDocument>): NoteCategoryEmbedded => ({
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
          $or: data.relatedNoteIds.map((noteId: string) => ({ $or: [{ id: noteId }, { _id: noteId }] })),
          notebookId: resolvedNotebookId,
        } as Filter<NoteDocument>)
        .toArray();
      relationsFrom = relatedNoteDocs.map((note: NoteDocument): NoteRelationFromEmbedded => {
        const targetId = note.id ?? note._id;
        return {
          sourceNoteId: id,
          targetNoteId: targetId,
          assignedAt: now,
          targetNote: {
            id: targetId,
            title: note.title,
            color: note.color ?? null,
          },
        };
      });
    }

    const doc: NoteDocument = {
      _id: id,
      id,
      title: data.title,
      content: data.content,
      editorType: data.editorType ?? "markdown",
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

  async update(id: string, data: NoteUpdateInput): Promise<NoteRecord> {
    const db = await getMongoDb();
    const collection = db.collection<NoteDocument>(noteCollectionName);
    const currentDoc = await collection.findOne({ $or: [{ id }, { _id: id }] } as Filter<NoteDocument>);
    if (!currentDoc) throw notFoundError("Note not found");
    const fallbackNotebookId =
      currentDoc.notebookId ??
      (await mongoNoteRepository.getOrCreateDefaultNotebook()).id;

    const setFields: Partial<NoteDocument> = {
      updatedAt: new Date(),
    };
    if (data.title !== undefined) setFields.title = data.title;
    if (data.content !== undefined) setFields.content = data.content;
    if (data.editorType !== undefined) setFields.editorType = data.editorType;
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
        const resolvedNotebookId = data.notebookId ?? fallbackNotebookId;
        const tagCollection = db.collection<TagDocument>(tagCollectionName);
        const tagDocs = await tagCollection
          .find({
            $or: data.tagIds.map((tagId: string) => ({
              $or: [{ id: tagId }, { _id: tagId }],
            })),
            notebookId: resolvedNotebookId,
          } as Filter<TagDocument>)
          .toArray();
        tags = tagDocs.map((tag: WithId<TagDocument>): NoteTagEmbedded => ({
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
        const resolvedNotebookId = data.notebookId ?? fallbackNotebookId;
        const categoryCollection = db.collection<CategoryDocument>(
          categoryCollectionName
        );
        const categoryDocs = await categoryCollection
          .find({
            $or: data.categoryIds.map((catId: string) => ({
              $or: [{ id: catId }, { _id: catId }],
            })),
            notebookId: resolvedNotebookId,
          } as Filter<CategoryDocument>)
          .toArray();
        categories = categoryDocs.map((cat: WithId<CategoryDocument>): NoteCategoryEmbedded => ({
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
        const resolvedNotebookId = data.notebookId ?? fallbackNotebookId;
        const relatedNoteDocs = await collection
          .find({
            $or: data.relatedNoteIds.map((noteId: string) => ({
              $or: [{ id: noteId }, { _id: noteId }],
            })),
            notebookId: resolvedNotebookId,
          } as Filter<NoteDocument>)
          .toArray();
        relationsFrom = relatedNoteDocs.map((note: NoteDocument): NoteRelationFromEmbedded => {
          const targetId = note.id ?? note._id;
          return {
            sourceNoteId: id,
            targetNoteId: targetId,
            assignedAt: now,
            targetNote: {
              id: targetId,
              title: note.title,
              color: note.color ?? null,
            },
          };
        });
      }
      setFields.relationsFrom = relationsFrom;
    }

    const updateDoc: UpdateFilter<NoteDocument> = {
      $set: setFields,
    };
    const result = await collection.findOneAndUpdate(
      { $or: [{ id }, { _id: id }] } as Filter<NoteDocument>,
      updateDoc,
      { returnDocument: "after" }
    );

    if (!result) throw notFoundError("Note not found");
    return toNoteResponse(result as WithId<NoteDocument>);
  },

  async delete(id: string): Promise<boolean> {
    const db = await getMongoDb();
    const collection = db.collection<NoteDocument>(noteCollectionName);
    const noteFileCollection = db.collection<NoteFileDocument>(noteFileCollectionName);
    await noteFileCollection.deleteMany({ noteId: id } as Filter<NoteFileDocument>);
    const result = await collection.deleteOne({ $or: [{ id }, { _id: id }] } as Filter<NoteDocument>);
    return result.deletedCount > 0;
  },

  // Tag operations
  async getAllTags(notebookId?: string | null): Promise<TagRecord[]> {
    const db = await getMongoDb();
    const collection = db.collection<TagDocument>(tagCollectionName);
    const resolvedNotebookId =
      notebookId ?? (await mongoNoteRepository.getOrCreateDefaultNotebook()).id;
    const docs = await collection
      .find({ notebookId: resolvedNotebookId } as Filter<TagDocument>)
      .sort({ name: 1 })
      .toArray();
    return docs.map(toTagResponse);
  },

  async getTagById(id: string): Promise<TagRecord | null> {
    const db = await getMongoDb();
    const collection = db.collection<TagDocument>(tagCollectionName);
    const doc = await collection.findOne({ $or: [{ id }, { _id: id }] } as Filter<TagDocument>);
    return doc ? toTagResponse(doc) : null;
  },

  async createTag(data: TagCreateInput): Promise<TagRecord> {
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

  async updateTag(id: string, data: TagUpdateInput): Promise<TagRecord> {
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
      { $or: [{ id }, { _id: id }] } as Filter<TagDocument>,
      updateDoc,
      { returnDocument: "after" }
    );

    if (!result) throw notFoundError("Tag not found");
    return toTagResponse(result as WithId<TagDocument>);
  },

  async deleteTag(id: string): Promise<boolean> {
    const db = await getMongoDb();
    const collection = db.collection<TagDocument>(tagCollectionName);
    const result = await collection.deleteOne({ $or: [{ id }, { _id: id }] } as Filter<TagDocument>);

    // Remove tag from all notes
    const noteCollection = db.collection<NoteDocument>(noteCollectionName);
    const pullTags: UpdateFilter<NoteDocument> = {
      $pull: { tags: { tagId: id } } as UpdateFilter<NoteDocument>["$pull"],
    };
    await noteCollection.updateMany({ "tags.tagId": id } as Filter<NoteDocument>, pullTags);
    
    return result.deletedCount > 0;
  },

  // Category operations
  async getAllCategories(notebookId?: string | null): Promise<CategoryRecord[]> {
    const db = await getMongoDb();
    const collection = db.collection<CategoryDocument>(categoryCollectionName);
    const resolvedNotebookId =
      notebookId ?? (await mongoNoteRepository.getOrCreateDefaultNotebook()).id;
    const docs = await collection
      .find({ notebookId: resolvedNotebookId } as Filter<CategoryDocument>)
      .sort({ name: 1 })
      .toArray();
    return docs.map(toCategoryResponse);
  },

  async getCategoryById(id: string): Promise<CategoryRecord | null> {
    const db = await getMongoDb();
    const collection = db.collection<CategoryDocument>(categoryCollectionName);
    const doc = await collection.findOne({ $or: [{ id }, { _id: id }] } as Filter<CategoryDocument>);
    return doc ? toCategoryResponse(doc) : null;
  },

  async getCategoryTree(notebookId?: string | null): Promise<CategoryWithChildren[]> {
    const db = await getMongoDb();
    const collection = db.collection<CategoryDocument>(categoryCollectionName);
    const resolvedNotebookId =
      notebookId ?? (await mongoNoteRepository.getOrCreateDefaultNotebook()).id;
    const docs = await collection
      .find({ notebookId: resolvedNotebookId } as Filter<CategoryDocument>)
      .sort({ name: 1 })
      .toArray();
    const categories = docs.map(toCategoryResponse);

    // Fetch all notes that have categories to populate the tree
    const noteCollection = db.collection<NoteDocument>(noteCollectionName);
    const noteDocs = await noteCollection
      .find({ "categories.0": { $exists: true }, notebookId: resolvedNotebookId } as Filter<NoteDocument>)
      .toArray();
    const notes = noteDocs.map(toNoteResponse);

    return buildTree(categories, notes);
  },

  async createCategory(data: CategoryCreateInput): Promise<CategoryRecord> {
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

  async updateCategory(id: string, data: CategoryUpdateInput): Promise<CategoryRecord> {
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
      { $or: [{ id }, { _id: id }] } as Filter<CategoryDocument>,
      updateDoc,
      { returnDocument: "after" }
    );

    if (!result) throw notFoundError("Category not found");
    return toCategoryResponse(result as WithId<CategoryDocument>);
  },

  async deleteCategory(id: string, recursive?: boolean): Promise<boolean> {
    const db = await getMongoDb();
    const collection = db.collection<CategoryDocument>(categoryCollectionName);
    const noteCollection = db.collection<NoteDocument>(noteCollectionName);

    // Get the category to find its parent
    const category = await collection.findOne({ $or: [{ id }, { _id: id }] } as Filter<CategoryDocument>);
    if (!category) return false;

    if (recursive) {
      // Recursively collect all descendant category IDs
      const collectDescendantIds = async (categoryId: string): Promise<string[]> => {
        const children = await collection
          .find({ parentId: categoryId } as Filter<CategoryDocument>)
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
      } as Filter<NoteDocument>);

      // Delete all categories (in reverse order to handle children first)
      for (const catId of categoryIds.reverse()) {
        await collection.deleteOne({ $or: [{ id: catId }, { _id: catId }] } as Filter<CategoryDocument>);
      }
    } else {
      // Move children to parent (or null if deleting root folder)
      await collection.updateMany(
        { parentId: id } as Filter<CategoryDocument>,
        { $set: { parentId: category.parentId } } as UpdateFilter<CategoryDocument>
      );

      // Delete the category
      await collection.deleteOne({ $or: [{ id }, { _id: id }] } as Filter<CategoryDocument>);

      // Remove category from all notes
      const pullCategories: UpdateFilter<NoteDocument> = {
        $pull: { categories: { categoryId: id } } as UpdateFilter<NoteDocument>["$pull"],
      };
      await noteCollection.updateMany(
        { "categories.categoryId": id } as Filter<NoteDocument>,
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
    const doc = await collection.findOne({ $or: [{ id }, { _id: id }] } as Filter<NotebookDocument>);
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
      { $or: [{ id }, { _id: id }] } as Filter<NotebookDocument>,
      updateDoc,
      { returnDocument: "after" }
    );
    if (!result) return null;
    return toNotebookResponse(result as WithId<NotebookDocument>);
  },

  async deleteNotebook(id: string): Promise<boolean> {
    const db = await getMongoDb();
    const collection = db.collection<NotebookDocument>(notebookCollectionName);
    const noteCollection = db.collection<NoteDocument>(noteCollectionName);
    const tagCollection = db.collection<TagDocument>(tagCollectionName);
    const categoryCollection = db.collection<CategoryDocument>(categoryCollectionName);
    const themeCollection = db.collection<ThemeDocument>(themeCollectionName);

    await noteCollection.deleteMany({ notebookId: id } as Filter<NoteDocument>);
    await tagCollection.deleteMany({ notebookId: id } as Filter<TagDocument>);
    await categoryCollection.deleteMany({ notebookId: id } as Filter<CategoryDocument>);
    await themeCollection.deleteMany({ notebookId: id } as Filter<ThemeDocument>);

    const result = await collection.deleteOne({ $or: [{ id }, { _id: id }] } as Filter<NotebookDocument>);
    return result.deletedCount > 0;
  },

  async getAllThemes(notebookId?: string | null): Promise<ThemeRecord[]> {
    const db = await getMongoDb();
    const collection = db.collection<ThemeDocument>(themeCollectionName);
    const resolvedNotebookId =
      notebookId ?? (await mongoNoteRepository.getOrCreateDefaultNotebook()).id;
    const docs = await collection
      .find({ notebookId: resolvedNotebookId } as Filter<ThemeDocument>)
      .sort({ name: 1 })
      .toArray();
    return docs.map(toThemeResponse);
  },

  async getThemeById(id: string): Promise<ThemeRecord | null> {
    const db = await getMongoDb();
    const collection = db.collection<ThemeDocument>(themeCollectionName);
    const doc = await collection.findOne({ $or: [{ id }, { _id: id }] } as Filter<ThemeDocument>);
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
      { $or: [{ id }, { _id: id }] } as Filter<ThemeDocument>,
      updateDoc,
      { returnDocument: "after" }
    );
    if (!result) return null;
    return toThemeResponse(result as WithId<ThemeDocument>);
  },

  async deleteTheme(id: string): Promise<boolean> {
    const db = await getMongoDb();
    const collection = db.collection<ThemeDocument>(themeCollectionName);
    const result = await collection.deleteOne({ $or: [{ id }, { _id: id }] } as Filter<ThemeDocument>);
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
    } as Filter<NoteFileDocument>);
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
      .find({ noteId: _noteId } as Filter<NoteFileDocument>)
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
    } as Filter<NoteFileDocument>);
    return result.deletedCount > 0;
  },
};