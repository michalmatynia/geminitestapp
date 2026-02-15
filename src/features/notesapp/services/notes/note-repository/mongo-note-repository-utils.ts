import type {
  CategoryDocument,
  NoteCategoryEmbedded,
  NoteDocument,
  NoteFileDocument,
  NoteRelationFromEmbedded,
  NoteRelationToEmbedded,
  NotebookDocument,
  TagDocument,
  ThemeDocument,
} from '@/features/notesapp/services/notes/types/mongo-note-types';
import type {
  CategoryRecord,
  CategoryWithChildren,
  NoteFileRecord,
  NoteFilters,
  NoteWithRelations as NoteRecord,
  NotebookRecord,
  TagRecord,
  ThemeRecord,
} from '@/shared/types/domain/notes';

import type { Filter, WithId } from 'mongodb';

export const toIsoCreatedAt = (value: unknown): string => {
  if (typeof value === 'string' && value.length > 0) return value;
  if (value instanceof Date) return value.toISOString();
  return new Date().toISOString();
};

const toIsoUpdatedAt = (value: unknown): string | null => {
  if (typeof value === 'string' && value.length > 0) return value;
  if (value instanceof Date) return value.toISOString();
  return null;
};

export const toNoteResponse = (doc: WithId<NoteDocument>): NoteRecord => {
  const id = doc.id ?? doc._id;
  const tags = Array.isArray(doc.tags) ? doc.tags : [];
  const categories = Array.isArray(doc.categories) ? doc.categories : [];
  const relationsFrom = Array.isArray(doc.relationsFrom) ? doc.relationsFrom : [];

  return {
    id,
    title: doc.title,
    content: doc.content,
    editorType: doc.editorType ?? 'markdown',
    color: doc.color ?? null,
    isPinned: doc.isPinned ?? false,
    isArchived: doc.isArchived ?? false,
    isFavorite: doc.isFavorite ?? false,
    notebookId: doc.notebookId ?? null,
    createdAt: toIsoCreatedAt(doc.createdAt),
    updatedAt: toIsoUpdatedAt(doc.updatedAt),
    tags,
    categories,
    relationsFrom,
    relationsTo: Array.isArray(doc.relationsTo) ? doc.relationsTo : [],
    tagIds: tags.map((t: { tagId: string }) => t.tagId),
    categoryIds: categories.map((c: { categoryId: string }) => c.categoryId),
    relatedNoteIds: relationsFrom.map((r: { targetNoteId: string }) => r.targetNoteId),
  };
};

export const toTagResponse = (doc: WithId<TagDocument>): TagRecord => ({
  id: doc.id ?? doc._id,
  name: doc.name,
  color: doc.color ?? null,
  notebookId: doc.notebookId ?? null,
  createdAt: toIsoCreatedAt(doc.createdAt),
  updatedAt: toIsoUpdatedAt(doc.updatedAt),
});

export const toCategoryResponse = (doc: WithId<CategoryDocument>): CategoryRecord => ({
  id: doc.id ?? doc._id,
  name: doc.name,
  description: doc.description ?? null,
  color: doc.color ?? null,
  parentId: doc.parentId ?? null,
  notebookId: doc.notebookId ?? null,
  themeId: doc.themeId ?? null,
  sortIndex: doc.sortIndex ?? null,
  createdAt: toIsoCreatedAt(doc.createdAt),
  updatedAt: toIsoUpdatedAt(doc.updatedAt),
});

export const toNotebookResponse = (doc: WithId<NotebookDocument>): NotebookRecord => ({
  id: doc.id ?? doc._id,
  name: doc.name,
  color: doc.color ?? null,
  defaultThemeId: doc.defaultThemeId ?? null,
  createdAt: toIsoCreatedAt(doc.createdAt),
  updatedAt: toIsoUpdatedAt(doc.updatedAt),
});

export const toThemeResponse = (doc: WithId<ThemeDocument>): ThemeRecord => ({
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
  createdAt: toIsoCreatedAt(doc.createdAt),
  updatedAt: toIsoUpdatedAt(doc.updatedAt),
});

export const toNoteFileResponse = (doc: WithId<NoteFileDocument>): NoteFileRecord => ({
  id: doc.id ?? doc._id,
  noteId: doc.noteId,
  slotIndex: doc.slotIndex,
  filename: doc.filename,
  filepath: doc.filepath,
  mimetype: doc.mimetype,
  size: doc.size,
  width: doc.width ?? null,
  height: doc.height ?? null,
  createdAt: toIsoCreatedAt(doc.createdAt),
  updatedAt: toIsoUpdatedAt(doc.updatedAt) ?? toIsoCreatedAt(doc.createdAt),
});

export const buildTree = (
  categories: CategoryRecord[],
  notes: NoteRecord[] = []
): CategoryWithChildren[] => {
  const categoryMap: Record<string, CategoryWithChildren> = {};
  categories.forEach((cat: CategoryRecord): void => {
    categoryMap[cat.id] = { ...cat, children: [], notes: [] };
  });

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

export const buildIncomingRelationsMap = (
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
        assignedAt: toIsoCreatedAt(rel.assignedAt),
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

export const buildSearchFilter = (filters: NoteFilters = {}): Filter<NoteDocument> => {
  const filter: Filter<NoteDocument> = {};
  if (filters['notebookId']) {
    filter['notebookId'] = filters['notebookId'];
  }

  if (filters['search']) {
    const regex = { $regex: filters['search'], $options: 'i' };
    const searchScope = filters['searchScope'] || 'both';

    if (searchScope === 'both') {
      filter.$or = [{ title: regex }, { content: regex }];
    } else if (searchScope === 'title') {
      filter['title'] = regex;
    } else if (searchScope === 'content') {
      filter['content'] = regex;
    }
  }

  if (typeof filters['isPinned'] === 'boolean') {
    filter['isPinned'] = filters['isPinned'];
  }

  if (typeof filters['isArchived'] === 'boolean') {
    filter['isArchived'] = filters['isArchived'];
  }

  if (typeof filters['isFavorite'] === 'boolean') {
    filter['isFavorite'] = filters['isFavorite'];
  }

  if (filters['tagIds'] && filters['tagIds'].length > 0) {
    filter['tags'] = { $elemMatch: { tagId: { $in: filters['tagIds'] } } };
  }

  if (filters['categoryIds'] && filters['categoryIds'].length > 0) {
    filter['categories'] = { $elemMatch: { categoryId: { $in: filters['categoryIds'] } } };
  }

  return filter;
};
