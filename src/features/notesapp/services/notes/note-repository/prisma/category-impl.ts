import 'server-only';

import { Prisma } from '@prisma/client';

import prisma from '@/shared/lib/db/prisma';
import type {
  NoteCategoryDto as CategoryRecord,
  NoteCategoryRecordWithChildrenDto as CategoryWithChildren,
  CreateNoteCategoryDto as CategoryCreateInput,
  UpdateNoteCategoryDto as CategoryUpdateInput,
} from '@/shared/contracts/notes';

import { getOrCreateDefaultNotebook } from './notebook-impl';

const categoryTreeInclude = {
  notes: {
    include: {
      note: {
        include: {
          tags: { include: { tag: true } },
          categories: { include: { category: true } },
        },
      },
    },
  },
} satisfies Prisma.CategoryInclude;

type CategoryTreeRecord = Prisma.CategoryGetPayload<{
  include: typeof categoryTreeInclude;
}>;

export const getAllCategories = async (
  notebookId?: string | null
): Promise<CategoryRecord[]> => {
  const resolvedNotebookId =
    notebookId ?? (await getOrCreateDefaultNotebook()).id;
  const categories = await prisma.category.findMany({
    where: { notebookId: resolvedNotebookId },
    orderBy: [{ sortIndex: 'asc' }, { name: 'asc' }],
  });
  return categories.map((cat) => ({
    ...cat,
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
  }));
};

export const getCategoryById = async (
  id: string
): Promise<CategoryRecord | null> => {
  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat) return null;
  return {
    ...cat,
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
  };
};

export const getCategoryTree = async (
  notebookId?: string | null
): Promise<CategoryWithChildren[]> => {
  const resolvedNotebookId =
    notebookId ?? (await getOrCreateDefaultNotebook()).id;
  const categories: CategoryTreeRecord[] = await prisma.category.findMany({
    where: { notebookId: resolvedNotebookId },
    orderBy: [{ sortIndex: 'asc' }, { name: 'asc' }],
    include: categoryTreeInclude,
  });

  const buildTree = (parentId: string | null): CategoryWithChildren[] => {
    return categories
      .filter((cat: CategoryTreeRecord) => cat.parentId === parentId)
      .map((cat: CategoryTreeRecord): CategoryWithChildren => ({
        ...cat,
        createdAt: cat.createdAt.toISOString(),
        updatedAt: cat.updatedAt.toISOString(),
        notes: cat.notes.map((nc: CategoryTreeRecord['notes'][number]) => ({
          ...nc.note,
          editorType: nc.note.editorType as 'markdown' | 'wysiwyg' | 'code',
          createdAt: nc.note.createdAt.toISOString(),
          updatedAt: nc.note.updatedAt.toISOString(),
          tagIds: nc.note.tags.map((t) => t.tagId),
          categoryIds: nc.note.categories.map((c) => c.categoryId),
          relatedNoteIds: [], // Add if needed, or omit if optional
          tags: nc.note.tags.map((t: CategoryTreeRecord['notes'][number]['note']['tags'][number]) => ({
            ...t,
            assignedAt: t.assignedAt,
            tag: {
              ...t.tag,
              createdAt: t.tag.createdAt.toISOString(),
              updatedAt: t.tag.updatedAt.toISOString(),
            },
          })),
          categories: nc.note.categories.map((c: CategoryTreeRecord['notes'][number]['note']['categories'][number]) => ({
            ...c,
            assignedAt: c.assignedAt,
            category: {
              ...c.category,
              createdAt: c.category.createdAt.toISOString(),
              updatedAt: c.category.updatedAt.toISOString(),
            },
          })),
        })),
        children: buildTree(cat.id),
        _count: { notes: cat.notes.length },
      }));
  };

  return buildTree(null);
};

