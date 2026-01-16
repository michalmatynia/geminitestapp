import { GET as GET_NOTES, POST as POST_NOTES } from "@/app/api/notes/route";
import {
  GET as GET_NOTE,
  PATCH as PATCH_NOTE,
  DELETE as DELETE_NOTE,
} from "@/app/api/notes/[id]/route";
import prisma from "@/lib/prisma";

const createTag = (name: string) => prisma.tag.create({ data: { name } });
const createCategory = (name: string, parentId?: string | null) =>
  prisma.category.create({ data: { name, parentId: parentId ?? null } });

const createNote = async (data: {
  title: string;
  content: string;
  isPinned?: boolean;
  isArchived?: boolean;
  tagIds?: string[];
  categoryIds?: string[];
  relatedNoteIds?: string[];
}) => {
  const { tagIds = [], categoryIds = [], relatedNoteIds = [], ...rest } = data;
  return prisma.note.create({
    data: {
      ...rest,
      tags: {
        create: tagIds.map((tagId) => ({ tag: { connect: { id: tagId } } })),
      },
      categories: {
        create: categoryIds.map((categoryId) => ({
          category: { connect: { id: categoryId } },
        })),
      },
      relationsFrom: {
        create: relatedNoteIds.map((targetNoteId) => ({
          targetNote: { connect: { id: targetNoteId } },
        })),
      },
    },
  });
};

describe("Notes API", () => {
  beforeEach(async () => {
    await prisma.noteRelation.deleteMany({});
    await prisma.noteTag.deleteMany({});
    await prisma.noteCategory.deleteMany({});
    await prisma.note.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.category.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns notes with relations", async () => {
    const tag = await createTag("Work");
    const category = await createCategory("Projects");
    await createNote({
      title: "Alpha",
      content: "First note",
      isPinned: true,
      tagIds: [tag.id],
      categoryIds: [category.id],
    });

    const res = await GET_NOTES(new Request("http://localhost/api/notes"));
    const notes = await res.json();

    expect(res.status).toBe(200);
    expect(notes).toHaveLength(1);
    expect(notes[0].tags[0].tag.name).toBe("Work");
    expect(notes[0].categories[0].category.name).toBe("Projects");
  });

  it("filters notes by search scope and flags", async () => {
    await createNote({ title: "Alpha", content: "Bravo", isPinned: true });
    await createNote({ title: "Gamma", content: "Alpha", isArchived: true });

    const res = await GET_NOTES(
      new Request(
        "http://localhost/api/notes?search=Alpha&searchScope=title&isPinned=true"
      )
    );
    const notes = await res.json();

    expect(res.status).toBe(200);
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe("Alpha");
  });

  it("filters notes by tags and categories", async () => {
    const tag = await createTag("Urgent");
    const category = await createCategory("Inbox");
    await createNote({
      title: "With relations",
      content: "Tagged and categorized",
      tagIds: [tag.id],
      categoryIds: [category.id],
    });
    await createNote({ title: "Other", content: "No relations" });

    const res = await GET_NOTES(
      new Request(
        `http://localhost/api/notes?tagIds=${tag.id}&categoryIds=${category.id}`
      )
    );
    const notes = await res.json();

    expect(res.status).toBe(200);
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe("With relations");
  });

  it("creates a note with tags and categories", async () => {
    const tag = await createTag("Personal");
    const category = await createCategory("Home");

    const res = await POST_NOTES(
      new Request("http://localhost/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Note",
          content: "Created via API",
          tagIds: [tag.id],
          categoryIds: [category.id],
        }),
      })
    );
    const note = await res.json();

    expect(res.status).toBe(201);
    expect(note.tags[0].tag.name).toBe("Personal");
    expect(note.categories[0].category.name).toBe("Home");
  });

  it("rejects note creation without title/content", async () => {
    const res = await POST_NOTES(
      new Request("http://localhost/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "", content: "" }),
      })
    );

    expect(res.status).toBe(400);
  });

  it("fetches a note by id and returns 404 when missing", async () => {
    const note = await createNote({ title: "Lookup", content: "By id" });

    const res = await GET_NOTE(new Request("http://localhost/api/notes/x"), {
      params: Promise.resolve({ id: note.id }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe(note.id);

    const missing = await GET_NOTE(new Request("http://localhost/api/notes/y"), {
      params: Promise.resolve({ id: "missing-id" }),
    });
    expect(missing.status).toBe(404);
  });

  it("updates a note with new relations", async () => {
    const tag1 = await createTag("Old");
    const tag2 = await createTag("New");
    const category1 = await createCategory("Old Cat");
    const category2 = await createCategory("New Cat");
    const related = await createNote({
      title: "Related",
      content: "Target note",
    });
    const note = await createNote({
      title: "Original",
      content: "Content",
      tagIds: [tag1.id],
      categoryIds: [category1.id],
    });

    const res = await PATCH_NOTE(
      new Request(`http://localhost/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Updated",
          tagIds: [tag2.id],
          categoryIds: [category2.id],
          relatedNoteIds: [related.id],
        }),
      }),
      { params: Promise.resolve({ id: note.id }) }
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.title).toBe("Updated");
    expect(data.tags[0].tag.id).toBe(tag2.id);
    expect(data.categories[0].category.id).toBe(category2.id);
    expect(data.relationsFrom[0].targetNote.id).toBe(related.id);
  });

  it("deletes a note", async () => {
    const note = await createNote({ title: "Delete me", content: "Soon" });

    const res = await DELETE_NOTE(
      new Request(`http://localhost/api/notes/${note.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: note.id }) }
    );

    expect(res.status).toBe(200);
    const remaining = await prisma.note.findUnique({ where: { id: note.id } });
    expect(remaining).toBeNull();
  });
});
