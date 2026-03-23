import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET_handler } from './handler';
import { noteService } from '@/features/notesapp/server';

vi.mock('@/features/notesapp/server', () => ({
  noteService: {
    getById: vi.fn(),
  },
}));

describe('notes/lookup GET_handler', () => {
  const mockContext = { source: 'test', query: {} } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws badRequestError if ids are missing', async () => {
    const req = new NextRequest('http://localhost/api/notes/lookup');
    await expect(GET_handler(req, mockContext)).rejects.toThrow('ids query parameter is required');
  });

  it('returns ordered notes from service', async () => {
    const mockNotes = {
      'n1': { id: 'n1', title: 'Note 1', color: 'red', content: 'C1' },
      'n2': { id: 'n2', title: 'Note 2', color: 'blue', content: 'C2' },
    };
    vi.mocked(noteService.getById).mockImplementation(async (id) => (mockNotes as any)[id] ?? null);

    const contextWithQuery = { 
      ...mockContext, 
      query: { ids: ['n2', 'n1', 'n3'] } 
    };
    const req = new NextRequest('http://localhost/api/notes/lookup?ids=n2,n1,n3');
    const response = await GET_handler(req, contextWithQuery);
    const data = await response.json();

    expect(data).toHaveLength(2);
    expect(data[0].id).toBe('n2');
    expect(data[1].id).toBe('n1');
    expect(noteService.getById).toHaveBeenCalledTimes(3);
  });
});
