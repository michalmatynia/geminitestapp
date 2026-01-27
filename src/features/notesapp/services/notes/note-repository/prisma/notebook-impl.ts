import prisma from "@/shared/lib/db/prisma";
import type {
  NotebookRecord,
  NotebookCreateInput,
  NotebookUpdateInput,
} from "@/shared/types/notes";

export const getOrCreateDefaultNotebook = async (): Promise<NotebookRecord> => {
  const existing = await prisma.notebook.findFirst({
    orderBy: { createdAt: "asc" },
  });
  const notebook = existing
    ? existing
    : await prisma.notebook.create({
        data: { name: "Default", color: "#3b82f6" },
      });

  // Ensure orphans are assigned to the default notebook
  await prisma.note.updateMany({
    where: { notebookId: null },
    data: { notebookId: notebook.id },
  });
  await prisma.tag.updateMany({
    where: { notebookId: null },
    data: { notebookId: notebook.id },
  });
  await prisma.category.updateMany({
    where: { notebookId: null },
    data: { notebookId: notebook.id },
  });

  return notebook;
};

export const getAllNotebooks = async (): Promise<NotebookRecord[]> => {
  await getOrCreateDefaultNotebook();
  return prisma.notebook.findMany({ orderBy: { createdAt: "asc" } });
};

export const getNotebookById = async (
  id: string
): Promise<NotebookRecord | null> => {
  return prisma.notebook.findUnique({ where: { id } });
};

export const createNotebook = async (
  data: NotebookCreateInput
): Promise<NotebookRecord> => {
  return prisma.notebook.create({
    data: {
      name: data.name,
      ...(data.color !== undefined && { color: data.color }),
    },
  });
};

export const updateNotebook = async (
  id: string,
  data: NotebookUpdateInput
): Promise<NotebookRecord | null> => {
  try {
    return await prisma.notebook.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.defaultThemeId !== undefined &&
          (data.defaultThemeId
            ? { defaultTheme: { connect: { id: data.defaultThemeId } } }
            : { defaultTheme: { disconnect: true } })),
      },
    });
  } catch {
    return null;
  }
};

export const deleteNotebook = async (id: string): Promise<boolean> => {
  try {
    await prisma.notebook.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
};
