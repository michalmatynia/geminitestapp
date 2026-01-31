import "server-only";

import prisma from "@/shared/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import type { CmsRepository, PageUpdateData } from "../../types/services/cms-repository";
import type { Page, Slug, PageComponent, CmsTheme, CmsThemeCreateInput, CmsThemeUpdateInput } from "../../types";

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

  async getPageBySlug(slugValue: string): Promise<Page | null> {
    const slug = await prisma.slug.findUnique({ where: { slug: slugValue } });
    if (!slug) return null;
    const pageSlug = await prisma.pageSlug.findFirst({ where: { slugId: slug.id } });
    if (!pageSlug) return null;
    return this.getPageById(pageSlug.pageId);
  },

  async updatePage(id: string, data: PageUpdateData): Promise<Page | null> {
    const cleanData = removeUndefined({
      name: data.name,
      status: data.status,
      publishedAt: data.publishedAt !== undefined ? (data.publishedAt ? new Date(data.publishedAt) : null) : undefined,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      seoOgImage: data.seoOgImage,
      seoCanonical: data.seoCanonical,
      robotsMeta: data.robotsMeta,
      themeId: data.themeId,
      showMenu: data.showMenu,
    });

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

  // Themes
  async getThemes(): Promise<CmsTheme[]> {
    const themes = await prisma.cmsTheme.findMany({
      orderBy: { createdAt: "desc" },
    });
    return themes as unknown as CmsTheme[];
  },

  async getThemeById(id: string): Promise<CmsTheme | null> {
    const theme = await prisma.cmsTheme.findUnique({ where: { id } });
    return theme as unknown as CmsTheme | null;
  },

  async createTheme(data: CmsThemeCreateInput): Promise<CmsTheme> {
    const theme = await prisma.cmsTheme.create({
      data: {
        name: data.name,
        colors: data.colors as Prisma.InputJsonValue,
        typography: data.typography as Prisma.InputJsonValue,
        spacing: data.spacing as Prisma.InputJsonValue,
        customCss: data.customCss ?? null,
      },
    });
    return theme as unknown as CmsTheme;
  },

  async updateTheme(id: string, data: CmsThemeUpdateInput): Promise<CmsTheme | null> {
    const cleanData = removeUndefined({
      name: data.name,
      colors: data.colors as Prisma.InputJsonValue | undefined,
      typography: data.typography as Prisma.InputJsonValue | undefined,
      spacing: data.spacing as Prisma.InputJsonValue | undefined,
      customCss: data.customCss,
    });
    const theme = await prisma.cmsTheme.update({
      where: { id },
      data: cleanData as Prisma.CmsThemeUpdateInput,
    });
    return theme as unknown as CmsTheme | null;
  },

  async deleteTheme(id: string): Promise<CmsTheme | null> {
    const theme = await prisma.cmsTheme.delete({ where: { id } });
    return theme as unknown as CmsTheme | null;
  },
};
