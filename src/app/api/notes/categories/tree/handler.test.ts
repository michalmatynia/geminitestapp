import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHandler } from './handler';
import { noteService } from '@/features/notesapp/server';

vi.mock('@/features/notesapp/server', () => ({
  noteService: {
    getOrCreateDefaultNotebook: vi.fn(),
    getCategoryTree: vi.fn(),
  },
}));

describe('notes/categories/tree getHandler', () => {
  const mockContext = { source: 'test', query: {} } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses provided notebookId if present', async () => {
    const mockTree = [{ id: 'c1', name: 'Cat 1', children: [] }];
    vi.mocked(noteService.getCategoryTree).mockResolvedValue(mockTree as any);

    const contextWithQuery = { ...mockContext, query: { notebookId: 'nb-123' } };
    const req = new NextRequest('http://localhost/api/notes/categories/tree?notebookId=nb-123');
    const response = await getHandler(req, contextWithQuery);
    const data = await response.json();

    expect(data).toEqual(mockTree);
    expect(noteService.getCategoryTree).toHaveBeenCalledWith('nb-123');
    expect(noteService.getOrCreateDefaultNotebook).not.toHaveBeenCalled();
  });

  it('falls back to default notebook if notebookId is missing', async () => {
    const mockTree = [{ id: 'c2' }];
    vi.mocked(noteService.getOrCreateDefaultNotebook).mockResolvedValue({ id: 'nb-default' } as any);
    vi.mocked(noteService.getCategoryTree).mockResolvedValue(mockTree as any);

    const req = new NextRequest('http://localhost/api/notes/categories/tree');
    const response = await getHandler(req, mockContext);
    const data = await response.json();

    expect(data).toEqual(mockTree);
    expect(noteService.getOrCreateDefaultNotebook).toHaveBeenCalled();
    expect(noteService.getCategoryTree).toHaveBeenCalledWith('nb-default');
  });
});
