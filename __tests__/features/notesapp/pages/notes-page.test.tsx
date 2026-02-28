/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { AdminLayoutProvider } from '@/features/admin/context/AdminLayoutContext';
import { NoteSettingsProvider } from '@/features/notesapp/hooks/NoteSettingsContext';
import { AdminNotesPage } from '@/features/notesapp/pages/AdminNotesPage';
import { server } from '@/mocks/server';
import type { NoteWithRelations, TagRecord, CategoryRecord } from '@/shared/contracts/notes';
import { ToastProvider } from '@/shared/ui/toast';

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
    id: 'tag-1',
    name: 'Work',
    color: '#3b82f6',
    notebookId: null,
    createdAt: now,
    updatedAt: now,
  },
];

const baseCategories: CategoryRecord[] = [
  {
    id: 'cat-1',
    name: 'Projects',
    description: null,
    color: '#10b981',
    parentId: null,
    notebookId: null,
    themeId: null,
    sortIndex: 0,
    createdAt: now,
    updatedAt: now,
  },
];

const baseNotebooks = [
  {
    id: 'notebook-1',
    name: 'Default',
    color: '#3b82f6',
    defaultThemeId: null,
    createdAt: now,
    updatedAt: now,
  },
];

const makeNote = (overrides: Partial<NoteWithRelations> = {}): NoteWithRelations => ({
  id: 'note-1',
  title: 'Alpha',
  content: 'First note',
  color: '#ffffff',
  editorType: 'markdown',
  isPinned: true,
  isArchived: false,
  isFavorite: false,
  notebookId: null,
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
      tag: baseTags[0]!,
    },
  ],
  categories: [
    {
      noteId: 'note-1',
      categoryId: 'cat-1',
      assignedAt: now,
      category: baseCategories[0]!,
    },
  ],
  relationsFrom: [],
  relationsTo: [],
  relations: [],
  ...overrides,
});

const renderNotesPage = () => {
  queryClient.clear();
  return render(
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
};

describe('Notes page UI', () => {
  let notes: NoteWithRelations[] = [];

  beforeEach(() => {
    window.localStorage.clear();
    notes = [makeNote(), makeNote({ id: 'note-2', title: 'Beta' })];
    const tags = [...baseTags];
    const categories = [...baseCategories];
    const notebooks = [...baseNotebooks];

    if (!global.crypto || !('randomUUID' in global.crypto)) {
      Object.defineProperty(global, 'crypto', {
        value: { randomUUID: () => 'test-uuid' },
      });
    }

    server.use(
      http.get('/api/settings', () => HttpResponse.json([])),
      http.get('/api/notes/categories', () => HttpResponse.json([])),
      http.post('/api/client-errors', () => HttpResponse.json({ success: true })),
      http.post('/api/query-telemetry', () => HttpResponse.json({ success: true })),
      http.get('/api/notes/tags', () => HttpResponse.json(tags)),
      http.get('/api/notes/themes', () => HttpResponse.json([])),
      http.get('/api/ai-paths/trigger-buttons', () => HttpResponse.json([])),
      http.get('/api/notes/notebooks', () => HttpResponse.json(notebooks)),
      http.get('/api/notes/categories/tree', () => {
        const tree = categories.map((category) => ({
          ...category,
          children: [],
          notes: notes
            .filter((note: NoteWithRelations) =>
              note.categories?.some(
                (cat) => (cat as { categoryId: string }).categoryId === category.id
              )
            )
            .map((note: NoteWithRelations) => ({
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
      http.post('/api/notes', async ({ request }) => {
        const body = (await request.json()) as {
          title?: string;
          content?: string;
          isPinned?: boolean;
          isArchived?: boolean;
          tagIds?: string[];
          categoryIds?: string[];
        };
        const tagIds = Array.isArray(body.tagIds) ? body.tagIds : [];
        const categoryIds = Array.isArray(body.categoryIds) ? body.categoryIds : [];
        const newNote = makeNote({
          id: `note-${notes.length + 1}`,
          title: body.title || 'Untitled',
          content: body.content || '',
          isPinned: body.isPinned ?? false,
          isArchived: body.isArchived ?? false,
          tagIds,
          categoryIds,
          tags: tagIds.map((tagId: string) => {
            const tag = tags.find((t) => t.id === tagId) ?? tags[0]!;
            return { noteId: 'temp', tagId, assignedAt: now, tag };
          }),
          categories: categoryIds.map((categoryId: string) => {
            const category = categories.find((c) => c.id === categoryId) ?? categories[0]!;
            return { noteId: 'temp', categoryId, assignedAt: now, category };
          }),
        });
        notes.push(newNote);
        return HttpResponse.json(newNote, { status: 201 });
      }),
      http.get('/api/notes', ({ request }) => {
        const url = new URL(request.url);
        let filtered = [...notes];
        const search = url.searchParams.get('search');
        const tagIds = url.searchParams.get('tagIds')?.split(',') ?? [];

        if (search) {
          filtered = filtered.filter((note) => {
            return (
              note.title.toLowerCase().includes(search.toLowerCase()) ||
              note.content.toLowerCase().includes(search.toLowerCase())
            );
          });
        }
        if (tagIds.length > 0 && tagIds[0]) {
          filtered = filtered.filter((note) => note.tagIds.some((id) => tagIds.includes(id)));
        }
        return HttpResponse.json(filtered);
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders notes from the API', async () => {
    renderNotesPage();

    expect(await screen.findByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Beta' })).toBeInTheDocument();
  });

  it('filters notes by search and tag', async () => {
    renderNotesPage();
    const user = userEvent.setup();

    await user.type(await screen.findByPlaceholderText('Search notes...'), 'Alpha');

    // Wait for multiple layers of debouncing (400ms + 250ms + 300ms)
    await new Promise((resolve) => setTimeout(resolve, 1200));

    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Beta' })).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const tagFilter = screen.getByRole('button', { name: /Filter by tags.../i });
    await user.click(tagFilter);

    // MultiSelect items are CheckboxItems in DropdownMenu
    const workOption = await screen.findByRole('menuitemcheckbox', { name: /Work/i });
    await user.click(workOption);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    });
  });

  it('creates a new note from the modal', async () => {
    renderNotesPage();
    const user = userEvent.setup();

    await user.click(await screen.findByLabelText('Create note'));
    await user.type(screen.getByPlaceholderText('Enter note title'), 'Gamma');
    await user.type(
      screen.getByPlaceholderText('Enter note content (paste images directly!)'),
      'Third note'
    );
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByRole('heading', { name: 'Gamma' }, { timeout: 3000 })
    ).toBeInTheDocument();
  });
});
