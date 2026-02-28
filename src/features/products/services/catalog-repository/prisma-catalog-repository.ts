import 'server-only';

import type {
  CatalogCreateInput,
  CatalogRecord,
  CatalogRepository,
  CatalogUpdateInput,
} from '@/shared/contracts/products';
import prisma from '@/shared/lib/db/prisma';

import type { Catalog as PrismaCatalog } from '@prisma/client';

const toRecord = (
  catalog: PrismaCatalog & {
    languages?: { languageId: string; position: number }[];
  }
): CatalogRecord => ({
  id: catalog.id,
  name: catalog.name,
  description: catalog.description ?? null,
  isDefault: catalog.isDefault,
  defaultLanguageId: catalog.defaultLanguageId ?? null,
  defaultPriceGroupId: catalog.defaultPriceGroupId ?? null,
  createdAt: catalog.createdAt.toISOString(),
  updatedAt: catalog.updatedAt.toISOString(),
  // Sort by position to ensure correct ordering
  languageIds:
    catalog.languages
      ?.sort((a: { position: number }, b: { position: number }) => a.position - b.position)
      .map((entry: { languageId: string }) => entry.languageId) ?? [],
  priceGroupIds: catalog.priceGroupIds ?? [],
});

export const prismaCatalogRepository: CatalogRepository = {
  async listCatalogs() {
    const catalogs = await prisma.catalog.findMany({
      include: {
        languages: {
          select: { languageId: true, position: true },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return catalogs.map(toRecord);
  },

  async getCatalogById(id: string) {
    const catalog = await prisma.catalog.findUnique({
      where: { id },
      include: {
        languages: {
          select: { languageId: true, position: true },
          orderBy: { position: 'asc' },
        },
      },
    });
    return catalog ? toRecord(catalog) : null;
  },

  async createCatalog(input: CatalogCreateInput) {
    if (input.isDefault) {
      await prisma.catalog.updateMany({ data: { isDefault: false } });
    }
    const catalog = await prisma.catalog.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        isDefault: Boolean(input.isDefault),
        defaultLanguageId: input.defaultLanguageId ?? null,
        defaultPriceGroupId: input.defaultPriceGroupId ?? null,
        priceGroupIds: input.priceGroupIds ?? [],
      },
    });
    if (input.languageIds?.length) {
      const existing = await prisma.language.findMany({
        where: { id: { in: input.languageIds } },
        select: { id: true },
      });
      const validIds = new Set(existing.map((entry: { id: string }) => entry.id));
      const languageIds = input.languageIds.filter((id: string) => validIds.has(id));
      if (languageIds.length > 0) {
        await prisma.catalogLanguage.createMany({
          data: languageIds.map((languageId: string, index: number) => ({
            catalogId: catalog.id,
            languageId,
            position: index,
          })),
          skipDuplicates: true,
        });
      }
    }
    const created = await prisma.catalog.findUnique({
      where: { id: catalog.id },
      include: {
        languages: {
          select: { languageId: true, position: true },
          orderBy: { position: 'asc' },
        },
      },
    });
    return toRecord(created ?? catalog);
  },

  async updateCatalog(id: string, input: CatalogUpdateInput) {
    if (input.isDefault) {
      await prisma.catalog.updateMany({ data: { isDefault: false } });
    }
    await prisma.catalog.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
        ...(input.defaultLanguageId !== undefined && {
          defaultLanguageId: input.defaultLanguageId,
        }),
        ...(input.defaultPriceGroupId !== undefined && {
          defaultPriceGroupId: input.defaultPriceGroupId,
        }),
        ...(input.priceGroupIds !== undefined && {
          priceGroupIds: input.priceGroupIds,
        }),
      },
    });
    if (input.languageIds) {
      const existing = await prisma.language.findMany({
        where: { id: { in: input.languageIds } },
        select: { id: true },
      });
      const validIds = new Set(existing.map((entry: { id: string }) => entry.id));
      const languageIds = input.languageIds.filter((id: string) => validIds.has(id));
      await prisma.catalogLanguage.deleteMany({ where: { catalogId: id } });
      if (languageIds.length > 0) {
        await prisma.catalogLanguage.createMany({
          data: languageIds.map((languageId: string, index: number) => ({
            catalogId: id,
            languageId,
            position: index,
          })),
          skipDuplicates: true,
        });
      }
    }
    const updated = await prisma.catalog.findUnique({
      where: { id },
      include: {
        languages: {
          select: { languageId: true, position: true },
          orderBy: { position: 'asc' },
        },
      },
    });
    return updated ? toRecord(updated) : null;
  },

  async deleteCatalog(id: string) {
    await prisma.catalog.delete({ where: { id } });
  },

  async getCatalogsByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const catalogs = await prisma.catalog.findMany({
      where: { id: { in: ids } },
      include: {
        languages: {
          select: { languageId: true, position: true },
          orderBy: { position: 'asc' },
        },
      },
    });
    return catalogs.map(toRecord);
  },

  async setDefaultCatalog(id: string) {
    await prisma.catalog.updateMany({ data: { isDefault: false } });
    await prisma.catalog.update({ where: { id }, data: { isDefault: true } });
  },
};