export const createCategory = async (
  data: CategoryCreateInput
): Promise<CategoryRecord> => {
  const resolvedNotebookId =
    data.notebookId ?? (await getOrCreateDefaultNotebook()).id;
  const parentId = data.parentId ?? null;
  const maxSort = await prisma.category.aggregate({
    where: { notebookId: resolvedNotebookId, parentId },
    _max: { sortIndex: true },
  });
  const nextSortIndex = (maxSort._max.sortIndex ?? -1) + 1;
  const createData: Prisma.CategoryCreateInput = {
    name: data.name,
    notebook: { connect: { id: resolvedNotebookId } },
    sortIndex: data.sortIndex ?? nextSortIndex,
  };
  if (data.description !== undefined) createData.description = data.description;
  if (data.color !== undefined) createData.color = data.color;
  if (data.parentId) createData.parent = { connect: { id: data.parentId } };
  if (data.themeId) createData.theme = { connect: { id: data.themeId } };

  const cat = await prisma.category.create({ data: createData });
  return {
    ...cat,
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
  };
};

export const updateCategory = async (
  id: string,
  data: CategoryUpdateInput
): Promise<CategoryRecord | null> => {
  try {
    let nextSortIndex: number | undefined;
    if (data.parentId !== undefined && data.sortIndex === undefined) {
      const current = await prisma.category.findUnique({ where: { id } });
      const resolvedNotebookId = current?.notebookId ?? (await getOrCreateDefaultNotebook()).id;
      const parentId = data.parentId ?? null;
      const maxSort = await prisma.category.aggregate({
        where: { notebookId: resolvedNotebookId, parentId },
        _max: { sortIndex: true },
      });
      nextSortIndex = ((maxSort._max.sortIndex ?? -1) + 1);
    }
    const updateData: Prisma.CategoryUpdateInput = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && {
        description: data.description,
      }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.sortIndex !== undefined && data.sortIndex !== null
        ? { sortIndex: data.sortIndex }
        : nextSortIndex !== undefined
          ? { sortIndex: nextSortIndex }
          : {}),
      ...(data.parentId !== undefined &&
        (data.parentId
          ? { parent: { connect: { id: data.parentId } } }
          : { parent: { disconnect: true } })),
    };
    if (data.themeId !== undefined) {
      updateData.theme = data.themeId
        ? { connect: { id: data.themeId } }
        : { disconnect: true };
    }
    const cat = await prisma.category.update({ where: { id }, data: updateData });
    return {
      ...cat,
      createdAt: cat.createdAt.toISOString(),
      updatedAt: cat.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
};

export const deleteCategory = async (
  id: string,
  recursive?: boolean
): Promise<boolean> => {
  try {
    if (recursive) {
      // Recursively collect all descendant category IDs
      const collectDescendantIds = async (
        categoryId: string
      ): Promise<string[]> => {
        const children = await prisma.category.findMany({
          where: { parentId: categoryId },
          select: { id: true },
        });

        const ids = [categoryId];
        for (const child of children) {
          const descendantIds = await collectDescendantIds(child.id);
          ids.push(...descendantIds);
        }
        return ids;
      };

      const categoryIds = await collectDescendantIds(id);

      // Delete all notes in these categories (and their junction records)
      // First, get all note IDs in these categories
      const notesInCategories = await prisma.noteCategory.findMany({
        where: { categoryId: { in: categoryIds } },
        select: { noteId: true },
      });
      const noteIds = Array.from(
        new Set(notesInCategories.map((nc: { noteId: string }) => nc.noteId))
      );

      // Delete note-tag relations for these notes
      await prisma.noteTag.deleteMany({
        where: { noteId: { in: noteIds } },
      });

      // Delete note-category relations for these notes
      await prisma.noteCategory.deleteMany({
        where: { noteId: { in: noteIds } },
      });

      // Delete the notes themselves
      await prisma.note.deleteMany({
        where: { id: { in: noteIds } },
      });

      // Delete all categories (children first due to foreign key constraints)
      // Since we're deleting from leaves up, reverse the array
      for (const catId of categoryIds.reverse()) {
        await prisma.category.delete({ where: { id: catId } });
      }
    } else {
      await prisma.category.delete({ where: { id } });
    }
    return true;
  } catch (error) {
    const { logSystemError } = await import('@/features/observability/server');
    await logSystemError({
      message: '[PrismaNoteRepository][deleteCategory] Error',
      error,
      context: { id, recursive },
      source: 'note-repository-prisma'
    });
    return false;
  }
};
