import { test, expect } from "@playwright/test";

test.describe("Notes Advanced E2E", () => {
  let notes: any[] = [];
  let categories: any[] = [];
  let tags: any[] = [];
  let notebooks: any[] = [];
  let themes: any[] = [];

  test.beforeEach(async ({ page }) => {
    const now = new Date().toISOString();
    notes = [
      {
        id: "note-1",
        title: "Main Note",
        content: "Content with a link to another note.",
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
      }
    ];
    categories = [{ id: "cat-1", name: "Work", parentId: null, notebookId: "nb-1" }];
    tags = [{ id: "tag-1", name: "Urgent", color: "#ff0000" }];
    notebooks = [{ id: "nb-1", name: "My Notebook", color: "#3b82f6" }];
    themes = [{ id: "theme-1", name: "Dark Blue", backgroundColor: "#000033", textColor: "#ffffff" }];

    // Global API Mocks
    await page.route("**/api/auth/session", (route) => route.fulfill({ json: { user: { id: "u-1", name: "Test User", role: "super_admin" }, expires: "2099-01-01T00:00:00.000Z" } }));
    await page.route("**/api/notes/notebooks", (route) => route.fulfill({ json: notebooks }));
    await page.route(/\/api\/notes\/categories\/tree.*/, (route) => route.fulfill({ json: categories.map(c => ({ ...c, children: [], notes: [] })) }));
    await page.route(/\/api\/notes\/tags.*/, (route) => route.fulfill({ json: tags }));
    await page.route(/\/api\/notes\/themes.*/, (route) => route.fulfill({ json: themes }));
    await page.route("**/api/settings/lite**", (route) => route.fulfill({ json: [] }));
    await page.route("**/api/settings**", (route) => route.fulfill({ json: [] }));
    
    // Note by ID mock
    await page.route(/\/api\/notes\/note-[^/?]+$/, async (route) => {
        const id = route.request().url().split("/").pop();
        if (route.request().method() === "GET") {
            const note = notes.find(n => n.id === id);
            return note ? route.fulfill({ json: note }) : route.fulfill({ status: 404 });
        }
        if (route.request().method() === "PATCH") {
            const body = JSON.parse(route.request().postData() || "{}");
            const index = notes.findIndex(n => n.id === id);
            if (index !== -1) {
                notes[index] = { ...notes[index], ...body };
                return route.fulfill({ json: notes[index] });
            }
        }
        if (route.request().method() === "DELETE") {
            notes = notes.filter(n => n.id !== id);
            return route.fulfill({ json: { success: true } });
        }
    });

    // Notes list and create mock with filtering
    await page.route(/\/api\/notes(\?.*)?$/, async (route) => {
        if (route.request().method() === "GET") {
            const url = new URL(route.request().url());
            const search = url.searchParams.get("search")?.toLowerCase();
            const scope = url.searchParams.get("searchScope") || "both";
            
            let filteredNotes = [...notes];
            if (search) {
                filteredNotes = filteredNotes.filter(n => {
                    const inTitle = n.title.toLowerCase().includes(search);
                    const inContent = n.content.toLowerCase().includes(search);
                    if (scope === "title") return inTitle;
                    if (scope === "content") return inContent;
                    return inTitle || inContent;
                });
            }
            return route.fulfill({ json: filteredNotes });
        }
        if (route.request().method() === "POST") {
            const body = JSON.parse(route.request().postData() || "{}");
            const newNote = { ...body, id: `note-${Date.now()}`, createdAt: now, updatedAt: now, tags: [], categories: [], relationsFrom: [], relationsTo: [] };
            notes.push(newNote);
            return route.fulfill({ status: 201, json: newNote });
        }
    });
  });

  test("can switch to list view and sort by name", async ({ page }) => {
    await page.goto("/admin/notes", { waitUntil: "networkidle" });
    
    await page.getByTitle("Layout options").click();
    await page.getByText("List", { exact: true }).click();
    await expect(page.getByText("List")).toBeVisible();
    
    await page.getByTitle("Sort by name").click();
    await expect(page.getByTitle("Sort by name")).toHaveClass(/bg-blue-600/);
  });

  test("can favorite a note from the card", async ({ page }) => {
    await page.goto("/admin/notes", { waitUntil: "networkidle" });
    
    const favBtn = page.getByLabel("Favorite note");
    await favBtn.click();
    
    await expect(page.getByLabel("Unfavorite note")).toBeVisible();
  });

  test("note detail view and editing", async ({ page }) => {
    await page.goto("/admin/notes", { waitUntil: "networkidle" });
    
    await page.getByRole("heading", { name: "Main Note" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Main Note" })).toBeVisible();
    
    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByPlaceholder("Enter note title").fill("Updated Title");
    await page.getByRole("button", { name: "Update" }).click();
    
    await expect(page.getByRole("heading", { level: 1, name: "Updated Title" })).toBeVisible();
  });

  test("deleting a note returns to list view", async ({ page }) => {
    await page.goto("/admin/notes", { waitUntil: "networkidle" });
    
    await page.getByRole("heading", { name: "Main Note" }).click();
    await page.getByRole("button", { name: "Edit" }).click();
    
    page.on("dialog", dialog => dialog.accept());
    // Use exact match to avoid multiple elements
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    
    await expect(page.getByText("No notes found")).toBeVisible();
  });

  test("search by content only", async ({ page }) => {
    await page.goto("/admin/notes", { waitUntil: "networkidle" });
    
    await page.getByTitle("Search in content only").click();
    
    const searchInput = page.getByPlaceholder("Search in All Notes...");
    await searchInput.fill("another note"); 
    
    await expect(page.getByRole("heading", { name: "Main Note" })).toBeVisible();
    
    await searchInput.fill("Main Note"); 
    await expect(page.getByRole("heading", { name: "Main Note" })).toBeHidden();
  });
});
