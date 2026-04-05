import type {
  CategoryDocument,
  NoteCategoryEmbedded,
  NoteDocument,
  NoteFileDocument,
  NoteRelationFromEmbedded,
  NoteRelationToEmbedded,
  NoteTagEmbedded,
  NotebookDocument,
  TagDocument,
  ThemeDocument,
} from '@/features/notesapp/contracts';
import type {
  CategoryRecord,
  CategoryWithChildren,
  NoteFileRecord,
  NoteFilters,
  NoteRecord,
  NotebookRecord,
  TagRecord,
  ThemeRecord,
} from '@/shared/contracts/notes';

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
  const relationsTo = Array.isArray(doc.relationsTo) ? doc.relationsTo : [];

  const record: NoteRecord = {
    id,
    title: doc.title,
    content: doc.content,
    editorType: (doc.editorType as NoteRecord['editorType']) ?? 'markdown',
    color: doc.color ?? null,
    isPinned: doc.isPinned ?? false,
    isArchived: doc.isArchived ?? false,
    isFavorite: doc.isFavorite ?? false,
    notebookId: doc.notebookId ?? null,
    createdAt: toIsoCreatedAt(doc.createdAt),
    updatedAt: toIsoUpdatedAt(doc.updatedAt),
    tags: [], // Populated by caller if needed
    categories: [], // Populated by caller if needed
    tagIds: tags.map((t: NoteTagEmbedded) => t.tagId),
    categoryIds: categories.map((c: NoteCategoryEmbedded) => c.categoryId),
    relatedNoteIds: relationsFrom.map((r: NoteRelationFromEmbedded) => r.targetNoteId),
    relations: [],
    relationsFrom: relationsFrom as unknown[],
    relationsTo: relationsTo as unknown[],
  };

  return record;
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
  description: doc.description ?? null,
  color: doc.color ?? null,
  defaultThemeId: doc.defaultThemeId ?? null,
  createdAt: toIsoCreatedAt(doc.createdAt),
  updatedAt: toIsoUpdatedAt(doc.updatedAt),
});

export const toThemeResponse = (doc: WithId<ThemeDocument>): ThemeRecord => ({
  id: doc.id ?? doc._id,
  name: doc.name,
  description: doc.description ?? null,
  isDefault: doc.isDefault ?? false,
  notebookId: doc.notebookId ?? null,
  textColor: doc.textColor ?? '#e5e7eb',
  backgroundColor: doc.backgroundColor ?? '#111827',
  markdownHeadingColor: doc.markdownHeadingColor ?? '#ffffff',
  markdownLinkColor: doc.markdownLinkColor ?? '#60a5fa',
  markdownCodeBackground: doc.markdownCodeBackground ?? '#1f2937',
  markdownCodeText: doc.markdownCodeText ?? '#e5e7eb',
  relatedNoteBorderWidth: doc.relatedNoteBorderWidth ?? 1,
  relatedNoteBorderColor: doc.relatedNoteBorderColor ?? '#374151',
  relatedNoteBackgroundColor: doc.relatedNoteBackgroundColor ?? '#1f2937',
  relatedNoteTextColor: doc.relatedNoteTextColor ?? '#e5e7eb',
  themeData: doc.themeData ?? {},
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
    const noteCategories = (note.categories || []) as Array<
      string | { categoryId: string }
    >;
    noteCategories.forEach((c): void => {
      const categoryId = typeof c === 'string' ? c : c.categoryId;
      const category = categoryMap[categoryId];
      if (category) {
        if (!category.notes) {
          category.notes = [];
        }
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
        id: rel.id,
        type: rel.type,
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

const applyNoteSearchScopeFilter = (
  filter: Filter<NoteDocument>,
  search: string,
  searchScope: NoteFilters['searchScope']
): void => {
  const regex = { $regex: search, $options: 'i' };
  if (searchScope === 'both') {
    filter.$or = [{ title: regex }, { content: regex }];
    return;
  }
  if (searchScope === 'title') {
    filter['title'] = regex;
    return;
  }
  if (searchScope === 'content') {
    filter['content'] = regex;
  }
};

const applyBooleanNoteFilter = (
  filter: Filter<NoteDocument>,
  key: 'isPinned' | 'isArchived' | 'isFavorite',
  value: unknown
): void => {
  if (typeof value === 'boolean') {
    filter[key] = value;
  }
};

const applyEmbeddedIdFilter = (
  filter: Filter<NoteDocument>,
  key: 'tags' | 'categories',
  embeddedKey: 'tagId' | 'categoryId',
  values: string[] | undefined
): void => {
  if (values && values.length > 0) {
    filter[key] = { $elemMatch: { [embeddedKey]: { $in: values } } };
  }
};

export const buildSearchFilter = (filters: NoteFilters = {}): Filter<NoteDocument> => {
  const filter: Filter<NoteDocument> = {};
  if (filters['notebookId']) {
    filter['notebookId'] = filters['notebookId'];
  }

  if (filters['search']) {
    applyNoteSearchScopeFilter(filter, filters['search'], filters['searchScope'] || 'both');
  }

  applyBooleanNoteFilter(filter, 'isPinned', filters['isPinned']);
  applyBooleanNoteFilter(filter, 'isArchived', filters['isArchived']);
  applyBooleanNoteFilter(filter, 'isFavorite', filters['isFavorite']);
  applyEmbeddedIdFilter(filter, 'tags', 'tagId', filters['tagIds']);
  applyEmbeddedIdFilter(filter, 'categories', 'categoryId', filters['categoryIds']);

  return filter;
};
