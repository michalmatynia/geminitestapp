/**
 * @vitest-environment jsdom
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminNotesPage } from "@/features/notesapp/pages/AdminNotesPage";
import { AdminLayoutProvider } from "@/features/admin/context/AdminLayoutContext";
import { NoteSettingsProvider } from "@/features/notesapp/hooks/NoteSettingsContext";
import { ToastProvider } from "@/shared/ui/toast";
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { NoteWithRelations } from "@/shared/types/notes";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const now = new Date();

const makeNote = (overrides: Partial<NoteWithRelations> = {}): NoteWithRelations => ({
  id: "note-1",
  title: "Alpha",
  content: "First note",
  color: "#ffffff",
  editorType: "markdown",
  isPinned: false,
  isArchived: false,
  isFavorite: false,
  notebookId: "nb-1",
  createdAt: now,
  updatedAt: now,
  tags: [],
  categories: [],
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

describe("Notes Advanced UI", () => {
  let notes: NoteWithRelations[] = [];

  beforeEach(() => {
    notes = [
      makeNote({ id: "note-1", title: "Apple", createdAt: new Date("2023-01-01") }),
      makeNote({ id: "note-2", title: "Banana", createdAt: new Date("2023-01-02") }),
    ];

    server.use(
      http.get("/api/settings", () => HttpResponse.json([])),
      http.get("/api/notes/tags", () => HttpResponse.json([])),
      http.get("/api/notes/notebooks", () => HttpResponse.json([{ id: "nb-1", name: "Default" }])),
      http.get("/api/notes/categories/tree", () => HttpResponse.json([])),
      http.get("/api/notes", () => HttpResponse.json(notes)),
      http.get("/api/notes/:id", ({ params }) => {
        const note = notes.find(n => n.id === params.id);
        return note ? HttpResponse.json(note) : HttpResponse.json({ error: "Not found" }, { status: 404 });
      }),
      http.patch("/api/notes/:id", async ({ params, request }) => {
        const body = await request.json() as any;
        const index = notes.findIndex(n => n.id === params.id);
        if (index !== -1) {
            notes[index] = { ...notes[index], ...body };
            return HttpResponse.json(notes[index]);
        }
        return HttpResponse.json({ error: "Not found" }, { status: 404 });
      }),
      http.delete("/api/notes/:id", ({ params }) => {
        notes = notes.filter(n => n.id !== params.id);
        return HttpResponse.json({ success: true });
      })
    );

    // Mock confirm for deletion
    vi.stubGlobal("confirm", vi.fn(() => true));
    
    // Mock navigator.clipboard
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("switches between grid and list views", async () => {
    renderNotesPage();
    const user = userEvent.setup();

    const layoutBtn = await screen.findByTitle(/Layout options/i);
    await user.click(layoutBtn);
    
    const listOption = await screen.findByText("List");
    await user.click(listOption);
    
    // Verify layout changed (the label in the button updates)
    expect(await screen.findByText("List")).toBeInTheDocument();
  });

  it("sorts notes by title", async () => {
    renderNotesPage();
    const user = userEvent.setup();

    // Default sort is by Date (created desc usually). Banana (Jan 2) before Apple (Jan 1).
    const cards = await screen.findAllByRole("heading", { level: 3 });
    expect(cards[0]!.textContent).toBe("Banana");
    expect(cards[1]!.textContent).toBe("Apple");

    // Change sort to name (ascending is usually default or we can toggle order)
    const sortByNameBtn = screen.getByTitle("Sort by name");
    await user.click(sortByNameBtn);

    // After clicking Name, it sorts by Name. Sort order is still DESC by default.
    // Banana (B) comes before Apple (A) in DESC order.
    await waitFor(async () => {
      const cardsAfterSort = await screen.findAllByRole("heading", { level: 3 });
      expect(cardsAfterSort[0]!.textContent).toBe("Banana");
      expect(cardsAfterSort[1]!.textContent).toBe("Apple");
    });

    // Toggle to ASC
    const orderBtn = screen.getByTitle(/Descending/);
    await user.click(orderBtn);

    await waitFor(async () => {
      const cardsAfterSort = await screen.findAllByRole("heading", { level: 3 });
      expect(cardsAfterSort[0]!.textContent).toBe("Apple");
      expect(cardsAfterSort[1]!.textContent).toBe("Banana");
    });
  });

  it("opens note detail view and enters edit mode", async () => {
    renderNotesPage();
    const user = userEvent.setup();

    const appleNote = await screen.findByRole("heading", { name: "Apple" });
    await user.click(appleNote);

    expect(await screen.findByText("First note")).toBeInTheDocument();
    
    const editBtn = screen.getByRole("button", { name: "Edit" });
    await user.click(editBtn);
    
    const titleInput = screen.getByPlaceholderText("Enter note title");
    expect(titleInput).toHaveValue("Apple");
  });

  it("edits a note and saves", async () => {
    renderNotesPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("heading", { name: "Apple" }));
    await user.click(await screen.findByRole("button", { name: "Edit" }));

    const titleInput = screen.getByPlaceholderText("Enter note title");
    await user.clear(titleInput);
    await user.type(titleInput, "Updated Apple");
    
    await user.click(screen.getByRole("button", { name: "Update" }));

    // Should be back in detail view with updated title. 
    // Use h1 selector to be specific (breadcrumb also contains the title)
    expect(await screen.findByRole("heading", { level: 1, name: "Updated Apple" })).toBeInTheDocument();
  });

  it("deletes a note from edit mode", async () => {
    renderNotesPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("heading", { name: "Banana" }));
    await user.click(await screen.findByRole("button", { name: "Edit" }));
    
    const deleteBtn = screen.getByRole("button", { name: "Delete" });
    await user.click(deleteBtn);

    // Should be back to list view, and Banana should be gone
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Banana" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "Apple" })).toBeInTheDocument();
  });

  it("toggles favorite status from list view", async () => {
    renderNotesPage();
    const user = userEvent.setup();

    // Use a more robust selector to find the card container
    const appleTitle = await screen.findByRole("heading", { name: "Apple" });
    const appleCard = appleTitle.closest(".rounded-lg.border.p-4"); 
    
    const favBtn = await within(appleCard as HTMLElement).findByRole("button", { name: /Favorite note/i });
    
    await user.click(favBtn);
    
    // Check if it's now Unfavorite note
    expect(await within(appleCard as HTMLElement).findByRole("button", { name: /Unfavorite note/i })).toBeInTheDocument();
  });
});