import prisma from "@/lib/prisma";
import type {
  TagRecord,
  TagCreateInput,
  TagUpdateInput,
} from "@/types/notes";
import { getOrCreateDefaultNotebook } from "./notebook-impl";

export const getAllTags = async (
  notebookId?: string | null
): Promise<TagRecord[]> => {
  const resolvedNotebookId =
    notebookId ?? (await getOrCreateDefaultNotebook()).id;
  return prisma.tag.findMany({
    where: { notebookId: resolvedNotebookId },
    orderBy: { name: "asc" },
  });
};

export const getTagById = async (id: string): Promise<TagRecord | null> => {
  return prisma.tag.findUnique({ where: { id } });
};

export const createTag = async (data: TagCreateInput): Promise<TagRecord> => {
  const resolvedNotebookId =
    data.notebookId ?? (await getOrCreateDefaultNotebook()).id;

  return prisma.tag.create({
    data: {
      name: data.name,
      ...(data.color !== undefined && { color: data.color }),
      notebook: { connect: { id: resolvedNotebookId } },
    },
  });
};

export const updateTag = async (
  id: string,
  data: TagUpdateInput
): Promise<TagRecord | null> => {
  try {
    return await prisma.tag.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
      },
    });
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
