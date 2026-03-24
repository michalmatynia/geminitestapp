import { ObjectId } from 'mongodb';

import type { DatabaseSyncHandler } from './types';
import type { Prisma } from '@prisma/client';

type BatchResult = { count: number };

type EntityWithId = { id: string };
type RawMongoDoc = Record<string, unknown>;
type NotebookDoc = RawMongoDoc & Partial<NotebookSeed>;
type ThemeDoc = RawMongoDoc & Partial<ThemeSeed>;
type TagDoc = RawMongoDoc & Partial<TagSeed>;
type CategoryDoc = RawMongoDoc & Partial<CategorySeed>;
type NoteFileDoc = RawMongoDoc & Partial<NoteFileSeed>;

type NotebookSeed = {
  id: string;
  name: string;
  color: string | null;
  defaultThemeId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ThemeSeed = {
  id: string;
  name: string;
  notebookId: string | null;
  textColor: string;
  backgroundColor: string;
  markdownHeadingColor: string;
  markdownLinkColor: string;
  markdownCodeBackground: string;
  markdownCodeText: string;
  relatedNoteBorderWidth: number;
  relatedNoteBorderColor: string;
  relatedNoteBackgroundColor: string;
  relatedNoteTextColor: string;
  createdAt: Date;
  updatedAt: Date;
};

type TagSeed = {
  id: string;
  name: string;
  color: string | null;
  notebookId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type CategorySeed = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  parentId: string | null;
  themeId: string | null;
  notebookId: string | null;
  sortIndex: number;
  createdAt: Date;
  updatedAt: Date;
};

interface MongoNoteTag {
  tagId: string;
  assignedAt?: Date | string;
}

interface MongoNoteCategory {
  categoryId: string;
  assignedAt?: Date | string;
}

interface MongoNoteRelation {
  targetNoteId: string;
  assignedAt?: Date | string;
}

interface MongoNoteDoc {
  _id?: ObjectId;
  id?: string;
  title?: string;
  content?: string;
  editorType?: string;
  color?: string | null;
  isPinned?: boolean;
  isArchived?: boolean;
  isFavorite?: boolean;
  notebookId?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  tags?: MongoNoteTag[];
  categories?: MongoNoteCategory[];
  relationsFrom?: MongoNoteRelation[];
}

type NoteSeed = {
  id: string;
  title: string;
  content: string;
  editorType: string;
  color: string | null;
  isPinned: boolean;
  isArchived: boolean;
  isFavorite: boolean;
  notebookId: string | null;
  createdAt: Date;
  updatedAt: Date;
  tags: MongoNoteTag[];
  categories: MongoNoteCategory[];
  relationsFrom: MongoNoteRelation[];
};

type NoteFileSeed = {
  id: string;
  noteId: string;
  slotIndex: number;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type NotebookRow = NotebookSeed;
type ThemeRow = ThemeSeed;
type TagRow = TagSeed;
type CategoryRow = CategorySeed;
type NoteTagRow = { noteId: string; tagId: string; assignedAt: Date };
type NoteCategoryRow = { noteId: string; categoryId: string; assignedAt: Date };
type NoteRelationRow = { sourceNoteId: string; targetNoteId: string; assignedAt: Date };
type NoteFileRow = NoteFileSeed;
type NoteWithRelationsRow = Omit<NoteSeed, 'tags' | 'categories' | 'relationsFrom'> & {
  tags: NoteTagRow[];
  categories: NoteCategoryRow[];
  relationsFrom: NoteRelationRow[];
  files: NoteFileRow[];
};

export const syncNotebooks: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = (await mongo.collection('notebooks').find({}).toArray()) as NotebookDoc[];
  const warnings: string[] = [];
  const seenNames = new Set<string>();
  const data = docs
    .map((doc: NotebookDoc): NotebookSeed | null => {
      const id = normalizeId(doc);
      if (!id) return null;
      const name = (doc.name as string) ?? id;
      if (seenNames.has(name)) {
        warnings.push(`Skipped duplicate notebook name: ${name}`);
        return null;
      }
      seenNames.add(name);
      return {
        id,
        name,
        color: (doc.color as string | null) ?? null,
        defaultThemeId: (doc.defaultThemeId as string | null) ?? null,
        createdAt: (doc.createdAt as Date) ?? new Date(),
        updatedAt: (doc.updatedAt as Date) ?? new Date(),
      };
    })
    .filter((item): item is NotebookSeed => item !== null);
  const deleted = (await prisma.notebook.deleteMany()) as BatchResult;
  const created: BatchResult = data.length
    ? ((await prisma.notebook.createMany({
      data: data as Prisma.NotebookCreateManyInput[],
    })) as BatchResult)
    : { count: 0 };
  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

export const syncThemes: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const notebookRows = (await prisma.notebook.findMany({
    select: { id: true },
  })) as EntityWithId[];
  const availableNotebookIds = new Set<string>(
    notebookRows.map((entry) => entry.id)
  );
  const warnings: string[] = [];
  const docs = (await mongo.collection('themes').find({}).toArray()) as ThemeDoc[];
  const data = docs
    .map((doc: ThemeDoc): ThemeSeed | null => {
      const id = normalizeId(doc);
      if (!id) return null;
      const rawNotebookId = (doc.notebookId as string | null) ?? null;
      const resolvedNotebookId =
        rawNotebookId && availableNotebookIds.has(rawNotebookId) ? rawNotebookId : null;
      if (rawNotebookId && !resolvedNotebookId) {
        warnings.push(`Theme ${id}: missing notebook ${rawNotebookId}`);
      }
      return {
        id,
        name: (doc.name as string) ?? id,
        notebookId: resolvedNotebookId,
        textColor: (doc.textColor as string) ?? '#e5e7eb',
        backgroundColor: (doc.backgroundColor as string) ?? '#111827',
        markdownHeadingColor:
          (doc.markdownHeadingColor as string) ?? '#ffffff',
        markdownLinkColor: (doc.markdownLinkColor as string) ?? '#60a5fa',
        markdownCodeBackground:
          (doc.markdownCodeBackground as string) ?? '#1f2937',
        markdownCodeText: (doc.markdownCodeText as string) ?? '#e5e7eb',
        relatedNoteBorderWidth:
          (doc.relatedNoteBorderWidth as number) ?? 1,
        relatedNoteBorderColor:
          (doc.relatedNoteBorderColor as string) ?? '#374151',
        relatedNoteBackgroundColor:
          (doc.relatedNoteBackgroundColor as string) ?? '#1f2937',
        relatedNoteTextColor:
          (doc.relatedNoteTextColor as string) ?? '#e5e7eb',
        createdAt: (doc.createdAt as Date) ?? new Date(),
        updatedAt: (doc.updatedAt as Date) ?? new Date(),
      };
    })
    .filter((item): item is ThemeSeed => item !== null);
  const deleted = (await prisma.theme.deleteMany()) as BatchResult;
  const created: BatchResult = data.length
    ? ((await prisma.theme.createMany({
      data: data as Prisma.ThemeCreateManyInput[],
    })) as BatchResult)
    : { count: 0 };
  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

export const syncTags: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const notebookRows = (await prisma.notebook.findMany({
    select: { id: true },
  })) as EntityWithId[];
  const availableNotebookIds = new Set<string>(
    notebookRows.map((entry) => entry.id)
  );
  const warnings: string[] = [];
  const docs = (await mongo.collection('tags').find({}).toArray()) as TagDoc[];
  const seenTags = new Set<string>();
  const data = docs
    .map((doc: TagDoc): TagSeed | null => {
      const id = normalizeId(doc);
      if (!id) return null;
      const name = (doc.name as string) ?? id;
      const rawNotebookId = (doc.notebookId as string | null) ?? null;
      const resolvedNotebookId =
        rawNotebookId && availableNotebookIds.has(rawNotebookId) ? rawNotebookId : null;
      if (rawNotebookId && !resolvedNotebookId) {
        warnings.push(`Tag ${id}: missing notebook ${rawNotebookId}`);
      }
      const key = `${resolvedNotebookId ?? 'none'}::${name}`;
      if (seenTags.has(key)) {
        warnings.push(`Skipped duplicate tag: ${name} (${resolvedNotebookId ?? 'no-notebook'})`);
        return null;
      }
      seenTags.add(key);
      return {
        id,
        name,
        color: (doc.color as string | null) ?? null,
        notebookId: resolvedNotebookId,
        createdAt: (doc.createdAt as Date) ?? new Date(),
        updatedAt: (doc.updatedAt as Date) ?? new Date(),
      };
    })
    .filter((item): item is TagSeed => item !== null);
  const deleted = (await prisma.tag.deleteMany()) as BatchResult;
  const created: BatchResult = data.length
    ? ((await prisma.tag.createMany({
      data: data as Prisma.TagCreateManyInput[],
    })) as BatchResult)
    : { count: 0 };
  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

export const syncCategories: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = (await mongo.collection('categories').find({}).toArray()) as CategoryDoc[];
  const warnings: string[] = [];
  const notebookRows = (await prisma.notebook.findMany({
    select: { id: true },
  })) as EntityWithId[];
  const availableNotebookIds = new Set<string>(
    notebookRows.map((entry) => entry.id)
  );
  const themeRows = (await prisma.theme.findMany({
    select: { id: true },
  })) as EntityWithId[];
  const availableThemeIds = new Set<string>(
    themeRows.map((entry) => entry.id)
  );
  const raw = docs
    .map((doc: CategoryDoc): CategorySeed | null => {
      const id = normalizeId(doc);
      if (!id) return null;
      return {
        id,
        name: (doc.name as string) ?? id,
        description: (doc.description as string | null) ?? null,
        color: (doc.color as string | null) ?? null,
        parentId: (doc.parentId as string | null) ?? null,
        themeId: (doc.themeId as string | null) ?? null,
        notebookId: (doc.notebookId as string | null) ?? null,
        sortIndex: (doc.sortIndex as number | null) ?? 0,
        createdAt: (doc.createdAt as Date) ?? new Date(),
        updatedAt: (doc.updatedAt as Date) ?? new Date(),
      };
    })
    .filter((item): item is CategorySeed => item !== null);
  const seenCategories = new Set<string>();
  const deduped = raw.filter((entry) => {
    const key = `${entry.notebookId ?? 'none'}::${entry.name}`;
    if (seenCategories.has(key)) {
      warnings.push(
        `Skipped duplicate category: ${entry.name} (${entry.notebookId ?? 'no-notebook'})`
      );
      return false;
    }
    seenCategories.add(key);
    return true;
  });
  const availableCategoryIds = new Set(deduped.map((entry) => entry.id));
  const data = deduped.map((entry): Prisma.CategoryCreateManyInput => {
    const resolvedParentId =
      entry.parentId && availableCategoryIds.has(entry.parentId) ? entry.parentId : null;
    if (entry.parentId && !resolvedParentId) {
      warnings.push(`Category ${entry.id}: missing parent ${entry.parentId}`);
    }
    const resolvedNotebookId =
      entry.notebookId && availableNotebookIds.has(entry.notebookId) ? entry.notebookId : null;
    if (entry.notebookId && !resolvedNotebookId) {
      warnings.push(`Category ${entry.id}: missing notebook ${entry.notebookId}`);
    }
    const resolvedThemeId =
      entry.themeId && availableThemeIds.has(entry.themeId) ? entry.themeId : null;
    if (entry.themeId && !resolvedThemeId) {
      warnings.push(`Category ${entry.id}: missing theme ${entry.themeId}`);
    }
    return {
      ...entry,
      parentId: resolvedParentId,
      notebookId: resolvedNotebookId,
      themeId: resolvedThemeId,
    };
  });
  const deleted = (await prisma.category.deleteMany()) as BatchResult;
  const created: BatchResult = data.length
    ? ((await prisma.category.createMany({ data })) as BatchResult)
    : { count: 0 };
  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

export const syncNotes: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const docs = (await mongo.collection('notes').find({}).toArray()) as MongoNoteDoc[];
  const notebookRows = (await prisma.notebook.findMany({
    select: { id: true },
  })) as EntityWithId[];
  const availableNotebookIds = new Set<string>(
    notebookRows.map((entry) => entry.id)
  );
  const data = docs.map(
    (doc): NoteSeed => {
      const id = doc.id || doc._id?.toString() || '';
      return {
        id,
        title: doc.title ?? '',
        content: doc.content ?? '',
        editorType: doc.editorType ?? 'markdown',
        color: doc.color ?? null,
        isPinned: Boolean(doc.isPinned),
        isArchived: Boolean(doc.isArchived),
        isFavorite: Boolean(doc.isFavorite),
        notebookId:
          doc.notebookId && availableNotebookIds.has(doc.notebookId) ? doc.notebookId : null,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
        tags: doc.tags ?? [],
        categories: doc.categories ?? [],
        relationsFrom: doc.relationsFrom ?? [],
      };
    }
  );

  await prisma.noteTag.deleteMany();
  await prisma.noteCategory.deleteMany();
  await prisma.noteRelation.deleteMany();
  await prisma.noteFile.deleteMany();
  const deleted = (await prisma.note.deleteMany()) as BatchResult;

  const noteData = data.map(({ tags: _t, categories: _c, relationsFrom: _r, ...rest }) => rest);
  const created: BatchResult = noteData.length
    ? ((await prisma.note.createMany({
      data: noteData as Prisma.NoteCreateManyInput[],
    })) as BatchResult)
    : { count: 0 };

  const tagRows = data.flatMap((note) =>
    note.tags.map((tag: { tagId: string; assignedAt?: Date | string }) => ({
      noteId: note.id,
      tagId: tag.tagId,
      assignedAt: tag.assignedAt ? new Date(tag.assignedAt) : new Date(),
    }))
  ) as Prisma.NoteTagCreateManyInput[];
  if (tagRows.length) await prisma.noteTag.createMany({ data: tagRows });

  const categoryRows = data.flatMap((note) =>
    note.categories.map((cat: { categoryId: string; assignedAt?: Date | string }) => ({
      noteId: note.id,
      categoryId: cat.categoryId,
      assignedAt: cat.assignedAt ? new Date(cat.assignedAt) : new Date(),
    }))
  ) as Prisma.NoteCategoryCreateManyInput[];
  if (categoryRows.length) await prisma.noteCategory.createMany({ data: categoryRows });

  const relationRows = data.flatMap((note) =>
    note.relationsFrom
      .filter((rel: { targetNoteId?: string; assignedAt?: Date | string }): rel is {
        targetNoteId: string;
        assignedAt?: Date | string;
      } =>
        Boolean(rel.targetNoteId)
      )
      .map((rel: { targetNoteId: string; assignedAt?: Date | string }) => ({
        sourceNoteId: note.id,
        targetNoteId: rel.targetNoteId,
        assignedAt: rel.assignedAt ? new Date(rel.assignedAt) : new Date(),
      }))
  ) as Prisma.NoteRelationCreateManyInput[];
  if (relationRows.length) await prisma.noteRelation.createMany({ data: relationRows });

  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncNoteFiles: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = (await mongo.collection('noteFiles').find({}).toArray()) as NoteFileDoc[];
  const noteRows = (await prisma.note.findMany({
    select: { id: true },
  })) as EntityWithId[];
  const availableNoteIds = new Set<string>(
    noteRows.map((entry) => entry.id)
  );
  const data = docs
    .map((doc: NoteFileDoc): NoteFileSeed | null => {
      const id = normalizeId(doc);
      const noteId = doc.noteId as string;
      if (!id || !noteId || !availableNoteIds.has(noteId)) return null;
      return {
        id,
        noteId,
        slotIndex: (doc.slotIndex as number) ?? 0,
        filename: (doc.filename as string) ?? '',
        filepath: (doc.filepath as string) ?? '',
        mimetype: (doc.mimetype as string) ?? '',
        size: (doc.size as number) ?? 0,
        width: (doc.width as number | null) ?? null,
        height: (doc.height as number | null) ?? null,
        createdAt: (doc.createdAt as Date) ?? new Date(),
        updatedAt: (doc.updatedAt as Date) ?? new Date(),
      };
    })
    .filter((item): item is NoteFileSeed => item !== null);
  const deleted = (await prisma.noteFile.deleteMany()) as BatchResult;
  const created: BatchResult = data.length
    ? ((await prisma.noteFile.createMany({
      data: data as Prisma.NoteFileCreateManyInput[],
    })) as BatchResult)
    : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

// --- Prisma to Mongo handlers ---

export const syncNotesPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const [notes, tags, categories] = (await Promise.all([
    prisma.note.findMany({
      include: {
        tags: true,
        categories: true,
        relationsFrom: true,
        files: true,
      },
    }),
    prisma.tag.findMany(),
    prisma.category.findMany(),
  ])) as [NoteWithRelationsRow[], TagRow[], CategoryRow[]];

  const tagMap = new Map(tags.map((tag) => [tag.id, tag]));
  const categoryMap = new Map(
    categories.map((category) => [category.id, category])
  );
  const noteMap = new Map(notes.map((note) => [note.id, note]));

  const docs = notes.map((note) => {
    const tagEntries = note.tags.map((entry) => {
      const tag = tagMap.get(entry.tagId);
      return {
        noteId: entry.noteId,
        tagId: entry.tagId,
        assignedAt: entry.assignedAt,
        tag: tag
          ? {
            id: tag.id,
            name: tag.name,
            color: tag.color ?? null,
            notebookId: tag.notebookId ?? null,
            createdAt: tag.createdAt,
            updatedAt: tag.updatedAt,
          }
          : {
            id: entry.tagId,
            name: '',
            color: null,
            notebookId: null,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
          },
      };
    });
    const categoryEntries = note.categories.map((entry) => {
      const category = categoryMap.get(entry.categoryId);
      return {
        noteId: entry.noteId,
        categoryId: entry.categoryId,
        assignedAt: entry.assignedAt,
        category: category
          ? {
            id: category.id,
            name: category.name,
            description: category.description ?? null,
            color: category.color ?? null,
            parentId: category.parentId ?? null,
            themeId: category.themeId ?? null,
            notebookId: category.notebookId ?? null,
            sortIndex: category.sortIndex,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
          }
          : {
            id: entry.categoryId,
            name: '',
            description: null,
            color: null,
            parentId: null,
            themeId: null,
            notebookId: null,
            sortIndex: 0,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
          },
      };
    });
    const relationsFrom = note.relationsFrom.map((entry) => {
      const target = noteMap.get(entry.targetNoteId);
      return {
        sourceNoteId: entry.sourceNoteId,
        targetNoteId: entry.targetNoteId,
        assignedAt: entry.assignedAt,
        targetNote: target
          ? { id: target.id, title: target.title, color: target.color ?? null }
          : { id: entry.targetNoteId, title: '', color: null },
      };
    });
    return {
      _id: note.id,
      id: note.id,
      title: note.title,
      content: note.content,
      editorType: note.editorType,
      color: note.color ?? null,
      isPinned: note.isPinned,
      isArchived: note.isArchived,
      isFavorite: note.isFavorite,
      notebookId: note.notebookId ?? null,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      tags: tagEntries,
      categories: categoryEntries,
      relationsFrom,
      files: note.files.map((file) => ({
        noteId: file.noteId,
        slotIndex: file.slotIndex,
        filename: file.filename,
        filepath: file.filepath,
        mimetype: file.mimetype,
        size: file.size,
        width: file.width ?? null,
        height: file.height ?? null,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      })),
    };
  });

  const collection = mongo.collection<Record<string, unknown>>('notes');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: notes.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncNoteFilesPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const files = (await prisma.noteFile.findMany()) as NoteFileRow[];
  const docs = files.map((file) => ({
    _id: file.id,
    id: file.id,
    noteId: file.noteId,
    slotIndex: file.slotIndex,
    filename: file.filename,
    filepath: file.filepath,
    mimetype: file.mimetype,
    size: file.size,
    width: file.width ?? null,
    height: file.height ?? null,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  }));
  const collection = mongo.collection<Record<string, unknown>>('noteFiles');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: files.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncTagsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.tag.findMany()) as TagRow[];
  const docs = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    name: row.name,
    color: row.color ?? null,
    notebookId: row.notebookId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection<Record<string, unknown>>('tags');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncCategoriesPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.category.findMany()) as CategoryRow[];
  const docs = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    color: row.color ?? null,
    parentId: row.parentId ?? null,
    themeId: row.themeId ?? null,
    notebookId: row.notebookId ?? null,
    sortIndex: row.sortIndex,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection<Record<string, unknown>>('categories');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncNotebooksPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.notebook.findMany()) as NotebookRow[];
  const docs = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    name: row.name,
    color: row.color ?? null,
    defaultThemeId: row.defaultThemeId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection<Record<string, unknown>>('notebooks');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncThemesPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.theme.findMany()) as ThemeRow[];
  const docs = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    name: row.name,
    textColor: row.textColor,
    backgroundColor: row.backgroundColor,
    markdownHeadingColor: row.markdownHeadingColor,
    markdownLinkColor: row.markdownLinkColor,
    markdownCodeBackground: row.markdownCodeBackground,
    markdownCodeText: row.markdownCodeText,
    relatedNoteBorderWidth: row.relatedNoteBorderWidth,
    relatedNoteBorderColor: row.relatedNoteBorderColor,
    relatedNoteBackgroundColor: row.relatedNoteBackgroundColor,
    relatedNoteTextColor: row.relatedNoteTextColor,
    notebookId: row.notebookId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection<Record<string, unknown>>('themes');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};
