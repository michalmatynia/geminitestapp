import type { Page } from '@playwright/test';

const now = new Date('2026-03-07T00:00:00.000Z').toISOString();

const tags = [
  {
    id: 'tag-1',
    name: 'Work',
    color: '#3b82f6',
    notebookId: 'notebook-1',
    createdAt: now,
    updatedAt: now,
  },
];

const categories = [
  {
    id: 'cat-1',
    name: 'Projects',
    description: null,
    color: '#10b981',
    parentId: null,
    notebookId: 'notebook-1',
    themeId: null,
    sortIndex: 0,
    createdAt: now,
    updatedAt: now,
  },
];

const notebooks = [
  {
    id: 'notebook-1',
    name: 'Default',
    color: '#3b82f6',
    defaultThemeId: null,
    createdAt: now,
    updatedAt: now,
  },
];

const notes = [
  {
    id: 'note-1',
    title: 'Alpha',
    content: 'First note',
    color: '#ffffff',
    editorType: 'markdown',
    isPinned: true,
    isArchived: false,
    isFavorite: false,
    notebookId: 'notebook-1',
    createdAt: now,
    updatedAt: now,
    tagIds: ['tag-1'],
    categoryIds: ['cat-1'],
    relatedNoteIds: [],
    tags: [
      {
        noteId: 'note-1',
        tagId: 'tag-1',
        assignedAt: now,
        tag: tags[0],
      },
    ],
    categories: [
      {
        noteId: 'note-1',
        categoryId: 'cat-1',
        assignedAt: now,
        category: categories[0],
      },
    ],
    relationsFrom: [],
    relationsTo: [],
    relations: [],
  },
  {
    id: 'note-2',
    title: 'Beta',
    content: 'Second note',
    color: '#ffffff',
    editorType: 'markdown',
    isPinned: false,
    isArchived: false,
    isFavorite: false,
    notebookId: 'notebook-1',
    createdAt: now,
    updatedAt: now,
    tagIds: [],
    categoryIds: [],
    relatedNoteIds: [],
    tags: [],
    categories: [],
    relationsFrom: [],
    relationsTo: [],
    relations: [],
  },
];

const buildTree = () =>
  categories.map((category) => ({
    ...category,
    children: [],
    notes: notes
      .filter((note) => note.categoryIds.includes(category.id))
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

export async function mockNotesWorkspaceApis(page: Page): Promise<void> {
  await page.route('**/api/settings/lite**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/settings**', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            key: 'noteSettings:selectedNotebookId',
            value: 'notebook-1',
          },
        ]),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route('**/api/ai-paths/trigger-buttons**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/client-errors', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route('**/api/query-telemetry', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route('**/api/notes/tags**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(tags),
    });
  });

  await page.route('**/api/notes/themes**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/notes/notebooks**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(notebooks),
    });
  });

  await page.route('**/api/notes/categories/tree**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildTree()),
    });
  });

  await page.route(/\/api\/notes(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(notes),
    });
  });
}
