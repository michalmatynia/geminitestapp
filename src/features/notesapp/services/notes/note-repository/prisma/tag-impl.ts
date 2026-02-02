import prisma from "@/shared/lib/db/prisma";
import type { Tag } from "@prisma/client";
import type {
  TagRecord,
  TagCreateInput,
  TagUpdateInput,
} from "@/shared/types/notes";
import { getOrCreateDefaultNotebook } from "./notebook-impl";

export const getAllTags = async (
  notebookId?: string | null
): Promise<TagRecord[]> => {
  const resolvedNotebookId =
    notebookId ?? (await getOrCreateDefaultNotebook()).id;
  const tags = await prisma.tag.findMany({
    where: { notebookId: resolvedNotebookId },
    orderBy: { name: "asc" },
  });
  return tags.map((tag: Tag) => ({
    ...tag,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
  }));
};

export const getTagById = async (id: string): Promise<TagRecord | null> => {
  const tag = await prisma.tag.findUnique({ where: { id } });
  return tag ? {
    ...tag,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
  } : null;
};

export const createTag = async (data: TagCreateInput): Promise<TagRecord> => {
  const resolvedNotebookId =
    data.notebookId ?? (await getOrCreateDefaultNotebook()).id;

  const tag = await prisma.tag.create({
    data: {
      name: data.name,
      ...(data.color !== undefined && { color: data.color }),
      notebook: { connect: { id: resolvedNotebookId } },
    },
  });
  return {
    ...tag,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
  };
};

export const updateTag = async (
  id: string,
  data: TagUpdateInput
): Promise<TagRecord | null> => {
  try {
    const tag = await prisma.tag.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
      },
    });
    return {
      ...tag,
      createdAt: tag.createdAt.toISOString(),
      updatedAt: tag.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
};

export const deleteTag = async (id: string): Promise<boolean> => {
  try {
    await prisma.tag.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
};
