import { test, expect } from "@playwright/test";

test.describe("Notes page", () => {
  test("lists, filters, and creates notes", async ({ page }) => {
    const now = new Date().toISOString();
    const tags = [
      {
        id: "tag-1",
        name: "Work",
        color: "#3b82f6",
        createdAt: now,
        updatedAt: now,
      },
    ];
    const categories = [
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
    const notes: Array<any> = [
      {
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
            tag: tags[0],
          },
        ],
        categories: [
          {
            noteId: "note-1",
            categoryId: "cat-1",
            assignedAt: now,
            category: categories[0],
          },
        ],
        relationsFrom: [],
        relationsTo: [],
      },
      {
        id: "note-2",
        title: "Beta",
        content: "Second note",
        color: "#ffffff",
        isPinned: false,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
        tags: [],
        categories: [],
        relationsFrom: [],
        relationsTo: [],
      },
    ];

    const buildTree = () =>
      categories.map((category) => ({
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

    await page.route("**/api/settings", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.route("**/api/notes/tags", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(tags),
      });
    });

    await page.route("**/api/notes/categories/tree", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildTree()),
      });
    });

    await page.route("**/api/notes", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "POST") {
        const body = JSON.parse(request.postData() || "{}");
        const newNote = {
          id: `note-${notes.length + 1}`,
          title: body.title,
          content: body.content,
          color: body.color ?? "#ffffff",
          isPinned: body.isPinned ?? false,
          isArchived: body.isArchived ?? false,
          createdAt: now,
          updatedAt: now,
          tags: (body.tagIds || []).map((tagId: string) => ({
            noteId: "temp",
            tagId,
            assignedAt: now,
            tag: tags.find((tag) => tag.id === tagId) ?? tags[0],
          })),
          categories: (body.categoryIds || []).map((categoryId: string) => ({
            noteId: "temp",
            categoryId,
            assignedAt: now,
            category:
              categories.find((category) => category.id === categoryId) ??
              categories[0],
          })),
          relationsFrom: [],
          relationsTo: [],
        };
        notes.push(newNote);
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(newNote),
        });
      }

      let filtered = [...notes];
      const search = url.searchParams.get("search");
      const searchScope = url.searchParams.get("searchScope") ?? "both";

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

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(filtered),
      });
    });

    await page.goto("/admin/notes");

    await expect(page.getByRole("heading", { name: "Notes" })).toBeVisible();
    await expect(page.getByText("Alpha")).toBeVisible();
    await expect(page.getByText("Beta")).toBeVisible();

    await page.getByPlaceholder("Search in All Notes...").fill("Alpha");
    await expect(page.getByText("Alpha")).toBeVisible();
    await expect(page.getByText("Beta")).toBeHidden();

    await page.getByRole("button", { name: "Create note" }).click();
    await page.getByPlaceholder("Enter note title").fill("Gamma");
    await page.getByPlaceholder("Enter note content").fill("Third note");
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.getByText("Gamma")).toBeVisible();
  });
});
