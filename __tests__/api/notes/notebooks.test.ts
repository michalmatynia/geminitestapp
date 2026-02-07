import { NextRequest } from 'next/server';
import { vi, beforeEach, afterAll, describe, it, expect } from 'vitest';

import { GET, POST } from '@/app/api/notes/notebooks/route';
import { noteService } from '@/features/notesapp/server';

vi.mock('@/features/notesapp/server', () => ({
  noteService: {
    getAllNotebooks: vi.fn(),
    createNotebook: vi.fn(),
  },
}));

describe('Notes Notebooks API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/notes/notebooks', () => {
    it('should return all notebooks', async () => {
      const mockNotebooks = [
        { id: '1', name: 'Notebook 1' },
        { id: '2', name: 'Notebook 2' },
      ];
      vi.mocked(noteService.getAllNotebooks).mockResolvedValue(mockNotebooks as any);

      const res = await GET(
        new NextRequest('http://localhost/api/notes/notebooks')
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data).toHaveLength(2);
      expect(noteService.getAllNotebooks).toHaveBeenCalled();
    });
  });

  describe('POST /api/notes/notebooks', () => {
    it('should create a new notebook', async () => {
      const newNotebook = { name: 'My New Notebook', color: '#3b82f6' };
      const res = await POST(
        new NextRequest('http://localhost/api/notes/notebooks', {
          method: 'POST',
          body: JSON.stringify(newNotebook),
        })
      );
      const data = await res.json();
      expect(res.status).toEqual(201);
      expect(data.name).toEqual('New Notebook'); // Based on mock return value
      expect(noteService.createNotebook).toHaveBeenCalledWith(expect.objectContaining({
        name: 'My New Notebook'
      }));
    });

    it('should return 400 for invalid data', async () => {
      const res = await POST(
        new NextRequest('http://localhost/api/notes/notebooks', {
          method: 'POST',
          body: JSON.stringify({}), // missing name
        })
      );
      expect(res.status).toEqual(400);
    });
  });
});
