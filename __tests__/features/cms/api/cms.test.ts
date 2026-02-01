import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/cms/slugs/route";
import { DELETE } from "@/app/api/cms/slugs/[id]/route";
import { getCmsRepository } from "@/features/cms/services/cms-repository";
import type { Slug } from "@/features/cms/types";

describe("CMS API", () => {
  let cmsRepository: any;

  beforeEach(async () => {
    cmsRepository = await getCmsRepository();
    // Use a try-catch or ensure deleteMany exists/works for the provider
    // For prisma it works, for mongo we might need to be careful if it's not implemented
    // But our repos have basic CRUD.
    const slugs = await cmsRepository.getSlugs();
    for (const s of slugs) {
      await cmsRepository.deleteSlug(s.id);
    }
  });

  it("should create a new slug", async () => {
    const req = new NextRequest("http://localhost/api/cms/slugs", {
      method: "POST",
      body: JSON.stringify({ slug: "test-slug" }),
    });

    const res = await POST(req);
    const data = (await res.json()) as { slug: string };

    expect(res.status).toBe(200);
    expect(data.slug).toBe("test-slug");
  });

  it("should not create a duplicate slug (idempotent)", async () => {
    await cmsRepository.createSlug({ slug: "test-slug" });

    const req = new NextRequest("http://localhost/api/cms/slugs", {
      method: "POST",
      body: JSON.stringify({ slug: "test-slug" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { slug: string };
    expect(data.slug).toBe("test-slug");
  });

  it("should fetch all slugs", async () => {
    await cmsRepository.createSlug({ slug: "test-slug-1" });
    await cmsRepository.createSlug({ slug: "test-slug-2" });

    const res = await GET(new NextRequest("http://localhost/api/cms/slugs"));
    const data = (await res.json()) as Slug[];

    expect(res.status).toBe(200);
    expect(data.length).toBe(2);
  });

  it("should delete a slug", async () => {
    const slug = await cmsRepository.createSlug({ slug: "test-slug" });

    const req = new NextRequest(`http://localhost/api/cms/slugs/${slug.id}`, {
      method: "DELETE",
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: slug.id }) });
    expect(res.status).toBe(204);

    const deletedSlug = await cmsRepository.getSlugById(slug.id);
    expect(deletedSlug).toBeNull();
  });
});
