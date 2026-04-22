import { http, HttpResponse } from 'msw';
import { NextRequest } from 'next/server';
import { vi, MockInstance, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { getHandler, postHandler } from '@/app/api/chatbot/handler';
import { server } from '@/mocks/server';
import { resolveBrainModelExecutionConfig } from '@/shared/lib/ai-brain/server';
import { runChatbotModel } from '@/shared/lib/ai/chatbot/server-model-runtime';

const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434';

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: vi.fn().mockResolvedValue('mongodb'),
  getAppDbProviderSetting: vi.fn().mockResolvedValue('mongodb'),
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

vi.mock('@/shared/lib/ai/chatbot/server-model-runtime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/ai/chatbot/server-model-runtime')>();
  return {
    ...actual,
    runChatbotModel: vi.fn(),
  };
});

describe('Chatbot API', () => {
  let consoleErrorSpy: MockInstance;

  const createApiContext = () => ({
    requestId: 'chatbot-test-id',
    body: {},
    query: {},
    getElapsedMs: () => 0,
  });

  const invokeGet = (req: NextRequest): Promise<Response> =>
    getHandler(req, createApiContext() as never);

  const invokePost = async (req: NextRequest): Promise<Response> => {
    try {
      return await postHandler(req, createApiContext() as never);
    } catch (error: unknown) {
      const err = error as {
        name?: string;
        code?: string;
        message?: string;
        stack?: string;
        httpStatus?: number;
      };
      const status =
        (err.name === 'AppError' && err.code === 'NOT_FOUND') ||
        err.code === 'P2025'
          ? 404
          : (err.name === 'AppError' && err.code === 'VALIDATION_ERROR') ||
              err.code === 'BAD_REQUEST' ||
              err.name === 'ValidationError' ||
              err.name === 'ZodError'
            ? 400
            : err.httpStatus || 500;
      return Response.json(
        {
          error: err.message,
          code: err.code,
          errorId: 'mock-error-id',
          stack: err.stack,
        },
        { status }
      );
    }
  };

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

    const res = await invokeGet(new NextRequest('http://localhost/api/chatbot'));
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

    const res = await invokeGet(new NextRequest('http://localhost/api/chatbot'));
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

    const res = await invokePost(req);
    const data = (await res.json()) as { error: string };

    expect(res.status).toBe(400);
    expect(data.error).toBe('No messages provided.');
  });

  it('should proxy chat requests to Ollama via Brain runtime', async () => {
    vi.mocked(runChatbotModel).mockResolvedValue({
      message: 'Hello from model.',
      modelId: 'test-model',
      provider: 'ollama',
    });

    const req = new NextRequest('http://localhost/api/chatbot', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    const res = await invokePost(req);
    const data = (await res.json()) as { message: string; error?: string };

    if (res.status !== 200) {
      console.log('Error response:', JSON.stringify(data, null, 2));
    }

    expect(res.status).toBe(200);
    expect(data.message).toBe('Hello from model.');
  });

  it('should return a debug errorId when chat proxy fails', async () => {
    vi.mocked(runChatbotModel).mockRejectedValue(new Error('Ollama error: Model unavailable'));

    const req = new NextRequest('http://localhost/api/chatbot', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    const res = await invokePost(req);
    const data = (await res.json()) as { error: string; errorId?: string };

    expect(res.status).toBe(500);
    expect(data.error).toContain('Ollama error');
    expect(data.errorId).toBeDefined();
  });

  it('should return a debug errorId on unexpected chat errors', async () => {
    vi.mocked(runChatbotModel).mockRejectedValue(new Error('Unexpected error'));

    const req = new NextRequest('http://localhost/api/chatbot', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    const res = await invokePost(req);
    const data = (await res.json()) as { errorId?: string };

    expect(res.status).toBe(500);
    expect(data.errorId).toBeDefined();
  });
});
