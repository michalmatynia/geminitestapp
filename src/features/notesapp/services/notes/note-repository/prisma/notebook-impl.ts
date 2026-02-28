import type {
  NotebookDto as NotebookRecord,
  CreateNotebookDto as NotebookCreateInput,
  UpdateNotebookDto as NotebookUpdateInput,
} from '@/shared/contracts/notes';
import prisma from '@/shared/lib/db/prisma';

import type { Notebook } from '@prisma/client';

let cachedDefaultNotebook: NotebookRecord | null = null;

export const invalidateDefaultNotebookCache = async (): Promise<void> => {
  cachedDefaultNotebook = null;
};

export const getOrCreateDefaultNotebook = async (): Promise<NotebookRecord> => {
  if (cachedDefaultNotebook) return cachedDefaultNotebook;

  const existing = await prisma.notebook.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  const notebook = existing
    ? existing
    : await prisma.notebook.create({
        data: { name: 'Default', color: '#3b82f6' },
      });

  const result: NotebookRecord = {
    ...notebook,
    createdAt: notebook.createdAt.toISOString(),
    updatedAt: notebook.updatedAt.toISOString(),
  };

  cachedDefaultNotebook = result;
  return result;
};

export const getAllNotebooks = async (): Promise<NotebookRecord[]> => {
  await getOrCreateDefaultNotebook();
  const notebooks = await prisma.notebook.findMany({
    orderBy: { createdAt: 'asc' },
  });
  return notebooks.map((nb: Notebook) => ({
    ...nb,
    createdAt: nb.createdAt.toISOString(),
    updatedAt: nb.updatedAt.toISOString(),
  }));
};

export const getNotebookById = async (id: string): Promise<NotebookRecord | null> => {
  const notebook = await prisma.notebook.findUnique({ where: { id } });
  return notebook
    ? {
        ...notebook,
        createdAt: notebook.createdAt.toISOString(),
        updatedAt: notebook.updatedAt.toISOString(),
      }
    : null;
};

export const createNotebook = async (data: NotebookCreateInput): Promise<NotebookRecord> => {
  const notebook = await prisma.notebook.create({
    data: {
      name: data.name,
      ...(data.color !== undefined && { color: data.color }),
    },
  });
  return {
    ...notebook,
    createdAt: notebook.createdAt.toISOString(),
    updatedAt: notebook.updatedAt.toISOString(),
  };
};

export const updateNotebook = async (
  id: string,
  data: NotebookUpdateInput
): Promise<NotebookRecord | null> => {
  try {
    const notebook = await prisma.notebook.update({
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
    return {
      ...notebook,
      createdAt: notebook.createdAt.toISOString(),
      updatedAt: notebook.updatedAt.toISOString(),
    };
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
