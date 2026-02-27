import 'server-only';

import { randomUUID } from 'crypto';

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
} from '@/features/notesapp/services/notes/types/mongo-note-types';
import type { NoteRepository } from '@/features/notesapp/services/notes/types/note-repository';
import type {
  NoteDto as NoteRecord,
  NoteWithRelationsDto as NoteWithRelations,
  NoteFiltersDto as NoteFilters,
  CreateNoteDto as NoteCreateInput,
  UpdateNoteDto as NoteUpdateInput,
  CreateNoteTagDto as TagCreateInput,
  UpdateNoteTagDto as TagUpdateInput,
  CreateNoteCategoryDto as CategoryCreateInput,
  UpdateNoteCategoryDto as CategoryUpdateInput,
  NoteTagDto as TagRecord,
  NoteCategoryDto as CategoryRecord,
  NoteCategoryRecordWithChildrenDto as CategoryWithChildren,
  NotebookDto as NotebookRecord,
  CreateNotebookDto as NotebookCreateInput,
  UpdateNotebookDto as NotebookUpdateInput,
  NoteFileDto as NoteFileRecord,
  CreateNoteFileDto as NoteFileCreateInput,
  NoteThemeDto as ThemeRecord,
  CreateNoteThemeDto as ThemeCreateInput,
  UpdateNoteThemeDto as ThemeUpdateInput,
} from '@/shared/contracts/notes';
import { notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import {
  buildIncomingRelationsMap,
  buildSearchFilter,
  buildTree,
  toIsoCreatedAt,
  toCategoryResponse,
  toNoteFileResponse,
  toNotebookResponse,
  toNoteResponse,
  toTagResponse,
  toThemeResponse,
} from './mongo-note-repository-utils';

import type { Filter, WithId, UpdateFilter } from 'mongodb';

const noteCollectionName = 'notes';
const tagCollectionName = 'tags';
const categoryCollectionName = 'categories';
const notebookCollectionName = 'notebooks';
const noteFileCollectionName = 'noteFiles';
const themeCollectionName = 'themes';

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
            name: 'Default',
            color: '#3b82f6',
            defaultThemeId: null,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          };
          await collection.insertOne(doc);
          return doc;
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

  async invalidateDefaultNotebookCache(): Promise<void> {
    // No cache in mongo repository
  },

  // Note CRUD operations
  async getAll(filters: NoteFilters = {}): Promise<NoteWithRelations[]> {
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
        .find({ 'relationsFrom.targetNoteId': { $in: noteIds } } as Filter<NoteDocument>)
        .toArray()
      : [];
    const incomingMap = buildIncomingRelationsMap(incomingDocs, noteIdSet);
    
    const result: NoteWithRelations[] = notes.map((note: NoteRecord) => {
      const doc = docs.find(d => (d.id ?? d._id) === note.id);
      const { tags: _, categories: __, relations: ___, relationsFrom: ____, relationsTo: _____, ...baseNote } = note;
      return {
        ...baseNote,
        files: filesByNoteId.get(note.id) ?? [],
        relations: [],
        relationsFrom: ((doc as NoteDocument)?.relationsFrom ?? []).map(r => ({ ...r, assignedAt: toIsoCreatedAt(r.assignedAt) })),
        relationsTo: (incomingMap.get(note.id) ?? []).map(r => ({ ...r, assignedAt: toIsoCreatedAt(r.assignedAt) })),
        tags: (doc?.tags ?? []).map(t => ({ ...t, assignedAt: toIsoCreatedAt(t.assignedAt) })),
        categories: (doc?.categories ?? []).map(c => ({ ...c, assignedAt: toIsoCreatedAt(c.assignedAt) })),
      };
    });

    if (filters.truncateContent) {
      return result.map((note: NoteWithRelations) => ({
        ...note,
        content: note.content.length > 300 ? note.content.slice(0, 300) + '...' : note.content,
      }));
    }

    return result;
  },

  async getById(id: string): Promise<NoteWithRelations | null> {
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
      .find({ 'relationsFrom.targetNoteId': note.id } as Filter<NoteDocument>)
      .toArray();
    const relationsTo = incomingDocs
      .map((incoming: NoteDocument): NoteRelationToEmbedded | null => {
        const relation = incoming.relationsFrom?.find(
          (rel: NoteRelationFromEmbedded): boolean =>
            rel.targetNoteId === note.id || rel.targetNote?.id === note.id
        );
        if (!relation) return null;
        const sourceId = incoming.id ?? incoming._id;
        return {
          id: relation.id,
          type: relation.type,
          sourceNoteId: sourceId,
          targetNoteId: note.id,
          assignedAt: toIsoCreatedAt(relation.assignedAt),
          sourceNote: {
            id: sourceId,
            title: incoming.title,
            color: incoming.color ?? null,
          },
        };
      })
      .filter((rel: NoteRelationToEmbedded | null): rel is NoteRelationToEmbedded => rel !== null);
    
    const { tags: _, categories: __, relations: ___, relationsFrom: ____, relationsTo: _____, ...baseNote } = note;
    const result: NoteWithRelations = {
      ...baseNote,
      files: noteFiles.map(toNoteFileResponse),
      relations: [],
      relationsFrom: ((doc as NoteDocument).relationsFrom ?? []).map(r => ({ ...r, assignedAt: toIsoCreatedAt(r.assignedAt) })),
      relationsTo: relationsTo.map(r => ({ ...r, assignedAt: toIsoCreatedAt(r.assignedAt) })),
      tags: ((doc as NoteDocument).tags ?? []).map(t => ({ ...t, assignedAt: toIsoCreatedAt(t.assignedAt) })),
      categories: ((doc as NoteDocument).categories ?? []).map(c => ({ ...c, assignedAt: toIsoCreatedAt(c.assignedAt) })),
    };
    return result;
  },

  async create(data: NoteCreateInput): Promise<NoteWithRelations> {
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
        assignedAt: now.toISOString(),
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
        assignedAt: now.toISOString(),
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
          id: randomUUID(),
          type: 'related',
          sourceNoteId: id,
          targetNoteId: targetId,
          assignedAt: now.toISOString(),
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
      editorType: data.editorType ?? 'markdown',
      color: data.color ?? '#ffffff',
      isPinned: data.isPinned ?? false,
      isArchived: data.isArchived ?? false,
      isFavorite: data.isFavorite ?? false,
      notebookId: resolvedNotebookId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      tags,
      categories,
      relationsFrom,
      relationsTo: [],
      tagIds: tags.map((t) => t.tagId),
      categoryIds: categories.map((c) => c.categoryId),
      relatedNoteIds: relationsFrom.map((r) => r.targetNoteId),
    };

    await collection.insertOne(doc);
    const noteResponse = toNoteResponse(doc);
    const { tags: _, categories: __, relations: ___, relationsFrom: ____, relationsTo: _____, ...baseNote } = noteResponse;
    const result: NoteWithRelations = {
      ...baseNote,
      files: [],
      relations: [],
      relationsFrom: (doc.relationsFrom ?? []).map(r => ({ ...r, assignedAt: toIsoCreatedAt(r.assignedAt) })),
      relationsTo: [],
      tags: (doc.tags ?? []).map(t => ({ ...t, assignedAt: toIsoCreatedAt(t.assignedAt) })),
      categories: (doc.categories ?? []).map(c => ({ ...c, assignedAt: toIsoCreatedAt(c.assignedAt) })),
    };
    return result;
  },

  async update(id: string, data: NoteUpdateInput): Promise<NoteWithRelations | null> {
    const db = await getMongoDb();
    const collection = db.collection<NoteDocument>(noteCollectionName);
    const currentDoc = await collection.findOne({ $or: [{ id }, { _id: id }] } as Filter<NoteDocument>);
    if (!currentDoc) throw notFoundError('Note not found');
    const fallbackNotebookId =
      currentDoc.notebookId ??
      (await mongoNoteRepository.getOrCreateDefaultNotebook()).id;

    const setFields: Partial<NoteDocument> = {
      updatedAt: new Date().toISOString(),
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
          assignedAt: now.toISOString(),
          tag: toTagResponse(tag),
        }));
      }
      setFields.tags = tags;
      setFields.tagIds = tags.map((t) => t.tagId);
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
          assignedAt: now.toISOString(),
          category: toCategoryResponse(cat),
        }));
      }
      setFields.categories = categories;
      setFields.categoryIds = categories.map((c) => c.categoryId);
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
            id: randomUUID(),
            type: 'related',
            sourceNoteId: id,
            targetNoteId: targetId,
            assignedAt: now.toISOString(),
            targetNote: {
              id: targetId,
              title: note.title,
              color: note.color ?? null,
            },
          };
        });
      }
      setFields.relationsFrom = relationsFrom;
      setFields.relatedNoteIds = relationsFrom.map((r) => r.targetNoteId);
    }

    const updateDoc: UpdateFilter<NoteDocument> = {
      $set: setFields,
    };
    const result = await collection.findOneAndUpdate(
      { $or: [{ id }, { _id: id }] } as Filter<NoteDocument>,
      updateDoc,
      { returnDocument: 'after' }
    );

    if (!result) throw notFoundError('Note not found');
    const noteResponse = toNoteResponse(result);
    const { tags: _, categories: __, relations: ___, ...baseNote } = noteResponse;
    const noteWithRelations: NoteWithRelations = {
      ...baseNote,
      files: [], // Files are not updated in this operation
      relations: [],
      relationsFrom: ((result as NoteDocument).relationsFrom ?? []).map(r => ({ ...r, assignedAt: toIsoCreatedAt(r.assignedAt) })),
      relationsTo: ((result as NoteDocument).relationsTo ?? []).map(r => ({ ...r, assignedAt: toIsoCreatedAt(r.assignedAt) })),
      tags: ((result as NoteDocument).tags ?? []).map(t => ({ ...t, assignedAt: toIsoCreatedAt(t.assignedAt) })),
      categories: ((result as NoteDocument).categories ?? []).map(c => ({ ...c, assignedAt: toIsoCreatedAt(c.assignedAt) })),
    };
    return noteWithRelations;
  },

  async syncRelatedNotesBatch(
    noteId: string,
    addedIds: string[],
    removedIds: string[]
  ): Promise<void> {
    if (addedIds.length === 0 && removedIds.length === 0) return;
    const db = await getMongoDb();
    const collection = db.collection<NoteDocument>(noteCollectionName);
    const bulkOps: Record<string, unknown>[] = [];

    for (const relatedId of addedIds) {
      if (relatedId === noteId) continue;
      bulkOps.push({
        updateOne: {
          filter: { $or: [{ id: relatedId }, { _id: relatedId }] },
          update: { $addToSet: { relatedNoteIds: noteId } },
        },
      });
    }

    for (const relatedId of removedIds) {
      bulkOps.push({
        updateOne: {
          filter: { $or: [{ id: relatedId }, { _id: relatedId }] },
          update: { $pull: { relatedNoteIds: noteId } },
        },
      });
    }

    if (bulkOps.length > 0) {
      await collection.bulkWrite(bulkOps as unknown as Parameters<typeof collection.bulkWrite>[0]);
    }  },

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
      color: data.color ?? '#3b82f6',
      notebookId: resolvedNotebookId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await collection.insertOne(doc);
    return toTagResponse(doc);
  },

  async updateTag(id: string, data: TagUpdateInput): Promise<TagRecord> {
    const db = await getMongoDb();
    const collection = db.collection<TagDocument>(tagCollectionName);

    const updateDoc: UpdateFilter<TagDocument> = {
      $set: {
        updatedAt: new Date().toISOString(),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
      },
    };

    const result = await collection.findOneAndUpdate(
      { $or: [{ id }, { _id: id }] } as Filter<TagDocument>,
      updateDoc,
      { returnDocument: 'after' }
    );

    if (!result) throw notFoundError('Tag not found');
    return toTagResponse(result);
  },

  async deleteTag(id: string): Promise<boolean> {
    const db = await getMongoDb();
    const collection = db.collection<TagDocument>(tagCollectionName);
    const result = await collection.deleteOne({ $or: [{ id }, { _id: id }] } as Filter<TagDocument>);

    // Remove tag from all notes
    const noteCollection = db.collection<NoteDocument>(noteCollectionName);
    const pullTags = {
      $pull: { tags: { tagId: id } },
    } as UpdateFilter<NoteDocument>;
    await noteCollection.updateMany({ 'tags.tagId': id } as Filter<NoteDocument>, pullTags);
    
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
      .sort({ sortIndex: 1, name: 1 })
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
      .sort({ sortIndex: 1, name: 1 })
      .toArray();
    const categories = docs.map(toCategoryResponse);

    // Fetch all notes that have categories to populate the tree
    const noteCollection = db.collection<NoteDocument>(noteCollectionName);
    const noteDocs = await noteCollection
      .find({ 'categories.0': { $exists: true }, notebookId: resolvedNotebookId } as Filter<NoteDocument>)
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
    const parentId = data.parentId ?? null;
    const lastSibling = await collection
      .find({ notebookId: resolvedNotebookId, parentId } as Filter<CategoryDocument>)
      .sort({ sortIndex: -1 })
      .limit(1)
      .toArray();
    const nextSortIndex = (lastSibling[0]?.sortIndex ?? -1) + 1;

    const doc: CategoryDocument = {
      _id: id,
      id,
      name: data.name,
      description: data.description ?? null,
      color: data.color ?? '#10b981',
      parentId,
      themeId: data.themeId ?? null,
      notebookId: resolvedNotebookId,
      sortIndex: data.sortIndex ?? nextSortIndex,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await collection.insertOne(doc);
    return toCategoryResponse(doc);
  },

  async updateCategory(id: string, data: CategoryUpdateInput): Promise<CategoryRecord> {
    const db = await getMongoDb();
    const collection = db.collection<CategoryDocument>(categoryCollectionName);

    const current = await collection.findOne({ $or: [{ id }, { _id: id }] } as Filter<CategoryDocument>);
    if (!current) throw notFoundError('Category not found');

    let nextSortIndex: number | undefined;
    if (data.parentId !== undefined && data.sortIndex === undefined) {
      const resolvedNotebookId = current.notebookId ?? null;
      const parentId = data.parentId ?? null;
      const lastSibling = await collection
        .find({ notebookId: resolvedNotebookId, parentId } as Filter<CategoryDocument>)
        .sort({ sortIndex: -1 })
        .limit(1)
        .toArray();
      nextSortIndex = (lastSibling[0]?.sortIndex ?? -1) + 1;
    }

    const updateDoc: UpdateFilter<CategoryDocument> = {
      $set: {
        updatedAt: new Date().toISOString(),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
        ...(data.themeId !== undefined && { themeId: data.themeId }),
        ...(data.sortIndex !== undefined
          ? { sortIndex: data.sortIndex }
          : nextSortIndex !== undefined
            ? { sortIndex: nextSortIndex }
            : {}),
      },
    };

    const result = await collection.findOneAndUpdate(
      { $or: [{ id }, { _id: id }] } as Filter<CategoryDocument>,
      updateDoc,
      { returnDocument: 'after' }
    );

    if (!result) throw notFoundError('Category not found');
    return toCategoryResponse(result);
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
        'categories.categoryId': { $in: categoryIds },
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
      const pullCategories = {
        $pull: { categories: { categoryId: id } },
      } as UpdateFilter<NoteDocument>;
      await noteCollection.updateMany(
        { 'categories.categoryId': id } as Filter<NoteDocument>,
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
      color: data.color ?? '#3b82f6',
      defaultThemeId: data.defaultThemeId ?? null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await collection.insertOne(doc);
    return toNotebookResponse(doc);
  },

  async updateNotebook(id: string, data: NotebookUpdateInput): Promise<NotebookRecord | null> {
    const db = await getMongoDb();
    const collection = db.collection<NotebookDocument>(notebookCollectionName);
    const updateDoc: UpdateFilter<NotebookDocument> = {
      $set: {
        updatedAt: new Date().toISOString(),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.defaultThemeId !== undefined && { defaultThemeId: data.defaultThemeId }),
      },
    };
    const result = await collection.findOneAndUpdate(
      { $or: [{ id }, { _id: id }] } as Filter<NotebookDocument>,
      updateDoc,
      { returnDocument: 'after' }
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
      textColor: data.textColor ?? '#e5e7eb',
      backgroundColor: data.backgroundColor ?? '#111827',
      markdownHeadingColor: data.markdownHeadingColor ?? '#ffffff',
      markdownLinkColor: data.markdownLinkColor ?? '#60a5fa',
      markdownCodeBackground: data.markdownCodeBackground ?? '#1f2937',
      markdownCodeText: data.markdownCodeText ?? '#e5e7eb',
      relatedNoteBorderWidth: data.relatedNoteBorderWidth ?? 1,
      relatedNoteBorderColor: data.relatedNoteBorderColor ?? '#374151',
      relatedNoteBackgroundColor:
        data.relatedNoteBackgroundColor ?? '#1f2937',
      relatedNoteTextColor: data.relatedNoteTextColor ?? '#e5e7eb',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await collection.insertOne(doc);
    return toThemeResponse(doc);
  },

  async updateTheme(id: string, data: ThemeUpdateInput): Promise<ThemeRecord | null> {
    const db = await getMongoDb();
    const collection = db.collection<ThemeDocument>(themeCollectionName);
    const updateDoc: UpdateFilter<ThemeDocument> = {
      $set: {
        updatedAt: new Date().toISOString(),
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
      { returnDocument: 'after' }
    );
    if (!result) return null;
    return toThemeResponse(result);
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
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
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
