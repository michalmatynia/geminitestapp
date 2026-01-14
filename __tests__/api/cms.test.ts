import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/cms/slugs/route";
import { DELETE } from "@/app/api/cms/slugs/[id]/route";

import prisma from "@/lib/prisma";

describe("CMS API", () => {
  beforeEach(async () => {
    await prisma.slug.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should create a new slug", async () => {
    const req = new Request("http://localhost/api/cms/slugs", {
      method: "POST",
      body: JSON.stringify({ slug: "test-slug" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.slug).toBe("test-slug");
  });

  it("should not create a duplicate slug", async () => {
    await prisma.slug.create({ data: { slug: "test-slug" } });

    const req = new Request("http://localhost/api/cms/slugs", {
      method: "POST",
      body: JSON.stringify({ slug: "test-slug" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("should fetch all slugs", async () => {
    await prisma.slug.createMany({
      data: [{ slug: "test-slug-1" }, { slug: "test-slug-2" }],
    });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.length).toBe(2);
  });

  it("should delete a slug", async () => {
    const slug = await prisma.slug.create({ data: { slug: "test-slug" } });

    const req = new NextRequest(`http://localhost/api/cms/slugs/${slug.id}`, {
      method: "DELETE",
    });

    const res = await DELETE(req, { params: { id: slug.id } });
    expect(res.status).toBe(204);

    const deletedSlug = await prisma.slug.findUnique({
      where: { id: slug.id },
    });
    expect(deletedSlug).toBeNull();
  });
});
