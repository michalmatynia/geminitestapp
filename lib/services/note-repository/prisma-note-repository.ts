import { PrismaClient } from "@prisma/client";
import type {
  NoteWithRelations as NoteRecord,
  NoteCreateInput as CreateNoteInput,
  NoteUpdateInput as UpdateNoteInput,
  NoteFilters,
  TagRecord,
  CategoryRecord,
  TagCreateInput as CreateTagInput,
  TagUpdateInput as UpdateTagInput,
  CategoryCreateInput as CreateCategoryInput,
  CategoryUpdateInput as UpdateCategoryInput,
  CategoryWithChildren,
} from "@/types/notes";
import type { NoteRepository } from "@/types/services/note-repository";

const prisma = new PrismaClient();

const buildTree = (categories: CategoryRecord[]): CategoryWithChildren[] => {
  const categoryMap: Record<string, CategoryWithChildren> = {};
  categories.forEach((cat) => {
    categoryMap[cat.id] = { ...cat, children: [], notes: [] };
  });

  const rootCategories: CategoryWithChildren[] = [];

  categories.forEach((cat) => {
    if (cat.parentId && categoryMap[cat.parentId]) {
      categoryMap[cat.parentId].children.push(categoryMap[cat.id]);
    } else {
      rootCategories.push(categoryMap[cat.id]);
    }
  });

  return rootCategories;
};

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
    })) as NoteRecord[];
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
    } as NoteRecord;
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
    } as NoteRecord;
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
    } as NoteRecord;
  },

  async delete(id) {
    try {
      await prisma.note.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
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
    try {
      await prisma.tag.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
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

  async getCategoryTree() {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    return buildTree(categories);
  },

  async createCategory(data) {
    return prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
        color: data.color,
        parentId: data.parentId,
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
        ...(data.parentId !== undefined && { parentId: data.parentId }),
      },
    });
  },

  async deleteCategory(id) {
    try {
      await prisma.category.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },
};
