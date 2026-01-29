import "server-only";

import prisma from "@/shared/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import type { CmsRepository } from "../../types/services/cms-repository";
import type { Block, Page, Slug, PageComponent } from "../../types";

// Helper to remove undefined keys for exactOptionalPropertyTypes compliance
function removeUndefined<T extends object>(obj: T): T {
  const newObj = { ...obj };
  Object.keys(newObj).forEach((key) => {
    if (newObj[key as keyof T] === undefined) {
      delete newObj[key as keyof T];
    }
  });
  return newObj;
}

export const prismaCmsRepository: CmsRepository = {
  // Blocks
  async getBlocks(): Promise<Block[]> {
    const blocks = await prisma.block.findMany({
      orderBy: { createdAt: "desc" },
    });
    return blocks as unknown as Block[];
  },

  async getBlockById(id: string): Promise<Block | null> {
    const block = await prisma.block.findUnique({ where: { id } });
    return block as unknown as Block | null;
  },

  async getBlockByName(name: string): Promise<Block | null> {
    const block = await prisma.block.findUnique({ where: { name } });
    return block as unknown as Block | null;
  },

  async createBlock(data: { name: string; content: unknown }): Promise<Block> {
    const block = await prisma.block.create({
      data: {
        name: data.name,
        content: data.content as Prisma.InputJsonValue,
      },
    });
    return block as unknown as Block;
  },

  async updateBlock(id: string, data: { name?: string | undefined; content?: unknown }): Promise<Block | null> {
    const cleanData = removeUndefined(data);
    const block = await prisma.block.update({
      where: { id },
      data: cleanData as Prisma.BlockUpdateInput,
    });
    return block as unknown as Block | null;
  },

  async deleteBlock(id: string): Promise<Block | null> {
    const block = await prisma.block.delete({ where: { id } });
    return block as unknown as Block | null;
  },

  // Pages
  async getPages(): Promise<Page[]> {
    const pages = await prisma.page.findMany({
      include: {
        slugs: {
          include: {
            slug: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return pages as unknown as Page[];
  },

  async getPageById(id: string): Promise<Page | null> {
    const page = await prisma.page.findUnique({
      where: { id },
      include: {
        slugs: {
          include: {
            slug: true,
          },
        },
        blocks: {
          include: {
            block: true,
          },
        },
        components: true,
      },
    });
    return page as unknown as Page | null;
  },

  async createPage(data: { name: string }): Promise<Page> {
    const page = await prisma.page.create({
      data: { name: data.name },
    });
    return page as unknown as Page;
  },

  async updatePage(id: string, data: { name?: string | undefined; components?: PageComponent[] | undefined }): Promise<Page | null> {
    const cleanData = removeUndefined({ name: data.name });
    
    if (Object.keys(cleanData).length > 0) {
      await prisma.page.update({
        where: { id },
        data: cleanData as Prisma.PageUpdateInput,
      });
    }

    if (data.components) {
      await this.replacePageComponents(id, data.components);
    }

    return this.getPageById(id);
  },

  async deletePage(id: string): Promise<Page | null> {
    const page = await prisma.page.delete({ where: { id } });
    return page as unknown as Page | null;
  },

  async replacePageSlugs(pageId: string, slugIds: string[]): Promise<void> {
    await prisma.pageSlug.deleteMany({ where: { pageId } });
    if (slugIds.length === 0) return;
    await prisma.pageSlug.createMany({
      data: slugIds.map((slugId) => ({ pageId, slugId })),
    });
  },

  async replacePageComponents(pageId: string, components: PageComponent[]): Promise<void> {
    await prisma.pageComponent.deleteMany({ where: { pageId } });
    if (components.length === 0) return;
    await prisma.pageComponent.createMany({
      data: components.map((component, index) => ({
        pageId,
        type: component.type,
        content: component.content as Prisma.InputJsonValue,
        order: index,
      })),
    });
  },

  // Slugs
  async getSlugs(): Promise<Slug[]> {
    const slugs = await prisma.slug.findMany({
      orderBy: { createdAt: "desc" },
    });
    return slugs as unknown as Slug[];
  },

  async getSlugById(id: string): Promise<Slug | null> {
    const slug = await prisma.slug.findUnique({ where: { id } });
    return slug as unknown as Slug | null;
  },

  async getSlugByValue(slugValue: string): Promise<Slug | null> {
    const slug = await prisma.slug.findUnique({ where: { slug: slugValue } });
    return slug as unknown as Slug | null;
  },

  async createSlug(data: { slug: string; isDefault?: boolean | undefined }): Promise<Slug> {
    const cleanData = removeUndefined(data);
    const slug = await prisma.slug.create({
      data: cleanData as Prisma.SlugCreateInput,
    });
    return slug as unknown as Slug;
  },

  async updateSlug(id: string, data: { slug?: string | undefined; isDefault?: boolean | undefined }): Promise<Slug | null> {
    const cleanData = removeUndefined(data);
    const slug = await prisma.slug.update({
      where: { id },
      data: cleanData as Prisma.SlugUpdateInput,
    });
    return slug as unknown as Slug | null;
  },

  async deleteSlug(id: string): Promise<Slug | null> {
    const slug = await prisma.slug.delete({ where: { id } });
    return slug as unknown as Slug | null;
  },

  // Relationships
  async addSlugToPage(pageId: string, slugId: string): Promise<void> {
    await prisma.pageSlug.create({
      data: {
        pageId,
        slugId,
      },
    });
  },

  async removeSlugFromPage(pageId: string, slugId: string): Promise<void> {
    await prisma.pageSlug.delete({
      where: {
        pageId_slugId: {
          pageId,
          slugId,
        },
      },
    });
  },

  async addBlockToPage(pageId: string, blockId: string): Promise<void> {
    await prisma.pageBlock.create({
      data: {
        pageId,
        blockId,
      },
    });
  },

  async removeBlockFromPage(pageId: string, blockId: string): Promise<void> {
    await prisma.pageBlock.delete({
      where: {
        pageId_blockId: {
          pageId,
          blockId,
        },
      },
    });
  },
};
