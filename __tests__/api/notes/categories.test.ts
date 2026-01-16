import {
  GET as GET_CATEGORIES,
  POST as POST_CATEGORY,
} from "@/app/api/notes/categories/route";
import {
  PATCH as PATCH_CATEGORY,
  DELETE as DELETE_CATEGORY,
} from "@/app/api/notes/categories/[id]/route";
import { GET as GET_TREE } from "@/app/api/notes/categories/tree/route";
import prisma from "@/lib/prisma";

const createCategory = (name: string, parentId?: string | null) =>
  prisma.category.create({ data: { name, parentId: parentId ?? null } });

const createNote = async (title: string, categoryId: string) => {
  return prisma.note.create({
    data: {
      title,
      content: `${title} content`,
      categories: {
        create: [{ category: { connect: { id: categoryId } } }],
      },
    },
  });
};

describe("Notes Categories API", () => {
  beforeEach(async () => {
    await prisma.noteRelation.deleteMany({});
    await prisma.noteTag.deleteMany({});
    await prisma.noteCategory.deleteMany({});
    await prisma.note.deleteMany({});
    await prisma.category.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lists categories", async () => {
    await prisma.category.createMany({
      data: [{ name: "Work" }, { name: "Home" }],
    });

    const res = await GET_CATEGORIES();
    const categories = await res.json();

    expect(res.status).toBe(200);
    expect(categories).toHaveLength(2);
  });

  it("creates a category and rejects empty names", async () => {
    const res = await POST_CATEGORY(
      new Request("http://localhost/api/notes/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Projects" }),
      })
    );
    const created = await res.json();

    expect(res.status).toBe(201);
    expect(created.name).toBe("Projects");

    const missing = await POST_CATEGORY(
      new Request("http://localhost/api/notes/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }),
      })
    );

    expect(missing.status).toBe(400);
  });

  it("updates a category", async () => {
    const category = await createCategory("Old Name");

    const res = await PATCH_CATEGORY(
      new Request(`http://localhost/api/notes/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Name" }),
      }),
      { params: Promise.resolve({ id: category.id }) }
    );
    const updated = await res.json();

    expect(res.status).toBe(200);
    expect(updated.name).toBe("New Name");
  });

  it("returns a hierarchical category tree", async () => {
    const root = await createCategory("Root");
    const child = await createCategory("Child", root.id);
    await createNote("Child Note", child.id);

    const res = await GET_TREE();
    const tree = await res.json();

    expect(res.status).toBe(200);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].notes).toHaveLength(1);
  });

  it("deletes categories recursively with notes", async () => {
    const root = await createCategory("Root");
    const child = await createCategory("Child", root.id);
    await createNote("Root Note", root.id);
    await createNote("Child Note", child.id);

    const res = await DELETE_CATEGORY(
      new Request(
        `http://localhost/api/notes/categories/${root.id}?recursive=true`,
        { method: "DELETE" }
      ),
      { params: Promise.resolve({ id: root.id }) }
    );

    expect(res.status).toBe(200);
    const remainingCategories = await prisma.category.findMany({});
    const remainingNotes = await prisma.note.findMany({});
    expect(remainingCategories).toHaveLength(0);
    expect(remainingNotes).toHaveLength(0);
  });
});
