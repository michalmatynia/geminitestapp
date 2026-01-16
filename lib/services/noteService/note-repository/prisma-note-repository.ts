import type { NoteRepository } from "@/types/services/note-repository";
import type { NoteFilters, NoteWithRelations, NoteCreateInput, NoteUpdateInput, TagRecord, CategoryRecord, CategoryWithChildren, CategoryCreateInput, CategoryUpdateInput, TagCreateInput, TagUpdateInput } from "@/types/notes";
import prisma from "@/lib/prisma";

export const prismaNoteRepository: NoteRepository = {
  async getAll(filters: NoteFilters): Promise<NoteWithRelations[]> {
    const { search, searchScope = "both", isPinned, isArchived, tagIds, categoryIds } = filters;

    const where: any = {};

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

    if (tagIds && tagIds.length > 0) {
      where.tags = { some: { tagId: { in: tagIds } } };
    }

    if (categoryIds && categoryIds.length > 0) {
      where.categories = { some: { categoryId: { in: categoryIds } } };
    }

    return prisma.note.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        categories: { include: { category: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  },

  async getById(id: string): Promise<NoteWithRelations | null> {
    return prisma.note.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        categories: { include: { category: true } },
      },
    });
  },

  async create(data: NoteCreateInput): Promise<NoteWithRelations> {
    const { tagIds, categoryIds, ...rest } = data;

    return prisma.note.create({
      data: {
        ...rest,
        tags: {
          create: tagIds?.map((tagId) => ({ tag: { connect: { id: tagId } } })),
        },
        categories: {
          create: categoryIds?.map((categoryId) => ({
            category: { connect: { id: categoryId } },
          })),
        },
      },
      include: {
        tags: { include: { tag: true } },
        categories: { include: { category: true } },
      },
    });
  },

  async update(id: string, data: NoteUpdateInput): Promise<NoteWithRelations | null> {
    const { tagIds, categoryIds, ...rest } = data;

    const updateData: any = { ...rest };

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

    console.log("[PrismaNoteRepository][update] updateData:", JSON.stringify(updateData, null, 2)); // Debug log

    try {
      return await prisma.note.update({
        where: { id },
        data: updateData,
        include: {
          tags: { include: { tag: true } },
          categories: { include: { category: true } },
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

  async getAllTags(): Promise<TagRecord[]> {
    return prisma.tag.findMany({ orderBy: { name: "asc" } });
  },

  async getTagById(id: string): Promise<TagRecord | null> {
    return prisma.tag.findUnique({ where: { id } });
  },

  async createTag(data: TagCreateInput): Promise<TagRecord> {
    return prisma.tag.create({ data });
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

  async getAllCategories(): Promise<CategoryRecord[]> {
    return prisma.category.findMany({ orderBy: { name: "asc" } });
  },

  async getCategoryById(id: string): Promise<CategoryRecord | null> {
    return prisma.category.findUnique({ where: { id } });
  },

  async getCategoryTree(): Promise<CategoryWithChildren[]> {
    const categories = await prisma.category.findMany({
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
    return prisma.category.create({ data });
  },

  async updateCategory(id: string, data: CategoryUpdateInput): Promise<CategoryRecord | null> {
    try {
      return await prisma.category.update({ where: { id }, data });
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
};