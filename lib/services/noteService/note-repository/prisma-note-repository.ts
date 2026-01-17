import type { Prisma } from "@prisma/client";
import type { NoteRepository } from "@/types/services/note-repository";
import type {
  NoteFilters,
  NoteWithRelations,
  NoteCreateInput,
  NoteUpdateInput,
  TagRecord,
  CategoryRecord,
  CategoryWithChildren,
  CategoryCreateInput,
  CategoryUpdateInput,
  TagCreateInput,
  TagUpdateInput,
  NotebookRecord,
  NotebookCreateInput,
  NotebookUpdateInput,
  NoteFileRecord,
  NoteFileCreateInput,
  ThemeRecord,
  ThemeCreateInput,
  ThemeUpdateInput,
} from "@/types/notes";
import prisma from "@/lib/prisma";

export const prismaNoteRepository: NoteRepository = {
  async getOrCreateDefaultNotebook(): Promise<NotebookRecord> {
    const existing = await prisma.notebook.findFirst({
      orderBy: { createdAt: "asc" },
    });
    const notebook = existing
      ? existing
      : await prisma.notebook.create({
          data: { name: "Default", color: "#3b82f6" },
        });

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
  },

  async getAll(filters: NoteFilters): Promise<NoteWithRelations[]> {
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
      notebookId ?? (await prismaNoteRepository.getOrCreateDefaultNotebook()).id;
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
        content: note.content.length > 300 ? note.content.slice(0, 300) + "..." : note.content,
      }));
    }

    return notes;
  },

  async getById(id: string): Promise<NoteWithRelations | null> {
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
  },

  async create(data: NoteCreateInput): Promise<NoteWithRelations> {
    const { tagIds, categoryIds, relatedNoteIds, notebookId, ...rest } = data;
    const resolvedNotebookId =
      notebookId ?? (await prismaNoteRepository.getOrCreateDefaultNotebook()).id;

    return prisma.note.create({
      data: {
        ...rest,
        notebook: { connect: { id: resolvedNotebookId } },
        tags: {
          create: tagIds?.map((tagId) => ({ tag: { connect: { id: tagId } } })),
        },
        categories: {
          create: categoryIds?.map((categoryId) => ({
            category: { connect: { id: categoryId } },
          })),
        },
        relationsFrom: {
          create: relatedNoteIds?.map((targetNoteId) => ({
            targetNote: { connect: { id: targetNoteId } },
          })),
        },
      },
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
  },

  async update(id: string, data: NoteUpdateInput): Promise<NoteWithRelations | null> {
    const { tagIds, categoryIds, relatedNoteIds, notebookId, ...rest } = data;

    const updateData: Prisma.NoteUpdateInput = { ...rest };
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
  },

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.note.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async getAllTags(notebookId?: string | null): Promise<TagRecord[]> {
    const resolvedNotebookId =
      notebookId ?? (await prismaNoteRepository.getOrCreateDefaultNotebook()).id;
    return prisma.tag.findMany({
      where: { notebookId: resolvedNotebookId },
      orderBy: { name: "asc" },
    });
  },

  async getTagById(id: string): Promise<TagRecord | null> {
    return prisma.tag.findUnique({ where: { id } });
  },

  async createTag(data: TagCreateInput): Promise<TagRecord> {
    const resolvedNotebookId =
      data.notebookId ?? (await prismaNoteRepository.getOrCreateDefaultNotebook()).id;
    return prisma.tag.create({
      data: {
        name: data.name,
        color: data.color,
        notebook: { connect: { id: resolvedNotebookId } },
      },
    });
  },

  async updateTag(id: string, data: TagUpdateInput): Promise<TagRecord | null> {
    try {
      return await prisma.tag.update({ where: { id }, data });
    } catch {
      return null;
    }
  },

  async deleteTag(id: string): Promise<boolean> {
    try {
      await prisma.tag.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async getAllCategories(notebookId?: string | null): Promise<CategoryRecord[]> {
    const resolvedNotebookId =
      notebookId ?? (await prismaNoteRepository.getOrCreateDefaultNotebook()).id;
    return prisma.category.findMany({
      where: { notebookId: resolvedNotebookId },
      orderBy: { name: "asc" },
    });
  },

  async getCategoryById(id: string): Promise<CategoryRecord | null> {
    return prisma.category.findUnique({ where: { id } });
  },

  async getCategoryTree(notebookId?: string | null): Promise<CategoryWithChildren[]> {
    const resolvedNotebookId =
      notebookId ?? (await prismaNoteRepository.getOrCreateDefaultNotebook()).id;
    const categories = await prisma.category.findMany({
      where: { notebookId: resolvedNotebookId },
      orderBy: { name: "asc" },
      include: {
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
      },
    });
    
    const buildTree = (parentId: string | null): CategoryWithChildren[] => {
      return categories
        .filter((cat) => cat.parentId === parentId)
        .map((cat) => ({
          ...cat,
          notes: cat.notes.map((nc) => nc.note),
          children: buildTree(cat.id),
        }));
    };

    return buildTree(null);
  },

  async createCategory(data: CategoryCreateInput): Promise<CategoryRecord> {
    const resolvedNotebookId =
      data.notebookId ?? (await prismaNoteRepository.getOrCreateDefaultNotebook()).id;

    const createData: Prisma.CategoryCreateInput = {
      name: data.name,
      notebook: { connect: { id: resolvedNotebookId } },
    };
    if (data.description !== undefined) createData.description = data.description;
    if (data.color !== undefined) createData.color = data.color;
    if (data.parentId) createData.parent = { connect: { id: data.parentId } };
    if (data.themeId) createData.theme = { connect: { id: data.themeId } };

    return prisma.category.create({ data: createData });
  },

  async updateCategory(id: string, data: CategoryUpdateInput): Promise<CategoryRecord | null> {
    try {
      const updateData: Prisma.CategoryUpdateInput = { ...data };
      if (data.themeId !== undefined) {
        updateData.theme = data.themeId ? { connect: { id: data.themeId } } : { disconnect: true };
      }
      return await prisma.category.update({ where: { id }, data: updateData });
    } catch {
      return null;
    }
  },

  async deleteCategory(id: string, recursive?: boolean): Promise<boolean> {
    try {
      if (recursive) {
        // Recursively collect all descendant category IDs
        const collectDescendantIds = async (categoryId: string): Promise<string[]> => {
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
        const noteIds = Array.from(new Set(notesInCategories.map((nc) => nc.noteId)));

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
  },

  async getAllNotebooks(): Promise<NotebookRecord[]> {
    await prismaNoteRepository.getOrCreateDefaultNotebook();
    return prisma.notebook.findMany({ orderBy: { createdAt: "asc" } });
  },

  async getNotebookById(id: string): Promise<NotebookRecord | null> {
    return prisma.notebook.findUnique({ where: { id } });
  },

  async createNotebook(data: NotebookCreateInput): Promise<NotebookRecord> {
    return prisma.notebook.create({
      data: {
        name: data.name,
        color: data.color ?? "#3b82f6",
      },
    });
  },

  async updateNotebook(id: string, data: NotebookUpdateInput): Promise<NotebookRecord | null> {
    try {
      return await prisma.notebook.update({ where: { id }, data });
    } catch {
      return null;
    }
  },

  async deleteNotebook(id: string): Promise<boolean> {
    try {
      await prisma.notebook.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async getAllThemes(notebookId?: string | null): Promise<ThemeRecord[]> {
    const resolvedNotebookId =
      notebookId ?? (await prismaNoteRepository.getOrCreateDefaultNotebook()).id;
    return prisma.theme.findMany({
      where: { notebookId: resolvedNotebookId },
      orderBy: { name: "asc" },
    });
  },

  async getThemeById(id: string): Promise<ThemeRecord | null> {
    return prisma.theme.findUnique({ where: { id } });
  },

  async createTheme(data: ThemeCreateInput): Promise<ThemeRecord> {
    const resolvedNotebookId =
      data.notebookId ?? (await prismaNoteRepository.getOrCreateDefaultNotebook()).id;
    return prisma.theme.create({
      data: {
        name: data.name,
        notebookId: resolvedNotebookId,
        textColor: data.textColor ?? "#e2e8f0",
        backgroundColor: data.backgroundColor ?? "#0f172a",
        markdownHeadingColor: data.markdownHeadingColor ?? "#f8fafc",
        markdownLinkColor: data.markdownLinkColor ?? "#38bdf8",
        markdownCodeBackground: data.markdownCodeBackground ?? "#0b1220",
        markdownCodeText: data.markdownCodeText ?? "#e2e8f0",
        relatedNoteBorderWidth: data.relatedNoteBorderWidth ?? 1,
        relatedNoteBorderColor: data.relatedNoteBorderColor ?? "#34d399",
        relatedNoteBackgroundColor:
          data.relatedNoteBackgroundColor ?? "#0f3a2f",
        relatedNoteTextColor: data.relatedNoteTextColor ?? "#ecfdf5",
      },
    });
  },

  async updateTheme(id: string, data: ThemeUpdateInput): Promise<ThemeRecord | null> {
    try {
      return await prisma.theme.update({
        where: { id },
        data: {
          name: data.name,
          notebookId: data.notebookId ?? undefined,
          textColor: data.textColor,
          backgroundColor: data.backgroundColor,
          markdownHeadingColor: data.markdownHeadingColor,
          markdownLinkColor: data.markdownLinkColor,
          markdownCodeBackground: data.markdownCodeBackground,
          markdownCodeText: data.markdownCodeText,
          relatedNoteBorderWidth: data.relatedNoteBorderWidth,
          relatedNoteBorderColor: data.relatedNoteBorderColor,
          relatedNoteBackgroundColor: data.relatedNoteBackgroundColor,
          relatedNoteTextColor: data.relatedNoteTextColor,
        },
      });
    } catch {
      return null;
    }
  },

  async deleteTheme(id: string): Promise<boolean> {
    try {
      await prisma.theme.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async createNoteFile(data: NoteFileCreateInput): Promise<NoteFileRecord> {
    return prisma.noteFile.create({
      data: {
        noteId: data.noteId,
        slotIndex: data.slotIndex,
        filename: data.filename,
        filepath: data.filepath,
        mimetype: data.mimetype,
        size: data.size,
        width: data.width,
        height: data.height,
      },
    });
  },

  async getNoteFiles(noteId: string): Promise<NoteFileRecord[]> {
    return prisma.noteFile.findMany({
      where: { noteId },
      orderBy: { slotIndex: "asc" },
    });
  },

  async deleteNoteFile(noteId: string, slotIndex: number): Promise<boolean> {
    try {
      await prisma.noteFile.delete({
        where: {
          noteId_slotIndex: { noteId, slotIndex },
        },
      });
      return true;
    } catch {
      return false;
    }
  },
};
