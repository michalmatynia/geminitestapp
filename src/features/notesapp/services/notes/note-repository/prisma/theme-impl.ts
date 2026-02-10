import 'server-only';

import { Prisma, type Theme } from '@prisma/client';

import prisma from '@/shared/lib/db/prisma';
import type {
  ThemeRecord,
  ThemeCreateInput,
  ThemeUpdateInput,
} from '@/shared/types/domain/notes';

import { getOrCreateDefaultNotebook } from './notebook-impl';

export const getAllThemes = async (
  notebookId?: string | null
): Promise<ThemeRecord[]> => {
  const resolvedNotebookId =
    notebookId ?? (await getOrCreateDefaultNotebook()).id;
  const themes = await prisma.theme.findMany({
    where: { notebookId: resolvedNotebookId },
    orderBy: { name: 'asc' },
  });
  return themes.map((theme: Theme) => ({
    ...theme,
    createdAt: theme.createdAt.toISOString(),
    updatedAt: theme.updatedAt.toISOString(),
  }));
};

export const getThemeById = async (id: string): Promise<ThemeRecord | null> => {
  const theme = await prisma.theme.findUnique({ where: { id } });
  return theme ? {
    ...theme,
    createdAt: theme.createdAt.toISOString(),
    updatedAt: theme.updatedAt.toISOString(),
  } : null;
};

export const createTheme = async (
  data: ThemeCreateInput
): Promise<ThemeRecord> => {
  const resolvedNotebookId =
    data.notebookId ?? (await getOrCreateDefaultNotebook()).id;

  const createData: Prisma.ThemeCreateInput = {
    name: data.name,
    notebook: { connect: { id: resolvedNotebookId } },
    ...(data.textColor !== undefined && { textColor: data.textColor }),
    ...(data.backgroundColor !== undefined && {
      backgroundColor: data.backgroundColor,
    }),
    ...(data.markdownHeadingColor !== undefined && {
      markdownHeadingColor: data.markdownHeadingColor,
    }),
    ...(data.markdownLinkColor !== undefined && {
      markdownLinkColor: data.markdownLinkColor,
    }),
    ...(data.markdownCodeBackground !== undefined && {
      markdownCodeBackground: data.markdownCodeBackground,
    }),
    ...(data.markdownCodeText !== undefined && {
      markdownCodeText: data.markdownCodeText,
    }),
    ...(data.relatedNoteBorderWidth !== undefined && {
      relatedNoteBorderWidth: data.relatedNoteBorderWidth,
    }),
    ...(data.relatedNoteBorderColor !== undefined && {
      relatedNoteBorderColor: data.relatedNoteBorderColor,
    }),
    ...(data.relatedNoteBackgroundColor !== undefined && {
      relatedNoteBackgroundColor: data.relatedNoteBackgroundColor,
    }),
    ...(data.relatedNoteTextColor !== undefined && {
      relatedNoteTextColor: data.relatedNoteTextColor,
    }),
  };

  const theme = await prisma.theme.create({
    data: createData,
  });
  return {
    ...theme,
    createdAt: theme.createdAt.toISOString(),
    updatedAt: theme.updatedAt.toISOString(),
  };
};

export const updateTheme = async (
  id: string,
  data: ThemeUpdateInput
): Promise<ThemeRecord | null> => {
  try {
    const updateData: Prisma.ThemeUpdateInput = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.notebookId !== undefined &&
        (data.notebookId
          ? { notebook: { connect: { id: data.notebookId } } }
          : { notebook: { disconnect: true } })),
      ...(data.textColor !== undefined && { textColor: data.textColor }),
      ...(data.backgroundColor !== undefined && {
        backgroundColor: data.backgroundColor,
      }),
      ...(data.markdownHeadingColor !== undefined && {
        markdownHeadingColor: data.markdownHeadingColor,
      }),
      ...(data.markdownLinkColor !== undefined && {
        markdownLinkColor: data.markdownLinkColor,
      }),
      ...(data.markdownCodeBackground !== undefined && {
        markdownCodeBackground: data.markdownCodeBackground,
      }),
      ...(data.markdownCodeText !== undefined && {
        markdownCodeText: data.markdownCodeText,
      }),
      ...(data.relatedNoteBorderWidth !== undefined && {
        relatedNoteBorderWidth: data.relatedNoteBorderWidth,
      }),
      ...(data.relatedNoteBorderColor !== undefined && {
        relatedNoteBorderColor: data.relatedNoteBorderColor,
      }),
      ...(data.relatedNoteBackgroundColor !== undefined && {
        relatedNoteBackgroundColor: data.relatedNoteBackgroundColor,
      }),
      ...(data.relatedNoteTextColor !== undefined && {
        relatedNoteTextColor: data.relatedNoteTextColor,
      }),
    };
    const theme = await prisma.theme.update({
      where: { id },
      data: updateData,
    });
    return {
      ...theme,
      createdAt: theme.createdAt.toISOString(),
      updatedAt: theme.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
};

export const deleteTheme = async (id: string): Promise<boolean> => {
  try {
    await prisma.theme.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
};
