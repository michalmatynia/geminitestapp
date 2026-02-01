import "server-only";

import prisma from "@/shared/lib/db/prisma";
import type {
  CategoryRecord,
  CategoryWithChildren,
  CategoryCreateInput,
  CategoryUpdateInput,
} from "@/shared/types/notes";
import { Prisma } from "@prisma/client";
import { getOrCreateDefaultNotebook } from "./notebook-impl";

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
  return prisma.category.findMany({
    where: { notebookId: resolvedNotebookId },
    orderBy: [{ sortIndex: "asc" }, { name: "asc" }],
  });
};

export const getCategoryById = async (
  id: string
): Promise<CategoryRecord | null> => {
  return prisma.category.findUnique({ where: { id } });
};

export const getCategoryTree = async (
  notebookId?: string | null
): Promise<CategoryWithChildren[]> => {
  const resolvedNotebookId =
    notebookId ?? (await getOrCreateDefaultNotebook()).id;
  const categories: CategoryTreeRecord[] = await prisma.category.findMany({
    where: { notebookId: resolvedNotebookId },
    orderBy: [{ sortIndex: "asc" }, { name: "asc" }],
    include: categoryTreeInclude,
  });

  const buildTree = (parentId: string | null): CategoryWithChildren[] => {
    return categories
      .filter((cat: CategoryTreeRecord) => cat.parentId === parentId)
      .map((cat: CategoryTreeRecord): CategoryWithChildren => ({
        ...cat,
        notes: cat.notes.map((nc: CategoryTreeRecord["notes"][number]) => nc.note),
        children: buildTree(cat.id),
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

  return prisma.category.create({ data: createData });
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
      nextSortIndex = (maxSort._max.sortIndex ?? -1) + 1;
    }
    const updateData: Prisma.CategoryUpdateInput = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && {
        description: data.description,
      }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.sortIndex !== undefined
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
    return await prisma.category.update({ where: { id }, data: updateData });
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
    console.error("[PrismaNoteRepository][deleteCategory] Error:", error);
    return false;
  }
};
