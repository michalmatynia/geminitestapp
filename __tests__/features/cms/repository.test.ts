import { vi, describe, it, expect, beforeEach } from "vitest";
import prisma from "@/shared/lib/db/prisma";
import { prismaCmsRepository } from "@/features/cms/services/cms-repository/prisma-cms-repository";

vi.mock("@/shared/lib/db/prisma", () => ({
  default: {
    page: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    slug: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    pageSlug: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    pageComponent: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    cmsTheme: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("CMS Repository (Prisma)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Pages", () => {
    it("should get all pages", async () => {
      const mockPages = [{ id: "1", name: "Home" }];
      (prisma.page.findMany as any).mockResolvedValue(mockPages);

      const result = await prismaCmsRepository.getPages();

      expect(prisma.page.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockPages);
    });

    it("should get page by id with inclusions", async () => {
      const mockPage = { id: "1", name: "Home", components: [], slugs: [] };
      (prisma.page.findUnique as any).mockResolvedValue(mockPage);

      const result = await prismaCmsRepository.getPageById("1");

      expect(prisma.page.findUnique).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "1" },
        include: expect.any(Object),
      }));
      expect(result).toEqual(mockPage);
    });

    it("should create a new page", async () => {
      const mockPage = { id: "1", name: "New Page" };
      (prisma.page.create as any).mockResolvedValue(mockPage);

      const result = await prismaCmsRepository.createPage({ name: "New Page" });

      expect(prisma.page.create).toHaveBeenCalledWith({
        data: { name: "New Page" },
      });
      expect(result).toEqual(mockPage);
    });

    it("should delete a page", async () => {
      const mockPage = { id: "1", name: "Deleted" };
      (prisma.page.delete as any).mockResolvedValue(mockPage);

      const result = await prismaCmsRepository.deletePage("1");

      expect(prisma.page.delete).toHaveBeenCalledWith({ where: { id: "1" } });
      expect(result).toEqual(mockPage);
    });

    it("should update a page", async () => {
      const mockPage = { id: "1", name: "Updated" };
      (prisma.page.update as any).mockResolvedValue(mockPage);
      (prisma.page.findUnique as any).mockResolvedValue(mockPage);

      const result = await prismaCmsRepository.updatePage("1", { name: "Updated" });

      expect(prisma.page.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: expect.objectContaining({ name: "Updated" }),
      });
      expect(result).toEqual(mockPage);
    });

    it("should replace page components", async () => {
      const pageId = "page-1";
      const components = [
        { type: "hero", content: { title: "Hello" } },
        { type: "text", content: { body: "World" } },
      ];

      await prismaCmsRepository.replacePageComponents(pageId, components as any);

      expect(prisma.pageComponent.deleteMany).toHaveBeenCalledWith({ where: { pageId } });
      expect(prisma.pageComponent.createMany).toHaveBeenCalledWith({
        data: components.map((c, i) => ({
          pageId,
          type: c.type,
          content: c.content,
          order: i,
        })),
      });
    });
  });

  describe("Slugs", () => {
    it("should get all slugs", async () => {
      const mockSlugs = [{ id: "1", slug: "home" }];
      (prisma.slug.findMany as any).mockResolvedValue(mockSlugs);

      const result = await prismaCmsRepository.getSlugs();

      expect(prisma.slug.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockSlugs);
    });

    it("should create a slug", async () => {
      const mockSlug = { id: "1", slug: "test" };
      (prisma.slug.create as any).mockResolvedValue(mockSlug);

      const result = await prismaCmsRepository.createSlug({ slug: "test" });

      expect(prisma.slug.create).toHaveBeenCalledWith({
        data: { slug: "test" },
      });
      expect(result).toEqual(mockSlug);
    });
  });

  describe("Relationships", () => {
    it("should add slug to page", async () => {
      await prismaCmsRepository.addSlugToPage("p1", "s1");
      expect(prisma.pageSlug.create).toHaveBeenCalledWith({
        data: { pageId: "p1", slugId: "s1" },
      });
    });
  });
});
