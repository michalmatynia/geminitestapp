import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as listPages, POST as createPage } from "@/app/api/cms/pages/route";
import { GET as getPage, PUT as updatePage, DELETE as deletePage } from "@/app/api/cms/pages/[id]/route";
import { getCmsRepository } from "@/features/cms/services/cms-repository";

vi.mock("@/features/cms/services/cms-repository", () => ({
  getCmsRepository: vi.fn(),
}));

vi.mock("@/features/cms/services/cms-domain", () => ({
  resolveCmsDomainFromRequest: vi.fn().mockResolvedValue({ id: "d1", domain: "localhost" }),
  getSlugsForDomain: vi.fn().mockResolvedValue([]),
  resolveCmsDomainScopeById: vi.fn(),
}));

vi.mock("@/features/observability/server", () => ({
  ErrorSystem: {
    captureException: vi.fn(),
  },
}));

describe("CMS Pages API", () => {
  const mockRepo = {
    getPages: vi.fn(),
    getPageById: vi.fn(),
    createPage: vi.fn(),
    updatePage: vi.fn(),
    deletePage: vi.fn(),
    addSlugToPage: vi.fn(),
    replacePageSlugs: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getCmsRepository as any).mockResolvedValue(mockRepo);
  });

  describe("GET /api/cms/pages", () => {
    it("should return a list of pages", async () => {
      const mockPages = [{ id: "1", name: "Page 1" }];
      mockRepo.getPages.mockResolvedValue(mockPages);

      const res = await listPages(new NextRequest("http://localhost/api/cms/pages?scope=all"), {} as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(mockPages);
      expect(mockRepo.getPages).toHaveBeenCalled();
    });
  });

  describe("GET /api/cms/pages/[id]", () => {
    it("should return a single page", async () => {
      const mockPage = { id: "123", name: "Single Page" };
      mockRepo.getPageById.mockResolvedValue(mockPage);

      const res = await getPage(new NextRequest("http://localhost"), { params: Promise.resolve({ id: "123" }) } as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(mockPage);
    });

    it("should return 404 if page not found", async () => {
      mockRepo.getPageById.mockResolvedValue(null);
      const res = await getPage(new NextRequest("http://localhost"), { params: Promise.resolve({ id: "999" }) } as any);
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/cms/pages", () => {
    it("should create a new page", async () => {
      const pageData = { name: "New CMS Page", slugIds: ["slug-1"] };
      const createdPage = { id: "p-123", name: "New CMS Page" };
      mockRepo.createPage.mockResolvedValue(createdPage);

      const req = new NextRequest("http://localhost/api/cms/pages", {
        method: "POST",
        body: JSON.stringify(pageData),
      });

      const res = await createPage(req, {} as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(createdPage);
      expect(mockRepo.createPage).toHaveBeenCalledWith({ name: "New CMS Page" });
      expect(mockRepo.addSlugToPage).toHaveBeenCalledWith("p-123", "slug-1");
    });
  });

  describe("PUT /api/cms/pages/[id]", () => {
    it("should update a page", async () => {
      const updateData = {
        name: "Updated Page",
        slugIds: ["s1"],
        components: [{ type: "Hero", content: {} }]
      };
      const updatedPage = { id: "123", name: "Updated Page" };
      mockRepo.updatePage.mockResolvedValue(updatedPage);

      const req = new NextRequest("http://localhost", {
        method: "PUT",
        body: JSON.stringify(updateData),
      });

      const res = await updatePage(req, { params: Promise.resolve({ id: "123" }) } as any);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(updatedPage);
      expect(mockRepo.updatePage).toHaveBeenCalledWith("123", expect.objectContaining({ name: "Updated Page" }));
      expect(mockRepo.replacePageSlugs).toHaveBeenCalledWith("123", ["s1"]);
    });
  });

  describe("DELETE /api/cms/pages/[id]", () => {
    it("should delete a page", async () => {
      mockRepo.deletePage.mockResolvedValue({ id: "123" });
      const res = await deletePage(new NextRequest("http://localhost"), { params: Promise.resolve({ id: "123" }) } as any);
      expect(res.status).toBe(204);
      expect(mockRepo.deletePage).toHaveBeenCalledWith("123");
    });
  });
});
