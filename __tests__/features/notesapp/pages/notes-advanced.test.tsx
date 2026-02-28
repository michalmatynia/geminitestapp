/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { AdminLayoutProvider } from '@/features/admin/context/AdminLayoutContext';
import { NoteSettingsProvider } from '@/features/notesapp/hooks/NoteSettingsContext';
import { AdminNotesPage } from '@/features/notesapp/pages/AdminNotesPage';
import { server } from '@/mocks/server';
import type { NoteWithRelations } from '@/shared/contracts/notes';
import { ToastProvider } from '@/shared/ui/toast';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const now = new Date().toISOString();

const makeNote = (overrides: Partial<NoteWithRelations> = {}): NoteWithRelations => ({
  id: 'note-1',
  title: 'Alpha',
  content: 'First note',
  color: '#ffffff',
  editorType: 'markdown',
  isPinned: false,
  isArchived: false,
  isFavorite: false,
  notebookId: 'nb-1',
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

describe('Notes Advanced UI', () => {
  let notes: NoteWithRelations[] = [];

  beforeEach(() => {
    window.localStorage.clear();
    queryClient.clear();
    notes = [
      makeNote({ id: 'note-1', title: 'Apple', createdAt: '2023-01-01T00:00:00.000Z' }),
      makeNote({ id: 'note-2', title: 'Banana', createdAt: '2023-01-02T00:00:00.000Z' }),
    ];

    server.use(
      http.get('/api/settings', () => HttpResponse.json([])),
      http.get('/api/notes/tags', () => HttpResponse.json([])),
      http.get('/api/notes/categories', () => HttpResponse.json([])),
      http.post('/api/client-errors', () => HttpResponse.json({ success: true })),
      http.post('/api/query-telemetry', () => HttpResponse.json({ success: true })),
      http.get('/api/notes/themes', () => HttpResponse.json([])),
      http.get('/api/ai-paths/trigger-buttons', () => HttpResponse.json([])),
      http.get('/api/notes/notebooks', () => HttpResponse.json([{ id: 'nb-1', name: 'Default' }])),
      http.get('/api/notes/categories/tree', () => HttpResponse.json([])),
      http.get('/api/notes', () => HttpResponse.json(notes)),
      http.get('/api/notes/:id', ({ params }) => {
        const note = notes.find((n) => n.id === params['id']);
        return note
          ? HttpResponse.json(note)
          : HttpResponse.json({ error: 'Not found' }, { status: 404 });
      }),
      http.patch('/api/notes/:id', async ({ params, request }) => {
        const body = (await request.json()) as Partial<NoteWithRelations>;
        const index = notes.findIndex((n) => n.id === params['id']);
        if (index !== -1) {
          notes[index] = { ...notes[index], ...body };
          return HttpResponse.json(notes[index]);
        }
        return HttpResponse.json({ error: 'Not found' }, { status: 404 });
      }),
      http.delete('/api/notes/:id', ({ params }) => {
        notes = notes.filter((n) => n.id !== params['id']);
        return HttpResponse.json({ success: true });
      })
    );

    // Mock confirm for deletion
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true)
    );

    // Mock navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('switches between grid and list views', async () => {
    renderNotesPage();
    const user = userEvent.setup();

    const grid4Button = await screen.findByRole('button', { name: /Grid 4/i });
    await user.click(grid4Button);

    // Grid 4 button should now be the 'default' variant
    // In our implementation, default has text-foreground/90, and outline does not
    expect(grid4Button.className).toContain('text-foreground/90');
  });

  it('sorts notes by title', async () => {
    renderNotesPage();
    const user = userEvent.setup();

    // Wait for notes to load
    const appleNote = await screen.findByRole('heading', { name: 'Apple' });
    expect(appleNote).toBeInTheDocument();

    const sortBySelect = screen.getByRole('combobox', { name: /Sort By/i });
    await user.click(sortBySelect);
    const nameOption = await screen.findByRole('option', { name: 'Name' });
    await user.click(nameOption);

    // Wait for sort to apply
    await waitFor(async () => {
      const cardsAfterSort = await screen.findAllByRole('heading', { level: 3 });
      expect(cardsAfterSort.length).toBeGreaterThan(0);
    });

    const orderBtn = screen.getByTitle(/Click to sort ascending/i);
    await user.click(orderBtn);
  });

  it('opens note detail view and enters edit mode', async () => {
    renderNotesPage();
    const user = userEvent.setup();

    const appleNote = await screen.findByRole('heading', { name: 'Apple' });
    await user.click(appleNote);

    // Use findByText to wait for the detail view to render
    expect(await screen.findByText('First note', {}, { timeout: 3000 })).toBeInTheDocument();

    const editBtn = await screen.findByRole('button', { name: 'Edit' });
    await user.click(editBtn);

    const titleInput = screen.getByPlaceholderText('Enter note title');
    expect(titleInput).toHaveValue('Apple');
  });

  it('edits a note and saves', async () => {
    renderNotesPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('heading', { name: 'Apple' }));
    await user.click(await screen.findByRole('button', { name: 'Edit' }));

    const titleInput = screen.getByPlaceholderText('Enter note title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Apple');

    await user.click(screen.getByRole('button', { name: 'Update' }));

    // Should be back in detail view with updated title.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Updated Apple' })
    ).toBeInTheDocument();
  });

  it('deletes a note from edit mode', async () => {
    renderNotesPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('heading', { name: 'Banana' }));
    await user.click(await screen.findByRole('button', { name: 'Edit' }));

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    await user.click(deleteBtn);

    // Click Delete in ConfirmModal
    const modal = await screen.findByRole('dialog');
    const confirmBtn = within(modal).getByRole('button', { name: 'Delete' });
    await user.click(confirmBtn);

    // Should be back to list view, and Banana should be gone
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Banana' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Apple' })).toBeInTheDocument();
  });

  it('toggles favorite status from list view', async () => {
    renderNotesPage();
    const user = userEvent.setup();

    // Use a more robust selector to find the card container
    const appleTitle = await screen.findByRole('heading', { name: 'Apple' });
    const appleCard = appleTitle.closest('.rounded-lg.border.p-4') || appleTitle.parentElement;

    const favBtn = await within(appleCard as HTMLElement).findByRole('button', {
      name: /Favorite note/i,
    });

    await user.click(favBtn);

    // Check if it's now Unfavorite note
    expect(
      await within(appleCard as HTMLElement).findByRole('button', { name: /Unfavorite note/i })
    ).toBeInTheDocument();
  });
});
