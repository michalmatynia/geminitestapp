/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { ObjectId } from 'mongodb';

import type { DatabaseSyncHandler } from './types';
import type { Prisma } from '@prisma/client';

export const syncNotebooks: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = await mongo.collection('notebooks').find({}).toArray();
  const warnings: string[] = [];
  const seenNames = new Set<string>();
  const data = docs
    .map((doc: Record<string, unknown>): Prisma.NotebookCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
      if (!id) return null;
      const name = (doc as { name?: string }).name ?? id;
      if (seenNames.has(name)) {
        warnings.push(`Skipped duplicate notebook name: ${name}`);
        return null;
      }
      seenNames.add(name);
      return {
        id,
        name,
        color: (doc as { color?: string | null }).color ?? null,
        defaultThemeId: (doc as { defaultThemeId?: string | null }).defaultThemeId ?? null,
        createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
        updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
      };
    })
    .filter((item): item is Prisma.NotebookCreateManyInput => item !== null);
  const deleted = await prisma.notebook.deleteMany();
  const created = data.length ? await prisma.notebook.createMany({ data }) : { count: 0 };
  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

export const syncThemes: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const availableNotebookIds = new Set<string>(
    (await prisma.notebook.findMany({ select: { id: true } })).map(
      (entry: { id: string }) => entry.id
    )
  );
  const warnings: string[] = [];
  const docs = await mongo.collection('themes').find({}).toArray();
  const data = docs
    .map((doc: Record<string, unknown>): Prisma.ThemeCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
      if (!id) return null;
      const rawNotebookId = (doc as { notebookId?: string | null }).notebookId ?? null;
      const resolvedNotebookId =
        rawNotebookId && availableNotebookIds.has(rawNotebookId) ? rawNotebookId : null;
      if (rawNotebookId && !resolvedNotebookId) {
        warnings.push(`Theme ${id}: missing notebook ${rawNotebookId}`);
      }
      return {
        id,
        name: (doc as { name?: string }).name ?? id,
        notebookId: resolvedNotebookId,
        textColor: (doc as { textColor?: string }).textColor ?? '#e5e7eb',
        backgroundColor: (doc as { backgroundColor?: string }).backgroundColor ?? '#111827',
        markdownHeadingColor:
          (doc as { markdownHeadingColor?: string }).markdownHeadingColor ?? '#ffffff',
        markdownLinkColor: (doc as { markdownLinkColor?: string }).markdownLinkColor ?? '#60a5fa',
        markdownCodeBackground:
          (doc as { markdownCodeBackground?: string }).markdownCodeBackground ?? '#1f2937',
        markdownCodeText: (doc as { markdownCodeText?: string }).markdownCodeText ?? '#e5e7eb',
        relatedNoteBorderWidth:
          (doc as { relatedNoteBorderWidth?: number }).relatedNoteBorderWidth ?? 1,
        relatedNoteBorderColor:
          (doc as { relatedNoteBorderColor?: string }).relatedNoteBorderColor ?? '#374151',
        relatedNoteBackgroundColor:
          (doc as { relatedNoteBackgroundColor?: string }).relatedNoteBackgroundColor ?? '#1f2937',
        relatedNoteTextColor:
          (doc as { relatedNoteTextColor?: string }).relatedNoteTextColor ?? '#e5e7eb',
        createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
        updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
      };
    })
    .filter((item): item is Prisma.ThemeCreateManyInput => item !== null);
  const deleted = await prisma.theme.deleteMany();
  const created = data.length ? await prisma.theme.createMany({ data }) : { count: 0 };
  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

export const syncTags: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const availableNotebookIds = new Set<string>(
    (await prisma.notebook.findMany({ select: { id: true } })).map(
      (entry: { id: string }) => entry.id
    )
  );
  const warnings: string[] = [];
  const docs = await mongo.collection('tags').find({}).toArray();
  const seenTags = new Set<string>();
  const data = docs
    .map((doc: Record<string, unknown>): Prisma.TagCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
      if (!id) return null;
      const name = (doc as { name?: string }).name ?? id;
      const rawNotebookId = (doc as { notebookId?: string | null }).notebookId ?? null;
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
        color: (doc as { color?: string | null }).color ?? null,
        notebookId: resolvedNotebookId,
        createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
        updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
      };
    })
    .filter((item): item is Prisma.TagCreateManyInput => item !== null);
  const deleted = await prisma.tag.deleteMany();
  const created = data.length ? await prisma.tag.createMany({ data }) : { count: 0 };
  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

