import prisma from "@/lib/prisma";
import type {
  CatalogCreateInput,
  CatalogRecord,
  CatalogRepository,
  CatalogUpdateInput,
} from "@/types/services/catalog-repository";

const toRecord = (catalog: {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  defaultLanguageId: string | null;
  createdAt: Date;
  updatedAt: Date;
  languages?: { languageId: string }[];
}): CatalogRecord => ({
  id: catalog.id,
  name: catalog.name,
  description: catalog.description ?? null,
  isDefault: catalog.isDefault,
  defaultLanguageId: catalog.defaultLanguageId ?? null,
  createdAt: catalog.createdAt,
  updatedAt: catalog.updatedAt,
  languageIds: catalog.languages?.map((entry) => entry.languageId) ?? [],
});

export const prismaCatalogRepository: CatalogRepository = {
  async listCatalogs() {
    const catalogs = await prisma.catalog.findMany({
      include: { languages: { select: { languageId: true } } },
      orderBy: { createdAt: "desc" },
    });
    return catalogs.map(toRecord);
  },

  async getCatalogById(id: string) {
    const catalog = await prisma.catalog.findUnique({
      where: { id },
      include: { languages: { select: { languageId: true } } },
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
      },
    });
    if (input.languageIds?.length) {
      const existing = await prisma.language.findMany({
        where: { id: { in: input.languageIds } },
        select: { id: true },
      });
      const validIds = new Set(existing.map((entry) => entry.id));
      const languageIds = input.languageIds.filter((id) => validIds.has(id));
      if (languageIds.length > 0) {
        await prisma.catalogLanguage.createMany({
          data: languageIds.map((languageId) => ({
            catalogId: catalog.id,
            languageId,
          })),
          skipDuplicates: true,
        });
      }
    }
    const created = await prisma.catalog.findUnique({
      where: { id: catalog.id },
      include: { languages: { select: { languageId: true } } },
    });
    return toRecord(created ?? catalog);
  },

  async updateCatalog(id: string, input: CatalogUpdateInput) {
    if (input.isDefault) {
      await prisma.catalog.updateMany({ data: { isDefault: false } });
    }
    const catalog = await prisma.catalog.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description ?? undefined,
        isDefault: input.isDefault ?? undefined,
        defaultLanguageId: input.defaultLanguageId ?? undefined,
      },
    });
    if (input.languageIds) {
      const existing = await prisma.language.findMany({
        where: { id: { in: input.languageIds } },
        select: { id: true },
      });
      const validIds = new Set(existing.map((entry) => entry.id));
      const languageIds = input.languageIds.filter((id) => validIds.has(id));
      await prisma.catalogLanguage.deleteMany({ where: { catalogId: id } });
      if (languageIds.length > 0) {
        await prisma.catalogLanguage.createMany({
          data: languageIds.map((languageId) => ({
            catalogId: id,
            languageId,
          })),
          skipDuplicates: true,
        });
      }
    }
    const updated = await prisma.catalog.findUnique({
      where: { id },
      include: { languages: { select: { languageId: true } } },
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
      include: { languages: { select: { languageId: true } } },
    });
    return catalogs.map(toRecord);
  },

  async setDefaultCatalog(id: string) {
    await prisma.catalog.updateMany({ data: { isDefault: false } });
    await prisma.catalog.update({ where: { id }, data: { isDefault: true } });
  },
};
