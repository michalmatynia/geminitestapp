import {
  GET as GET_TAGS,
  POST as POST_TAG,
} from "@/app/api/notes/tags/route";
import {
  PATCH as PATCH_TAG,
  DELETE as DELETE_TAG,
} from "@/app/api/notes/tags/[id]/route";
import prisma from "@/lib/prisma";

describe("Notes Tags API", () => {
  beforeEach(async () => {
    await prisma.noteTag.deleteMany({});
    await prisma.note.deleteMany({});
    await prisma.tag.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lists tags ordered by name", async () => {
    await prisma.tag.createMany({
      data: [{ name: "Beta" }, { name: "Alpha" }],
    });

    const res = await GET_TAGS();
    const tags = await res.json();

    expect(res.status).toBe(200);
    expect(tags[0].name).toBe("Alpha");
    expect(tags[1].name).toBe("Beta");
  });

  it("creates a tag", async () => {
    const res = await POST_TAG(
      new Request("http://localhost/api/notes/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Personal" }),
      })
    );
    const tag = await res.json();

    expect(res.status).toBe(201);
    expect(tag.name).toBe("Personal");
  });

  it("rejects tag creation without a name", async () => {
    const res = await POST_TAG(
      new Request("http://localhost/api/notes/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }),
      })
    );

    expect(res.status).toBe(400);
  });

  it("updates a tag", async () => {
    const tag = await prisma.tag.create({ data: { name: "Old" } });

    const res = await PATCH_TAG(
      new Request(`http://localhost/api/notes/tags/${tag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New" }),
      }),
      { params: Promise.resolve({ id: tag.id }) }
    );
    const updated = await res.json();

    expect(res.status).toBe(200);
    expect(updated.name).toBe("New");
  });

  it("deletes a tag", async () => {
    const tag = await prisma.tag.create({ data: { name: "Delete" } });

    const res = await DELETE_TAG(
      new Request(`http://localhost/api/notes/tags/${tag.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: tag.id }) }
    );

    expect(res.status).toBe(200);
    const remaining = await prisma.tag.findUnique({ where: { id: tag.id } });
    expect(remaining).toBeNull();
  });
});