export const syncCategories: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = await mongo.collection('categories').find({}).toArray();
  const warnings: string[] = [];
  const availableNotebookIds = new Set<string>(
    (await prisma.notebook.findMany({ select: { id: true } })).map(
      (entry: { id: string }) => entry.id
    )
  );
  const availableThemeIds = new Set<string>(
    (await prisma.theme.findMany({ select: { id: true } })).map((entry: { id: string }) => entry.id)
  );
  const raw = docs
    .map((doc: Record<string, unknown>): Prisma.CategoryCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
      if (!id) return null;
      return {
        id,
        name: (doc as { name?: string }).name ?? id,
        description: (doc as { description?: string | null }).description ?? null,
        color: (doc as { color?: string | null }).color ?? null,
        parentId: (doc as { parentId?: string | null }).parentId ?? null,
        themeId: (doc as { themeId?: string | null }).themeId ?? null,
        notebookId: (doc as { notebookId?: string | null }).notebookId ?? null,
        sortIndex: (doc as { sortIndex?: number | null }).sortIndex ?? 0,
        createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
        updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
      };
    })
    .filter((item): item is Prisma.CategoryCreateManyInput => item !== null);
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
  const deleted = await prisma.category.deleteMany();
  const created = data.length ? await prisma.category.createMany({ data }) : { count: 0 };
  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

export const syncNotes: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const docs = await mongo.collection('notes').find({}).toArray();
  const availableNotebookIds = new Set<string>(
    (await prisma.notebook.findMany({ select: { id: true } })).map(
      (entry: { id: string }) => entry.id
    )
  );

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

  const data = (docs as unknown as MongoNoteDoc[]).map(
    (
      doc
    ): Prisma.NoteCreateManyInput & {
      tags: MongoNoteTag[];
      categories: MongoNoteCategory[];
      relationsFrom: MongoNoteRelation[];
    } => {
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
  const deleted = await prisma.note.deleteMany();

  const noteData = data.map(({ tags: _t, categories: _c, relationsFrom: _r, ...rest }) => rest);
  const created = noteData.length
    ? await prisma.note.createMany({ data: noteData as Prisma.NoteCreateManyInput[] })
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
      .filter((rel): rel is { targetNoteId: string; assignedAt?: Date | string } =>
        Boolean(rel.targetNoteId)
      )
      .map((rel) => ({
        sourceNoteId: note.id,
        targetNoteId: rel.targetNoteId,
        assignedAt: rel.assignedAt ? new Date(rel.assignedAt) : new Date(),
      }))
  ) as Prisma.NoteRelationCreateManyInput[];
  if (relationRows.length) await prisma.noteRelation.createMany({ data: relationRows });

  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncNoteFiles: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = await mongo.collection('noteFiles').find({}).toArray();
  const availableNoteIds = new Set<string>(
    (await prisma.note.findMany({ select: { id: true } })).map((entry: { id: string }) => entry.id)
  );
  const data = docs
    .map((doc: Record<string, unknown>): Prisma.NoteFileCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
      const noteId = (doc as { noteId?: string }).noteId;
      if (!id || !noteId || !availableNoteIds.has(noteId)) return null;
      return {
        id,
        noteId,
        slotIndex: (doc as { slotIndex?: number }).slotIndex ?? 0,
        filename: (doc as { filename?: string }).filename ?? '',
        filepath: (doc as { filepath?: string }).filepath ?? '',
        mimetype: (doc as { mimetype?: string }).mimetype ?? '',
        size: (doc as { size?: number }).size ?? 0,
        width: (doc as { width?: number | null }).width ?? null,
        height: (doc as { height?: number | null }).height ?? null,
        createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(),
        updatedAt: (doc as { updatedAt?: Date }).updatedAt ?? new Date(),
      };
    })
    .filter((item): item is Prisma.NoteFileCreateManyInput => item !== null);
  const deleted = await prisma.noteFile.deleteMany();
  const created = data.length ? await prisma.noteFile.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

// --- Prisma to Mongo handlers ---

export const syncNotesPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const [notes, tags, categories] = await Promise.all([
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
  ]);
  const tagMap = new Map(tags.map((tag) => [tag.id, tag]));
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
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

  const collection = mongo.collection('notes');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: notes.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncNoteFilesPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const files = await prisma.noteFile.findMany();
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
  const collection = mongo.collection('noteFiles');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: files.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncTagsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.tag.findMany();
  const docs = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    name: row.name,
    color: row.color ?? null,
    notebookId: row.notebookId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection('tags');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncCategoriesPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.category.findMany();
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
  const collection = mongo.collection('categories');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncNotebooksPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.notebook.findMany();
  const docs = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    name: row.name,
    color: row.color ?? null,
    defaultThemeId: row.defaultThemeId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection('notebooks');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncThemesPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.theme.findMany();
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
  const collection = mongo.collection('themes');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};
