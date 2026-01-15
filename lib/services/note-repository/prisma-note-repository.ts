import { PrismaClient } from "@prisma/client";
import type {
  NoteWithRelations,
  CreateNoteInput,
  UpdateNoteInput,
  NoteFilters,
  TagRecord,
  CategoryRecord,
  CreateTagInput,
  UpdateTagInput,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/types/notes";
import type { NoteRepository } from "@/types/services/note-repository";

const prisma = new PrismaClient();

export const prismaNoteRepository: NoteRepository = {
  // Note CRUD operations
  async getAll(filters = {}) {
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { content: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (typeof filters.isPinned === "boolean") {
      where.isPinned = filters.isPinned;
    }

    if (typeof filters.isArchived === "boolean") {
      where.isArchived = filters.isArchived;
    }

    if (filters.tagIds && filters.tagIds.length > 0) {
      where.tags = {
        some: {
          tagId: { in: filters.tagIds },
        },
      };
    }

    if (filters.categoryIds && filters.categoryIds.length > 0) {
      where.categories = {
        some: {
          categoryId: { in: filters.categoryIds },
        },
      };
    }

    const notes = await prisma.note.findMany({
      where,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return notes.map((note) => ({
      ...note,
      tags: note.tags.map((nt) => ({
        noteId: nt.noteId,
        tagId: nt.tagId,
        assignedAt: nt.assignedAt,
        tag: nt.tag,
      })),
      categories: note.categories.map((nc) => ({
        noteId: nc.noteId,
        categoryId: nc.categoryId,
        assignedAt: nc.assignedAt,
        category: nc.category,
      })),
    })) as NoteWithRelations[];
  },

  async getById(id) {
    const note = await prisma.note.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!note) return null;

    return {
      ...note,
      tags: note.tags.map((nt) => ({
        noteId: nt.noteId,
        tagId: nt.tagId,
        assignedAt: nt.assignedAt,
        tag: nt.tag,
      })),
      categories: note.categories.map((nc) => ({
        noteId: nc.noteId,
        categoryId: nc.categoryId,
        assignedAt: nc.assignedAt,
        category: nc.category,
      })),
    } as NoteWithRelations;
  },

  async create(data) {
    const note = await prisma.note.create({
      data: {
        title: data.title,
        content: data.content,
        color: data.color,
        isPinned: data.isPinned,
        isArchived: data.isArchived,
        tags: data.tagIds
          ? {
              create: data.tagIds.map((tagId) => ({
                tag: { connect: { id: tagId } },
              })),
            }
          : undefined,
        categories: data.categoryIds
          ? {
              create: data.categoryIds.map((categoryId) => ({
                category: { connect: { id: categoryId } },
              })),
            }
          : undefined,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    return {
      ...note,
      tags: note.tags.map((nt) => ({
        noteId: nt.noteId,
        tagId: nt.tagId,
        assignedAt: nt.assignedAt,
        tag: nt.tag,
      })),
      categories: note.categories.map((nc) => ({
        noteId: nc.noteId,
        categoryId: nc.categoryId,
        assignedAt: nc.assignedAt,
        category: nc.category,
      })),
    } as NoteWithRelations;
  },

  async update(id, data) {
    // Handle tag and category updates
    const updateData: any = {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
      ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
    };

    if (data.tagIds !== undefined) {
      // Delete existing tags and create new ones
      await prisma.noteTag.deleteMany({ where: { noteId: id } });
      updateData.tags = {
        create: data.tagIds.map((tagId) => ({
          tag: { connect: { id: tagId } },
        })),
      };
    }

    if (data.categoryIds !== undefined) {
      // Delete existing categories and create new ones
      await prisma.noteCategory.deleteMany({ where: { noteId: id } });
      updateData.categories = {
        create: data.categoryIds.map((categoryId) => ({
          category: { connect: { id: categoryId } },
        })),
      };
    }

    const note = await prisma.note.update({
      where: { id },
      data: updateData,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    return {
      ...note,
      tags: note.tags.map((nt) => ({
        noteId: nt.noteId,
        tagId: nt.tagId,
        assignedAt: nt.assignedAt,
        tag: nt.tag,
      })),
      categories: note.categories.map((nc) => ({
        noteId: nc.noteId,
        categoryId: nc.categoryId,
        assignedAt: nc.assignedAt,
        category: nc.category,
      })),
    } as NoteWithRelations;
  },

  async delete(id) {
    await prisma.note.delete({ where: { id } });
  },

  // Tag operations
  async getAllTags() {
    return prisma.tag.findMany({
      orderBy: { name: "asc" },
    });
  },

  async getTagById(id) {
    return prisma.tag.findUnique({ where: { id } });
  },

  async createTag(data) {
    return prisma.tag.create({
      data: {
        name: data.name,
        color: data.color,
      },
    });
  },

  async updateTag(id, data) {
    return prisma.tag.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
      },
    });
  },

  async deleteTag(id) {
    await prisma.tag.delete({ where: { id } });
  },

  // Category operations
  async getAllCategories() {
    return prisma.category.findMany({
      orderBy: { name: "asc" },
    });
  },

  async getCategoryById(id) {
    return prisma.category.findUnique({ where: { id } });
  },

  async createCategory(data) {
    return prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
        color: data.color,
      },
    });
  },

  async updateCategory(id, data) {
    return prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.color !== undefined && { color: data.color }),
      },
    });
  },

  async deleteCategory(id) {
    await prisma.category.delete({ where: { id } });
  },

  // Tag/Category assignment operations
  async assignTags(noteId, tagIds) {
    await prisma.noteTag.createMany({
      data: tagIds.map((tagId) => ({
        noteId,
        tagId,
      })),
      skipDuplicates: true,
    });
  },

  async removeTags(noteId, tagIds) {
    await prisma.noteTag.deleteMany({
      where: {
        noteId,
        tagId: { in: tagIds },
      },
    });
  },

  async assignCategories(noteId, categoryIds) {
    await prisma.noteCategory.createMany({
      data: categoryIds.map((categoryId) => ({
        noteId,
        categoryId,
      })),
      skipDuplicates: true,
    });
  },

  async removeCategories(noteId, categoryIds) {
    await prisma.noteCategory.deleteMany({
      where: {
        noteId,
        categoryId: { in: categoryIds },
      },
    });
  },
};
