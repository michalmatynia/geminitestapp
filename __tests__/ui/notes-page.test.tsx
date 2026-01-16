/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AdminNotesPage from "@/app/(admin)/admin/notes/page";
import { AdminLayoutProvider } from "@/lib/context/AdminLayoutContext";
import { NoteSettingsProvider } from "@/lib/context/NoteSettingsContext";
import { ToastProvider } from "@/components/ui/toast";

const now = new Date().toISOString();

const baseTags = [
  {
    id: "tag-1",
    name: "Work",
    color: "#3b82f6",
    createdAt: now,
    updatedAt: now,
  },
];

const baseCategories = [
  {
    id: "cat-1",
    name: "Projects",
    description: null,
    color: "#10b981",
    parentId: null,
    createdAt: now,
    updatedAt: now,
  },
];

const makeNote = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "note-1",
  title: "Alpha",
  content: "First note",
  color: "#ffffff",
  isPinned: true,
  isArchived: false,
  createdAt: now,
  updatedAt: now,
  tags: [
    {
      noteId: "note-1",
      tagId: "tag-1",
      assignedAt: now,
      tag: baseTags[0],
    },
  ],
  categories: [
    {
      noteId: "note-1",
      categoryId: "cat-1",
      assignedAt: now,
      category: baseCategories[0],
    },
  ],
  relationsFrom: [],
  relationsTo: [],
  ...overrides,
});

const renderNotesPage = () =>
  render(
    <AdminLayoutProvider>
      <NoteSettingsProvider>
        <ToastProvider>
          <AdminNotesPage />
        </ToastProvider>
      </NoteSettingsProvider>
    </AdminLayoutProvider>
  );

describe("Notes page UI", () => {
  beforeEach(() => {
    const notes = [makeNote(), makeNote({ id: "note-2", title: "Beta" })];
    const tags = [...baseTags];
    const categories = [...baseCategories];

    if (!global.crypto || !("randomUUID" in global.crypto)) {
      Object.defineProperty(global, "crypto", {
        value: { randomUUID: () => "test-uuid" },
      });
    }

    jest.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.url;
      const method = init?.method ?? "GET";
      const parsed = new URL(url, "http://localhost");

      if (parsed.pathname === "/api/settings") {
        if (method === "GET") {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      if (parsed.pathname === "/api/notes/tags") {
        return new Response(JSON.stringify(tags), { status: 200 });
      }

      if (parsed.pathname === "/api/notes/categories/tree") {
        const tree = categories.map((category) => ({
          ...category,
          children: [],
          notes: notes
            .filter((note) =>
              note.categories.some((cat) => cat.categoryId === category.id)
            )
            .map((note) => ({
              id: note.id,
              title: note.title,
              content: note.content,
              color: note.color,
              isPinned: note.isPinned,
              isArchived: note.isArchived,
              createdAt: note.createdAt,
              updatedAt: note.updatedAt,
            })),
        }));
        return new Response(JSON.stringify(tree), { status: 200 });
      }

      if (parsed.pathname === "/api/notes" && method === "POST") {
        const body = JSON.parse(init?.body as string);
        const newNote = makeNote({
          id: `note-${notes.length + 1}`,
          title: body.title,
          content: body.content,
          isPinned: body.isPinned,
          isArchived: body.isArchived,
          tags: (body.tagIds || []).map((tagId: string) => {
            const tag = tags.find((t) => t.id === tagId) ?? tags[0];
            return {
              noteId: "temp",
              tagId,
              assignedAt: now,
              tag,
            };
          }),
          categories: (body.categoryIds || []).map((categoryId: string) => {
            const category =
              categories.find((c) => c.id === categoryId) ?? categories[0];
            return {
              noteId: "temp",
              categoryId,
              assignedAt: now,
              category,
            };
          }),
        });
        notes.push(newNote);
        return new Response(JSON.stringify(newNote), { status: 201 });
      }

      if (parsed.pathname === "/api/notes") {
        let filtered = [...notes];
        const search = parsed.searchParams.get("search");
        const searchScope = parsed.searchParams.get("searchScope") ?? "both";
        const isPinned = parsed.searchParams.get("isPinned");
        const isArchived = parsed.searchParams.get("isArchived");
        const tagIds = parsed.searchParams.get("tagIds")?.split(",") ?? [];
        const categoryIds =
          parsed.searchParams.get("categoryIds")?.split(",") ?? [];

        if (search) {
          filtered = filtered.filter((note) => {
            const inTitle = note.title
              .toLowerCase()
              .includes(search.toLowerCase());
            const inContent = note.content
              .toLowerCase()
              .includes(search.toLowerCase());
            if (searchScope === "title") return inTitle;
            if (searchScope === "content") return inContent;
            return inTitle || inContent;
          });
        }
        if (isPinned !== null && isPinned !== undefined) {
          filtered = filtered.filter(
            (note) => String(note.isPinned) === isPinned
          );
        }
        if (isArchived !== null && isArchived !== undefined) {
          filtered = filtered.filter(
            (note) => String(note.isArchived) === isArchived
          );
        }
        if (tagIds.length > 0 && tagIds[0]) {
          filtered = filtered.filter((note) =>
            note.tags.some((tag) => tagIds.includes(tag.tagId))
          );
        }
        if (categoryIds.length > 0 && categoryIds[0]) {
          filtered = filtered.filter((note) =>
            note.categories.some((cat) => categoryIds.includes(cat.categoryId))
          );
        }
        return new Response(JSON.stringify(filtered), { status: 200 });
      }

      return new Response("Not found", { status: 404 });
    });
  });

  afterEach(() => {
    (global.fetch as jest.Mock).mockRestore();
  });

  it("renders notes from the API", async () => {
    renderNotesPage();

    expect(await screen.findByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("filters notes by search and tag", async () => {
    renderNotesPage();
    const user = userEvent.setup();

    await user.type(
      await screen.findByPlaceholderText("Search in All Notes..."),
      "Alpha"
    );

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeInTheDocument();
      expect(screen.queryByText("Beta")).not.toBeInTheDocument();
    });

    await user.selectOptions(
      screen.getByRole("combobox"),
      screen.getByRole("option", { name: "Work" })
    );

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeInTheDocument();
    });
  });

  it("creates a new note from the modal", async () => {
    renderNotesPage();
    const user = userEvent.setup();

    await user.click(await screen.findByLabelText("Create note"));
    await user.type(screen.getByPlaceholderText("Enter note title"), "Gamma");
    await user.type(
      screen.getByPlaceholderText("Enter note content"),
      "Third note"
    );
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Gamma")).toBeInTheDocument();
  });
});
