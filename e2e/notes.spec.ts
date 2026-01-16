import { test, expect } from "@playwright/test";
import type {
  NoteRelationWithSource,
  NoteRelationWithTarget,
} from "@/types/notes";

test.describe("Notes page", () => {
  test("lists, filters, and creates notes", async ({ page }) => {
    const now = new Date().toISOString();
    type TagFixture = {
      id: string;
      name: string;
      color: string;
      createdAt: string;
      updatedAt: string;
    };

    type CategoryFixture = {
      id: string;
      name: string;
      description: string | null;
      color: string | null;
      parentId: string | null;
      createdAt: string;
      updatedAt: string;
    };

    type NoteFixture = {
      id: string;
      title: string;
      content: string;
      color: string;
      isPinned: boolean;
      isArchived: boolean;
      createdAt: string;
      updatedAt: string;
      tags: Array<{
        noteId: string;
        tagId: string;
        assignedAt: string;
        tag: TagFixture;
      }>;
      categories: Array<{
        noteId: string;
        categoryId: string;
        assignedAt: string;
        category: CategoryFixture;
      }>;
      relationsFrom: NoteRelationWithTarget[];
      relationsTo: NoteRelationWithSource[];
    };

    const tags: TagFixture[] = [
      {
        id: "tag-1",
        name: "Work",
        color: "#3b82f6",
        createdAt: now,
        updatedAt: now,
      },
    ];
    const categories: CategoryFixture[] = [
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
    const notes: NoteFixture[] = [
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

    const notebooks = [
      {
        id: "notebook-1",
        name: "Default",
        color: "#3b82f6",
        createdAt: now,
        updatedAt: now,
      },
    ];

    const buildTree = () =>
      categories.map((category) => ({
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

    await page.route("**/api/notes/notebooks", async (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(notebooks),
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
        const body = JSON.parse(request.postData() || "{}") as {
          title?: string;
          content?: string;
          color?: string;
          isPinned?: boolean;
          isArchived?: boolean;
          tagIds?: string[];
          categoryIds?: string[];
        };
        const tagIds = Array.isArray(body.tagIds) ? body.tagIds : [];
        const categoryIds = Array.isArray(body.categoryIds) ? body.categoryIds : [];
        const newNote = {
          id: `note-${notes.length + 1}`,
          title: body.title || "Untitled",
          content: body.content || "",
          color: body.color ?? "#ffffff",
          isPinned: body.isPinned ?? false,
          isArchived: body.isArchived ?? false,
          createdAt: now,
          updatedAt: now,
          tags: tagIds.map((tagId) => ({
            noteId: "temp",
            tagId,
            assignedAt: now,
            tag: tags.find((tag) => tag.id === tagId) ?? tags[0],
          })),
          categories: categoryIds.map((categoryId) => ({
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
