import "server-only";

import type { Prisma } from "@prisma/client";
import prisma from "@/shared/lib/db/prisma";
import type {
  NoteFilters,
  NoteWithRelations,
  NoteCreateInput,
  NoteUpdateInput,
} from "@/shared/types/notes";
import { getOrCreateDefaultNotebook } from "./notebook-impl";

export const getAll = async (
  filters: NoteFilters
): Promise<NoteWithRelations[]> => {
  const {
    search,
    searchScope = "both",
    isPinned,
    isArchived,
    isFavorite,
    tagIds,
    categoryIds,
    notebookId,
  } = filters;

  const where: Prisma.NoteWhereInput = {};
  const resolvedNotebookId =
    notebookId ?? (await getOrCreateDefaultNotebook()).id;
  where.notebookId = resolvedNotebookId;

  if (search) {
    if (searchScope === "both") {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    } else if (searchScope === "title") {
      where.title = { contains: search, mode: "insensitive" };
    } else if (searchScope === "content") {
      where.content = { contains: search, mode: "insensitive" };
    }
  }

  if (typeof isPinned === "boolean") where.isPinned = isPinned;
  if (typeof isArchived === "boolean") where.isArchived = isArchived;
  if (typeof isFavorite === "boolean") where.isFavorite = isFavorite;

  if (tagIds && tagIds.length > 0) {
    where.tags = { some: { tagId: { in: tagIds } } };
  }

  if (categoryIds && categoryIds.length > 0) {
    where.categories = { some: { categoryId: { in: categoryIds } } };
  }

  const notes = await prisma.note.findMany({
    where,
    include: {
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
      files: { orderBy: { slotIndex: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (filters.truncateContent) {
    return notes.map((note) => ({
      ...note,
      content:
        note.content.length > 300
          ? note.content.slice(0, 300) + "..."
          : note.content,
    }));
  }

  return notes;
};

export const getById = async (id: string): Promise<NoteWithRelations | null> => {
  return prisma.note.findUnique({
    where: { id },
    include: {
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
      files: { orderBy: { slotIndex: "asc" } },
    },
  });
};

export const create = async (
  data: NoteCreateInput
): Promise<NoteWithRelations> => {
  const { tagIds, categoryIds, relatedNoteIds, notebookId } = data;
  const resolvedNotebookId =
    notebookId ?? (await getOrCreateDefaultNotebook()).id;

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
      create: tagIds.map((tagId) => ({ tag: { connect: { id: tagId } } })),
    };
  }

  if (categoryIds) {
    createData.categories = {
      create: categoryIds.map((categoryId) => ({
        category: { connect: { id: categoryId } },
      })),
    };
  }

  if (relatedNoteIds) {
    createData.relationsFrom = {
      create: relatedNoteIds.map((targetNoteId) => ({
        targetNote: { connect: { id: targetNoteId } },
      })),
    };
  }

  return prisma.note.create({
    data: createData,
    include: {
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
      files: { orderBy: { slotIndex: "asc" } },
    },
  });
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
      create: tagIds.map((tagId) => ({ tag: { connect: { id: tagId } } })),
    };
  }

  if (categoryIds !== undefined) {
    updateData.categories = {
      deleteMany: {},
      create: categoryIds.map((categoryId) => ({
        category: { connect: { id: categoryId } },
      })),
    };
  }

  if (relatedNoteIds !== undefined) {
    updateData.relationsFrom = {
      deleteMany: {},
      create: relatedNoteIds.map((targetNoteId) => ({
        targetNote: { connect: { id: targetNoteId } },
      })),
    };
  }

  try {
    return await prisma.note.update({
      where: { id },
      data: updateData,
      include: {
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
        files: { orderBy: { slotIndex: "asc" } },
      },
    });
  } catch {
    return null;
  }
};

export const deleteNote = async (id: string): Promise<boolean> => {
  try {
    await prisma.note.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
};
