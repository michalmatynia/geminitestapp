import 'server-only';


import type {
  Page,
  Slug,
  PageComponent,
  CmsTheme,
  CreateCmsThemeDto as CmsThemeCreateInput,
  UpdateCmsThemeDto as CmsThemeUpdateInput,
  CmsRepository,
  PageUpdateData,
  CmsDomainDto,
  CreateCmsDomainDto,
  UpdateCmsDomainDto,
} from '@/shared/contracts/cms';
import prisma from '@/shared/lib/db/prisma';

import type {
  Prisma,
  Page as PrismaPage,
  Slug as PrismaSlug,
  CmsTheme as PrismaCmsTheme,
  PageComponent as PrismaPageComponent,
  CmsDomain as PrismaCmsDomain,
} from '@prisma/client';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function removeUndefined<T extends object>(obj: T): T {
  const newObj = { ...obj };
  Object.keys(newObj).forEach((key: string): void => {
    if (newObj[key as keyof T] === undefined) {
      delete newObj[key as keyof T];
    }
  });
  return newObj;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapPrismaSlug(
  s: PrismaSlug & {
    pages?: { pageId: string }[];
  }
): Slug {
  return {
    id: s.id,
    slug: s.slug,
    pageId: s.pages?.[0]?.pageId ?? null,
    isDefault: s.isDefault,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function mapPrismaTheme(t: PrismaCmsTheme): CmsTheme {
  return {
    id: t.id,
    name: t.name,
    colors: t.colors as unknown as CmsTheme['colors'],
    typography: t.typography as unknown as CmsTheme['typography'],
    spacing: t.spacing as unknown as CmsTheme['spacing'],
    customCss: t.customCss ?? undefined,
    isDefault: t.isDefault,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

function mapPrismaPageComponent(c: PrismaPageComponent): PageComponent {
  return {
    id: c.id,
    type: c.type,
    order: c.order,
    content: c.content as unknown as Record<string, unknown>,
    pageId: c.pageId,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt?.toISOString() ?? null,
  };
}

function mapPrismaPage(
  p: PrismaPage & { 
    slugs?: { slug: PrismaSlug }[];
    components?: PrismaPageComponent[];
  }
): Page {
  return {
    id: p.id,
    name: p.name,
    status: p.status as 'draft' | 'published' | 'scheduled',
    publishedAt: p.publishedAt?.toISOString(),
    themeId: p.themeId,
    showMenu: p.showMenu,
    seoTitle: p.seoTitle ?? undefined,
    seoDescription: p.seoDescription ?? undefined,
    seoOgImage: p.seoOgImage ?? undefined,
    seoCanonical: p.seoCanonical ?? undefined,
    robotsMeta: p.robotsMeta ?? undefined,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    slugs: p.slugs?.map(ps => mapPrismaSlug(ps.slug)) ?? [],
    components: p.components?.map(c => mapPrismaPageComponent(c)) ?? [],
  };
}

function mapPrismaDomain(d: PrismaCmsDomain): CmsDomainDto {
  return {
    id: d.id,
    name: d.domain,
    domain: d.domain,
    aliasOf: d.aliasOf ?? undefined,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Repository Implementation
// ---------------------------------------------------------------------------

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
      orderBy: { updatedAt: 'desc' },
    });
    return pages.map(mapPrismaPage);
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
        components: {
          orderBy: { order: 'asc' }
        },
      },
    });
    return page ? mapPrismaPage(page) : null;
  },

  async createPage(data: { name: string; themeId?: string | null | undefined }): Promise<Page> {
    const page = await prisma.page.create({
      data: { 
        name: data.name,
        themeId: data.themeId ?? null,
      },
      include: {
        slugs: { include: { slug: true } },
        components: true
      }
    });
    return mapPrismaPage(page);
  },

  async getPageBySlug(slugValue: string): Promise<Page | null> {
    const pageSlug = await prisma.pageSlug.findFirst({
      where: {
        slug: { slug: slugValue },
      },
      include: {
        page: {
          include: {
            slugs: {
              include: {
                slug: true,
              },
            },
            components: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
    return pageSlug?.page ? mapPrismaPage(pageSlug.page as Parameters<typeof mapPrismaPage>[0]) : null;
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

    const updated = await prisma.$transaction(async (tx) => {
      if (Object.keys(cleanData).length > 0) {
        await tx.page.update({
          where: { id },
          data: cleanData as Prisma.PageUpdateInput,
        });
      }

      if (data.components) {
        await tx.pageComponent.deleteMany({ where: { pageId: id } });
        if (data.components.length > 0) {
          await tx.pageComponent.createMany({
            data: data.components.map((component: PageComponent, index: number) => ({
              pageId: id,
              type: component.type,
              content: component.content as Prisma.InputJsonValue,
              order: index,
            })),
          });
        }
      }

      return tx.page.findUnique({
        where: { id },
        include: {
          slugs: { include: { slug: true } },
          components: { orderBy: { order: 'asc' } },
        },
      });
    });

    return updated ? mapPrismaPage(updated as any) : null;
  },

  async deletePage(id: string): Promise<Page | null> {
    const page = await prisma.page.delete({ 
      where: { id },
      include: {
        slugs: { include: { slug: true } },
        components: true
      }
    });
    return mapPrismaPage(page);
  },

  async replacePageSlugs(pageId: string, slugIds: string[]): Promise<void> {
    await prisma.pageSlug.deleteMany({ where: { pageId } });
    if (slugIds.length === 0) return;
    await prisma.pageSlug.createMany({
      data: slugIds.map((slugId: string) => ({ pageId, slugId })),
    });
  },

  async replacePageComponents(pageId: string, components: PageComponent[]): Promise<void> {
    await prisma.pageComponent.deleteMany({ where: { pageId } });
    if (components.length === 0) return;
    await prisma.pageComponent.createMany({
      data: components.map((component: PageComponent, index: number) => ({
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
      include: { pages: true },
      orderBy: { createdAt: 'desc' },
    });
    return slugs.map(mapPrismaSlug);
  },

  async getSlugsByIds(ids: string[]): Promise<Slug[]> {
    if (ids.length === 0) return [];
    const slugs = await prisma.slug.findMany({
      where: { id: { in: ids } },
      include: { pages: true },
      orderBy: { createdAt: 'desc' },
    });
    return slugs.map(mapPrismaSlug);
  },

  async getSlugById(id: string): Promise<Slug | null> {
    const slug = await prisma.slug.findUnique({ 
      where: { id },
      include: { pages: true }
    });
    return slug ? mapPrismaSlug(slug) : null;
  },

  async getSlugByValue(slugValue: string): Promise<Slug | null> {
    const slug = await prisma.slug.findUnique({ 
      where: { slug: slugValue },
      include: { pages: true }
    });
    return slug ? mapPrismaSlug(slug) : null;
  },

  async createSlug(data: { slug: string; isDefault?: boolean | undefined }): Promise<Slug> {
    const cleanData = removeUndefined(data);
    const slug = await prisma.slug.create({
      data: cleanData as Prisma.SlugCreateInput,
      include: { pages: true }
    });
    return mapPrismaSlug(slug);
  },

  async updateSlug(id: string, data: { slug?: string | undefined; isDefault?: boolean | undefined }): Promise<Slug | null> {
    const cleanData = removeUndefined(data);
    const slug = await prisma.slug.update({
      where: { id },
      data: cleanData as Prisma.SlugUpdateInput,
      include: { pages: true }
    });
    return slug ? mapPrismaSlug(slug) : null;
  },

  async deleteSlug(id: string): Promise<Slug | null> {
    const slug = await prisma.slug.delete({ where: { id } });
    return slug ? mapPrismaSlug(slug) : null;
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
      orderBy: { createdAt: 'desc' },
    });
    return themes.map(mapPrismaTheme);
  },

  async getThemeById(id: string): Promise<CmsTheme | null> {
    const theme = await prisma.cmsTheme.findUnique({ where: { id } });
    return theme ? mapPrismaTheme(theme) : null;
  },

  async createTheme(data: CmsThemeCreateInput): Promise<CmsTheme> {
    const theme = await prisma.cmsTheme.create({
      data: {
        name: data.name,
        colors: data.colors as unknown as Prisma.InputJsonValue,
        typography: data.typography as unknown as Prisma.InputJsonValue,
        spacing: data.spacing as unknown as Prisma.InputJsonValue,
        customCss: data.customCss ?? null,
      },
    });
    return mapPrismaTheme(theme);
  },

  async updateTheme(id: string, data: CmsThemeUpdateInput): Promise<CmsTheme | null> {
    const cleanData = removeUndefined({
      name: data.name,
      colors: data.colors as unknown as Prisma.InputJsonValue | undefined,
      typography: data.typography as unknown as Prisma.InputJsonValue | undefined,
      spacing: data.spacing as unknown as Prisma.InputJsonValue | undefined,
      customCss: data.customCss,
    });
    const theme = await prisma.cmsTheme.update({
      where: { id },
      data: cleanData as Prisma.CmsThemeUpdateInput,
    });
    return theme ? mapPrismaTheme(theme) : null;
  },

  async deleteTheme(id: string): Promise<CmsTheme | null> {
    const theme = await prisma.cmsTheme.delete({ where: { id } });
    return theme ? mapPrismaTheme(theme) : null;
  },

  async getDefaultTheme(): Promise<CmsTheme | null> {
    const theme = await prisma.cmsTheme.findFirst({
      where: { isDefault: true },
    });
    return theme ? mapPrismaTheme(theme) : null;
  },

  async setDefaultTheme(id: string): Promise<void> {
    await prisma.$transaction([
      prisma.cmsTheme.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      }),
      prisma.cmsTheme.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);
  },

  // Domains
  async getDomains(): Promise<CmsDomainDto[]> {
    const domains = await prisma.cmsDomain.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return domains.map(mapPrismaDomain);
  },

  async getDomainById(id: string): Promise<CmsDomainDto | null> {
    const domain = await prisma.cmsDomain.findUnique({ where: { id } });
    return domain ? mapPrismaDomain(domain) : null;
  },

  async createDomain(data: CreateCmsDomainDto): Promise<CmsDomainDto> {
    const domain = await prisma.cmsDomain.create({
      data: {
        domain: data.domain,
        aliasOf: data.aliasOf ?? null,
      },
    });
    return mapPrismaDomain(domain);
  },

  async updateDomain(id: string, data: UpdateCmsDomainDto): Promise<CmsDomainDto> {
    const cleanData = removeUndefined({
      domain: data.domain,
      aliasOf: data.aliasOf,
    });
    const domain = await prisma.cmsDomain.update({
      where: { id },
      data: cleanData as Prisma.CmsDomainUpdateInput,
    });
    return mapPrismaDomain(domain);
  },

  async deleteDomain(id: string): Promise<void> {
    await prisma.cmsDomain.delete({ where: { id } });
  },
};
