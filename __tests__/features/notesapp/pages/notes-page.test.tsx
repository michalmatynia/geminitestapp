/**
 * @vitest-environment jsdom
 */

import { vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AdminNotesPage } from "@/features/notesapp/pages/AdminNotesPage";
import { AdminLayoutProvider } from "@/features/admin/context/AdminLayoutContext";
import { NoteSettingsProvider } from "@/features/notesapp/hooks/NoteSettingsContext";
import { ToastProvider } from "@/shared/ui/toast";
import type { NoteWithRelations, TagRecord, CategoryRecord } from "@/shared/types/notes";
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";
import { NoteCreateData } from "@/features/notesapp/validations/notes";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const now = new Date().toISOString();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const baseTags: TagRecord[] = [
  {
    id: "tag-1",
    name: "Work",
    color: "#3b82f6",
    notebookId: null,
    createdAt: now,
    updatedAt: now,
  },
];

const baseCategories: CategoryRecord[] = [
  {
    id: "cat-1",
    name: "Projects",
    description: null,
    color: "#10b981",
    parentId: null,
    notebookId: null,
    themeId: null,
    createdAt: now,
    updatedAt: now,
  },
];

const baseNotebooks = [
  {
    id: "notebook-1",
    name: "Default",
    color: "#3b82f6",
    createdAt: now,
    updatedAt: now,
  },
];

const makeNote = (overrides: Partial<NoteWithRelations> = {}): NoteWithRelations => ({
  id: "note-1",
  title: "Alpha",
  content: "First note",
  color: "#ffffff",
  editorType: "markdown",
  isPinned: true,
  isArchived: false,
  isFavorite: false,
  notebookId: null,
  createdAt: now,
  updatedAt: now,
  tags: [
    {
      noteId: "note-1",
      tagId: "tag-1",
      assignedAt: now,
      tag: baseTags[0]!,
    },
  ],
  categories: [
    {
      noteId: "note-1",
      categoryId: "cat-1",
      assignedAt: now,
      category: baseCategories[0]!,
    },
  ],
  relationsFrom: [],
  relationsTo: [],
  relations: [],
  ...overrides,
});

const renderNotesPage = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <AdminLayoutProvider>
        <NoteSettingsProvider>
          <ToastProvider>
            <AdminNotesPage />
          </ToastProvider>
        </NoteSettingsProvider>
      </AdminLayoutProvider>
    </QueryClientProvider>
  );

describe("Notes page UI", () => {
  let notes: NoteWithRelations[] = [];
  
  beforeEach(() => {
    notes = [makeNote(), makeNote({ id: "note-2", title: "Beta" })];
    const tags = [...baseTags];
    const categories = [...baseCategories];
    const notebooks = [...baseNotebooks];

    if (!global.crypto || !("randomUUID" in global.crypto)) {
      Object.defineProperty(global, "crypto", {
        value: { randomUUID: () => "test-uuid" },
      });
    }

    server.use(
      http.get("/api/settings", () => {
        return HttpResponse.json([]);
      }),
      http.get("/api/notes/tags", () => {
        return HttpResponse.json(tags);
      }),
      http.get("/api/notes/notebooks", () => {
        return HttpResponse.json(notebooks);
      }),
      http.get("/api/notes/categories/tree", () => {
        const tree = categories.map((category) => ({
          ...category,
          children: [],
          notes: notes
            .filter((note) =>
              note.categories.some((cat: any) => cat.categoryId === category.id)
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
        return HttpResponse.json(tree);
      }),
      http.post("/api/notes", async ({ request }) => {
        const body = (await request.json()) as NoteCreateData;
        const tagIds = Array.isArray(body.tagIds) ? body.tagIds : [];
        const categoryIds = Array.isArray(body.categoryIds) ? body.categoryIds : [];
        const newNote = makeNote({
          id: `note-${notes.length + 1}`,
          title: body.title || "Untitled",
          content: body.content || "",
          isPinned: body.isPinned ?? false,
          isArchived: body.isArchived ?? false,
          tags: tagIds.map((tagId: string) => {
            const tag = tags.find((t) => t.id === tagId) ?? tags[0]!;
            return {
              noteId: "temp",
              tagId,
              assignedAt: now,
              tag,
            };
          }),
          categories: categoryIds.map((categoryId: string) => {
            const category =
              categories.find((c) => c.id === categoryId) ?? categories[0]!;
            return {
              noteId: "temp",
              categoryId,
              assignedAt: now,
              category,
            };
          }),
        });
        notes.push(newNote);
        return HttpResponse.json(newNote, { status: 201 });
      }),
      http.get("/api/notes", ({ request }) => {
        const url = new URL(request.url);
        let filtered = [...notes];
        const search = url.searchParams.get("search");
        const isPinned = url.searchParams.get("isPinned");
        const isArchived = url.searchParams.get("isArchived");
        const tagIds = url.searchParams.get("tagIds")?.split(",") ?? [];
        const categoryIds =
          url.searchParams.get("categoryIds")?.split(",") ?? [];

        if (search) {
          filtered = filtered.filter((note) => {
            return note.title.toLowerCase().includes(search.toLowerCase()) || 
                   note.content.toLowerCase().includes(search.toLowerCase());
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
            note.tags.some((tag: any) => tagIds.includes(tag.tagId))
          );
        }
        if (categoryIds.length > 0 && categoryIds[0]) {
          filtered = filtered.filter((note) =>
            note.categories.some((cat: any) => categoryIds.includes(cat.categoryId))
          );
        }
        return HttpResponse.json(filtered);
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders notes from the API", async () => {
    renderNotesPage();

    expect(await screen.findByRole("heading", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Beta" })).toBeInTheDocument();
  });

  it("filters notes by search and tag", async () => {
    renderNotesPage();
    const user = userEvent.setup();

    await user.type(
      await screen.findByPlaceholderText("Search in All Notes..."),
      "Alpha"
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Alpha" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Beta" })).not.toBeInTheDocument();
    });

    await user.selectOptions(
      screen.getByDisplayValue("Filter by Tag..."),
      screen.getByRole("option", { name: "Work" })
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Alpha" })).toBeInTheDocument();
    });
  });

  it("creates a new note from the modal", async () => {
    renderNotesPage();
    const user = userEvent.setup();

    await user.click(await screen.findByLabelText("Create note"));
    await user.type(screen.getByPlaceholderText("Enter note title"), "Gamma");
    await user.type(
      screen.getByPlaceholderText("Enter note content (paste images directly!)"),
      "Third note"
    );
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByRole("heading", { name: "Gamma" })).toBeInTheDocument();
  });
});
