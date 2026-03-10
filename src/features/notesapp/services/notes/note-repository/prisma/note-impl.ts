import 'server-only';

import type {
  NoteFilters,
  NoteWithRelations,
  NoteCreateInput,
  NoteUpdateInput,
  NoteEditorType,
} from '@/shared/contracts/notes';
import prisma from '@/shared/lib/db/prisma';
import type { Prisma } from '@/shared/lib/db/prisma-client';

import { getOrCreateDefaultNotebook } from './notebook-impl';


const noteInclude = {
  tags: { include: { tag: true } },
  categories: { include: { category: true } },
  relationsFrom: {
    include: {
      targetNote: { select: { id: true, title: true, color: true } },
    },
  },
  relationsTo: {
    include: {
      sourceNote: { select: { id: true, title: true, color: true } },
    },
  },
  files: { orderBy: { slotIndex: 'asc' } },
} as const;

type NotePrismaResult = Prisma.NoteGetPayload<{
  include: typeof noteInclude;
}>;

const convertNote = (note: NotePrismaResult): NoteWithRelations => ({
  id: note.id,
  title: note.title,
  content: note.content,
  editorType: note.editorType as NoteEditorType,
  color: note.color,
  isPinned: note.isPinned,
  isArchived: note.isArchived,
  isFavorite: note.isFavorite,
  notebookId: note.notebookId,
  createdAt: note.createdAt.toISOString(),
  updatedAt: note.updatedAt?.toISOString() ?? null,
  tagIds: note.tags.map((t) => t.tagId),
  categoryIds: note.categories.map((c) => c.categoryId),
  relatedNoteIds: note.relationsFrom.map((r) => r.targetNoteId),
  relations: [],
  tags: note.tags.map((t: NotePrismaResult['tags'][number]) => ({
    noteId: t.noteId,
    tagId: t.tagId,
    assignedAt: t.assignedAt.toISOString(),
    tag: {
      id: t.tag.id,
      name: t.tag.name,
      color: t.tag.color,
      notebookId: t.tag.notebookId,
      createdAt: t.tag.createdAt.toISOString(),
      updatedAt: t.tag.updatedAt.toISOString(),
    },
  })),
  categories: note.categories.map((c: NotePrismaResult['categories'][number]) => ({
    noteId: c.noteId,
    categoryId: c.categoryId,
    assignedAt: c.assignedAt.toISOString(),
    category: {
      id: c.category.id,
      name: c.category.name,
      description: c.category.description,
      color: c.category.color,
      parentId: c.category.parentId,
      notebookId: c.category.notebookId,
      themeId: c.category.themeId,
      sortIndex: c.category.sortIndex,
      createdAt: c.category.createdAt.toISOString(),
      updatedAt: c.category.updatedAt.toISOString(),
    },
  })),
  relationsFrom: note.relationsFrom.map((r: NotePrismaResult['relationsFrom'][number]) => ({
    sourceNoteId: r.sourceNoteId,
    targetNoteId: r.targetNoteId,
    assignedAt: r.assignedAt.toISOString(),
    targetNote: r.targetNote,
  })),
  relationsTo: note.relationsTo.map((r: NotePrismaResult['relationsTo'][number]) => ({
    sourceNoteId: r.sourceNoteId,
    targetNoteId: r.targetNoteId,
    assignedAt: r.assignedAt.toISOString(),
    sourceNote: r.sourceNote,
  })),
  files: note.files.map((f: NotePrismaResult['files'][number]) => ({
    id: f.id,
    noteId: f.noteId,
    slotIndex: f.slotIndex,
    filename: f.filename,
    filepath: f.filepath,
    mimetype: f.mimetype,
    size: f.size,
    width: f.width,
    height: f.height,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  })),
});

export const getAll = async (filters: NoteFilters): Promise<NoteWithRelations[]> => {
  const {
    search,
    searchScope = 'both',
    isPinned,
    isArchived,
    isFavorite,
    tagIds,
    categoryIds,
    notebookId,
  } = filters;

  const where: Prisma.NoteWhereInput = {};
  const resolvedNotebookId = notebookId ?? (await getOrCreateDefaultNotebook()).id;
  where.notebookId = resolvedNotebookId;

  if (search) {
    if (searchScope === 'both') {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    } else if (searchScope === 'title') {
      where.title = { contains: search, mode: 'insensitive' };
    } else if (searchScope === 'content') {
      where.content = { contains: search, mode: 'insensitive' };
    }
  }

  if (typeof isPinned === 'boolean') where.isPinned = isPinned;
  if (typeof isArchived === 'boolean') where.isArchived = isArchived;
  if (typeof isFavorite === 'boolean') where.isFavorite = isFavorite;

  if (tagIds && tagIds.length > 0) {
    where.tags = { some: { tagId: { in: tagIds } } };
  }

  if (categoryIds && categoryIds.length > 0) {
    where.categories = { some: { categoryId: { in: categoryIds } } };
  }

  const notes = await prisma.note.findMany({
    where,
    include: noteInclude,
    orderBy: { updatedAt: 'desc' },
  });

  if (filters.truncateContent) {
    return notes.map((note: NotePrismaResult) => {
      const converted = convertNote(note);
      return {
        ...converted,
        content:
          converted.content.length > 300
            ? converted.content.slice(0, 300) + '...'
            : converted.content,
      };
    });
  }

  return notes.map(convertNote);
};

