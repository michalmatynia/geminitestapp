import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

const { deleteEmbeddingDocumentMock } = vi.hoisted(() => ({
  deleteEmbeddingDocumentMock: vi.fn(),
}));

vi.mock('@/features/ai/agentcreator/server', () => ({
  deleteEmbeddingDocument: deleteEmbeddingDocumentMock,
}));

import { DELETE_handler } from './handler';

describe('agentcreator teaching collection document-by-id handler module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteEmbeddingDocumentMock.mockResolvedValue(true);
  });

  it('rejects requests without a documentId param', async () => {
    const context = {
      params: {},
    } as ApiHandlerContext;

    await expect(
      DELETE_handler(
        new NextRequest('http://localhost/api/agentcreator/teaching/collections/collection-1/documents'),
        context
      )
    ).rejects.toThrow('Missing documentId.');

    expect(deleteEmbeddingDocumentMock).not.toHaveBeenCalled();
  });

  it('deletes the requested embedding document and returns the result', async () => {
    const response = await DELETE_handler(
      new NextRequest(
        'http://localhost/api/agentcreator/teaching/collections/collection-1/documents/document-1',
        { method: 'DELETE' }
      ),
      {
        params: {
          collectionId: 'collection-1',
          documentId: 'document-1',
        },
      } as ApiHandlerContext
    );

    expect(deleteEmbeddingDocumentMock).toHaveBeenCalledWith('document-1');
    await expect(response.json()).resolves.toEqual({
      ok: true,
      deleted: true,
    });
  });
});
