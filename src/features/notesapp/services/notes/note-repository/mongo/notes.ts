/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { randomUUID } from 'crypto';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import {
  NoteDocument,
  TagDocument,
  CategoryDocument,
  NoteFileDocument,
  NoteTagEmbedded,
  NoteCategoryEmbedded,
  NoteRelationFromEmbedded,
  NoteRelationToEmbedded,
} from '../../types/mongo-note-types';
import {
  NoteRecord,
  NoteWithRelations,
  NoteFilters,
  NoteCreateInput,
  NoteUpdateInput,
  NoteFileRecord,
} from '@/shared/contracts/notes';
import {
  toNoteResponse,
  toNoteFileResponse,
  buildSearchFilter,
  buildIncomingRelationsMap,
  toIsoCreatedAt,
  toTagResponse,
  toCategoryResponse,
} from '../mongo-note-repository-utils';
import { Filter, UpdateFilter, WithId } from 'mongodb';
import { notFoundError } from '@/shared/errors/app-error';

const noteCollectionName = 'notes';
const tagCollectionName = 'tags';
const categoryCollectionName = 'categories';
const noteFileCollectionName = 'noteFiles';

export const mongoNoteCrudImpl = {
  async getAll(
    filters: NoteFilters = {},
    getOrCreateDefaultNotebook: () => Promise<any>
  ): Promise<NoteWithRelations[]> {
    const db = await getMongoDb();
    const resolvedNotebookId = filters.notebookId ?? (await getOrCreateDefaultNotebook()).id;
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
          .find({
            'relationsFrom.targetNoteId': { $in: noteIds },
          } as Filter<NoteDocument>)
          .toArray()
      : [];
    const incomingMap = buildIncomingRelationsMap(incomingDocs, noteIdSet);

    const result: NoteWithRelations[] = notes.map((note: NoteRecord) => {
      const doc = docs.find((d) => (d.id ?? d._id) === note.id);
      const {
        tags: _,
        categories: __,
        relations: ___,
        relationsFrom: ____,
        relationsTo: _____,
        ...baseNote
      } = note;
      return {
        ...baseNote,
        files: filesByNoteId.get(note.id) ?? [],
        relations: [],
        relationsFrom: ((doc as NoteDocument)?.relationsFrom ?? []).map((r) => ({
          ...r,
          assignedAt: toIsoCreatedAt(r.assignedAt),
        })),
        relationsTo: (incomingMap.get(note.id) ?? []).map((r) => ({
          ...r,
          assignedAt: toIsoCreatedAt(r.assignedAt),
        })),
        tags: (doc?.tags ?? []).map((t) => ({
          ...t,
          assignedAt: toIsoCreatedAt(t.assignedAt),
        })),
        categories: (doc?.categories ?? []).map((c) => ({
          ...c,
          assignedAt: toIsoCreatedAt(c.assignedAt),
        })),
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
    const doc = await collection.findOne({
      $or: [{ id }, { _id: id }],
    } as Filter<NoteDocument>);
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

    const {
      tags: _,
      categories: __,
      relations: ___,
      relationsFrom: ____,
      relationsTo: _____,
      ...baseNote
    } = note;
    const result: NoteWithRelations = {
      ...baseNote,
      files: noteFiles.map(toNoteFileResponse),
      relations: [],
      relationsFrom: ((doc as NoteDocument).relationsFrom ?? []).map((r) => ({
        ...r,
        assignedAt: toIsoCreatedAt(r.assignedAt),
      })),
      relationsTo: relationsTo.map((r) => ({
        ...r,
        assignedAt: toIsoCreatedAt(r.assignedAt),
      })),
      tags: ((doc as NoteDocument).tags ?? []).map((t) => ({
        ...t,
        assignedAt: toIsoCreatedAt(t.assignedAt),
      })),
      categories: ((doc as NoteDocument).categories ?? []).map((c) => ({
        ...c,
        assignedAt: toIsoCreatedAt(c.assignedAt),
      })),
    };
    return result;
  },

  async create(
    data: NoteCreateInput,
    getOrCreateDefaultNotebook: () => Promise<any>
  ): Promise<NoteWithRelations> {
    const db = await getMongoDb();
    const collection = db.collection<NoteDocument>(noteCollectionName);

    const id = randomUUID();
    const now = new Date();
    const resolvedNotebookId = data.notebookId ?? (await getOrCreateDefaultNotebook()).id;

    // Fetch tags if provided
    let tags: NoteTagEmbedded[] = [];
    if (data.tagIds && data.tagIds.length > 0) {
      const tagCollection = db.collection<TagDocument>(tagCollectionName);
      const tagDocs = await tagCollection
        .find({
          $or: data.tagIds.map((tagId: string) => ({
            $or: [{ id: tagId }, { _id: tagId }],
          })),
          notebookId: resolvedNotebookId,
        } as Filter<TagDocument>)
        .toArray();
      tags = tagDocs.map(
        (tag: WithId<TagDocument>): NoteTagEmbedded => ({
          noteId: id,
          tagId: tag.id ?? tag._id,
          assignedAt: now.toISOString(),
          tag: toTagResponse(tag),
        })
      );
    }

    // Fetch categories if provided
    let categories: NoteCategoryEmbedded[] = [];
    if (data.categoryIds && data.categoryIds.length > 0) {
      const categoryCollection = db.collection<CategoryDocument>(categoryCollectionName);
      const categoryDocs = await categoryCollection
        .find({
          $or: data.categoryIds.map((categoryId: string) => ({
            $or: [{ id: categoryId }, { _id: categoryId }],
          })),
          notebookId: resolvedNotebookId,
        } as Filter<CategoryDocument>)
        .toArray();
      categories = categoryDocs.map(
        (category: WithId<CategoryDocument>): NoteCategoryEmbedded => ({
          noteId: id,
          categoryId: category.id ?? category._id,
          assignedAt: now.toISOString(),
          category: toCategoryResponse(category),
        })
      );
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
      relationsFrom: [],
      relationsTo: [],
      tagIds: tags.map((t) => t.tagId),
      categoryIds: categories.map((c) => c.categoryId),
      relatedNoteIds: [],
    };

    await collection.insertOne(doc);
    return (await mongoNoteCrudImpl.getById(id))!;
  },

  async update(
    id: string,
    data: NoteUpdateInput,
    getOrCreateDefaultNotebook: () => Promise<any>
  ): Promise<NoteWithRelations | null> {
    const db = await getMongoDb();
    const collection = db.collection<NoteDocument>(noteCollectionName);
    const currentDoc = await collection.findOne({
      $or: [{ id }, { _id: id }],
    } as Filter<NoteDocument>);
    if (!currentDoc) throw notFoundError('Note not found');
    const fallbackNotebookId = currentDoc.notebookId ?? (await getOrCreateDefaultNotebook()).id;

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
        tags = tagDocs.map(
          (tag: WithId<TagDocument>): NoteTagEmbedded => ({
            noteId: id,
            tagId: tag.id ?? tag._id,
            assignedAt: now.toISOString(),
            tag: toTagResponse(tag),
          })
        );
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
        const categoryCollection = db.collection<CategoryDocument>(categoryCollectionName);
        const categoryDocs = await categoryCollection
          .find({
            $or: data.categoryIds.map((catId: string) => ({
              $or: [{ id: catId }, { _id: catId }],
            })),
            notebookId: resolvedNotebookId,
          } as Filter<CategoryDocument>)
          .toArray();
        categories = categoryDocs.map(
          (cat: WithId<CategoryDocument>): NoteCategoryEmbedded => ({
            noteId: id,
            categoryId: cat.id ?? cat._id,
            assignedAt: now.toISOString(),
            category: toCategoryResponse(cat),
          })
        );
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
    return (await mongoNoteCrudImpl.getById(id))!;
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
    }
  },

  async delete(id: string): Promise<boolean> {
    const db = await getMongoDb();
    const collection = db.collection<NoteDocument>(noteCollectionName);
    const noteFileCollection = db.collection<NoteFileDocument>(noteFileCollectionName);
    await noteFileCollection.deleteMany({
      noteId: id,
    } as Filter<NoteFileDocument>);
    const result = await collection.deleteOne({
      $or: [{ id }, { _id: id }],
    } as Filter<NoteDocument>);
    return result.deletedCount > 0;
  },
};
