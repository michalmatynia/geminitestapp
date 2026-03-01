import { http, HttpResponse } from 'msw';
import { NextRequest } from 'next/server';
import { vi, MockInstance, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { GET, POST } from '@/app/api/chatbot/route';
import { server } from '@/mocks/server';
import { resolveBrainModelExecutionConfig } from '@/shared/lib/ai-brain/server';
import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';

const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434';

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: vi.fn().mockResolvedValue('prisma'),
  getAppDbProviderSetting: vi.fn().mockResolvedValue('prisma'),
  invalidateAppDbProviderCache: vi.fn(),
  APP_DB_PROVIDER_SETTING_KEY: 'app_db_provider',
}));

vi.mock('@/shared/lib/ai-brain/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/ai-brain/server')>();
  return {
    ...actual,
    resolveBrainModelExecutionConfig: vi.fn(),
  };
});

vi.mock('@/shared/lib/ai-brain/server-runtime-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/ai-brain/server-runtime-client')>();
  return {
    ...actual,
    runBrainChatCompletion: vi.fn(),
  };
});

describe('Chatbot API', () => {
  let consoleErrorSpy: MockInstance;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env['OLLAMA_MODEL'] = 'test-model';
    
    // Mock AI Brain config directly
    vi.mocked(resolveBrainModelExecutionConfig).mockResolvedValue({
      provider: 'model',
      agentId: '',
      modelId: 'test-model',
      temperature: 0.7,
      maxTokens: 800,
      systemPrompt: 'You are a helpful assistant.',
      assignment: {
        enabled: true,
        provider: 'model',
        modelId: 'test-model',
        agentId: '',
        temperature: 0.7,
        maxTokens: 800,
        notes: null,
      },
      capability: 'chatbot.reply',
      feature: 'chatbot',
      brainApplied: {
        capability: 'chatbot.reply',
        feature: 'chatbot',
        modelFamily: 'chat',
        runtimeKind: 'chat',
        provider: 'model',
        modelId: 'test-model',
        temperature: 0.7,
        maxTokens: 800,
        systemPromptApplied: true,
        enforced: true,
      },
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.resetAllMocks();
    delete process.env['OLLAMA_MODEL'];
  });

  it('should list available Ollama models', async () => {
    server.use(
      http.get(`${OLLAMA_BASE_URL}/api/tags`, () => {
        return HttpResponse.json({
          models: [{ name: 'test-model' }, { name: 'llava' }],
        });
      })
    );

    const res = await GET(new NextRequest('http://localhost/api/chatbot'));
    const data = (await res.json()) as { models: string[] };

    expect(res.status).toBe(200);
    expect(data.models).toContain('test-model');
    expect(data.models).toContain('llava');
  });

  it('should return fallback models when model listing fails', async () => {
    // Intercept all discovery attempts across different base URLs
    server.use(
      http.get(/.*\/api\/tags/, () => {
        return new HttpResponse('Provider down', { status: 502 });
      }),
      http.get(/.*\/v1\/models/, () => {
        return new HttpResponse('Provider down', { status: 502 });
      })
    );

    const res = await GET(new NextRequest('http://localhost/api/chatbot'));
    const data = (await res.json()) as { 
      models: string[]; 
      warning?: { code: string; message: string } 
    };

    expect(res.status).toBe(200);
    expect(data.models).toBeDefined();
    expect(data.warning?.code).toBe('OLLAMA_UNAVAILABLE');
  });

  it('should reject invalid chat payloads', async () => {
    const req = new NextRequest('http://localhost/api/chatbot', {
      method: 'POST',
      body: JSON.stringify({ messages: [] }),
    });

    const res = await POST(req);
    const data = (await res.json()) as { error: string };

    expect(res.status).toBe(400);
    expect(data.error).toBe('No messages provided.');
  });

  it('should proxy chat requests to Ollama via Brain runtime', async () => {
    vi.mocked(runBrainChatCompletion).mockResolvedValue({
      text: 'Hello from model.',
      vendor: 'ollama',
      modelId: 'test-model',
    });

    const req = new NextRequest('http://localhost/api/chatbot', {
      method: 'POST',
      body: JSON.stringify({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    const res = await POST(req);
    const data = (await res.json()) as { message: string; error?: string };

    if (res.status !== 200) {
      console.log('Error response:', JSON.stringify(data, null, 2));
    }

    expect(res.status).toBe(200);
    expect(data.message).toBe('Hello from model.');
  });

  it('should return a debug errorId when chat proxy fails', async () => {
    vi.mocked(runBrainChatCompletion).mockRejectedValue(new Error('Ollama error: Model unavailable'));

    const req = new NextRequest('http://localhost/api/chatbot', {
      method: 'POST',
      body: JSON.stringify({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    const res = await POST(req);
    const data = (await res.json()) as { error: string; errorId?: string };

    expect(res.status).toBe(500);
    expect(data.error).toContain('Ollama error');
    expect(data.errorId).toBeDefined();
  });

  it('should return a debug errorId on unexpected chat errors', async () => {
    vi.mocked(runBrainChatCompletion).mockRejectedValue(new Error('Unexpected error'));

    const req = new NextRequest('http://localhost/api/chatbot', {
      method: 'POST',
      body: JSON.stringify({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    const res = await POST(req);
    const data = (await res.json()) as { errorId?: string };

    expect(res.status).toBe(500);
    expect(data.errorId).toBeDefined();
  });
});