export const getById = async (id: string): Promise<NoteWithRelations | null> => {
  const note = await prisma.note.findUnique({
    where: { id },
    include: noteInclude,
  });

  return note ? convertNote(note) : null;
};

export const create = async (data: NoteCreateInput): Promise<NoteWithRelations> => {
  const { tagIds, categoryIds, relatedNoteIds, notebookId } = data;
  const resolvedNotebookId = notebookId ?? (await getOrCreateDefaultNotebook()).id;

  const createData: Prisma.NoteCreateInput = {
    title: data.title,
    content: data.content,
    ...(data.editorType !== undefined && { editorType: data.editorType }),
    ...(data.color !== undefined && { color: data.color }),
    ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
    ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
    ...(data.isFavorite !== undefined && { isFavorite: data.isFavorite }),
    notebook: { connect: { id: resolvedNotebookId } },
  };

  if (tagIds) {
    createData.tags = {
      create: tagIds.map((tagId: string) => ({
        tag: { connect: { id: tagId } },
      })),
    };
  }

  if (categoryIds) {
    createData.categories = {
      create: categoryIds.map((categoryId: string) => ({
        category: { connect: { id: categoryId } },
      })),
    };
  }

  if (relatedNoteIds) {
    createData.relationsFrom = {
      create: relatedNoteIds.map((targetNoteId: string) => ({
        targetNote: { connect: { id: targetNoteId } },
      })),
    };
  }

  const note = await prisma.note.create({
    data: createData,
    include: noteInclude,
  });

  return convertNote(note);
};

export const update = async (
  id: string,
  data: NoteUpdateInput
): Promise<NoteWithRelations | null> => {
  const { tagIds, categoryIds, relatedNoteIds, notebookId } = data;

  const updateData: Prisma.NoteUpdateInput = {
    ...(data.title !== undefined && { title: data.title }),
    ...(data.content !== undefined && { content: data.content }),
    ...(data.editorType !== undefined && { editorType: data.editorType }),
    ...(data.color !== undefined && { color: data.color }),
    ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
    ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
    ...(data.isFavorite !== undefined && { isFavorite: data.isFavorite }),
  };
  if (notebookId !== undefined && notebookId !== null) {
    updateData.notebook = { connect: { id: notebookId } };
  }

  if (tagIds !== undefined) {
    updateData.tags = {
      deleteMany: {},
      create: tagIds.map((tagId: string) => ({
        tag: { connect: { id: tagId } },
      })),
    };
  }

  if (categoryIds !== undefined) {
    updateData.categories = {
      deleteMany: {},
      create: categoryIds.map((categoryId: string) => ({
        category: { connect: { id: categoryId } },
      })),
    };
  }

  if (relatedNoteIds !== undefined) {
    updateData.relationsFrom = {
      deleteMany: {},
      create: relatedNoteIds.map((targetNoteId: string) => ({
        targetNote: { connect: { id: targetNoteId } },
      })),
    };
  }

  try {
    const note = await prisma.note.update({
      where: { id },
      data: updateData,
      include: noteInclude,
    });
    return convertNote(note);
  } catch {
    return null;
  }
};

export const syncRelatedNotesBatch = async (
  noteId: string,
  addedIds: string[],
  removedIds: string[]
): Promise<void> => {
  if (addedIds.length === 0 && removedIds.length === 0) return;

  await prisma.$transaction(async (tx) => {
    // Bilateral additions
    for (const relatedId of addedIds) {
      if (relatedId === noteId) continue;
      // Add relation from related to current (current to related is already handled by main update)
      await tx.noteRelation.upsert({
        where: {
          sourceNoteId_targetNoteId: {
            sourceNoteId: relatedId,
            targetNoteId: noteId,
          },
        },
        create: {
          sourceNoteId: relatedId,
          targetNoteId: noteId,
          assignedAt: new Date(),
        },
        update: {},
      });
    }

    // Bilateral removals
    for (const relatedId of removedIds) {
      // Remove relation from related to current
      await tx.noteRelation.deleteMany({
        where: {
          sourceNoteId: relatedId,
          targetNoteId: noteId,
        },
      });
    }
  });
};

export const deleteNote = async (id: string): Promise<boolean> => {
  try {
    await prisma.note.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
};
