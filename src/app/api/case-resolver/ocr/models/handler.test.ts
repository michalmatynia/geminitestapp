import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET_handler } from './handler';
import { listBrainModels } from '@/shared/lib/ai-brain/server-model-catalog';

vi.mock('@/shared/lib/ai-brain/server-model-catalog', () => ({
  listBrainModels: vi.fn(),
}));

describe('case-resolver/ocr/models GET_handler', () => {
  const mockContext = { source: 'test' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns categorized OCR models from brain', async () => {
    const mockPayload = {
      models: ['gpt-4o', 'llama3'],
      descriptors: {
        'gpt-4o': { vendor: 'openai' },
        'llama3': { vendor: 'ollama' },
      },
    };
    vi.mocked(listBrainModels).mockResolvedValue(mockPayload as any);

    const req = new NextRequest('http://localhost/api/case-resolver/ocr/models');
    const response = await GET_handler(req, mockContext);
    const data = await response.json();

    expect(data.models).toEqual(['gpt-4o', 'llama3']);
    expect(data.ollamaModels).toEqual(['llama3']);
    expect(data.otherModels).toEqual(['gpt-4o']);
    expect(data.keySource).toBe('brain');
  });

  it('includes warning if brain provides one', async () => {
    const mockPayload = {
      models: [],
      warning: { code: 'EMPTY', message: 'No models' },
    };
    vi.mocked(listBrainModels).mockResolvedValue(mockPayload as any);

    const req = new NextRequest('http://localhost/api/case-resolver/ocr/models');
    const response = await GET_handler(req, mockContext);
    const data = await response.json();

    expect(data.warning).toEqual({ code: 'EMPTY', message: 'No models' });
  });
});
